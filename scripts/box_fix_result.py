# -*- coding: utf-8 -*-
"""Correct a box league result from the command line, instead of the Supabase SQL editor.

Richie, 25 Sep 2026: "Can you run it without supabase sql". Needs box_admin_set_result, created
once by supabase/box_admin_set_result_25Sep2026.sql.

A confirmed result is deliberately locked to players — both teams agreed it, so neither can move
it afterwards. The league still has to be able to fix its own errors: a score entered against the
wrong side, a result put on the wrong fixture. This is that door, gated by SITE_ADMIN_KEY, and
every call is written to box_score_log with the reason given.

    # show a match and what the change would do, without writing anything
    python scripts/box_fix_result.py <match-id>

    # put the win on the other team by mirroring the sets
    python scripts/box_fix_result.py <match-id> --swap --reason "teams reversed, Anna by email"

    # set an explicit score, read as team1-team2
    python scripts/box_fix_result.py <match-id> --sets "7-5,6-0" --reason "agreed by both teams"

    # clear it back to unplayed
    python scripts/box_fix_result.py <match-id> --clear --reason "entered on the wrong fixture"

Nothing is written unless --reason is given, so a dry look is the default.
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from box_league_mailout import load_env, sb_get  # noqa: E402
from box_league_notify import outcome  # noqa: E402


def rpc(fn, body):
    url, key = os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
    req = urllib.request.Request(f"{url}/rest/v1/rpc/{fn}", data=json.dumps(body).encode(),
                                 method="POST",
                                 headers={"apikey": key, "Authorization": f"Bearer {key}",
                                          "Content-Type": "application/json"})
    try:
        return json.loads(urllib.request.urlopen(req, timeout=30).read())
    except urllib.error.HTTPError as e:
        return f"http_{e.code}: {e.read().decode()[:300]}"


def parse_sets(text):
    out = []
    for part in text.replace(" ", "").split(","):
        a, _, b = part.partition("-")
        out.append([int(a), int(b)])
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("match")
    ap.add_argument("--swap", action="store_true", help="mirror every set: the win goes to the other team")
    ap.add_argument("--sets", help='explicit score, team1 first, e.g. "7-5,6-0"')
    ap.add_argument("--clear", action="store_true", help="clear the result, fixture back to unplayed")
    ap.add_argument("--reason", help="why — required to write anything, and stored in the log")
    a = ap.parse_args()
    load_env()

    rows = sb_get(f"box_matches?select=*&id=eq.{a.match}")
    if not rows:
        print("no match with that id")
        return 1
    m = rows[0]
    teams = {t["id"]: t for t in sb_get("box_teams?select=id,box,name,p1,p2&limit=500")}
    t1, t2 = teams.get(m["team1_id"]), teams.get(m["team2_id"])

    print(f"Box {m['box']}  ·  status {m['status']}  ·  sets {m['sets']}")
    print(f"  team1  {t1['name'] if t1 else '?'}")
    print(f"  team2  {t2['name'] if t2 else '?'}")
    print(f"  reads as: {outcome(m['sets'], t1, t2) if m['sets'] and t1 and t2 else 'no result'}")

    if a.clear:
        new = None
    elif a.sets:
        new = parse_sets(a.sets)
    elif a.swap:
        new = [[b, x] for x, b in (m["sets"] or [])]
    else:
        print("\nnothing to change (pass --swap, --sets or --clear)")
        return 0

    print(f"\nwould become: {'no result, back to unplayed' if new is None else new}")
    if new is not None and t1 and t2:
        print(f"  reads as: {outcome(new, t1, t2)}")
    if not a.reason:
        print("\nno --reason given, so nothing was written. Add one to apply it.")
        return 0

    key = os.environ.get("SITE_ADMIN_KEY", "")
    if not key:
        print("SITE_ADMIN_KEY is not set in .env.local")
        return 1
    res = rpc("box_admin_set_result", {"p_match": a.match, "p_sets": new,
                                       "p_reason": a.reason, "p_key": key})
    print("\nresult:", res)
    if str(res).startswith("ok"):
        after = sb_get(f"box_matches?select=sets,status&id=eq.{a.match}")[0]
        print("now:", after)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
