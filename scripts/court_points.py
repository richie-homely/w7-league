# -*- coding: utf-8 -*-
"""W7 Court Points: a point for every minute on court, from the Playtomic extract.

Richie, 9 Oct 2026: "build in a rewards system - for every minute on court you get a point -
free balls and court hours for top players".

Every player NAMED on a finished, uncancelled booking earns one point per minute of that
booking. Only named players score: a booking with one name on it scores one person, which is
the nudge - add your partners to the booking and they get their points too. Staff, coaches and
the house accounts in EXCLUDE never appear. Points are kept per calendar month (Dublin time)
and all time, keyed by the Playtomic email where there is one, else by the name.

    python scripts/court_points.py                 # print this month and all time, write data/court_points.csv
    python scripts/court_points.py --push          # also upsert the public rows (league_admin_set_points)
    python scripts/court_points.py --report 2026-09 # email Richie + Mike that month's winners, with emails
    python scripts/court_points.py --auto          # daily: push; on the 1st also report last month

The public rows carry a display name ("Barry M."), never an email. The CSV in data/ keeps
the full name and email so a reward can actually be handed to the right person.
"""
import csv, glob, io, json, os, re, sys, urllib.request
from collections import defaultdict
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from openpyxl import load_workbook

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W7 = os.path.join(os.path.dirname(ROOT), "w7-padel")
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from box_league_mailout import load_env  # noqa: E402

DUB = ZoneInfo("Europe/Dublin")
EXTRACTS = os.path.join(W7, "data", "playtomic", "W7_Playtomic_Extract_*.xlsx")
OUT_CSV = os.path.join(ROOT, "data", "court_points.csv")
POINTS_PER_MINUTE = 1
# Booking types that are court time for the people named on them. TOURNAMENT is W7's own
# socials, americanos and kids' camps; RECURRING_BOOKING is a block (coaching, clubs).
COUNT_TYPES = {"REGULAR_BOOKING", "OPEN_MATCH", "TOURNAMENT", "RECURRING_BOOKING", "PUBLIC_CLASS",
               "PRIVATE_CLASS", "COURSE_CLASS"}
# Staff, coaches and house accounts: on court for work, not for points. Matched on the
# normalised name or the email.
EXCLUDE = {"andresmartinezcuquerella", "andresmartinez", "w7padel", "welcome@w7padel.com",
           "mike@w7padel.com", "richiecarroll65@gmail.com", "richiecarroll", "davidhennebry", "mikeshanahan"}
# The ladder (Richie, 9 Oct 2026: "free balls after x many points - free hour on court after
# x many"): points only ever go up, and every time a player's total crosses a multiple of a
# rung they unlock that reward. Same numbers as src/lib/rewards.ts - keep the two in step.
LADDER = [("balls", 1500, "A tube of balls"), ("hour", 5000, "A free court hour")]
# Playtomic fills unnamed slots with placeholders; they are not people.
PLACEHOLDER = re.compile(r"^(player|participant|guest|jugador)\s*\d*$", re.I)
NL = "\n"

norm = lambda s: re.sub(r"[^a-z]", "", (s or "").lower())


def unlocked(points):
    """{rung: times unlocked} for a points total."""
    return {k: points // every for k, every, _ in LADDER}


def display(name):
    """'Barry MacCourt' -> 'Barry M.'; a single word stays as it is."""
    if "@" in (name or ""):                      # some Playtomic accounts carry the email as the name
        name = re.sub(r"[\d._-]+", " ", name.split("@")[0]).strip() or "Player"
    parts = [p for p in re.split(r"\s+", (name or "").strip()) if p]
    if not parts:
        return "Unknown"
    first = parts[0][:1].upper() + parts[0][1:]
    return first if len(parts) == 1 else f"{first} {parts[-1][:1].upper()}."


def newest_extract():
    fs = sorted(glob.glob(EXTRACTS), key=os.path.getmtime)
    if not fs:
        raise SystemExit("no Playtomic extract found")
    return fs[-1]


def compute(path, now=None):
    """-> players: {key: {name, email, display, months: {YYYY-MM: [minutes, sessions]}, total, sessions, first, last}}"""
    now = now or datetime.now(DUB)
    wb = load_workbook(path, read_only=True)
    ws = wb["Bookings"]
    rows = ws.iter_rows(values_only=True)
    ix = {h: i for i, h in enumerate(next(rows))}
    players = {}
    for r in rows:
        if r[ix["Cancelled"]] or r[ix["Type"]] not in COUNT_TYPES:
            continue
        start = datetime.fromisoformat(r[ix["Start Time"]])
        if start.tzinfo is None:
            start = start.replace(tzinfo=DUB)
        if start > now:
            continue
        mins = int(r[ix["Duration (min)"]] or 0)
        if mins <= 0:
            continue
        names = [n.strip() for n in (r[ix["Player Names"]] or "").split(",") if n.strip()]
        emails = [e.strip().lower() for e in (r[ix["Player Emails"]] or "").split(",")]
        month = start.strftime("%Y-%m")
        for i, name in enumerate(names):
            email = emails[i] if i < len(emails) and "@" in emails[i] else ""
            if norm(name) in EXCLUDE or email in EXCLUDE or PLACEHOLDER.match(name.strip()):
                continue
            key = email or f"name:{norm(name)}"
            p = players.setdefault(key, {"name": name, "email": email, "display": display(name), "months": defaultdict(lambda: [0, 0]),
                                         "total": 0, "sessions": 0, "first": start, "last": start})
            p["months"][month][0] += mins; p["months"][month][1] += 1
            p["total"] += mins; p["sessions"] += 1
            p["first"] = min(p["first"], start); p["last"] = max(p["last"], start)
    return players


def board(players, month=None, n=None):
    """Sorted (player, points, sessions) for a month, or all time when month is None."""
    rows = []
    for p in players.values():
        if month:
            m, s = p["months"].get(month, [0, 0])
        else:
            m, s = p["total"], p["sessions"]
        if m:
            rows.append((p, m * POINTS_PER_MINUTE, s))
    rows.sort(key=lambda x: (-x[1], -x[2], x[0]["name"]))
    return rows[:n] if n else rows


def write_csv(players, path=OUT_CSV):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    months = sorted({m for p in players.values() for m in p["months"]})
    with io.open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["name", "email", "display", "total_points", "sessions", "first", "last"] + months)
        for p in sorted(players.values(), key=lambda p: -p["total"]):
            w.writerow([p["name"], p["email"], p["display"], p["total"], p["sessions"], p["first"].date(), p["last"].date()]
                       + [p["months"].get(m, [0, 0])[0] for m in months])


def push(players):
    """Upsert the public rows: one per player per month plus an 'all' row. Display names only."""
    url, key = os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
    rows = []
    for k, p in players.items():
        pid = re.sub(r"[^a-z0-9]", "", k)[:40] or norm(p["name"])
        for m, (mins, s) in p["months"].items():
            rows.append({"player": pid, "display": p["display"], "month": m, "points": mins * POINTS_PER_MINUTE, "sessions": s})
        rows.append({"player": pid, "display": p["display"], "month": "all", "points": p["total"] * POINTS_PER_MINUTE, "sessions": p["sessions"]})
    body = json.dumps({"p_key": os.environ["SITE_ADMIN_KEY"], "p_rows": rows}).encode()
    req = urllib.request.Request(f"{url}/rest/v1/rpc/league_admin_set_points", data=body, method="POST",
                                 headers={"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    try:
        out = json.loads(urllib.request.urlopen(req, timeout=120).read())
    except urllib.error.HTTPError as e:
        if e.code == 404:
            raise SystemExit("league_admin_set_points is not in the database yet: paste supabase/court_points_09Oct2026.sql first")
        raise
    print("push:", out)
    return out


def text_board(players, month, n=15):
    label = datetime.strptime(month, "%Y-%m").strftime("%B %Y") if month else "all time"
    lines = [f"  {label}:"]
    for i, (p, pts, s) in enumerate(board(players, month, n), 1):
        hrs = pts / POINTS_PER_MINUTE / 60
        lines.append(f"   {i:2}. {p['display']:<16} {pts:6,} pts  {hrs:5.1f} h  {s:3} sessions")
    return NL.join(lines)


def crossings(players, month):
    """Rewards unlocked in a month: [(player, rung key, prize, total after)] where the player's
    running total crossed a multiple of the rung during that month."""
    out = []
    for p in players.values():
        before = sum(v[0] for m, v in p["months"].items() if m < month) * POINTS_PER_MINUTE
        after = before + p["months"].get(month, [0, 0])[0] * POINTS_PER_MINUTE
        for k, every, prize in LADDER:
            for _ in range(after // every - before // every):
                out.append((p, k, prize, after))
    return out


def report(players, month):
    """Rewards unlocked in a month, with emails, for Richie and Mike to hand out."""
    rows = board(players, month)
    lines = [f"W7 COURT POINTS - {datetime.strptime(month, '%Y-%m'):%B %Y} - rewards unlocked", ""]
    got = crossings(players, month)
    for k, every, prize in LADDER:
        mine = [g for g in got if g[1] == k]
        lines.append(f"  {prize} (every {every:,} points): {len(mine)}")
        for p, _, _, after in sorted(mine, key=lambda g: g[0]["name"]):
            lines.append(f"    {p['name']:<28} {p['email'] or '(no email on booking)':<36} now {after:6,} pts")
        lines.append("")
    lines.append("  Top of the board for the month:")
    for i, (p, pts, s) in enumerate(rows[:10], 1):
        lines.append(f"   {i:2}. {p['name']:<28} {pts:6,} pts  {s} sessions")
    lines += ["", f"  {len(rows)} players scored in the month; {sum(r[1] for r in rows):,} points in all.",
              "  Points are one per minute on court for every player named on a booking; staff and coaches excluded."]
    return NL.join(lines)


def main():
    load_env()
    args = sys.argv[1:]
    now = datetime.now(DUB)
    path = newest_extract()
    players = compute(path, now)
    this_month = now.strftime("%Y-%m")
    print(f"COURT POINTS from {os.path.basename(path)} - {len(players)} players")
    print(text_board(players, this_month)); print(text_board(players, None))
    write_csv(players)
    print("csv:", OUT_CSV)
    if "--report" in args or ("--auto" in args and now.day == 1):
        month = args[args.index("--report") + 1] if "--report" in args else (now.replace(day=1) - timedelta(days=1)).strftime("%Y-%m")
        txt = report(players, month)
        print(txt)
        sys.path.insert(0, os.path.join(W7, "scripts"))
        import w7_email_html as wh
        wh.send(f"W7 Court Points - {datetime.strptime(month, '%Y-%m'):%B %Y} winners", ["richiecarroll65@gmail.com", "mike@w7padel.com"], txt)
    if "--push" in args or "--auto" in args:
        push(players)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
