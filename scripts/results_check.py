# -*- coding: utf-8 -*-
"""Results check - one report of everything a results-watcher needs, for the scheduled task.

Richie, 12 Sep 2026: "switch the ongoing checking of results to an Opus task rather than a
Fable [session]". The judgment stays with the Claude task; this script does the gathering so
each run is cheap and the same every time. Read-only unless --commit / --register.

    python scripts/results_check.py            # print the report, do not touch state
    python scripts/results_check.py --commit   # ...and record this run in data/results_check_state.json
    python scripts/results_check.py --register "Michael Gombart" gombierunner@gmail.com
                                               # admin-register an email to the box team that player is on

Sections:
  NEW      box results submitted / confirmed / disputed since the last committed run (with the
           score, and a flag when a third set was logged after a 2-0 lead)
  OPEN     box scores awaiting the other team's confirmation, disputes, and box fixtures whose
           Playtomic booking started 3h+ ago with no score entered
  KNOCKOUT summer knockout ties booked and started 3h+ ago with no result in src/lib/bracket.ts,
           plus the ties booked in the next 3 days
  TOTALS   cycle-1 progress (10 fixtures x 20 boxes = 200)
CHANGED: yes|no on the last line - yes when NEW has rows or the OPEN / KNOCKOUT lists differ
from the last committed run. The task should send nothing when it is "no".
"""
import io, json, os, re, sys, urllib.request
from datetime import datetime, timedelta, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from box_league_mailout import load_env, sb_get  # noqa: E402

STATE = os.path.join(ROOT, "data", "results_check_state.json")
TEST_BOX = 99
PLAYED_AFTER_H = 3
CYCLE_FIXTURES = 200
LEAGUE_OPEN = datetime(2026, 9, 10, tzinfo=timezone.utc)   # cycle 1 opened 10 Sep 2026 (same as box_league_notify.py)


def sb_rpc(fn, body):
    url, key = os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
    req = urllib.request.Request(f"{url}/rest/v1/rpc/{fn}", data=json.dumps(body).encode(),
                                 headers={"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                                 method="POST")
    return json.loads(urllib.request.urlopen(req).read())


def ts(s):
    if not s:
        return None
    s = s.replace("Z", "+00:00")
    if "." in s:  # postgres microseconds can be 1-6 digits
        head, tail = s.split(".", 1)
        m = re.match(r"(\d+)(.*)", tail)
        s = f"{head}.{m.group(1)[:6].ljust(6, '0')}{m.group(2)}"
    return datetime.fromisoformat(s)


def fmt_sets(sets):
    return ", ".join(f"{a}-{b}" for a, b in sets) if sets else "-"


def local(dt):
    try:
        from zoneinfo import ZoneInfo
        return dt.astimezone(ZoneInfo("Europe/Dublin")).strftime("%a %d %b %H:%M")
    except Exception:
        return dt.strftime("%a %d %b %H:%M UTC")

DIVISIONS = {"g1-low": "lower", "g2-low": "lower", "g3-low": "lower", "g3-high": "upper", "g4-high": "upper"}
QUALIFY_PER_DIV, EXTRA_SPOTS = {"lower": 5, "upper": 4}, {"lower": 1, "upper": 0}


def qualifiers():
    """Ids of the summer teams in the two knockout brackets - a Python copy of
    computeStandings + tierQualifiers (standings.ts / bracket.ts): 3 pts a win, +1 for
    straight sets, walkover 3 pts and no sets; rank by points, h2h, set diff, game diff;
    top 5 per lower division + the best 6th, top 4 per upper division."""
    teams = sb_get("teams?select=id,division_id,placeholder&limit=300")
    fixtures = sb_get("fixtures?select=division_id,round,code,team1_id,team2_id,status,sets&status=in.(completed,walkover)&limit=1000")
    rows = {t["id"]: {"id": t["id"], "div": t["division_id"], "Pts": 0, "SF": 0, "SA": 0, "GF": 0, "GA": 0, "h2h": {}}
            for t in teams if not t.get("placeholder")}
    for f in sorted(fixtures, key=lambda f: (f["round"], f.get("code") or "")):
        r1, r2 = rows.get(f["team1_id"]), rows.get(f["team2_id"])
        if not r1 or not r2 or not f.get("sets"):
            continue
        if f["status"] == "walkover":
            w, l = (r1, r2) if f["sets"][0][0] > f["sets"][0][1] else (r2, r1)
            w["Pts"] += 3
            w["h2h"][l["id"]] = w["h2h"].get(l["id"], 0) + 1
            continue
        s1 = s2 = g1 = g2 = 0
        for idx, (a, b) in enumerate(f["sets"]):
            if idx != 2:
                g1 += a; g2 += b
            if a > b: s1 += 1
            elif b > a: s2 += 1
        r1["SF"] += s1; r1["SA"] += s2; r2["SF"] += s2; r2["SA"] += s1
        r1["GF"] += g1; r1["GA"] += g2; r2["GF"] += g2; r2["GA"] += g1
        w, l = (r1, r2) if s1 > s2 else (r2, r1)
        w["Pts"] += 3 + (1 if min(s1, s2) == 0 else 0)
        w["h2h"][l["id"]] = w["h2h"].get(l["id"], 0) + 1
    import functools
    def cmp(a, b):
        if a["Pts"] != b["Pts"]: return b["Pts"] - a["Pts"]
        ha, hb = a["h2h"].get(b["id"], 0), b["h2h"].get(a["id"], 0)
        if ha != hb: return hb - ha
        sd = (b["SF"] - b["SA"]) - (a["SF"] - a["SA"])
        if sd: return sd
        return (b["GF"] - b["GA"]) - (a["GF"] - a["GA"])
    merit = lambda r: (-r["Pts"], -(r["SF"] - r["SA"]), -(r["GF"] - r["GA"]))  # noqa: E731
    out = set()
    for tier in ("lower", "upper"):
        next_best = []
        for div, t in DIVISIONS.items():
            if t != tier:
                continue
            table = sorted((r for r in rows.values() if r["div"] == div), key=functools.cmp_to_key(cmp))
            per = QUALIFY_PER_DIV[tier]
            out.update(r["id"] for r in table[:per])
            if len(table) > per:
                next_best.append(table[per])
        next_best.sort(key=merit)
        out.update(r["id"] for r in next_best[:EXTRA_SPOTS[tier]])
    return out


def register(player, email):
    teams = [t for t in sb_get("box_teams?select=id,name,p1,p2,box&active=eq.true&limit=500")
             if player.lower() in (t["p1"] or "").lower() or player.lower() in (t["p2"] or "").lower()]
    if len(teams) != 1:
        print(f"REGISTER: {len(teams)} teams match '{player}' - nothing done: {[t['name'] for t in teams]}")
        return 1
    t = teams[0]
    key = os.environ.get("SITE_ADMIN_KEY", "")
    res = sb_rpc("box_admin_add_contact", {"p_key": key, "p_team_id": t["id"], "p_email": email})
    check = sb_rpc("box_team_for_email", {"p_email": email})
    print(f"REGISTER: {email} -> {t['name']} (box {t['box']}): {res.get('status')}; lookup now -> {check}")
    return 0 if res.get("status") == "ok" else 1


def main():
    load_env()
    args = sys.argv[1:]
    if "--register" in args:
        i = args.index("--register")
        return register(args[i + 1], args[i + 2])
    commit = "--commit" in args

    state = json.load(io.open(STATE, encoding="utf-8")) if os.path.exists(STATE) else {}
    last_run = ts(state.get("last_run")) or datetime(2026, 9, 10, tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(hours=PLAYED_AFTER_H)

    box_teams = {t["id"]: t for t in sb_get("box_teams?select=id,name,box,p1,p2&limit=500")}
    bname = lambda i: box_teams.get(i, {}).get("name", i)  # noqa: E731
    matches = [m for m in sb_get("box_matches?select=*&limit=1000") if m["box"] != TEST_BOX]
    bookings = sb_get("league_bookings?select=*&order=starts_at.asc&limit=500")

    out = []
    # ---- NEW: box transitions since the last committed run
    new_rows = []
    for m in matches:
        stamp = ts(m.get("confirmed_at") if m["status"] == "confirmed" else m.get("updated_at"))
        if m["status"] in ("submitted", "confirmed", "disputed") and stamp and stamp > last_run:
            sets = m.get("sets") or []
            flag = ""
            if len(sets) == 3:
                a2 = sum(1 for a, b in sets[:2] if a > b)
                if a2 in (0, 2):
                    flag = "  ** third set logged after a 2-0 lead - check with the teams **"
            who = bname(m["team1_id"]) + " v " + bname(m["team2_id"])
            new_rows.append((stamp, f"  box {m['box']:>2} {m['status']:<9} {who}: {fmt_sets(sets)}{flag}"))
    out.append(f"NEW since {local(last_run)} ({len(new_rows)}):")
    out += [r for _, r in sorted(new_rows)] or ["  none"]

    # ---- OPEN: awaiting confirmation / disputed / played-no-score
    open_rows = []
    for m in matches:
        who = bname(m["team1_id"]) + " v " + bname(m["team2_id"])
        if m["status"] == "submitted":
            age = now - ts(m["submitted_at"])
            open_rows.append(f"  box {m['box']:>2} awaiting confirmation {age.days}d {age.seconds // 3600}h: {who} {fmt_sets(m.get('sets'))}")
        elif m["status"] == "disputed":
            open_rows.append(f"  box {m['box']:>2} DISPUTED: {who}")
    pending_by_id = {m["id"]: m for m in matches if m["status"] == "pending"}
    for b in bookings:
        if b["kind"] != "box":
            continue
        m = pending_by_id.get(b["match_key"])  # a box booking's match_key is the box_matches id
        start = ts(b["starts_at"])
        if m and LEAGUE_OPEN <= start < cutoff:
            open_rows.append(f"  box {m['box']:>2} played {local(start)} {b['court']}, no score: {bname(m['team1_id'])} v {bname(m['team2_id'])}")
    out.append(f"\nOPEN ({len(open_rows)}):")
    out += open_rows or ["  none"]

    # ---- KNOCKOUT: summer ties vs bracket.ts
    teams = {t["id"]: f'{t["p1"]} & {t["p2"]}' for t in sb_get("teams?select=id,p1,p2&limit=300")}
    src = io.open(os.path.join(ROOT, "src", "lib", "bracket.ts"), encoding="utf-8").read()
    src = src[src.index("KNOCKOUT_RESULTS"):]
    entered, eliminated = set(), set()
    for block in re.findall(r"\{(.*?)playedOn", src, re.S):
        ids = re.findall(r'"([0-9a-f-]{36})"', block)
        win = re.search(r'winnerTeamId:\s*"([0-9a-f-]{36})"', block)
        if len(ids) >= 2:
            entered.add(frozenset(ids[:2]))
            if win:
                eliminated.update(i for i in ids[:2] if i != win.group(1))
    # The bookings feed calls any booking with four players from two same-tier summer teams
    # a knockout tie, so a social game between two league teams shows up too. Keep only
    # ties where both teams qualified for a bracket and neither has already lost a tie.
    quals = qualifiers()
    cand = []
    for b in bookings:
        if b["kind"] != "summer" or not b["match_key"].startswith("summer:"):
            continue
        ids = b["match_key"].split(":")[1:3]
        if frozenset(ids) in entered or eliminated & set(ids) or not set(ids) <= quals:
            continue
        cand.append((b, ids))
    ko_rows, soon = [], []
    for b, ids in cand:
        start = ts(b["starts_at"])
        tie = f"{teams.get(ids[0], ids[0])} v {teams.get(ids[1], ids[1])}"
        if start < cutoff and start > now - timedelta(days=10):
            ko_rows.append(f"  played {local(start)} {b['court']} ({b['confidence']}), not in bracket.ts: {tie}")
        elif now <= start <= now + timedelta(days=3):
            soon.append(f"  booked {local(start)} {b['court']} ({b['confidence']}): {tie}")
    out.append(f"\nKNOCKOUT ties played with no result entered ({len(ko_rows)}):")
    out += ko_rows or ["  none"]
    out.append("KNOCKOUT ties booked in the next 3 days:")
    out += soon or ["  none"]

    # ---- TOTALS
    by = {}
    for m in matches:
        by[m["status"]] = by.get(m["status"], 0) + 1
    out.append(f"\nTOTALS cycle 1: {by.get('confirmed', 0)} confirmed - {by.get('submitted', 0)} awaiting confirmation - "
               f"{by.get('disputed', 0)} disputed - {by.get('pending', 0)} unplayed - of {CYCLE_FIXTURES}")

    sig = json.dumps(sorted(open_rows + ko_rows))
    changed = bool(new_rows) or sig != state.get("open_sig")
    out.append(f"\nCHANGED: {'yes' if changed else 'no'}")
    print("\n".join(out))

    if commit:
        os.makedirs(os.path.dirname(STATE), exist_ok=True)
        json.dump({"last_run": now.isoformat(timespec="seconds"), "open_sig": sig},
                  io.open(STATE, "w", encoding="utf-8"), indent=1)
    return 0


if __name__ == "__main__":
    sys.exit(main())
