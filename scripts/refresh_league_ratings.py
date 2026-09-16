# -*- coding: utf-8 -*-
"""Refresh every league player's rating from their live Playtomic level.

Richie, 16 Sep 2026: "Can we show league players current Playtomic rating beside their names on
the leagues?" — the site stores r1/r2 on box_teams and teams, but the summer squads still carry
the level they entered with in June, so "current" has to be refreshed before it is shown.

Matching is by normalised name against W7's venue player list, the same way
refresh_ratings_from_venue.py does it. Where two accounts share a name the one nearest the
stored rating is taken, and anything unmatched keeps the rating it has. Writes an SQL file of
updates for Supabase (ratings only — no emails, so it is safe in the repo) and prints the moves.

    python scripts/refresh_league_ratings.py            # writes supabase/ratings_refresh_<date>.sql
"""
import os
import sys
from collections import defaultdict
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from box_league_mailout import load_env, sb_get  # noqa: E402
import refresh_ratings_from_venue as venue  # noqa: E402


def levels():
    """{normalised name: [levels]} from the venue player list."""
    out = defaultdict(list)
    for p in venue.fetch_players():
        for s in p.get("sports") or []:
            if s.get("sport_id") == "PADEL" and s.get("level_value") is not None:
                out[venue.norm(p.get("name") or "")].append(float(s["level_value"]))
    return out


def main():
    load_env()
    venue.load_env()
    lv = levels()
    print(f"venue players with a padel level: {len(lv)}")
    rows, moves, unmatched, ambiguous = [], [], [], []
    q = lambda s: "'" + s.replace("'", "''") + "'"   # noqa: E731

    for table, query in (("box_teams", "box_teams?select=id,box,name,p1,p2,r1,r2,active&limit=500"),
                         ("teams", "teams?select=id,division_id,p1,p2,r1,r2,placeholder&limit=300")):
        for t in sb_get(query):
            if table == "box_teams" and (not t["active"] or t["box"] >= 90):
                continue
            if table == "teams" and t.get("placeholder"):
                continue
            new = {}
            for col, name_col in (("r1", "p1"), ("r2", "p2")):
                nm = (t.get(name_col) or "").strip()
                old = None if t.get(col) is None else round(float(t[col]), 2)
                vals = sorted(set(lv.get(venue.norm(nm), [])))
                if not nm:
                    continue
                if not vals:
                    unmatched.append(f"{table}: {nm}")
                    continue
                if len(vals) > 1:
                    ambiguous.append(f"{table}: {nm} {vals}")
                    ref = old if old is not None else 0.5
                    live = min(vals, key=lambda v: abs(v - ref))
                else:
                    live = vals[0]
                live = round(live, 2)
                if old is None or abs(live - old) >= 0.01:
                    new[col] = live
                    moves.append((table, nm, old, live))
            if new:
                sets = ", ".join(f"{c} = {v}" for c, v in sorted(new.items()))
                rows.append(f"update public.{table} set {sets}, updated_at = now() where id = '{t['id']}';"
                            f"  -- {t.get('name') or t['p1'] + ' & ' + t['p2']}")

    path = os.path.join(ROOT, "supabase", f"ratings_refresh_{date.today():%d%b%Y}.sql")
    header = ["-- Live Playtomic ratings for every league player (Richie, 16 Sep 2026:",
              "-- \"show league players current Playtomic rating beside their names on the leagues\").",
              "-- Written by scripts/refresh_league_ratings.py from W7's venue player list.",
              f"-- {len(rows)} teams change; players not found on Playtomic keep the rating they had.", ""]
    open(path, "w", encoding="utf-8").write("\n".join(header + rows) + "\n")

    up = [m for m in moves if m[2] is not None and m[3] > m[2]]
    down = [m for m in moves if m[2] is not None and m[3] < m[2]]
    print(f"players changing: {len(moves)}  (up {len(up)}, down {len(down)}, new {len(moves) - len(up) - len(down)})")
    for table, nm, old, live in sorted(moves, key=lambda m: -abs((m[3] or 0) - (m[2] or 0)))[:20]:
        print(f"   {table:9} {nm:28} {('n/a' if old is None else f'{old:.2f}'):>6} -> {live:.2f}")
    print(f"not on Playtomic by name: {len(unmatched)}")
    for u in unmatched[:20]:
        print("   " + u)
    print(f"more than one account with that name: {len(ambiguous)}")
    for a in ambiguous[:10]:
        print("   " + a)
    print("wrote", path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
