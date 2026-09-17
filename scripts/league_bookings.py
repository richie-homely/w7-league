# -*- coding: utf-8 -*-
"""Which league matches are booked on the courts (Richie, 8 Sep 2026: "can you see from
the bookings when different boxes are booking in their games, and when the remaining
summer league matches are in?").

Playtomic bookings carry the participants' names. A booking whose four participants are
both players of two teams from the SAME box is a box fixture; four players spanning two
teams in the same summer-league tier is a knockout tie. Only-the-booker bookings (46 of
141 last week) cannot be attributed and are left alone — no guessing.

    python scripts/league_bookings.py            # print + write data/league_bookings.json
    python scripts/league_bookings.py --days 14 --push   # also write league_bookings in Supabase for the site
"""
import io, json, os, re, sys, urllib.request
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W7 = os.path.join(os.path.dirname(ROOT), "w7-padel")
sys.path.insert(0, os.path.join(W7, "scripts"))
OUT = os.path.join(ROOT, "data", "league_bookings.json")

def load_env(path):
    e = {}
    if not os.path.exists(path):
        return e
    for ln in io.open(path, encoding="utf-8-sig"):
        ln = ln.strip()
        if ln and "=" in ln and not ln.startswith("#"):
            k, _, v = ln.partition("="); e[k.strip()] = v.strip().strip('"').strip("'")
    return e

norm = lambda n: re.sub(r"[^a-z]", "", (n or "").lower())

# Cycle 1 of the box league opened Thu 10 Sep 2026 (BOX_CYCLES in src/lib/boxCalendar.ts).
# A booking before that cannot be a box fixture however well the four names line up -
# the league did not exist yet, so those are socials by people who later entered.
BOX_OPEN = "2026-09-10"


def outsiders(names, teams, by_player_box, by_player_summer):
    """Named players who play in a W7 league but belong to neither of the two teams
    this booking was matched to. Any of them means the booking is not that fixture.

    Richie, 12 Sep 2026: Monday 17:30 showed on the site as a BOX 1 fixture
    (O'Sullivan & Hennebry v Donohoe & Orr) but the booking was Ashley Wynne, David
    Hennebry, Shane Donohoe and Davy O'Sullivan - Dylan Orr was not on it. Three of a
    box's players plus somebody else's team-mate is a social four, not that fixture.

    Two kinds of name are deliberately NOT outsiders:
      - one unknown to both leagues - a guest or a sub from outside the league, so the
        booking stays "probable" rather than disappearing;
      - a player whose own box or summer team-mate is in this fixture. That covers the
        same person spelled two ways (the summer table has "Anton Burlihin"; Playtomic
        and the box table have "Anton Burihhin") and a regular partner standing in.
    """
    roster = {norm(p) for t in teams for p in (t["p1"], t["p2"])}
    out = []
    for n in names:
        k = norm(n)
        if k in roster:
            continue
        mates = set()
        for idx in (by_player_box, by_player_summer):
            t = idx.get(k)
            if t:
                mates |= {norm(t["p1"]), norm(t["p2"])}
        if mates and not (mates & roster):
            out.append(n)
    return out

API_BASE = "https://thirdparty.playtomic.io"

def playtomic_env():
    """Playtomic creds from the environment (GitHub Actions secrets) or, on a W7 machine, ../w7-padel/.env."""
    envf = os.path.join(W7, ".env")
    if os.path.exists(envf):
        for k, v in load_env(envf).items():
            if k.startswith("PLAYTOMIC_"):          # only the Playtomic creds — never the site key
                os.environ.setdefault(k, v)
    cid, sec, ven = (os.environ.get(k, "") for k in ("PLAYTOMIC_CLIENT_ID", "PLAYTOMIC_SECRET", "PLAYTOMIC_VENUE_ID"))
    if not (cid and sec and ven):
        raise SystemExit("PLAYTOMIC_CLIENT_ID / PLAYTOMIC_SECRET / PLAYTOMIC_VENUE_ID not set")
    return cid, sec, ven

def fetch_bookings(days, back=60):
    """Bookings from `back` days ago to `days` ahead. The past window is what lets the admin
    page show WHEN league games actually get played (Richie, 10 Sep 2026)."""
    import requests
    cid, sec, ven = playtomic_env()
    r = requests.post(f"{API_BASE}/api/v1/oauth/token", json={"client_id": cid, "secret": sec},
                      headers={"content-type": "application/json"}, timeout=30)
    r.raise_for_status()
    hdr = {"content-type": "application/json", "Authorization": f"Bearer {r.json()['token']}"}
    d0, d1 = date.today() - timedelta(days=back), date.today() + timedelta(days=days)
    out, page = [], 0
    while True:
        r = requests.get(f"{API_BASE}/api/v1/bookings", headers=hdr, timeout=60,
                         params={"tenant_id": ven, "start_booking_date": d0.strftime("%Y-%m-%dT00:00:00"),
                                 "end_booking_date": d1.strftime("%Y-%m-%dT23:59:59"), "page": page, "size": 200})
        r.raise_for_status()
        batch = r.json(); out += batch
        if len(batch) < 200: break
        page += 1
    return [b for b in out if b.get("status") != "CANCELED" and not b.get("is_canceled")]

def site_env():
    e = load_env(os.path.join(ROOT, ".env.local")) if os.path.exists(os.path.join(ROOT, ".env.local")) else {}
    for k in ("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SITE_ADMIN_KEY"):
        if os.environ.get(k): e[k] = os.environ[k]
    return e

def not_fixtures():
    """{(Dublin "YYYY-MM-DD HH:MM", court)} a team has told us was NOT their league game.

    Four team-mates playing a social look exactly like their own fixture, so nothing can tell
    them apart automatically. scripts/not_fixtures.csv is the manual override (Richie, 17 Sep
    2026, after Kris Rybak: "that wasn't league match"). Listed bookings are skipped entirely:
    no fixture match, no "played, no result" flag, no chaser, not counted as booked.
    """
    import csv
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "not_fixtures.csv")
    out = set()
    if not os.path.exists(path):
        return out
    for row in csv.reader(io.open(path, encoding="utf-8-sig")):
        if row and not row[0].lstrip().startswith("#") and len(row) >= 2:
            out.add((row[0].strip(), row[1].strip()))
    return out


def detect(days=14):
    env = site_env()
    H = {"apikey": env["NEXT_PUBLIC_SUPABASE_ANON_KEY"], "Authorization": f"Bearer {env['NEXT_PUBLIC_SUPABASE_ANON_KEY']}"}
    get = lambda q: json.load(urllib.request.urlopen(urllib.request.Request(f"{env['NEXT_PUBLIC_SUPABASE_URL']}/rest/v1/{q}", headers=H), timeout=60))
    box_teams = [t for t in get("box_teams?select=id,box,name,p1,p2,active&box=lt.90&limit=500") if t["active"]]
    matches = get("box_matches?select=id,box,team1_id,team2_id,status&box=lt.90&limit=2000")
    summer = get("teams?select=id,division_id,p1,p2&limit=300")
    by_player_box, by_player_summer = {}, {}
    for t in box_teams:
        by_player_box[norm(t["p1"])] = t; by_player_box[norm(t["p2"])] = t
    for t in summer:
        by_player_summer[norm(t["p1"])] = t; by_player_summer[norm(t["p2"])] = t
    fixture_by_pair = {tuple(sorted((m["team1_id"], m["team2_id"]))): m for m in matches}

    box_hits, summer_hits = [], []
    excluded = not_fixtures()
    if excluded:
        print(f"not_fixtures.csv: {len(excluded)} booking(s) excluded by hand")
    all_bookings = fetch_bookings(days)
    for b in all_bookings:
        names = [p.get("name") for p in ((b.get("participant_info") or {}).get("participants") or [])]
        if not (2 <= len(names) <= 4):
            continue
        from datetime import timezone
        from zoneinfo import ZoneInfo
        when = datetime.fromisoformat(b["booking_start_date"]).replace(tzinfo=timezone.utc).astimezone(ZoneInfo("Europe/Dublin")).strftime("%Y-%m-%d %H:%M")
        court = b.get("resource_name") or ""
        if (when, court) in excluded:
            continue
        # box fixture: two full teams, same box
        cnt = {}
        for n in names:
            t = by_player_box.get(norm(n))
            if t: cnt.setdefault(t["id"], [t, 0]); cnt[t["id"]][1] += 1
        two = [v[0] for v in cnt.values()]
        if (len(two) == 2 and two[0]["box"] == two[1]["box"] and max(v[1] for v in cnt.values()) == 2
                and when >= BOX_OPEN
                and not outsiders(names, two, by_player_box, by_player_summer)):
            certain = all(v[1] == 2 for v in cnt.values())
            m = fixture_by_pair.get(tuple(sorted((two[0]["id"], two[1]["id"]))))
            box_hits.append({"when": when, "starts_at": b["booking_start_date"], "court": court, "box": two[0]["box"],
                             "team1": two[0]["name"], "team2": two[1]["name"], "team_ids": sorted((two[0]["id"], two[1]["id"])),
                             "match_id": m["id"] if m else None, "status": m["status"] if m else "no fixture",
                             "confidence": "certain" if certain else "probable"})
            continue
        # summer-league tie: four players spanning exactly two teams in the same tier
        st = {}
        for n in names:
            t = by_player_summer.get(norm(n))
            if t: st.setdefault(t["id"], [t, 0]); st[t["id"]][1] += 1
        two = [v[0] for v in st.values()]
        if (len(two) == 1 and next(iter(st.values()))[1] == 2
                and not outsiders(names, two, by_player_box, by_player_summer)):
            # one full summer team on the booking, opponents not named: the site matches it to
            # that team's unplayed bracket tie, if it has exactly one
            t = two[0]
            summer_hits.append({"when": when, "starts_at": b["booking_start_date"], "court": court, "tier": t["division_id"].split("-")[-1],
                                "team_ids": [t["id"]], "team1": f"{t['p1']} & {t['p2']}", "team2": "", "confidence": "probable"})
            continue
        if (len(two) == 2 and sum(v[1] for v in st.values()) >= 3
                and len({t["division_id"].split("-")[-1] for t in two}) == 1
                and not outsiders(names, two, by_player_box, by_player_summer)):
            summer_hits.append({"when": when, "starts_at": b["booking_start_date"], "court": court, "tier": two[0]["division_id"].split("-")[-1],
                                "team_ids": sorted((two[0]["id"], two[1]["id"])),
                                "team1": f"{two[0]['p1']} & {two[0]['p2']}", "team2": f"{two[1]['p1']} & {two[1]['p2']}",
                                "confidence": "certain" if sum(v[1] for v in st.values()) == 4 else "probable"})
    # Court slots (Richie, 13 Sep 2026): how many of the three courts are free in each hour
    # for the next three weeks, so the site can show players what is actually bookable. Built
    # from the same pull as the fixture matching, so it costs no extra Playtomic call.
    from datetime import timezone as _tz
    # Half-hour steps, not hourly: courts go out at :00 and :30, so an hourly grid would
    # call 17:00 fully booked when the only game starts at 17:30 and 17:00-17:30 is free.
    # Seven days back as well as forward: the occupancy chart on the usage page needs the
    # week just gone to show what a filled week actually looks like beside the forward days,
    # which are always lighter because members book late (Richie, 13 Sep 2026).
    SLOT_BACK_DAYS, SLOT_DAYS, OPEN_H, CLOSE_H, STEP = 7, 21, 7, 22, 30
    busy = {}
    for b in all_bookings:
        if b.get("is_canceled"):
            continue
        st = datetime.fromisoformat(b["booking_start_date"]).replace(tzinfo=_tz.utc)
        en = datetime.fromisoformat(b["booking_end_date"]).replace(tzinfo=_tz.utc)
        cur = st.replace(minute=(st.minute // STEP) * STEP, second=0, microsecond=0)
        while cur < en:
            busy.setdefault(cur, set()).add(b.get("resource_name") or "?")
            cur += timedelta(minutes=STEP)
    COURTS = ["Padel 1", "Padel 2", "Padel 3"]
    MIN_GAME = 2   # half-hours: a game needs at least an hour on ONE court (Richie, 13 Sep 2026)
    dublin = ZoneInfo("Europe/Dublin")
    now_utc = datetime.now(_tz.utc)
    t = (now_utc - timedelta(days=SLOT_BACK_DAYS)).replace(hour=0, minute=0, second=0, microsecond=0)
    stop = now_utc.replace(minute=0, second=0, microsecond=0) + timedelta(days=SLOT_DAYS)
    grid = []   # open half-hours in order, with the set of courts free in each
    while t < stop:
        local = t.astimezone(dublin)
        if OPEN_H <= local.hour < CLOSE_H:
            grid.append((t, local.date(), {c for c in COURTS if c not in busy.get(t, ())}))
        t += timedelta(minutes=STEP)
    # Per court, find each unbroken free stretch within a day. A stretch of at least MIN_GAME
    # half-hours is bookable: every half-hour in it is "usable", and every half-hour from which
    # MIN_GAME half-hours still remain is a possible "start". Stretches never cross a closed
    # night, because the grid only holds open hours and the day must match.
    usable = [0] * len(grid)
    startable = [0] * len(grid)
    for c in COURTS:
        i = 0
        while i < len(grid):
            if c not in grid[i][2]:
                i += 1
                continue
            j = i
            while (j + 1 < len(grid) and c in grid[j + 1][2] and grid[j + 1][1] == grid[i][1]
                   and grid[j + 1][0] - grid[j][0] == timedelta(minutes=STEP)):
                j += 1
            length = j - i + 1
            if length >= MIN_GAME:
                for k in range(i, j + 1):
                    usable[k] += 1
                for k in range(i, j - MIN_GAME + 2):
                    startable[k] += 1
            i = j + 1
    slots = [{"slot_at": g[0].isoformat(), "free": len(g[2]), "startable": startable[n], "usable": usable[n]}
             for n, g in enumerate(grid)]

    # Booking lead time (Richie, 13 Sep 2026): Playtomic's feed has no created-at, so the
    # first hour we ever see a booking id is our best proxy for when it was made. The ledger
    # lives beside the repo so it survives runs; rows are pushed to booking_leadtime.
    SEEN = os.path.join(ROOT, "data", "booking_seen.json")
    try:
        ledger = json.load(io.open(SEEN, encoding="utf-8"))
    except Exception:
        ledger = {}
    now_iso = datetime.now(_tz.utc).isoformat(timespec="seconds")
    league_keys = {(h["starts_at"], h["court"]) for h in box_hits + summer_hits}
    leadtime = []
    for b in all_bookings:
        bid = b.get("booking_id")
        if not bid or b.get("is_canceled"):
            continue
        first = ledger.setdefault(bid, now_iso)
        st = b["booking_start_date"]
        leadtime.append({"booking_id": bid, "booked_at": first,
                         "starts_at": datetime.fromisoformat(st).replace(tzinfo=_tz.utc).isoformat(),
                         "court": b.get("resource_name") or "",
                         "is_league": (st, b.get("resource_name")) in league_keys,
                         "source": "detector"})
    # Forget bookings whose game is long past, so the ledger cannot grow without limit.
    cutoff = (datetime.now(_tz.utc) - timedelta(days=200)).isoformat()
    ledger = {k: v for k, v in ledger.items() if v >= cutoff}
    os.makedirs(os.path.dirname(SEEN), exist_ok=True)
    json.dump(ledger, io.open(SEEN, "w", encoding="utf-8"), indent=0)

    box_hits.sort(key=lambda x: x["when"]); summer_hits.sort(key=lambda x: x["when"])
    pending = sum(1 for m in matches if m["status"] == "pending")
    today_iso = datetime.now().strftime("%Y-%m-%d %H:%M")
    # only a FUTURE booking counts as "has a court"; a past booking against a still-pending
    # fixture is a game played before the league (or one never entered), not a plan
    booked_pending = sum(1 for h in box_hits if h["status"] == "pending" and h["when"] >= today_iso)
    # Likely league games in bookings that do not name opponents yet (Richie, 13 Sep 2026: "players
    # book a court in their name and don't add opponents straight away ... mention these in the
    # usage stats and emails"). Uses the bookings already fetched, so no extra Playtomic call.
    try:
        import unnamed_bookings
        detected = {(h["when"], h["court"]) for h in box_hits if h.get("match_id")}
        unnamed, unnamed_rates = unnamed_bookings.estimate(all_bookings, detected, get)
    except Exception as exc:
        unnamed, unnamed_rates = [], {"error": f"{type(exc).__name__}: {exc}"}
    res = {"read_at": datetime.now().isoformat(timespec="minutes"), "days": days, "box": box_hits, "summer": summer_hits, "slots": slots, "leadtime": leadtime, "unnamed": unnamed, "unnamed_rates": unnamed_rates,
           "box_pending": pending, "box_pending_booked": booked_pending}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(res, open(OUT, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    return res

def lines(res):
    L = [f"LEAGUE COURTS BOOKED — next {res['days']} days (from Playtomic participant lists; only bookings where all four players are known)"]
    L.append(f"  Box league: {res['box_pending_booked']} of {res['box_pending']} unplayed fixtures have a court booked ahead")
    for h in res["box"]:
        if h["when"] < datetime.now().strftime("%Y-%m-%d %H:%M"):
            continue                       # history feeds the admin heatmap, not this list
        L.append(f"    {h['when']}  {h['court']:8} box {h['box']:2}  {h['team1']}  v  {h['team2']}"
                 + ("" if h["status"] == "pending" else f"  [{h['status']}]") + ("" if h["confidence"] == "certain" else "  (probable: not all four named)"))
    # Only real fixtures, and only the days ahead (Richie, 16 Sep 2026: "Refresh the logic on this
    # email per latest updates to usage tab please"). The old list called every summer booking a
    # tie and reached back to July, so group rematches and friendlies were counted as knockout ties.
    from datetime import timedelta
    import summer_ties
    rule = summer_ties.rule()
    now_s = datetime.now().strftime("%Y-%m-%d %H:%M")
    horizon = (datetime.now() + timedelta(days=res["days"])).strftime("%Y-%m-%d %H:%M")
    ahead = [h for h in res["summer"] if now_s <= h["when"] <= horizon]
    tagged = [(h, rule.kind_for(h["team_ids"], h["starts_at"]) if rule else "summer") for h in ahead]
    ties = [h for h, k in tagged if k == "summer"]
    L.append(f"  Summer league knockouts: {len(ties)} tie{'' if len(ties) == 1 else 's'} booked")
    for h in ties:
        L.append(f"    {h['when']}  {h['court']:8} {h['tier']:5}  {h['team1']}  v  {h['team2'] or '(opponents not named)'}")
    friendly = sum(1 for _, k in tagged if k == "friendly")
    openb = sum(1 for _, k in tagged if k == "open")
    if friendly or openb:
        L.append(f"    (not fixtures, so not counted: {friendly} between league pairs who do not owe each other a game,"
                 f" {openb} with the opponents not named yet)")
    return L

def push(res):
    """Replace league_bookings in Supabase with the current picture (admin passcode from .env.local)."""
    env = site_env()
    key = env.get("SITE_ADMIN_KEY", "")
    if not key:
        raise SystemExit("SITE_ADMIN_KEY missing from .env.local")
    # Playtomic's third-party API gives naive UTC times (a booking the Manager shows as
    # 19:00 Irish time arrives as 18:00) — stamp UTC so the stored instant is right.
    from datetime import timezone
    def aware(ts):
        return datetime.fromisoformat(ts).replace(tzinfo=timezone.utc).isoformat()
    rows = []
    for h in res["box"]:
        if h["match_id"]:
            rows.append({"match_key": h["match_id"], "kind": "box", "starts_at": aware(h["starts_at"]), "court": h["court"],
                         "team1": h["team1"], "team2": h["team2"], "confidence": h["confidence"]})
    # Say what a summer booking actually is (Richie, 16 Sep 2026: "let's stop showing those as
    # summer league and see what they actually are"). Four players from two same-tier teams is
    # not a fixture once the group stage is over: only a bracket tie is. 'open' = opponents not
    # named yet, 'friendly' = two league pairs who are not drawn against each other.
    import summer_ties
    tie_rule = summer_ties.rule()
    for h in res["summer"]:
        mk = ("summer:" + ":".join(h["team_ids"])) if len(h["team_ids"]) == 2 else f"summer1:{h['team_ids'][0]}:{h['starts_at']}"
        kind = tie_rule.kind_for(h["team_ids"], h["starts_at"]) if tie_rule else "summer"
        rows.append({"match_key": mk, "kind": kind, "starts_at": aware(h["starts_at"]),
                     "court": h["court"], "team1": h["team1"], "team2": h["team2"], "confidence": h["confidence"]})
    # one row per fixture: if the same pair has two bookings, keep the earliest
    uniq = {}
    for r in sorted(rows, key=lambda r: r["starts_at"]):
        uniq.setdefault(r["match_key"], r)
    rows = list(uniq.values())
    H = {"apikey": env["NEXT_PUBLIC_SUPABASE_ANON_KEY"], "Authorization": f"Bearer {env['NEXT_PUBLIC_SUPABASE_ANON_KEY']}",
         "Content-Type": "application/json"}
    req = urllib.request.Request(f"{env['NEXT_PUBLIC_SUPABASE_URL']}/rest/v1/rpc/league_bookings_set",
                                 data=json.dumps({"p_key": key, "p_rows": rows}).encode(), headers=H, method="POST")
    try:
        out = json.load(urllib.request.urlopen(req, timeout=60))
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")[:400]
        # league_bookings_kinds_16Sep2026.sql not run yet: the table still only allows box/summer.
        # Push the old way rather than losing an hourly run; the labels land once the SQL is run.
        if "kind" in body or "check constraint" in body:
            print(f"league_bookings_set rejected the new kinds ({e.code}); retrying with box/summer only")
            for r in rows:
                if r["kind"] in ("open", "friendly"):
                    r["kind"] = "summer"
            req = urllib.request.Request(f"{env['NEXT_PUBLIC_SUPABASE_URL']}/rest/v1/rpc/league_bookings_set",
                                         data=json.dumps({"p_key": key, "p_rows": rows}).encode(), headers=H, method="POST")
            out = json.load(urllib.request.urlopen(req, timeout=60))
        else:
            raise SystemExit(f"league_bookings_set failed: HTTP {e.code} {body}")
    print("pushed:", out)
    from collections import Counter as _C
    print("  kinds:", dict(_C(r["kind"] for r in rows)))

    if res.get("slots"):
        req2 = urllib.request.Request(f"{env['NEXT_PUBLIC_SUPABASE_URL']}/rest/v1/rpc/court_slots_set",
                                      data=json.dumps({"p_key": key, "p_rows": res["slots"]}).encode(),
                                      headers=H, method="POST")
        try:
            print("pushed slots:", json.load(urllib.request.urlopen(req2, timeout=60)))
        except urllib.error.HTTPError as e:
            # court_slots_13Sep2026.sql not run yet — the fixtures still pushed, so do not fail
            print(f"court_slots_set skipped: HTTP {e.code} {e.read().decode(errors='replace')[:160]}")

    if res.get("leadtime"):
        req3 = urllib.request.Request(f"{env['NEXT_PUBLIC_SUPABASE_URL']}/rest/v1/rpc/booking_leadtime_set",
                                      data=json.dumps({"p_key": key, "p_rows": res["leadtime"]}).encode(),
                                      headers=H, method="POST")
        try:
            print("pushed leadtime:", json.load(urllib.request.urlopen(req3, timeout=90)))
        except urllib.error.HTTPError as e:
            # booking_leadtime_13Sep2026.sql not run yet — everything else still pushed
            print(f"booking_leadtime_set skipped: HTTP {e.code} {e.read().decode(errors='replace')[:160]}")

    if "unnamed" in res:
        req4 = urllib.request.Request(f"{env['NEXT_PUBLIC_SUPABASE_URL']}/rest/v1/rpc/league_unnamed_set",
                                      data=json.dumps({"p_key": key, "p_rows": res["unnamed"]}).encode(),
                                      headers=H, method="POST")
        try:
            print("pushed unnamed:", json.load(urllib.request.urlopen(req4, timeout=60)), res.get("unnamed_rates"))
        except urllib.error.HTTPError as e:
            # league_unnamed_13Sep2026.sql not run yet — everything else still pushed
            print(f"league_unnamed_set skipped: HTTP {e.code} {e.read().decode(errors='replace')[:160]}")
    return out

if __name__ == "__main__":
    days = int(sys.argv[sys.argv.index("--days") + 1]) if "--days" in sys.argv else 14
    res = detect(days)
    print("\n".join(lines(res)))
    print("->", OUT)
    if "--push" in sys.argv:
        push(res)
