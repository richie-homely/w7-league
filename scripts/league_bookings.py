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

API_BASE = "https://thirdparty.playtomic.io"

def playtomic_env():
    """Playtomic creds from the environment (GitHub Actions secrets) or, on a W7 machine, ../w7-padel/.env."""
    envf = os.path.join(W7, ".env")
    if os.path.exists(envf):
        for k, v in load_env(envf).items():
            os.environ.setdefault(k, v)
    cid, sec, ven = (os.environ.get(k, "") for k in ("PLAYTOMIC_CLIENT_ID", "PLAYTOMIC_SECRET", "PLAYTOMIC_VENUE_ID"))
    if not (cid and sec and ven):
        raise SystemExit("PLAYTOMIC_CLIENT_ID / PLAYTOMIC_SECRET / PLAYTOMIC_VENUE_ID not set")
    return cid, sec, ven

def fetch_bookings(days):
    import requests
    cid, sec, ven = playtomic_env()
    r = requests.post(f"{API_BASE}/api/v1/oauth/token", json={"client_id": cid, "secret": sec},
                      headers={"content-type": "application/json"}, timeout=30)
    r.raise_for_status()
    hdr = {"content-type": "application/json", "Authorization": f"Bearer {r.json()['token']}"}
    d0, d1 = date.today(), date.today() + timedelta(days=days)
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
    for b in fetch_bookings(days):
        names = [p.get("name") for p in ((b.get("participant_info") or {}).get("participants") or [])]
        if not (2 <= len(names) <= 4):
            continue
        when = b["booking_start_date"][:16].replace("T", " ")
        court = b.get("resource_name") or ""
        # box fixture: two full teams, same box
        cnt = {}
        for n in names:
            t = by_player_box.get(norm(n))
            if t: cnt.setdefault(t["id"], [t, 0]); cnt[t["id"]][1] += 1
        two = [v[0] for v in cnt.values()]
        if len(two) == 2 and two[0]["box"] == two[1]["box"] and max(v[1] for v in cnt.values()) == 2:
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
        if len(two) == 2 and sum(v[1] for v in st.values()) >= 3 and len({t["division_id"].split("-")[-1] for t in two}) == 1:
            summer_hits.append({"when": when, "starts_at": b["booking_start_date"], "court": court, "tier": two[0]["division_id"].split("-")[-1],
                                "team_ids": sorted((two[0]["id"], two[1]["id"])),
                                "team1": f"{two[0]['p1']} & {two[0]['p2']}", "team2": f"{two[1]['p1']} & {two[1]['p2']}",
                                "confidence": "certain" if sum(v[1] for v in st.values()) == 4 else "probable"})
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
        L.append(f"    {h['when']}  {h['court']:8} box {h['box']:2}  {h['team1']}  v  {h['team2']}"
                 + ("" if h["status"] == "pending" else f"  [{h['status']}]") + ("" if h["confidence"] == "certain" else "  (probable: not all four named)"))
    L.append(f"  Summer league knockouts: {len(res['summer'])} ties booked")
    for h in res["summer"]:
        L.append(f"    {h['when']}  {h['court']:8} {h['tier']:5}  {h['team1']}  v  {h['team2']}")
    return L

def push(res):
    """Replace league_bookings in Supabase with the current picture (admin passcode from .env.local)."""
    env = site_env()
    key = env.get("SITE_ADMIN_KEY", "")
    if not key:
        raise SystemExit("SITE_ADMIN_KEY missing from .env.local")
    # Playtomic gives naive Dublin wall-clock times; stamp the Dublin offset so the timestamptz
    # column stores the right instant and browsers show 16:30 as 16:30 (was showing +1h).
    from zoneinfo import ZoneInfo
    def aware(ts):
        return datetime.fromisoformat(ts).replace(tzinfo=ZoneInfo("Europe/Dublin")).isoformat()
    rows = []
    for h in res["box"]:
        if h["match_id"]:
            rows.append({"match_key": h["match_id"], "kind": "box", "starts_at": aware(h["starts_at"]), "court": h["court"],
                         "team1": h["team1"], "team2": h["team2"], "confidence": h["confidence"]})
    for h in res["summer"]:
        rows.append({"match_key": "summer:" + ":".join(h["team_ids"]), "kind": "summer", "starts_at": aware(h["starts_at"]),
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
        raise SystemExit(f"league_bookings_set failed: HTTP {e.code} {e.read().decode(errors='replace')[:400]}")
    print("pushed:", out)
    return out

if __name__ == "__main__":
    days = int(sys.argv[sys.argv.index("--days") + 1]) if "--days" in sys.argv else 14
    res = detect(days)
    print("\n".join(lines(res)))
    print("->", OUT)
    if "--push" in sys.argv:
        push(res)
