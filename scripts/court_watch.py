# -*- coding: utf-8 -*-
"""Courts held but not filled, and courts dropped late — watch and measure.

Richie, 19 Sep 2026: "people who go and book courts ... in advance with, say, one or two players,
don't fill the whole court and then release them last minute ... create a monitor within the
usage dashboard and then also in an email ... And if we see late cancellations booked a long time
in advance, then cancelled last minute that don't refill."

Two halves, both read-only for members — nothing is sent to anyone from here:

  HELD COURTS   future bookings with fewer than four players named, held by a box league player
                whose team still has fixtures to play. Most bookings never name all four, so a
                bare "not full" list would be half the book and worthless; this narrows it to the
                ones that would be a league game, and sorts by how close they are to starting.

  DROPPED LATE  bookings that were on the books and then cancelled, with how far ahead they were
                booked, how late they were dropped, and whether the same court and hour was taken
                again before it came round. That is the number that says what a late release
                actually costs: a slot dropped at 24 hours that refills costs nothing.

State lives in data/court_watch.json (gitignored — it is only ids, times and courts, but it sits
with the other local ledgers). Each run adds newly cancelled bookings and fills in refills for
the ones already recorded; nothing is ever removed, so the history builds from the first run.

    python scripts/court_watch.py [--days 21] [--quiet]
"""
import json
import os
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
import league_bookings as lb  # noqa: E402

STATE = os.path.join(ROOT, "data", "court_watch.json")
IE = ZoneInfo("Europe/Dublin")
# A league game needs four players; a booking with fewer named may still be full, so these are
# questions, not verdicts. Bands are hours before the booking starts.
BANDS = [(0, 36, "inside 36h"), (36, 72, "36-72h"), (72, 168, "3-7 days"), (168, 10 ** 6, "over a week")]


def _load():
    if os.path.exists(STATE):
        return json.load(open(STATE, encoding="utf-8"))
    return {"seen": {}, "cancelled": {}}


def _save(st):
    os.makedirs(os.path.dirname(STATE), exist_ok=True)
    json.dump(st, open(STATE, "w", encoding="utf-8"), indent=1)


def _key(b):
    st = datetime.fromisoformat(b["booking_start_date"]).replace(tzinfo=timezone.utc)
    return f"{st.astimezone(IE):%Y-%m-%d %H:%M}|{b.get('resource_name') or ''}"


def scan(days=21, back=3, bookings=None):
    """Update the ledger from one read of the feed. Returns (held, dropped, state)."""
    st = _load()
    now = datetime.now(timezone.utc)
    all_b = bookings if bookings is not None else lb.fetch_bookings(days, back=back, include_cancelled=True)
    live, cancelled = [], []
    for b in all_b:
        (cancelled if (b.get("is_canceled") or b.get("status") == "CANCELED") else live).append(b)

    # ── remember every live booking, so a cancellation can say how far ahead it was made ──
    live_keys = set()
    for b in live:
        bid = b.get("booking_id") or b.get("object_id")
        starts = datetime.fromisoformat(b["booking_start_date"]).replace(tzinfo=timezone.utc)
        live_keys.add(_key(b))
        if bid and bid not in st["seen"]:
            st["seen"][bid] = {"first_seen": now.isoformat(timespec="seconds"),
                               "starts_at": starts.isoformat(), "court": b.get("resource_name") or ""}

    # ── record cancellations, and how much notice they gave ──
    for b in cancelled:
        bid = b.get("booking_id") or b.get("object_id")
        if not bid or bid in st["cancelled"]:
            continue
        starts = datetime.fromisoformat(b["booking_start_date"]).replace(tzinfo=timezone.utc)
        seen = st["seen"].get(bid, {})
        first = datetime.fromisoformat(seen["first_seen"]) if seen.get("first_seen") else None
        st["cancelled"][bid] = {
            "starts_at": starts.isoformat(),
            "court": b.get("resource_name") or "",
            "first_seen": seen.get("first_seen"),
            "booked_days_ahead": round((starts - first).total_seconds() / 86400, 1) if first else None,
            "cancelled_seen_at": now.isoformat(timespec="seconds"),
            # Notice only means something when we saw the booking alive first. A cancellation
            # already in the past on its first read is history: we know it was cancelled, not when.
            "notice_hours": (round((starts - now).total_seconds() / 3600, 1)
                             if starts > now else None),
            "backfilled": starts <= now,
            "players_named": len((b.get("participant_info") or {}).get("participants") or []),
            "refilled": None,
        }

    # ── did the freed slot get taken again? ──
    for bid, c in st["cancelled"].items():
        if c.get("refilled") is not None:
            continue
        starts = datetime.fromisoformat(c["starts_at"])
        slot = f"{starts.astimezone(IE):%Y-%m-%d %H:%M}|{c['court']}"
        if slot in live_keys:
            c["refilled"] = now.isoformat(timespec="seconds")
        elif starts < now:
            c["refilled"] = False          # the hour came round with nobody on it

    _save(st)
    return held_courts(live, now), dropped_late(st, now), st


def held_courts(live, now=None):
    """Future bookings a box team is holding without naming the other pair."""
    now = now or datetime.now(timezone.utc)
    return _held(live, now)


def _held(live, now):
    from box_league_mailout import load_env, sb_get
    load_env()
    box_teams = [t for t in sb_get("box_teams?select=id,box,name,p1,p2,active&box=lt.90&limit=500") if t["active"]]
    by_player = {}
    for t in box_teams:
        by_player[lb.norm(t["p1"])] = t
        by_player[lb.norm(t["p2"])] = t
    pend = defaultdict(int)
    for m in sb_get("box_matches?select=team1_id,team2_id&status=eq.pending&box=lt.90&limit=2000"):
        pend[m["team1_id"]] += 1
        pend[m["team2_id"]] += 1
    out = []
    for b in live:
        starts = datetime.fromisoformat(b["booking_start_date"]).replace(tzinfo=timezone.utc)
        if starts < now:
            continue
        names = [p.get("name") for p in ((b.get("participant_info") or {}).get("participants") or [])]
        if len(names) >= 4:
            continue
        hit = {}
        for n in names:
            t = by_player.get(lb.norm(n))
            if t:
                hit[t["id"]] = t
        if len(hit) != 1:
            continue                      # nobody from a box team, or already two teams on it
        t = next(iter(hit.values()))
        if not pend[t["id"]]:
            continue                      # team has no fixtures left to play
        hrs = (starts - now).total_seconds() / 3600
        out.append({"starts_at": starts.isoformat(), "when": f"{starts.astimezone(IE):%a %d %b %H:%M}",
                    "court": b.get("resource_name") or "", "box": t["box"], "team": t["name"],
                    "named": len(names), "hours": round(hrs, 1), "fixtures_left": pend[t["id"]],
                    "band": next(lbl for lo, hi, lbl in BANDS if lo <= hrs < hi)})
    return sorted(out, key=lambda r: r["starts_at"])


def dropped_late(st, now=None):
    """Cancellations recorded so far, newest first, with notice and whether the slot refilled."""
    now = now or datetime.now(timezone.utc)
    rows = []
    for bid, c in st["cancelled"].items():
        starts = datetime.fromisoformat(c["starts_at"])
        rows.append({**c, "id": bid, "when": f"{starts.astimezone(IE):%a %d %b %H:%M}"})
    return sorted(rows, key=lambda r: r["cancelled_seen_at"], reverse=True)


def lines(held, dropped):
    """Report block for the daily email and the console."""
    L = ["COURTS HELD BUT NOT FILLED — a box team holding a court with the other pair not named",
         "  (most bookings never name all four, so these are questions, not verdicts)"]
    if not held:
        L.append("  none right now")
    for band in [b[2] for b in BANDS]:
        rows = [h for h in held if h["band"] == band]
        if not rows:
            continue
        L.append(f"  {band}: {len(rows)}")
        for h in rows:
            L.append(f"    {h['when']}  {h['court']:8} box {h['box']:2}  {h['team']}"
                     f"  ({h['named']} named, {h['fixtures_left']} fixtures left)")
    watched = [d for d in dropped if not d.get("backfilled")]
    late = [d for d in watched if d.get("notice_hours") is not None and d["notice_hours"] <= 36]
    unfilled = [d for d in late if d.get("refilled") is False]
    history = [d for d in dropped if d.get("backfilled")]
    hist_unfilled = [d for d in history if d.get("refilled") is False]
    L += ["", "COURTS DROPPED LATE — cancellations we watched happen"]
    if not watched:
        L.append("  none yet: notice can only be measured for bookings seen alive first, so this")
        L.append("  fills in from here on")
    else:
        L.append(f"  {len(watched)} cancelled · {len(late)} inside 36h of play · {len(unfilled)} of those never refilled")
        for d in late[:10]:
            ahead = f"booked {d['booked_days_ahead']}d ahead" if d.get("booked_days_ahead") is not None else "lead time unknown"
            fill = "never refilled" if d.get("refilled") is False else ("refilled" if d.get("refilled") else "still to come")
            L.append(f"    {d['when']}  {d['court']:8} {ahead}, dropped {d['notice_hours']:.0f}h out — {fill}")
    if history:
        L.append(f"  history before the watch started: {len(history)} cancellations on the feed,"
                 f" {len(hist_unfilled)} of their slots never taken again (no notice figure for these)")
    return L


def main():
    days = int(sys.argv[sys.argv.index("--days") + 1]) if "--days" in sys.argv else 21
    held, dropped, st = scan(days=days)
    print("\n".join(lines(held, dropped)))
    print(f"\nledger: {len(st['seen'])} bookings seen, {len(st['cancelled'])} cancellations recorded -> {STATE}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
