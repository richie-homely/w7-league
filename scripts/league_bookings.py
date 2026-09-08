# -*- coding: utf-8 -*-
"""Which league matches are booked on the courts (Richie, 8 Sep 2026: "can you see from
the bookings when different boxes are booking in their games, and when the remaining
summer league matches are in?").

Playtomic bookings carry the participants' names. A booking whose four participants are
both players of two teams from the SAME box is a box fixture; four players spanning two
teams in the same summer-league tier is a knockout tie. Only-the-booker bookings (46 of
141 last week) cannot be attributed and are left alone — no guessing.

    python scripts/league_bookings.py            # print + write data/league_bookings.json
    python scripts/league_bookings.py --days 14
"""
import io, json, os, re, sys, urllib.request
from datetime import date, datetime, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W7 = os.path.join(os.path.dirname(ROOT), "w7-padel")
sys.path.insert(0, os.path.join(W7, "scripts"))
OUT = os.path.join(ROOT, "data", "league_bookings.json")

def load_env(path):
    e = {}
    for ln in io.open(path, encoding="utf-8-sig"):
        ln = ln.strip()
        if ln and "=" in ln and not ln.startswith("#"):
            k, _, v = ln.partition("="); e[k.strip()] = v.strip().strip('"').strip("'")
    return e

norm = lambda n: re.sub(r"[^a-z]", "", (n or "").lower())

def fetch_bookings(days):
    for k, v in load_env(os.path.join(W7, ".env")).items():
        os.environ.setdefault(k, v)
    import requests, PythonW7Script as ex
    token = ex.authenticate()
    d0, d1 = date.today(), date.today() + timedelta(days=days)
    out, page = [], 0
    while True:
        r = requests.get(f"{ex.API_BASE}/api/v1/bookings", headers=ex.get_headers(token), timeout=60,
                         params={"tenant_id": ex.VENUE_ID, "start_booking_date": d0.strftime("%Y-%m-%dT00:00:00"),
                                 "end_booking_date": d1.strftime("%Y-%m-%dT23:59:59"), "page": page, "size": 200})
        r.raise_for_status()
        batch = r.json(); out += batch
        if len(batch) < 200: break
        page += 1
    return [b for b in out if b.get("status") != "CANCELED" and not b.get("is_canceled")]

def detect(days=14):
    env = load_env(os.path.join(ROOT, ".env.local"))
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
    for b in fetch_bookings(days):
        names = [p.get("name") for p in ((b.get("participant_info") or {}).get("participants") or [])]
        if len(names) != 4:
            continue
        when = b["booking_start_date"][:16].replace("T", " ")
        court = b.get("resource_name") or ""
        # box fixture: two full teams, same box
        cnt = {}
        for n in names:
            t = by_player_box.get(norm(n))
            if t: cnt.setdefault(t["id"], [t, 0]); cnt[t["id"]][1] += 1
        full = [v[0] for v in cnt.values() if v[1] == 2]
        if len(full) == 2 and full[0]["box"] == full[1]["box"]:
            m = fixture_by_pair.get(tuple(sorted((full[0]["id"], full[1]["id"]))))
            box_hits.append({"when": when, "court": court, "box": full[0]["box"], "team1": full[0]["name"], "team2": full[1]["name"],
                             "match_id": m["id"] if m else None, "status": m["status"] if m else "no fixture"})
            continue
        # summer-league tie: four players spanning exactly two teams in the same tier
        st = {}
        for n in names:
            t = by_player_summer.get(norm(n))
            if t: st.setdefault(t["id"], [t, 0]); st[t["id"]][1] += 1
        two = [v[0] for v in st.values()]
        if len(two) == 2 and sum(v[1] for v in st.values()) >= 3 and len({t["division_id"].split("-")[-1] for t in two}) == 1:
            summer_hits.append({"when": when, "court": court, "tier": two[0]["division_id"].split("-")[-1],
                                "team1": f"{two[0]['p1']} & {two[0]['p2']}", "team2": f"{two[1]['p1']} & {two[1]['p2']}"})
    box_hits.sort(key=lambda x: x["when"]); summer_hits.sort(key=lambda x: x["when"])
    pending = sum(1 for m in matches if m["status"] == "pending")
    booked_pending = sum(1 for h in box_hits if h["status"] == "pending")
    res = {"read_at": datetime.now().isoformat(timespec="minutes"), "days": days, "box": box_hits, "summer": summer_hits,
           "box_pending": pending, "box_pending_booked": booked_pending}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(res, open(OUT, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    return res

def lines(res):
    L = [f"LEAGUE COURTS BOOKED — next {res['days']} days (from Playtomic participant lists; only bookings where all four players are known)"]
    L.append(f"  Box league: {len(res['box'])} fixtures booked · {res['box_pending_booked']} of {res['box_pending']} unplayed fixtures have a court")
    for h in res["box"]:
        L.append(f"    {h['when']}  {h['court']:8} box {h['box']:2}  {h['team1']}  v  {h['team2']}" + ("" if h["status"] == "pending" else f"  [{h['status']}]"))
    L.append(f"  Summer league knockouts: {len(res['summer'])} ties booked")
    for h in res["summer"]:
        L.append(f"    {h['when']}  {h['court']:8} {h['tier']:5}  {h['team1']}  v  {h['team2']}")
    return L

if __name__ == "__main__":
    days = int(sys.argv[sys.argv.index("--days") + 1]) if "--days" in sys.argv else 14
    print("\n".join(lines(detect(days))))
    print("->", OUT)
