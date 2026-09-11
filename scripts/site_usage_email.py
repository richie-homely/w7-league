# -*- coding: utf-8 -*-
"""Daily usage email for league.w7padel.com (Richie, 7 Sep 2026: "send me an update each
day as the league starts").

Covers the whole league site — hub, summer league pages, knockouts, box league — because
the tracker sits in the root layout. Pulls site_usage_report(p_key, 14) with SITE_ADMIN_KEY
from w7-league/.env.local, plus fixture progress from box_matches, and emails Richie:

  * yesterday: page views, unique visitors, teams that used the site, results entered
  * 14-day bars by day; top pages (summer league vs box league at a glance)
  * cycle progress: fixtures confirmed / submitted / pending
  * teams active yesterday, and the teams that have NEVER identified themselves

    python scripts/site_usage_email.py [--dry-run] [--to a@b.com]
Task Scheduler: "W7 League Usage Daily", 08:05.
"""
import io, json, os, sys, urllib.request
from collections import Counter
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W7 = os.path.join(os.path.dirname(ROOT), "w7-padel")
sys.path.insert(0, os.path.join(W7, "scripts"))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
DUBLIN = ZoneInfo("Europe/Dublin")
TO = ["richiecarroll65@gmail.com"]
SITE = "https://league.w7padel.com"

def load_env(path):
    e = {}
    if os.path.exists(path):
        for ln in io.open(path, encoding="utf-8-sig"):
            ln = ln.strip()
            if ln and "=" in ln and not ln.startswith("#"):
                k, _, v = ln.partition("="); e[k.strip()] = v.strip().strip('"').strip("'")
    return e

def main():
    dry = "--dry-run" in sys.argv
    to = TO
    if "--to" in sys.argv:
        to = [sys.argv[sys.argv.index("--to") + 1]]
    env = load_env(os.path.join(ROOT, ".env.local"))
    for k, v in load_env(os.path.join(W7, ".env")).items():
        os.environ.setdefault(k, v)
    import w7_email_html as wh
    url, anon = env["NEXT_PUBLIC_SUPABASE_URL"], env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
    key = env.get("SITE_ADMIN_KEY", "")
    if not key:
        raise SystemExit("SITE_ADMIN_KEY missing from w7-league/.env.local — add the admin passcode and re-run")
    H = {"apikey": anon, "Authorization": f"Bearer {anon}", "Content-Type": "application/json"}
    def rpc(fn, body):
        r = urllib.request.Request(f"{url}/rest/v1/rpc/{fn}", data=json.dumps(body).encode(), headers=H, method="POST")
        return json.load(urllib.request.urlopen(r, timeout=60))
    def get(q):
        return json.load(urllib.request.urlopen(urllib.request.Request(f"{url}/rest/v1/{q}", headers=H), timeout=60))

    rep = rpc("site_usage_report", {"p_key": key, "p_days": 14})
    if isinstance(rep, dict) and rep.get("status") == "bad_key":
        raise SystemExit("SITE_ADMIN_KEY does not match the passcode in site_admin_keys")
    today = datetime.now(DUBLIN).date()
    yday = today - timedelta(days=1)
    by_day = {d["day"]: d for d in rep["by_day"]}
    y = by_day.get(yday.isoformat(), {"views": 0, "uniques": 0})
    teams = rep["teams"]
    seen = [t for t in teams if t["first_seen"]]
    never = [t for t in teams if not t["first_seen"]]
    active_y = [t for t in seen if t["last_seen"] and t["last_seen"][:10] == yday.isoformat()]
    new_y = [t for t in seen if t["first_seen"][:10] == yday.isoformat()]

    matches = get("box_matches?select=box,status,updated_at&box=lt.90&limit=2000")
    st = Counter(m["status"] for m in matches)
    conf_y = sum(1 for m in matches if m["status"] == "confirmed" and (m.get("updated_at") or "")[:10] == yday.isoformat())

    # ---- text ----
    L = [f"LEAGUE SITE USAGE — {yday:%a %d %b %Y}", "",
         f"YESTERDAY: {y['views']} page views · {y['uniques']} unique visitors · {len(active_y)} teams used the site"
         f" ({len(new_y)} for the first time) · {conf_y} results confirmed",
         "", f"LAST 14 DAYS: {rep['totals']['views']} views · {rep['totals']['unique_visitors']} unique visitors · "
             f"{len(seen)} of {len(teams)} box-league teams have been on · {rep['totals']['results_submitted']} submitted / "
             f"{rep['totals']['results_confirmed']} confirmed", "",
         f"CYCLE 1 FIXTURES: {st.get('confirmed', 0)} confirmed · {st.get('submitted', 0)} awaiting confirmation · "
         f"{st.get('disputed', 0)} disputed · {st.get('pending', 0)} still to play (of {len(matches)})", "",
         "BY DAY (views / unique visitors)"]
    for i in range(13, -1, -1):
        d = (today - timedelta(days=i)).isoformat()
        r = by_day.get(d, {"views": 0, "uniques": 0})
        L.append(f"  {d[5:]}  {'#' * min(60, r['views'] // 2):60} {r['views']:4} / {r['uniques']}")
    L += ["", "TOP PAGES (14 days)"]
    for p in rep["by_path"][:10]:
        L.append(f"  {p['path']:36} {p['views']:5} views  {p['uniques']:4} people")
    if active_y:
        L += ["", f"TEAMS ON THE SITE YESTERDAY ({len(active_y)})"]
        L += [f"  Box {t['box']:2}  {t['name']}" + ("  (first time)" if t in new_y else "") for t in sorted(active_y, key=lambda t: t["box"])]
    L += ["", f"NEVER IDENTIFIED THEMSELVES YET ({len(never)}) — chase with a link or check their email"]
    L += [f"  Box {t['box']:2}  {t['name']}" for t in sorted(never, key=lambda t: t["box"])] or ["  none — every team has been on"]
    # league courts booked (from the Playtomic participant lists) — best effort
    try:
        import league_bookings as lb
        L += [""] + lb.lines(lb.detect(14))
    except Exception as exc:
        L += ["", f"LEAGUE COURTS BOOKED: not available this run ({type(exc).__name__})"]
    # results vs W7 bookings (Richie, 11 Sep 2026): every entered result should sit on a W7
    # court booking with the players named on it — anything else may have been played elsewhere.
    try:
        lbk = {r["match_key"]: r for r in get("league_bookings?select=match_key,starts_at,court,confidence&kind=eq.box&limit=5000")}
        played = get("box_matches?select=id,box,team1_id,team2_id,status,updated_at&box=lt.90&status=neq.pending&limit=2000")
        tn = {t["id"]: t["name"] for t in get("box_teams?select=id,name&limit=500")}
        missing = [m for m in played if m["id"] not in lbk]
        L += ["", f"RESULTS vs W7 BOOKINGS: {len(played) - len(missing)} of {len(played)} results entered sit on a W7 court booking"
              + (f" · {len(missing)} with NO booking found:" if missing else " · none unaccounted for")]
        for m in sorted(missing, key=lambda m: m.get("updated_at") or ""):
            L.append(f"  Box {m['box']:2}  {tn.get(m['team1_id'], '?')}  v  {tn.get(m['team2_id'], '?')}  [{m['status']}]  entered {(m.get('updated_at') or '')[:16].replace('T', ' ')}")
        if missing:
            L.append("  (no booking = played elsewhere, or the W7 booking did not carry the players' names — ask the teams)")
    except Exception as exc:
        L += ["", f"RESULTS vs W7 BOOKINGS: not available this run ({type(exc).__name__})"]
    # league fixtures by week (Richie, 11 Sep 2026): the weekly booked/played view from the admin
    # page, in the email. Same Mon–Sun buckets. booked = league bookings by the week the court is
    # booked; played = box results confirmed that week + summer knockout results by date played.
    try:
        import re as _re
        lbs = get("league_bookings?select=kind,starts_at&limit=5000")
        bm = get("box_matches?select=status,updated_at,box&box=lt.90&limit=2000")
        src = open(os.path.join(ROOT, "src", "lib", "bracket.ts"), encoding="utf-8").read()
        ko = _re.findall(r'playedOn:\s*"(\d{4}-\d{2}-\d{2})"', src)
        def monday(d):
            return d - timedelta(days=d.weekday())
        wk = {}
        def at(d):
            k = monday(d); return wk.setdefault(k, {"bb": 0, "bp": 0, "sb": 0, "sp": 0})
        for r in lbs:
            d = datetime.fromisoformat(r["starts_at"]).astimezone(DUBLIN).date()
            at(d)["bb" if r["kind"] == "box" else "sb"] += 1
        for m in bm:
            if m["status"] == "confirmed" and m.get("updated_at"):
                at(datetime.fromisoformat(m["updated_at"].replace("Z", "+00:00")).astimezone(DUBLIN).date())["bp"] += 1
        for d in ko:
            at(date.fromisoformat(d))["sp"] += 1
        this_mon = monday(today)
        L += ["", "LEAGUE FIXTURES BY WEEK — booked (box · summer) / played (box · summer) · league games · court-hours",
              "  week            box bkd  box pld  sum bkd  sum pld   games  court-h"]
        for k in sorted(wk):
            w = wk[k]; games = w["bb"] + w["sb"]
            tag = "  <- this week" if k == this_mon else ("  (ahead)" if k > this_mon else "")
            L.append(f"  {k:%d %b}–{k + timedelta(days=6):%d %b}   {w['bb']:6}   {w['bp']:6}   {w['sb']:6}   {w['sp']:6}   {games:5}   {games * 1.5:5.0f}h{tag}")
        T = {k2: sum(w[k2] for w in wk.values()) for k2 in ("bb", "bp", "sb", "sp")}
        L.append(f"  {'all weeks':15} {T['bb']:6}   {T['bp']:6}   {T['sb']:6}   {T['sp']:6}   {T['bb'] + T['sb']:5}   {(T['bb'] + T['sb']) * 1.5:5.0f}h")
        L.append("  (summer group games appear as booked only — their results are in the league tables; 'ahead' weeks are bookings already made)")
    except Exception as exc:
        L += ["", f"LEAGUE FIXTURES BY WEEK: not available this run ({type(exc).__name__})"]
    L += ["", f"Portal: {SITE}/admin/usage", "— W7 league site"]
    text = "\n".join(L)

    # ---- html ----
    tiles = wh.tiles([
        {"v": str(y["views"]), "label": "page views", "sub": "yesterday"},
        {"v": str(y["uniques"]), "label": "unique visitors", "sub": "yesterday"},
        {"v": f"{len(active_y)}", "label": "teams used the site", "sub": f"{len(new_y)} first time"},
        {"v": f"{st.get('confirmed', 0)}/{len(matches)}", "label": "fixtures confirmed", "sub": "cycle 1"},
        {"v": f"{len(seen)}/{len(teams)}", "label": "teams ever on", "sub": f"{len(never)} never"},
    ])
    html = wh.shell("League site usage", f"{yday:%A %d %B %Y} · league.w7padel.com", tiles + wh.auto_body(text, first=False))
    subject = f"League site — {y['views']} views, {y['uniques']} visitors, {len(active_y)} teams on ({yday:%a %d %b})"
    if dry:
        print(text); print("\n[dry-run] would send:", subject, "->", to)
    else:
        wh.send(subject, to, text, html)
        print("sent:", subject)

if __name__ == "__main__":
    main()
