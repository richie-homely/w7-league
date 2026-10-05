# -*- coding: utf-8 -*-
"""Refresh every league player's rating from their live Playtomic level.

Richie, 16 Sep 2026: "Can we show league players current Playtomic rating beside their names on
the leagues?" — the site stores r1/r2 on box_teams and teams, but the summer squads still carry
the level they entered with in June, so "current" has to be refreshed before it is shown.
Richie, 5 Oct 2026: "set this up to make it update automatically every week" — so the refresh
can now apply itself (--push, through league_admin_set_ratings) and runs from the NUC every
Monday at 06:30 as the Task Scheduler job "W7 Ratings Weekly" (run_ratings_refresh.cmd).

Matching is by normalised name against W7's venue player list, the same way
refresh_ratings_from_venue.py does it. Anything unmatched keeps the rating it has. Where two
accounts share a name, scripts/rating_overrides.csv says which account the team means and the
level still comes live; without an override the one nearest the stored rating is taken and the
pair is printed, because that fallback keeps whatever we guessed first and never corrects itself.

Held for review: a player whose stored rating is real (not the 0.5 unrated floor) and whose live
level is more than HOLD_ABOVE away is NOT changed automatically - that pattern is nearly always
the name matching somebody else's account (5 Oct 2026: both Lang teams "halved" overnight). The
hold is listed in the email; --force applies it, or an override pins the right account.

    python scripts/refresh_league_ratings.py                  # dry: writes supabase/ratings_refresh_<date>.sql, prints the moves
    python scripts/refresh_league_ratings.py --push           # apply through league_admin_set_ratings (needs the SQL of 5 Oct 2026 run once)
    python scripts/refresh_league_ratings.py --push --notify  # the weekly run: apply, then email Richie if anything changed or is held
    python scripts/refresh_league_ratings.py --push --force   # apply the held moves too
"""
import json
import os
import sys
import urllib.request
from collections import defaultdict
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from box_league_mailout import load_env, sb_get  # noqa: E402
import refresh_ratings_from_venue as venue  # noqa: E402


OVERRIDES = os.path.join(ROOT, "scripts", "rating_overrides.csv")
HOLD_ABOVE = 1.0       # a real rating moving more than this in a week is held for a human (the Lang moves were 1.08-1.16)
FLOOR = 0.5            # Playtomic's floor; what an unrated entrant was stored as at the cut
RICHIE = "richiecarroll65@gmail.com"
NL = "\n"


def levels():
    """{normalised name: [(level, player_id, email)]} from the venue player list.

    The player_id comes back too, because two people at the club really do share a name and the
    only stable way to say which one a team means is the account id.
    """
    out = defaultdict(list)
    for p in venue.fetch_players():
        for s in p.get("sports") or []:
            if s.get("sport_id") == "PADEL" and s.get("level_value") is not None:
                out[venue.norm(p.get("name") or "")].append(
                    (float(s["level_value"]), str(p.get("player_id") or ""), p.get("email") or ""))
    return out


def overrides():
    """Which Playtomic account a given league player label means.

    Name matching cannot separate two Mark O'Sullivans, and "nearest to the rating we already
    hold" quietly keeps whichever one we guessed the first time - so a wrong pick never corrects
    itself. This file pins the account by id; the level still comes live from Playtomic each run.
    """
    out = {}
    if not os.path.exists(OVERRIDES):
        return out
    import csv
    for r in csv.DictReader(open(OVERRIDES, encoding="utf-8-sig")):
        label = (r.get("label") or "").strip()
        pid = (r.get("player_id") or "").strip()
        if label and pid:
            out[label] = pid
    return out


def sb_rpc(fn, body):
    url, key = os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
    req = urllib.request.Request(f"{url}/rest/v1/rpc/{fn}", data=json.dumps(body).encode(), method="POST",
                                 headers={"apikey": key, "Authorization": f"Bearer {key}",
                                          "Content-Type": "application/json"})
    return json.loads(urllib.request.urlopen(req, timeout=60).read())


def main():
    load_env()
    venue.load_env()
    args = sys.argv[1:]
    push, notify, force = "--push" in args, "--notify" in args, "--force" in args
    lv = levels()
    print(f"venue players with a padel level: {len(lv)}")
    pins = overrides()
    sql_rows, push_rows, moves, held, unmatched, ambiguous, pinned_used = [], [], [], [], [], [], []

    for table, query in (("box_teams", "box_teams?select=id,box,name,p1,p2,r1,r2,active&limit=500"),
                         ("teams", "teams?select=id,division_id,p1,p2,r1,r2,placeholder&limit=300")):
        for t in sb_get(query):
            if table == "box_teams" and (not t["active"] or t["box"] >= 90):
                continue
            if table == "teams" and t.get("placeholder"):
                continue
            label = t.get("name") or f"{t['p1']} & {t['p2']}"
            where = f"box {t['box']}" if table == "box_teams" else (t.get("division_id") or "summer")
            new = {}
            for col, name_col in (("r1", "p1"), ("r2", "p2")):
                nm = (t.get(name_col) or "").strip()
                old = None if t.get(col) is None else round(float(t[col]), 2)
                vals = sorted(set(lv.get(venue.norm(nm), [])))
                if not nm:
                    continue
                if not vals:
                    unmatched.append(f"{where}: {nm}")
                    continue
                if len(vals) > 1:
                    pinned = [v for v in vals if v[1] == pins.get(nm)]
                    if pinned:
                        live = pinned[0][0]
                        pinned_used.append(f"{where}: {nm} -> account {pinned[0][1]} ({live:.2f})")
                    else:
                        ambiguous.append(f"{where}: {nm} {[v[0] for v in vals]}"
                                         + "  accounts " + ", ".join(f"{v[1]}={v[0]:.2f}" for v in vals))
                        ref = old if old is not None else FLOOR
                        live = min((v[0] for v in vals), key=lambda v: abs(v - ref))
                else:
                    live = vals[0][0]
                live = round(live, 2)
                if old is not None and abs(live - old) < 0.01:
                    continue
                real_old = old is not None and old > FLOOR + 0.01
                if real_old and abs(live - old) > HOLD_ABOVE and not force:
                    held.append((where, label, nm, old, live))
                    continue
                new[col] = live
                moves.append((where, label, nm, old, live))
            if new:
                sets = ", ".join(f"{c} = {v}" for c, v in sorted(new.items()))
                sql_rows.append(f"update public.{table} set {sets}, updated_at = now() where id = '{t['id']}';  -- {label}")
                push_rows.append({"table": table, "id": t["id"], **new})

    path = os.path.join(ROOT, "supabase", f"ratings_refresh_{date.today():%d%b%Y}.sql")
    header = ["-- Live Playtomic ratings for every league player (Richie, 16 Sep 2026:",
              "-- \"show league players current Playtomic rating beside their names on the leagues\").",
              "-- Written by scripts/refresh_league_ratings.py from W7's venue player list.",
              f"-- {len(sql_rows)} teams change; players not found on Playtomic keep the rating they had;",
              f"-- {len(held)} move(s) over {HOLD_ABOVE} held for review (not in this file).", ""]
    open(path, "w", encoding="utf-8").write("\n".join(header + sql_rows) + "\n")

    # ---- report
    up = [m for m in moves if m[3] is not None and m[4] > m[3]]
    down = [m for m in moves if m[3] is not None and m[4] < m[3]]
    L = [f"players changing: {len(moves)}  (up {len(up)}, down {len(down)}, new {len(moves) - len(up) - len(down)}) across {len(sql_rows)} teams"]
    for where, label, nm, old, live in sorted(moves, key=lambda m: -abs((m[4] or 0) - (m[3] or 0)))[:20]:
        L.append(f"   {where:10} {nm:28} {('n/a' if old is None else f'{old:.2f}'):>6} -> {live:.2f}   ({label})")
    if held:
        L.append(f"HELD for review - a real rating moving more than {HOLD_ABOVE} usually means the name matched somebody else's account: {len(held)}")
        for where, label, nm, old, live in held:
            L.append(f"   {where:10} {nm:28} {old:.2f} -> {live:.2f}   ({label})  - pin the right account in scripts/rating_overrides.csv, or --force")
    L.append(f"not on Playtomic by name: {len(unmatched)}")
    L += [f"   {u}" for u in unmatched[:20]]
    if pinned_used:
        L.append(f"pinned to a named account by scripts/rating_overrides.csv: {len(pinned_used)}")
        L += [f"   {p}" for p in pinned_used]
    L.append(f"more than one account with that name, and no override: {len(ambiguous)}")
    L += [f"   {a}" for a in ambiguous[:10]]
    if ambiguous:
        L.append("   (add label,player_id to scripts/rating_overrides.csv to settle these for good)")
    L.append(f"wrote {path}")

    applied = None
    if push and push_rows:
        applied = sb_rpc("league_admin_set_ratings", {"p_key": os.environ.get("SITE_ADMIN_KEY", ""), "p_rows": push_rows})
        L.append(f"APPLIED: {applied}")
        if applied.get("status") != "ok":
            L.append("   the SQL in supabase/league_admin_set_ratings_05Oct2026.sql must be run once for --push to work")
    elif push:
        L.append("APPLIED: nothing to change")
    text = NL.join(L)
    print(text)

    if notify and (moves or held or (applied and applied.get("status") != "ok")):
        sys.path.insert(0, os.path.join(os.path.dirname(ROOT), "w7-padel", "scripts"))
        import w7_email_html as wh
        status = "applied" if applied and applied.get("status") == "ok" else ("FAILED" if applied else "dry run")
        subj = f"W7 ratings refresh - {len(moves)} player(s) {status}" + (f", {len(held)} held for review" if held else "")
        wh.send(subj, [RICHIE], text)
        print("summary emailed to Richie")
    return 0 if not applied or applied.get("status") == "ok" else 1


if __name__ == "__main__":
    raise SystemExit(main())
