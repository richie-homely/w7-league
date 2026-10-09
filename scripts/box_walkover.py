# -*- coding: utf-8 -*-
"""Record a box-league walkover (Richie, 9 Oct 2026: "add the ability to add in a walkover ... they
get 3 points rather than 4").

A walkover is a fixture one side concedes. The team that was ready to play gets 3 points, as for
a win decided in the tiebreak; the conceding team gets 0; it counts as 2-0 in sets and no games.
Applied through box_admin_set_walkover (supabase/box_walkover_09Oct2026.sql, SITE_ADMIN_KEY),
which also logs the reason to box_score_log.

    python scripts/box_walkover.py --list                       # fixtures that look like walkovers (6-0 6-0 and the like)
    python scripts/box_walkover.py --box 7 --winner "John D" --loser "Eamonn" --reason "Eamonn & Liam conceded, 4 Oct"
    python scripts/box_walkover.py --match <uuid> --winner "John D" --reason "..."
    python scripts/box_walkover.py --match <uuid> --clear --reason "..."   # back to unplayed

Team names match on any part of the name, case-insensitive; the script refuses if a name is
ambiguous within the box. --cycle defaults to the current cycle.
"""
import argparse, io, json, os, re, sys, urllib.request
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from box_league_mailout import load_env  # noqa: E402


def sb():
    url, key = os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
    H = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    def get(path):
        return json.loads(urllib.request.urlopen(urllib.request.Request(f"{url}/rest/v1/{path}", headers=H), timeout=60).read())
    def rpc(fn, body):
        req = urllib.request.Request(f"{url}/rest/v1/rpc/{fn}", data=json.dumps(body).encode(), method="POST", headers=H)
        return json.loads(urllib.request.urlopen(req, timeout=60).read())
    return get, rpc


def current_cycle():
    src = io.open(os.path.join(ROOT, "src", "lib", "boxCalendar.ts"), encoding="utf-8").read()
    from datetime import date
    today = date.today().isoformat()
    cycles = re.findall(r'n:\s*(\d+)[^}]*?start:\s*"(\d{4}-\d{2}-\d{2})"[^}]*?end:\s*"(\d{4}-\d{2}-\d{2})"', src)
    for n, s, e in cycles:
        if s <= today <= e:
            return int(n)
    return int(cycles[-1][0]) if cycles else 1


def pick(teams, needle, box):
    hits = [t for t in teams if t["box"] == box and needle.lower() in t["name"].lower()]
    if len(hits) != 1:
        raise SystemExit(f"'{needle}' matches {len(hits)} teams in box {box}: {[t['name'] for t in hits]}")
    return hits[0]


def main():
    load_env()
    ap = argparse.ArgumentParser()
    ap.add_argument("--list", action="store_true"); ap.add_argument("--box", type=int); ap.add_argument("--cycle", type=int)
    ap.add_argument("--match"); ap.add_argument("--winner"); ap.add_argument("--loser"); ap.add_argument("--reason", default="")
    ap.add_argument("--clear", action="store_true")
    a = ap.parse_args()
    get, rpc = sb()
    teams = get("box_teams?select=id,name,box,active&limit=1000")
    by_id = {t["id"]: t for t in teams}
    cyc = a.cycle or current_cycle()
    matches = get(f"box_matches?select=id,box,cycle,team1_id,team2_id,sets,status,walkover_to,updated_at&cycle=eq.{cyc}&box=lt.90&order=box&limit=2000")

    if a.list:
        print(f"cycle {cyc}: results where the loser took 1 game or fewer, and walkovers already recorded")
        for m in matches:
            n1, n2 = by_id[m["team1_id"]]["name"], by_id[m["team2_id"]]["name"]
            if m["status"] == "walkover":
                print(f"  box {m['box']:2}  WALKOVER to {by_id[m['walkover_to']]['name']}   ({n1} v {n2})   {m['id']}")
            elif m["status"] in ("confirmed", "submitted") and m.get("sets"):
                g1 = sum(s[0] for s in m["sets"][:2]); g2 = sum(s[1] for s in m["sets"][:2])
                if min(g1, g2) <= 1:
                    print(f"  box {m['box']:2}  {n1} v {n2}   {' '.join(f'{x}-{y}' for x, y in m['sets'])}   {m['status']}   {m['id']}")
        return 0

    if len((a.reason or "").strip()) < 8:
        raise SystemExit("--reason needs at least 8 characters; it goes in the log")
    if a.match:
        m = next((x for x in matches if x["id"] == a.match), None) or get(f"box_matches?select=id,box,cycle,team1_id,team2_id,status&id=eq.{a.match}")[0]
    else:
        if not (a.box and a.winner and a.loser):
            raise SystemExit("give --match, or --box with --winner and --loser")
        w, l = pick(teams, a.winner, a.box), pick(teams, a.loser, a.box)
        m = next((x for x in matches if {x["team1_id"], x["team2_id"]} == {w["id"], l["id"]}), None)
        if not m:
            raise SystemExit(f"no cycle-{cyc} fixture between {w['name']} and {l['name']}")
    n1, n2 = by_id[m["team1_id"]]["name"], by_id[m["team2_id"]]["name"]
    if a.clear:
        r = rpc("box_admin_set_walkover", {"p_match": m["id"], "p_winner": None, "p_reason": a.reason, "p_key": os.environ["SITE_ADMIN_KEY"]})
        print(f"box {m['box']} {n1} v {n2}: cleared -> {r}")
        return 0
    winner = pick(teams, a.winner, m["box"]) if a.winner else None
    if not winner or winner["id"] not in (m["team1_id"], m["team2_id"]):
        raise SystemExit("--winner must be one of the two teams in the fixture")
    r = rpc("box_admin_set_walkover", {"p_match": m["id"], "p_winner": winner["id"], "p_reason": a.reason, "p_key": os.environ["SITE_ADMIN_KEY"]})
    print(f"box {m['box']} {n1} v {n2}: walkover to {winner['name']} -> {r}")
    if r == "ok_walkover":
        print("  3 points to the winner, 0 to the other side; the site updates on its next read")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
