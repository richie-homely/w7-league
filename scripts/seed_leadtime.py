# -*- coding: utf-8 -*-
"""Seed booking_leadtime from the Playtomic "New reservation" emails.

The hourly detector can only learn how far ahead a booking was made from the moment it
starts watching — a booking already on the books when it first ran looks like it was made
then. The reservation emails are timestamped when Playtomic actually sent them, so they give
real history back as far as the mailbox goes.

Run once after booking_leadtime_13Sep2026.sql, then again only if you want to backfill a
longer window. Email rows outrank detector rows in the setter, so re-running is safe and
corrects any first-seen guesses.

    python scripts/seed_leadtime.py --days 30            # dry run, prints what it found
    python scripts/seed_leadtime.py --days 30 --push     # write to Supabase

Needs a Gmail app password in the environment (GMAIL_USER / GMAIL_APP_PASSWORD), the same
pair the outgoing mail uses; it reads over IMAP rather than through any Gmail API.
"""
import email
import imaplib
import json
import os
import re
import sys
import urllib.request
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from box_league_mailout import load_env, sb_get  # noqa: E402

IE = ZoneInfo("Europe/Dublin")
# "Name X Date 18/09/2026 Time 20:30 - 22:00 Where W7 Padel Wicklow, Padel 3"
PAT = re.compile(
    r"Date\s+(\d{2}/\d{2}/\d{4})\s+Time\s+(\d{2}:\d{2})\s*-\s*\d{2}:\d{2}\s+"
    r"Where\s+W7 Padel Wicklow,\s*(Padel \d)", re.S)


def fetch(days):
    """(sent_at, plays_at, court) for every new-reservation email in the window."""
    user, pw = os.environ.get("GMAIL_USER"), os.environ.get("GMAIL_APP_PASSWORD")
    if not (user and pw):
        raise SystemExit("GMAIL_USER / GMAIL_APP_PASSWORD missing")
    since = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%d-%b-%Y")
    M = imaplib.IMAP4_SSL("imap.gmail.com")
    M.login(user, pw)
    M.select("INBOX", readonly=True)
    _, data = M.search(None, f'(FROM "no-reply@playtomic.io" SUBJECT "New reservation" SINCE {since})')
    ids = data[0].split()
    out = []
    for i in range(0, len(ids), 100):
        chunk = b",".join(ids[i:i + 100])
        _, msgs = M.fetch(chunk, "(RFC822)")
        for part in msgs:
            if not isinstance(part, tuple):
                continue
            msg = email.message_from_bytes(part[1])
            body = ""
            for p in msg.walk():
                if p.get_content_type() in ("text/plain", "text/html"):
                    try:
                        body += p.get_payload(decode=True).decode(errors="replace")
                    except Exception:
                        pass
            body = re.sub(r"<[^>]+>", " ", body)
            body = re.sub(r"\s+", " ", body)
            hit = PAT.search(body)
            if not hit:
                continue
            sent = parsedate_to_datetime(msg["Date"]).astimezone(timezone.utc)
            dd, mm, yy = hit.group(1).split("/")
            hh, mi = hit.group(2).split(":")
            plays = datetime(int(yy), int(mm), int(dd), int(hh), int(mi), tzinfo=IE)
            out.append((sent, plays, hit.group(3)))
    M.logout()
    return out


def main():
    load_env()
    days = int(sys.argv[sys.argv.index("--days") + 1]) if "--days" in sys.argv else 30
    rows_in = fetch(days)
    print(f"{len(rows_in)} reservation emails in the last {days} days")
    if not rows_in:
        return 0

    # Match each email to the live booking so it carries the same booking_id the detector
    # uses; without that the two sources would double-count the same court hour.
    import league_bookings as lb
    live = {}
    for b in lb.fetch_bookings(60, back=days + 5):
        if b.get("is_canceled"):
            continue
        st = datetime.fromisoformat(b["booking_start_date"]).replace(tzinfo=timezone.utc)
        live[(st.astimezone(IE).strftime("%Y-%m-%d %H:%M"), b.get("resource_name"))] = b
    league_keys = {(datetime.fromisoformat(r["starts_at"]).astimezone(IE).strftime("%Y-%m-%d %H:%M"), r["court"])
                   for r in sb_get("league_bookings?select=starts_at,court&limit=2000")}

    rows, unmatched = [], 0
    for sent, plays, court in rows_in:
        key = (plays.strftime("%Y-%m-%d %H:%M"), court)
        b = live.get(key)
        if not b:
            unmatched += 1          # cancelled since, or older than the booking feed reaches
            continue
        rows.append({"booking_id": b["booking_id"], "booked_at": sent.isoformat(),
                     "starts_at": plays.astimezone(timezone.utc).isoformat(),
                     "court": court, "is_league": key in league_keys, "source": "email"})
    # One row per booking. The same booking can produce two or three emails (Playtomic
    # re-sends on an edit, or a rebooked slot lands on the same court hour), and Postgres
    # refuses to upsert the same key twice in one batch. The earliest send is the moment the
    # booking was actually made, so that one wins.
    best = {}
    for r in rows:
        cur = best.get(r["booking_id"])
        if cur is None or r["booked_at"] < cur["booked_at"]:
            best[r["booking_id"]] = r
    dupes = len(rows) - len(best)
    rows = list(best.values())
    if dupes:
        print(f"collapsed {dupes} repeat emails onto the booking they belong to")
    lead = [(datetime.fromisoformat(r["starts_at"]) - datetime.fromisoformat(r["booked_at"])).total_seconds() / 86400
            for r in rows]
    lg = [r for r in rows if r["is_league"]]
    print(f"matched {len(rows)} to a live booking ({unmatched} gone or out of range), {len(lg)} league")
    if lead:
        lead.sort()
        print(f"lead time: mean {sum(lead)/len(lead):.1f}d · median {lead[len(lead)//2]:.1f}d")

    if "--push" not in sys.argv:
        print("\n[dry run] pass --push to write these to booking_leadtime")
        return 0

    env = {k: os.environ[k] for k in ("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY")}
    key = os.environ.get("SITE_ADMIN_KEY", "")
    H = {"apikey": env["NEXT_PUBLIC_SUPABASE_ANON_KEY"],
         "Authorization": f"Bearer {env['NEXT_PUBLIC_SUPABASE_ANON_KEY']}", "Content-Type": "application/json"}
    req = urllib.request.Request(f"{env['NEXT_PUBLIC_SUPABASE_URL']}/rest/v1/rpc/booking_leadtime_set",
                                 data=json.dumps({"p_key": key, "p_rows": rows}).encode(),
                                 headers=H, method="POST")
    print("pushed:", json.load(urllib.request.urlopen(req, timeout=120)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
