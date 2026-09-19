# -*- coding: utf-8 -*-
"""One-off note to the three of us: what we now measure on held and dropped courts, and the plan.

Richie, 19 Sep 2026: "send an email summary to me Dave and Mike of our findings and strategy to
monitor and act". Figures are read live from the court ledger and the Playtomic feed, so the note
never quotes a number that is out of date.

    python scripts/court_watch_brief.py [--dry-run]
"""
import json
import os
import sys
from collections import Counter
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
import cancel_emails  # noqa: E402
import court_watch  # noqa: E402
import league_bookings as lb  # noqa: E402


def from_ledger(st):
    """Cancellations with an exact time: ledger rows matched to the club's emails, plus the ones
    that happened outside the booking window we poll."""
    rows = []
    for c in st["cancelled"].values():
        if c.get("cancelled_at_exact") and c.get("notice_hours") is not None:
            rows.append({"name": c.get("cancelled_by") or "?", "court": c["court"],
                         "starts_at": c["starts_at"], "cancelled_at": c["cancelled_at_exact"],
                         "notice_hours": c["notice_hours"]})
    rows += list(st.get("from_email", {}).values())
    return rows

TO = ["richiecarroll65@gmail.com", "davidmhennebry7@gmail.com", "mike@w7padel.com"]


def main():
    dry = "--dry-run" in sys.argv
    sys.path.insert(0, os.path.join(os.path.dirname(ROOT), "w7-padel", "scripts"))
    import w7_email_html as wh

    now = datetime.now(timezone.utc)
    all_b = lb.fetch_bookings(21, back=3, include_cancelled=True)
    live = [b for b in all_b if not (b.get("is_canceled") or b.get("status") == "CANCELED")]
    future = [b for b in live
              if datetime.fromisoformat(b["booking_start_date"]).replace(tzinfo=timezone.utc) > now]
    named = Counter(len((b.get("participant_info") or {}).get("participants") or []) for b in future)
    held = court_watch.held_courts(live, now)
    st = json.load(open(court_watch.STATE, encoding="utf-8"))
    canc = list(st["cancelled"].values())
    hist = [c for c in canc if c.get("backfilled")]
    hist_dead = [c for c in hist if c.get("refilled") is False]
    watched = [c for c in canc if not c.get("backfilled")]
    late = [c for c in watched if c.get("notice_hours") is not None and c["notice_hours"] <= 36]
    band = Counter(h["band"] for h in held)
    email_rows = from_ledger(st)
    ev = cancel_emails.decisions(email_rows)
    late_ev = [r for r in ev if 0 <= r["notice_hours"] <= cancel_emails.LATE_H]
    rep = cancel_emails.repeat_offenders(email_rows)
    followed = [c for c in st["cancelled"].values()
                if c.get("notice_hours") is not None and 0 <= c["notice_hours"] <= cancel_emails.LATE_H
                and c.get("refilled") is not None]
    refilled = sum(1 for c in followed if c["refilled"])
    dead = sum(1 for c in followed if c["refilled"] is False)

    L = [
        "W7 — courts held and courts dropped: what we now measure, and what I suggest we do",
        "",
        "THE PROBLEM",
        "  Members book a court for a league game days ahead with only themselves on it, never fill",
        "  the other three places, and let it go at short notice. A court freed inside 24 hours is",
        "  hard to sell, and the league game still has to find a slot somewhere else.",
        "",
        "WHAT THE BOOKINGS ACTUALLY SHOW",
        f"  Of {len(future)} future bookings on the courts right now:",
        f"    {named.get(4, 0)} have all four players named",
        f"    {named.get(2, 0) + named.get(3, 0)} have two or three named",
        f"    {named.get(1, 0)} name only the booker",
        f"    {named.get(0, 0)} name nobody at all",
        "  So a booking that is not fully named is normal, not suspicious. Chasing every one of them",
        "  would be half the book and everyone would learn to ignore us.",
        "",
        f"  Narrowed to what matters — a box league pair holding a court, the other pair not named,",
        f"  and fixtures still to play — there are {len(held)} right now:",
    ]
    for _, _, label in court_watch.BANDS:
        if band.get(label):
            L.append(f"    {band[label]:2} {label}")
    L += [
        "  That is a list one person can act on in two minutes a day.",
        "",
        "CANCELLATIONS — HOW WE SEE THEM",
        "  Two sources, and they agree. Playtomic's booking feed carries cancelled bookings, which we",
        "  now read every hour, so from here on we know within the hour when a court is dropped and",
        "  whether the slot is taken again. Playtomic also emails the club the moment anyone cancels,",
        "  with the name, court and slot, which gave us three months of history in one go.",
        "",
        "THREE MONTHS OF CANCELLATIONS — from the club's own Playtomic emails",
        f"  {len(ev)} cancellation decisions since 18 June, {len(late_ev)} of them inside 36 hours of play.",
        "  Courts dropped together by one person count once, so nobody is inflated by a single act.",
        f"  Of the late ones we can follow through, {refilled} refilled and {dead} never did.",
        "",
        f"  Dropping late more than once ({len(rep)} people). This is a prompt for a word, not evidence:",
        "  it covers every court booking, not just league games, and some will be block bookings",
        "  released on purpose, which is the behaviour we want.",
    ]
    for name, n_late, n_all, worst in rep[:8]:
        L.append(f"    {name:26} {n_late} late of {n_all} · shortest notice {worst:.0f}h")
    L += [
        "",
        "WHAT I SUGGEST",
        "  1. Watch first, act second. The monitor is live now: the held list and the dropped list are",
        "     in the daily usage email, and nothing is sent to any member.",
        "  2. A nudge at 48 hours to the person holding the court: one question, are you playing this,",
        "     with two buttons, confirm or release. Same one-tap pattern the league results already use.",
        "  3. A list at 36 hours of anything unanswered, for one of us to cancel by hand. I would not",
        "     auto-cancel: a court can be genuinely full with only the booker named, and cancelling a",
        "     real game is far worse than carrying an empty one.",
        "  4. A stated rule behind it, something like: courts held for league games should be released",
        "     36 hours out if the game is not on. Without a rule the nudge is a polite request; with",
        "     one it is a reminder.",
        "",
        "WHAT I NEED FROM YOU TWO",
        "  David and Mike — the wording of the rule, and whether a late release should carry any",
        "  consequence. Also whether the 36-hour cancel call sits with the club or with me.",
        "",
        "Nothing changes for members until we agree the nudge. Until then this is measurement only.",
        "",
        "— W7 league site",
    ]
    text = "\n".join(L)
    subject = f"W7 — held courts and late drops: {len(held)} held now, {len(hist_dead)} freed slots never refilled"
    if dry:
        print(text)
        print("\n[dry-run] would send to", ", ".join(TO), "|", subject)
        return 0
    wh.send(subject, TO, text, wh.shell("Courts", "Held courts and late drops", wh.auto_body(text)))
    print("sent to", ", ".join(TO))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
