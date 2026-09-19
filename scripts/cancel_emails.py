# -*- coding: utf-8 -*-
"""Exact cancellation times from Playtomic's "Canceled reservation in your club" emails.

Richie, 19 Sep 2026: "Grab cancels from my email inbox. We can also flag repeat late cancellers
for closer monitoring too."

The hourly ledger (court_watch.py) sees a cancellation within the hour it happens, which is fine
going forward but says nothing about the weeks before we started watching. Playtomic emails the
club the moment a booking is cancelled, and the email carries the member's name, the court and
the slot, with the send time as the exact moment of cancellation. Feeding those in turns the
ledger's "cancelled at some point" rows into real notice figures, and names who cancels late.

The emails are pulled in the session (Gmail connector) and handed to this script as JSON records
of {"at": <ISO cancel time>, "text": <email snippet>}; parsing, matching and the repeat-offender
count live here so the rules are in the repo rather than in a chat.

    python scripts/cancel_emails.py records.json [--dry-run]
"""
import html
import json
import os
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
import court_watch  # noqa: E402

IE = ZoneInfo("Europe/Dublin")
LATE_H = 36          # a drop inside this many hours of play is "late"
REPEAT_N = 2         # this many late drops makes someone worth watching

# "... Name Ronel Pickford Date 28/09/2026 Time 20:00 - 21:00 Where W7 Padel Wicklow, Padel 2 ..."
ROW = re.compile(r"Name\s+(?P<name>.+?)\s+Date\s+(?P<date>\d{2}/\d{2}/\d{4})\s+Time\s+"
                 r"(?P<from>\d{2}:\d{2})\s*-\s*(?P<to>\d{2}:\d{2})\s+Where\s+(?P<where>.+?)"
                 r"(?:\s+Payment|$)", re.S)
# One person dropping three courts in the same minute is one decision, not three.
SAME_DECISION_MIN = 10


def parse(records):
    """[{name, court, starts (Dublin), cancelled_at, notice_hours}] from email snippets."""
    out = []
    for r in records:
        m = ROW.search(html.unescape(r.get("text") or ""))
        if not m:
            continue
        d = m.group("date")
        starts = datetime.strptime(f"{d} {m.group('from')}", "%d/%m/%Y %H:%M").replace(tzinfo=IE)
        at = datetime.fromisoformat(str(r["at"]).replace("Z", "+00:00"))
        where = m.group("where")
        court = where.split(",")[-1].strip() if "," in where else where.strip()
        out.append({"name": m.group("name").strip(), "court": court,
                    "starts_at": starts.astimezone(timezone.utc).isoformat(),
                    "when": f"{starts:%a %d %b %H:%M}",
                    "cancelled_at": at.isoformat(),
                    "notice_hours": round((starts - at).total_seconds() / 3600, 1)})
    return sorted(out, key=lambda r: r["cancelled_at"])


def merge(rows, dry=False):
    """Write exact times into the court ledger. Returns (matched, added)."""
    st = court_watch._load()
    by_slot = {}
    for bid, c in st["cancelled"].items():
        starts = datetime.fromisoformat(c["starts_at"])
        by_slot[(starts.astimezone(IE).strftime("%Y-%m-%d %H:%M"), c["court"])] = (bid, c)
    matched, added = 0, 0
    st.setdefault("from_email", {})
    for r in rows:
        starts = datetime.fromisoformat(r["starts_at"])
        key = (starts.astimezone(IE).strftime("%Y-%m-%d %H:%M"), r["court"])
        hit = by_slot.get(key)
        if hit:
            bid, c = hit
            c["cancelled_at_exact"] = r["cancelled_at"]
            c["notice_hours"] = r["notice_hours"]
            c["backfilled"] = False
            c["cancelled_by"] = r["name"]
            matched += 1
        else:
            st["from_email"][f"{key[0]}|{key[1]}"] = r      # cancelled outside the feed window
            added += 1
    if not dry:
        court_watch._save(st)
    return matched, added


def decisions(rows):
    """Collapse courts dropped together by the same person into one decision."""
    out = []
    for r in sorted(rows, key=lambda r: (r["name"], r["cancelled_at"])):
        at = datetime.fromisoformat(r["cancelled_at"])
        prev = out[-1] if out else None
        if (prev and prev["name"] == r["name"]
                and (at - datetime.fromisoformat(prev["cancelled_at"])).total_seconds() <= SAME_DECISION_MIN * 60):
            prev["courts"] += 1
            prev["notice_hours"] = min(prev["notice_hours"], r["notice_hours"])
            continue
        out.append({**r, "courts": 1})
    return sorted(out, key=lambda r: r["cancelled_at"])


def repeat_offenders(rows, late_h=LATE_H, n=REPEAT_N):
    """[(name, late drops, total drops, shortest notice)] for people who drop late more than once."""
    rows = decisions(rows)
    late = defaultdict(list)
    total = defaultdict(int)
    for r in rows:
        total[r["name"]] += 1
        if 0 <= r["notice_hours"] <= late_h:
            late[r["name"]].append(r)
    out = [(name, len(v), total[name], min(x["notice_hours"] for x in v)) for name, v in late.items() if len(v) >= n]
    return sorted(out, key=lambda t: (-t[1], t[3]))


def lines(rows):
    ev = decisions(rows)
    late = [r for r in ev if 0 <= r["notice_hours"] <= LATE_H]
    L = [f"CANCELLATIONS FROM THE CLUB'S EMAIL — {len(rows)} courts dropped in {len(ev)} decisions,"
         f" {len(late)} of them inside {LATE_H}h of play"]
    rep = repeat_offenders(rows)
    if rep:
        L.append(f"  REPEAT LATE CANCELLERS ({REPEAT_N}+ inside {LATE_H}h) — worth a word, or closer watch")
        for name, n_late, n_all, worst in rep:
            L.append(f"    {name:28} {n_late} late of {n_all} cancellations · shortest notice {worst:.0f}h")
    else:
        L.append("  nobody has dropped late more than once")
    return L


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        raise SystemExit("usage: python scripts/cancel_emails.py records.json [--dry-run]")
    records = json.load(open(args[0], encoding="utf-8"))
    rows = parse(records)
    matched, added = merge(rows, dry="--dry-run" in sys.argv)
    print("\n".join(lines(rows)))
    print(f"\nparsed {len(rows)} of {len(records)} emails · ledger rows given an exact time: {matched}"
          f" · cancellations outside the feed window kept separately: {added}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
