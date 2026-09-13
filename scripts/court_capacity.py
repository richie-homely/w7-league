# -*- coding: utf-8 -*-
"""Court capacity: forward occupancy, and whether the league actually fits.

Richie, 13 Sep 2026: "is there a way we can check forward peak occupancy at the times when
league games are most commonly booked, just to keep an eye on making sure we're not
overcapacity on the courts, and there is actually time for all these league games to be
booked if we're gonna have fifty games a week." Then: "next week should be 50 league games,
let's see how many are scheduled and how many available hours are left for them to get
scheduled" - as a chart of scheduled vs needed vs available, daily, for this week, next week
and the week after.

The site cannot answer this: it only stores the bookings that matched a league fixture. This
reads EVERY Playtomic booking (the same feed league_bookings.py pulls hourly) and splits the
week into the windows a working member can realistically book.

Two traps this is built to avoid:

  * Booking lag. A week five days out looks nearly empty because members book late, not
    because it is free. Nothing here credits the league with time that later bookings will
    take: a future week is always charged the non-league demand a normal week brings.
  * "Free court-hours" as one number. Most of the club's empty time is weekday 09:00-16:00,
    which is no use to someone at work. That block is reported separately and never counted
    towards what the league can use.

    python scripts/court_capacity.py            # print the report
    python scripts/court_capacity.py --weeks 6  # look further ahead
    python scripts/court_capacity.py --html     # also write data/capacity_chart.html

report() and chart_html() both take the same gather() result, so the daily email makes one
Playtomic call for both.
"""
import os
import sys
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))

IE = ZoneInfo("Europe/Dublin")
COURTS = 3
OPEN_H, CLOSE_H = 7, 22                    # the club's booked day, from the Playtomic feed
PEAK = range(17, 22)                       # 17:00-21:59, the hours league games compete for
PEAK_CAP = COURTS * len(PEAK) * 7          # 105 court-hours of peak a week
CYCLE_END = "2026-10-11"                   # cycle 1 deadline (BOX_CYCLES in boxCalendar.ts)

# The windows a member can realistically book. Saturday and Sunday are split because
# lumping them hid that Saturday evening is the emptiest block in the week while Sunday
# daytime is the fullest. (name, weekdays, hours, counts_towards_league)
WINDOWS = [
    ("weekday early    07:00-09:00", range(0, 5), range(7, 9), True),
    ("weekday shoulder 16:00-17:00", range(0, 5), range(16, 17), True),
    ("weekday peak     17:00-22:00", range(0, 5), range(17, 22), True),
    ("Saturday daytime 08:00-18:00", range(5, 6), range(8, 18), True),
    ("Saturday evening 18:00-22:00", range(5, 6), range(18, 22), True),
    ("Sunday daytime   08:00-18:00", range(6, 7), range(8, 18), True),
    ("Sunday evening   18:00-22:00", range(6, 7), range(18, 22), True),
    ("weekday midday   09:00-16:00", range(0, 5), range(9, 16), False),
]
USABLE = [(w, h) for _, w, h, ok in WINDOWS if ok]
USABLE_CAP = sum(COURTS * len(list(h)) * len(list(w)) for w, h in USABLE)

# The daily email is a white card (w7_email_html), not the dark league site, so the chart
# uses that palette: neon yellow is unreadable on white, hence the darkened lime.
C_TEXT, C_MUTE, C_CARD, C_BORDER = "#182430", "#68767f", "#f6f8f9", "#e2e7ea"
C_TRACK = "#dfe5e9"                        # the unfilled part of a bar
C_ACCENT, C_INFO = "#7f9a1e", "#1a4a6e"    # scheduled (lime dark), available (navy)
C_NEED, C_RED, C_GREEN = "#b8b8b8", "#b3402e", "#2e7d32"


def is_peak(dt):
    """Peak is time a working member can actually play: weekday evenings from 17:00, and the
    whole weekend. Richie, 13 Sep 2026: "call all of weekend peak availability - people
    aren't in work." Same rule as isPeak() in src/lib/slots.ts, so the email and the site
    never disagree about what peak means."""
    return dt.weekday() >= 5 or dt.hour >= 17


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


def gather(weeks_ahead=4, weeks_back=4):
    """Everything the report and the chart need, in one Playtomic call."""
    import league_bookings as lb
    from box_league_mailout import load_env, sb_get
    load_env()

    raw = [b for b in lb.fetch_bookings(weeks_ahead * 7 + 7, back=weeks_back * 7 + 7)
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


def _split(bookings, mon, wins, since=None):
    """(league, other, capacity) court-hours in `wins` during the week starting `mon`.
    `since` limits it to that date onwards, for a week already part spent."""
    lg = oth = cap = 0.0
    for i in range(7):
        d = mon + timedelta(days=i)
        if since and d < since:
            continue
        for wds, hrs in wins:
            if d.weekday() not in wds:
                continue
            cap += COURTS * len(list(hrs))
            for st, en, is_lg in bookings:
                x = _hours(st, en, hrs, d)
                if x:
                    if is_lg:
                        lg += x
                    else:
                        oth += x
    return lg, oth, cap


def tracker(bookings, matches, weeks_back=4, weeks=3):
    """Scheduled vs needed vs available, for this week and the weeks after it."""
    today = datetime.now(IE).date()
    this_mon = today - timedelta(days=today.weekday())
    end = datetime.fromisoformat(CYCLE_END).date()

    left = sum(1 for m in matches if m["status"] == "pending")
    lg = [(s, e) for s, e, is_lg in bookings if is_lg]
    avg_h = (sum((e - s).total_seconds() for s, e in lg) / len(lg) / 3600) if lg else 1.5

    # What a normal week's non-league demand takes out of the usable windows. Median of the
    # weeks that have already filled, so one freak week does not set the bar.
    filled = [this_mon + timedelta(weeks=w) for w in range(-weeks_back, 1)]
    others = sorted(_split(bookings, m, USABLE)[1] for m in filled)
    typical_other = others[len(others) // 2] if others else 0.0

    # Whole weeks still ahead carry the target; the current week is mostly spent.
    whole = [this_mon + timedelta(weeks=w) for w in range(1, 12)]
    whole = [m for m in whole if m <= end]
    per_week = left / len(whole) if whole else float(left)

    out = []
    for i in range(weeks):
        mon = this_mon + timedelta(weeks=i)
        current = i == 0
        lg_h, oth_h, cap = _split(bookings, mon, USABLE, since=today if current else None)
        # A part-spent week is only charged the share of typical demand matching the days left.
        expect_other = max(oth_h, typical_other * (cap / USABLE_CAP if USABLE_CAP else 1))
        room = max((cap - lg_h - expect_other) / avg_h, 0)
        need = 0.0 if current else per_week
        out.append({
            "mon": mon,
            "label": f"{mon:%d %b}-{mon + timedelta(days=6):%d %b}",
            "current": current,
            "need": need,
            "booked": lg_h / avg_h,
            "room": room,
            "short": max(need - lg_h / avg_h - room, 0),
        })
    return {"weeks": out, "per_week": per_week, "avg_h": avg_h, "left": left,
            "typical_other": typical_other, "today": today, "this_mon": this_mon,
            "filled": filled}


def report(weeks_ahead=4, weeks_back=4, data=None):
    """Text lines for the daily usage email, or for the console."""
    bookings, matches = data or gather(weeks_ahead, weeks_back)
    t = tracker(bookings, matches, weeks_back)
    today, this_mon = t["today"], t["this_mon"]

    L = [f"COURT CAPACITY - peak evenings 17:00-22:00, {PEAK_CAP} court-hours a week "
         f"({COURTS} courts x {len(PEAK)}h x 7 nights)",
         "  week              league   other    free   free%   note"]
    for w in range(-weeks_back, weeks_ahead):
        mon = this_mon + timedelta(weeks=w)
        lg_h, oth_h, _ = _split(bookings, mon, [(range(0, 7), PEAK)])
        free = PEAK_CAP - lg_h - oth_h
        note = "" if w < 0 else "<- this week" if w == 0 else "still filling"
        L.append(f"  {mon:%d %b}-{mon + timedelta(days=6):%d %b}   {lg_h:6.1f}  {oth_h:6.1f}  "
                 f"{free:6.1f}   {free / PEAK_CAP * 100:4.0f}%   {note}")

    L += ["", f"  USABLE WINDOWS - court-hours a week, averaged over the {len(t['filled'])} weeks that have filled",
          f"    {'window':29}{'cap':>5}{'league':>8}{'other':>7}{'free':>7}  used"]
    ranked, usable_free, midday_free = [], 0.0, 0.0
    for name, wds, hrs, usable in WINDOWS:
        tot_l = tot_o = tot_c = 0.0
        for mon in t["filled"]:
            a, b, c = _split(bookings, mon, [(wds, hrs)])
            tot_l += a
            tot_o += b
            tot_c += c
        n = len(t["filled"])
        l_h, o_h, cap = tot_l / n, tot_o / n, tot_c / n
        free = cap - l_h - o_h
        if usable:
            usable_free += free
            ranked.append((free, name))
        else:
            midday_free += free
        L.append(f"    {name:29}{cap:5.0f}{l_h:8.1f}{o_h:7.1f}{free:7.1f}  {(l_h + o_h) / cap * 100:3.0f}%"
                 + ("" if usable else "   <- work hours for most members"))

    L += ["", f"  LEAGUE SCHEDULING BY WEEK - {t['left']} fixtures to clear by {CYCLE_END}, "
              f"{t['per_week']:.0f} a week",
          f"    {'week':17}{'need':>5}{'booked':>8}{'gap':>6}{'room left':>11}   verdict"]
    for w in t["weeks"]:
        verdict = ("this week, mostly spent" if w["current"] else
                   "fits" if w["short"] <= 0 else f"{w['short']:.0f} short")
        need = "-" if w["current"] else f"{w['need']:.0f}"
        gap = "-" if w["current"] else f"{w['need'] - w['booked']:.0f}"
        L.append(f"    {w['label']:17}{need:>5}{w['booked']:8.0f}{gap:>6}{w['room']:11.0f}   {verdict}")
    L.append(f"    room left = the {USABLE_CAP:.0f} usable court-hours a week, less league games already "
             f"booked, less the {t['typical_other']:.0f}h a normal week's non-league demand takes")

    ranked.sort(reverse=True)
    L += ["", "  WHERE TO POINT TEAMS - the usable windows with the most time genuinely free"]
    for i, (free, name) in enumerate(ranked[:3], 1):
        L.append(f"    {i}. {name.strip():28} {free:4.1f} free court-h a week = about {free / t['avg_h']:.0f} games")
    L.append("    A week still 5-6 days out looks far emptier on Playtomic than it will be - members"
             " book late. Every figure above uses only weeks that have already filled.")

    can_hold = usable_free / t["avg_h"]
    score = can_hold / t["per_week"] if t["per_week"] else 99
    verdict = ("comfortable" if score >= 1.5 else "workable but tight" if score >= 1.0 else
               f"short by about {t['per_week'] - can_hold:.0f} games a week")
    days_left = (datetime.fromisoformat(CYCLE_END).date() - today).days
    L += ["",
          f"  ROOM FOR LEAGUE GAMES - {t['left']} box fixtures unplayed, {days_left} days to the {CYCLE_END} deadline",
          f"    needed      {t['per_week']:.0f} games a week, at the measured {t['avg_h'] * 60:.0f} min a game",
          f"    available   {can_hold:.0f} games a week in the usable windows ({usable_free:.0f} free court-hours)",
          f"    score       {score:.2f} - {verdict}",
          f"    spare       another {midday_free / t['avg_h']:.0f} games a week sit in weekday 09:00-16:00, "
          f"open only to members who are off, retired or working from home"]
    return L


def chart_html(weeks_ahead=4, weeks_back=4, data=None):
    """Scheduled vs needed vs available, as email-safe HTML bars."""
    bookings, matches = data or gather(weeks_ahead, weeks_back)
    t = tracker(bookings, matches, weeks_back)
    scale = max([w["need"] for w in t["weeks"]]
                + [w["booked"] + w["room"] for w in t["weeks"]] + [1])

    def bar(value, colour, label):
        pct = max(min(value / scale * 100, 100), 0)
        rest = 100 - pct
        return (
            '<tr>'
            f'<td style="padding:2px 8px 2px 0;font:11px -apple-system,Segoe UI,sans-serif;'
            f'color:{C_MUTE};white-space:nowrap;width:76px">{label}</td>'
            '<td style="padding:2px 0"><table role="presentation" cellpadding="0" cellspacing="0" '
            'style="width:100%;border-collapse:collapse"><tr>'
            f'<td style="width:{pct:.1f}%;background:{colour};height:13px;line-height:13px;font-size:0">&nbsp;</td>'
            f'<td style="width:{rest:.1f}%;background:{C_TRACK};height:13px;line-height:13px;font-size:0">&nbsp;</td>'
            '</tr></table></td>'
            f'<td style="padding:2px 0 2px 8px;font:600 12px ui-monospace,Menlo,monospace;'
            f'color:{C_TEXT};width:32px;text-align:right">{value:.0f}</td>'
            '</tr>')

    blocks = []
    for w in t["weeks"]:
        head = w["label"] + (" · this week" if w["current"] else "")
        if w["current"]:
            tail = f'<span style="color:{C_MUTE}">rest of the week</span>'
        elif w["short"] <= 0:
            tail = f'<span style="color:{C_GREEN}">fits - room for all {w["need"]:.0f}</span>'
        else:
            tail = f'<span style="color:{C_RED}">{w["short"]:.0f} short of {w["need"]:.0f}</span>'
        rows = "" if w["current"] else bar(w["need"], C_NEED, "needed")
        rows += bar(w["booked"], C_ACCENT, "scheduled")
        rows += bar(w["room"], C_INFO, "available")
        blocks.append(
            '<div style="margin:0 0 14px">'
            f'<div style="font:700 12px -apple-system,Segoe UI,sans-serif;color:{C_TEXT};'
            f'margin:0 0 5px">{head} &nbsp;<span style="font-weight:400">{tail}</span></div>'
            '<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;'
            f'border-collapse:collapse">{rows}</table></div>')

    return (
        f'<div style="background:{C_CARD};border:1px solid {C_BORDER};border-radius:8px;padding:14px 16px">'
        f'<div style="font:700 13px -apple-system,Segoe UI,sans-serif;color:{C_ACCENT};'
        'letter-spacing:.04em;margin:0 0 4px">LEAGUE GAMES - SCHEDULED vs NEEDED vs AVAILABLE</div>'
        f'<div style="font:11px -apple-system,Segoe UI,sans-serif;color:{C_MUTE};margin:0 0 12px">'
        f'{t["left"]} box fixtures to clear by {CYCLE_END}, {t["per_week"]:.0f} a week. '
        '"Available" is room outside weekday working hours, after the non-league bookings a '
        'normal week brings - not the empty space a future week shows today.</div>'
        f'{"".join(blocks)}</div>')


def occupancy_chart_html(weeks_ahead=4, weeks_back=4, data=None, back_days=7, fwd_days=14):
    """Overall occupancy day by day, last week and forward (Richie, 13 Sep 2026: "a proper
    chart of overall bookings and occupancy for last week and forward by day, showing peak %,
    off peak %, total %, and how that's filling up").

    Forward days are always lighter than they will end up - members book a few days out - so
    every future day is marked, and the fill you see there is a floor, not a forecast."""
    bookings, _ = data or gather(weeks_ahead, weeks_back)
    today = datetime.now(IE).date()
    peak_h = [h for h in range(OPEN_H, CLOSE_H) if h >= 17]
    off_h = [h for h in range(OPEN_H, CLOSE_H) if h < 17]

    rows = []
    for i in range(-back_days, fwd_days + 1):
        d = today + timedelta(days=i)
        weekend = d.weekday() >= 5
        # On a weekend every open hour is peak, so there is no off-peak capacity at all.
        pk_hours = list(range(OPEN_H, CLOSE_H)) if weekend else peak_h
        of_hours = [] if weekend else off_h
        used_pk = used_of = 0.0
        for st, en, _ in bookings:
            used_pk += _hours(st, en, pk_hours, d)
            used_of += _hours(st, en, of_hours, d)
        cap_pk = COURTS * len(pk_hours)
        cap_of = COURTS * len(of_hours)
        rows.append({
            "date": d,
            "future": d > today,
            "today": d == today,
            "peak": used_pk / cap_pk * 100 if cap_pk else None,
            "off": used_of / cap_of * 100 if cap_of else None,
            "total": (used_pk + used_of) / (cap_pk + cap_of) * 100,
        })

    def bar(pct, colour, width_px=118):
        w = max(min(pct or 0, 100), 0)
        return (
            f'<table role="presentation" cellpadding="0" cellspacing="0" style="width:{width_px}px;'
            f'border-collapse:collapse;display:inline-table;vertical-align:middle"><tr>'
            f'<td style="width:{w:.1f}%;background:{colour};height:10px;line-height:10px;font-size:0">&nbsp;</td>'
            f'<td style="width:{100 - w:.1f}%;background:{C_TRACK};height:10px;line-height:10px;font-size:0">&nbsp;</td>'
            f'</tr></table>')

    body = []
    for r in rows:
        pct = lambda v: "&mdash;" if v is None else f"{v:.0f}%"   # noqa: E731
        label = f'{r["date"]:%a %d %b}'
        weight = 700 if r["today"] else 400
        colour = C_MUTE if r["future"] else C_TEXT
        body.append(
            f'<tr style="opacity:{"0.75" if r["future"] else "1"}">'
            f'<td style="padding:2px 8px 2px 0;font:{weight} 11px -apple-system,Segoe UI,sans-serif;'
            f'color:{colour};white-space:nowrap">{label}{" ·" if r["today"] else ""}</td>'
            f'<td style="padding:2px 6px 2px 0">{bar(r["peak"], C_ACCENT)}</td>'
            f'<td style="padding:2px 10px 2px 0;font:600 11px ui-monospace,Menlo,monospace;color:{C_TEXT};'
            f'text-align:right;width:34px">{pct(r["peak"])}</td>'
            f'<td style="padding:2px 6px 2px 0">{bar(r["off"], C_INFO)}</td>'
            f'<td style="padding:2px 10px 2px 0;font:600 11px ui-monospace,Menlo,monospace;color:{C_MUTE};'
            f'text-align:right;width:34px">{pct(r["off"])}</td>'
            f'<td style="padding:2px 0;font:700 11px ui-monospace,Menlo,monospace;color:{C_TEXT};'
            f'text-align:right;width:34px">{pct(r["total"])}</td>'
            f'</tr>')

    done = [r for r in rows if not r["future"]]
    avg_pk = sum(r["peak"] for r in done if r["peak"] is not None) / max(len([r for r in done if r["peak"] is not None]), 1)
    avg_of = sum(r["off"] for r in done if r["off"] is not None) / max(len([r for r in done if r["off"] is not None]), 1)

    return (
        f'<div style="background:{C_CARD};border:1px solid {C_BORDER};border-radius:8px;padding:14px 16px">'
        f'<div style="font:700 13px -apple-system,Segoe UI,sans-serif;color:{C_ACCENT};'
        'letter-spacing:.04em;margin:0 0 4px">COURT OCCUPANCY BY DAY</div>'
        f'<div style="font:11px -apple-system,Segoe UI,sans-serif;color:{C_MUTE};margin:0 0 10px">'
        f'Last {back_days} days and the next {fwd_days}. Peak is weekday evenings from 17:00 and all '
        f'weekend; off-peak is weekday daytime, so a weekend has no off-peak hours. Days gone by ran '
        f'{avg_pk:.0f}% at peak and {avg_of:.0f}% off-peak. Future days are still filling - what you '
        'see there is a floor, not a forecast.</div>'
        '<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse">'
        f'<tr><td></td>'
        f'<td colspan="2" style="font:700 9.5px -apple-system,Segoe UI,sans-serif;color:{C_ACCENT};'
        'letter-spacing:.08em;padding:0 6px 5px 0">PEAK</td>'
        f'<td colspan="2" style="font:700 9.5px -apple-system,Segoe UI,sans-serif;color:{C_INFO};'
        'letter-spacing:.08em;padding:0 6px 5px 0">OFF-PEAK</td>'
        f'<td style="font:700 9.5px -apple-system,Segoe UI,sans-serif;color:{C_MUTE};'
        'letter-spacing:.08em;padding:0 0 5px;text-align:right">ALL</td></tr>'
        f'{"".join(body)}</table></div>')


if __name__ == "__main__":
    ahead = int(sys.argv[sys.argv.index("--weeks") + 1]) if "--weeks" in sys.argv else 4
    d = gather(ahead, 4)
    print("\n".join(report(weeks_ahead=ahead, data=d)))
    if "--html" in sys.argv:
        out = os.path.join(ROOT, "data", "capacity_chart.html")
        open(out, "w", encoding="utf-8").write(
            f'<body style="background:#0a0a0a;padding:20px">{chart_html(data=d)}</body>')
        print("\n->", out)
