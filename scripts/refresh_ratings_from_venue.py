# -*- coding: utf-8 -*-
"""Overwrite roster ratings with the LIVE Playtomic level from W7's venue player list.

The Manager entrant list shows each player's rating as it was when they enrolled —
170 players showed identical ratings on 4, 6 and 7 Sep while the venue extract of 5 Sep
had 42 teams moved. So the entrant list is the roster and the venue player API is the
rating. Matching is by normalised name; unmatched players keep the entrant-list value
and are listed so they can be checked by hand.

    python scripts/refresh_ratings_from_venue.py data/box_entries_2026-09-07.json
    -> data/box_entries_2026-09-07_live.json  (+ printed change log)
"""
import io, json, os, re, sys, time

LEAGUE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W7 = os.path.join(os.path.dirname(LEAGUE), "w7-padel")
sys.path.insert(0, os.path.join(W7, "scripts"))

def load_env():
    for ln in io.open(os.path.join(W7, ".env"), encoding="utf-8-sig"):
        ln = ln.strip()
        if ln and not ln.startswith("#") and "=" in ln:
            k, _, v = ln.partition("=")
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

def norm(n):
    n = n.lower().replace("’", "'")
    n = re.sub(r"\(.*?\)", "", n)                 # "(2)" disambiguators
    return re.sub(r"[^a-z]", "", n)

def fetch_players():
    import requests, PythonW7Script as ex
    token = ex.authenticate()
    out, cursor = [], None
    while True:
        params = {"limit": 100, "include": "SPORTS"}
        if cursor:
            params["cursor_id"] = cursor
        r = requests.get(f"{ex.API_BASE}/api/v1/venues/{ex.VENUE_ID}/players", params=params,
                         headers=ex.get_headers(token), timeout=60)
        r.raise_for_status()
        d = r.json()
        out.extend(d.get("data", []))
        if not d.get("has_more"):
            break
        cursor = d.get("next_cursor_id"); time.sleep(0.5)
    return out

def main():
    load_env()
    src = sys.argv[1]
    teams = json.load(open(src, encoding="utf-8"))
    players = fetch_players()
    level = {}
    for p in players:
        for s in p.get("sports", []):
            if str(s.get("sport_id", "")).upper() == "PADEL" and s.get("level_value") is not None:
                key = norm(p.get("name", ""))
                if key:
                    level.setdefault(key, []).append(float(s["level_value"]))
    print(f"venue players: {len(players)}; with a padel level: {len(level)}")
    changed, unmatched, ambiguous = [], [], []
    for t in teams:
        for pl in t["players"]:
            k = norm(pl["name"])
            if k not in level:
                unmatched.append(pl["name"]); continue
            vals = sorted(set(level[k]))
            if len(vals) > 1:
                # two players share the name (two Ciara Kavanaghs): take the level nearest
                # the rating this entrant enrolled with — that is the same person
                ambiguous.append((pl["name"], vals))
                ref = pl["rating"] if pl["rating"] is not None else 0.5
                live = min(vals, key=lambda v: abs(v - ref))
            else:
                live = vals[0]
            old = pl["rating"]
            pl["rating_entry"] = old
            pl["rating"] = round(live, 2)
            if old is None or abs(live - old) >= 0.01:
                changed.append((pl["name"], old, round(live, 2)))
        rs = [p["rating"] if p["rating"] is not None else 0.5 for p in t["players"]]
        t["combined"] = round(sum(rs), 2)
        t["unrated"] = sum(1 for p in t["players"] if p["rating"] is None)
    out = src.replace(".json", "_live.json")
    json.dump(teams, open(out, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    print(f"ratings changed for {len(changed)} players; unmatched {len(unmatched)}; ambiguous {len(ambiguous)}")
    for n, a, b in sorted(changed, key=lambda x: -abs((x[2] or 0) - (x[1] or 0)))[:25]:
        print(f"  {n:34} {a if a is not None else 'N/A':>5} -> {b:.2f}")
    if unmatched:
        print("UNMATCHED (kept entrant-list rating): " + "; ".join(unmatched))
    if ambiguous:
        print("AMBIGUOUS (same name, several levels — took the one nearest the enrolment rating): " + "; ".join(f"{n} {v}" for n, v in ambiguous))
    print("->", out)

if __name__ == "__main__":
    main()
