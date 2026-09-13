# -*- coding: utf-8 -*-
"""Court capacity: forward occupancy, and whether the league actually fits.

Richie, 13 Sep 2026: "is there a way we can check forward peak occupancy at the times when
league games are most commonly booked, just to keep an eye on making sure we're not
overcapacity on the courts, and there is actually time for all these league games to be
booked if we're gonna have fifty games a week."

The site cannot answer this - it only stores the bookings that matched a league fixture.
This reads EVERY Playtomic booking (the same feed league_bookings.py already pulls hourly),
splits each week's peak evenings into league / other / free, and scores the free peak time
against what the unplayed box fixtures still need before the cycle deadline.

Forward weeks are always emptier than they will be: members book a few days out, not a
month. So the score does NOT trust the free time showing in a future week. It takes the
usual non-league peak demand from the weeks that have already filled, and asks what is
left after that much demand lands again.

    python scripts/court_capacity.py            # print the report
    python scripts/court_capacity.py --weeks 6  # look further ahead

report() returns the same lines for scripts/site_usage_email.py.
"""
import os
import sys
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))

IE = ZoneInfo("Europe/Dublin")
COURTS = 3
OPEN_H, CLOSE_H = 7, 22           # the club's booked day, from the Playtomic feed
PEAK = range(17, 22)              # 17:00-21:59, the five hours league games compete for
DAY = range(10, 16)               # 10:00-15:59, the quiet middle of the day
PEAK_CAP = COURTS * len(PEAK) * 7          # 105 court-hours of peak a week
DAY_CAP = COURTS * len(DAY) * 7            # 126 court-hours of daytime a week
CYCLE_END = "2026-10-11"          # cycle 1 deadline (BOX_CYCLES in src/lib/boxCalendar.ts)


def _loc(ts):
    return datetime.fromisoformat(ts).replace(tzinfo=timezone.utc).astimezone(IE)


def _hours(start, end, hours, day):
    """Court-hours a booking puts inside `hours` on `day`, in 30-minute steps."""
    if start.date() != day:
        return 0.0
    tot, cur = 0.0, start
    while cur < end:
        nxt = min(end, cur + timedelta(minutes=30))
        if cur.hour in hours:
            tot += (nxt - cur).total_seconds() / 3600
        cur = nxt
    return tot


def gather(weeks_ahead=4, weeks_back=3):
    """Everything the report needs, so the caller makes one Playtomic call."""
    import league_bookings as lb
    from box_league_mailout import load_env, sb_get
    load_env()

    raw = [b for b in lb.fetch_bookings(weeks_ahead * 7, back=weeks_back * 7 + 7)
           if not b.get("is_canceled")]
    league_keys = {(datetime.fromisoformat(r["starts_at"]).astimezone(IE).strftime("%Y-%m-%dT%H:%M"),
                    r["court"])
                   for r in sb_get("league_bookings?select=starts_at,court&limit=5000")}
    bookings = []
    for b in raw:
        s, e = _loc(b["booking_start_date"]), _loc(b["booking_end_date"])
        bookings.append((s, e, (s.strftime("%Y-%m-%dT%H:%M"), b.get("resource_name")) in league_keys))
    matches = sb_get("box_matches?select=status&box=lt.90&limit=2000")
    return bookings, matches


def report(weeks_ahead=4, weeks_back=3, data=None):
    """Text lines for the daily usage email, or for the console."""
    bookings, matches = data or gather(weeks_ahead, weeks_back)
    today = datetime.now(IE).date()
    this_mon = today - timedelta(days=today.weekday())

    def week_split(mon, hours):
        league = other = 0.0
        for i in range(7):
            d = mon + timedelta(days=i)
            for s, e, is_lg in bookings:
                h = _hours(s, e, hours, d)
                if h:
                    if is_lg:
                        league += h
                    else:
                        other += h
        return league, other

    L = [f"COURT CAPACITY - peak evenings 17:00-22:00, {PEAK_CAP} court-hours a week "
         f"({COURTS} courts x {len(PEAK)}h x 7 nights)",
         "  week              league   other    free   free%   note"]
    settled = []                       # non-league peak demand in weeks that have filled
    for w in range(-weeks_back, weeks_ahead):
        mon = this_mon + timedelta(weeks=w)
        league, other = week_split(mon, PEAK)
        free = PEAK_CAP - league - other
        if w < 0:
            note = ""
            settled.append(other)
        elif w == 0:
            note = "<- this week"
            settled.append(other)
        else:
            note = "still filling"
        L.append(f"  {mon:%d %b}-{mon + timedelta(days=6):%d %b}   {league:6.1f}  {other:6.1f}  {free:6.1f}   {free / PEAK_CAP * 100:4.0f}%   {note}")

    # What the box league still has to fit in.
    left = sum(1 for m in matches if m["status"] == "pending")
    days_left = (datetime.fromisoformat(CYCLE_END).date() - today).days
    weeks_left = max(days_left / 7, 0.15)
    per_week = left / weeks_left

    # Slot length and the share of league games that want a peak slot, measured not assumed.
    lg = [(s, e) for s, e, is_lg in bookings if is_lg]
    avg_h = (sum((e - s).total_seconds() for s, e in lg) / len(lg) / 3600) if lg else 1.5
    peak_share = (sum(1 for s, _ in lg if s.hour in PEAK) / len(lg)) if lg else 0.66

    need_h = per_week * avg_h
    need_peak = need_h * peak_share
    usual_other = sorted(settled)[len(settled) // 2] if settled else 0.0   # median of the filled weeks
    likely_free = PEAK_CAP - usual_other
    score = likely_free / need_peak if need_peak else 99

    day_league, day_other = week_split(this_mon, DAY)
    day_free = DAY_CAP - day_league - day_other

    verdict = ("comfortable" if score >= 1.5 else "workable but tight" if score >= 1.0 else
               "short - peak alone will not hold it")
    L += ["",
          f"  ROOM FOR LEAGUE GAMES - {left} box fixtures unplayed, {days_left} days to the {CYCLE_END} deadline",
          f"    needed      {per_week:.0f} games a week = {need_h:.0f} court-h, about {need_peak:.0f}h of it at peak "
          f"(league games run {avg_h * 60:.0f} min and {peak_share * 100:.0f}% start after 17:00)",
          f"    likely free {likely_free:.0f}h at peak, once the usual {usual_other:.0f}h of non-league demand lands",
          f"    score       {score:.2f} - {verdict}",
          f"    daytime     10:00-16:00 this week is {(day_league + day_other) / DAY_CAP * 100:.0f}% used - "
          f"{day_free:.0f} of {DAY_CAP} court-hours free, where any overflow has to go"]
    return L


if __name__ == "__main__":
    ahead = int(sys.argv[sys.argv.index("--weeks") + 1]) if "--weeks" in sys.argv else 4
    print("\n".join(report(weeks_ahead=ahead)))
