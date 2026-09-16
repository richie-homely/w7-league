# -*- coding: utf-8 -*-
"""Cross-checks over the league data: what does not add up right now.

Richie, 16 Sep 2026: "tidy up the matching and cross checks ... Check any other obvious cross
checks please". Read-only — it changes nothing, it just prints what looks wrong:

  1. summer bookings that are not a bracket tie (friendlies counted as league games)
  2. summer bookings with only one team named
  3. box bookings whose two teams are not actually a fixture in that box
  4. box fixtures with a booking that starts after the result was entered
  5. confirmed box results with no W7 booking found
  6. box fixtures that look booked twice (a pair with more than one court booking)
  7. results entered with a third set after a 2-0 lead (should be 2-0)
  8. box teams with no usable email (nobody can enter their scores)
  9. bookings for a box team that is no longer active

    python scripts/league_crosscheck.py
"""
import os
import sys
from collections import defaultdict
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from box_league_mailout import RELAY, load_env, sb_get, contacts_by_team_name  # noqa: E402
import summer_ties  # noqa: E402


def main():
    load_env()
    out = []
    bookings = sb_get("league_bookings?select=match_key,kind,starts_at,court,team1,team2,confidence&limit=5000")
    box_teams = {t["id"]: t for t in sb_get("box_teams?select=id,box,name,p1,p2,active&limit=500")}
    matches = sb_get("box_matches?select=id,box,status,sets,team1_id,team2_id,updated_at&limit=3000")
    by_id = {m["id"]: m for m in matches}
    summer_teams = {t["id"]: f'{t["p1"]} & {t["p2"]}' for t in sb_get("teams?select=id,p1,p2&limit=300")}
    rule = summer_ties.rule()

    # 1 + 2: summer bookings that are not a fixture at all (a friendly), and ones still open
    friendly, open_ = [], []
    for b in bookings:
        if b["kind"] not in ("summer", "friendly", "open"):
            continue
        if b["match_key"].startswith("summer1:"):
            open_.append(b)
        elif rule:
            a, c = b["match_key"].split(":")[1:3]
            if not rule.is_fixture(a, c, b["starts_at"]):
                friendly.append((b, a, c, rule.why(a, c, b["starts_at"])))
    out.append(f"1. summer bookings that are NOT a fixture (no group game, no bracket tie): {len(friendly)}")
    for b, a, c, why in sorted(friendly, key=lambda x: x[0]["starts_at"]):
        out.append(f"   {b['starts_at'][:16]}  {b['court']:8} {summer_teams.get(a, a)} v {summer_teams.get(c, c)}  [{b['kind']}: {why}]")
    out.append(f"2. summer bookings with only one team named: {len(open_)}")
    for b in sorted(open_, key=lambda x: x["starts_at"]):
        out.append(f"   {b['starts_at'][:16]}  {b['court']:8} {b['team1']}  [{b['kind']}]")

    # 3: box bookings whose key is not a real fixture
    bad_box = [b for b in bookings if b["kind"] == "box" and b["match_key"] not in by_id]
    out.append(f"3. box bookings not matching a fixture: {len(bad_box)}")
    for b in bad_box:
        out.append(f"   {b['starts_at'][:16]}  {b['court']:8} {b['team1']} v {b['team2']}")

    # 4 + 5: results against their booking
    late, nobooking = [], []
    bk = {b["match_key"]: b for b in bookings}
    for m in matches:
        if m["status"] not in ("submitted", "confirmed", "disputed") or m["box"] >= 90:
            continue
        b = bk.get(m["id"])
        names = f"box {m['box']:2} {box_teams.get(m['team1_id'], {}).get('name', '?')} v {box_teams.get(m['team2_id'], {}).get('name', '?')}"
        if not b:
            if m["status"] == "confirmed":
                nobooking.append(names)
            continue
        start = datetime.fromisoformat(b["starts_at"].replace("Z", "+00:00"))
        entered = datetime.fromisoformat((m["updated_at"] or "").replace("Z", "+00:00")) if m["updated_at"] else datetime.now(timezone.utc)
        if start > entered:
            late.append(f"{names} — result entered {entered:%d %b %H:%M}, booking starts {start:%d %b %H:%M}")
    out.append(f"4. results entered BEFORE their booking starts: {len(late)}")
    out += ["   " + x for x in late]
    out.append(f"5. confirmed results with no W7 booking: {len(nobooking)}")
    out += ["   " + x for x in nobooking]

    # 6: a box pair with more than one booking (the detector keeps the earliest)
    pairs = defaultdict(list)
    for b in bookings:
        if b["kind"] == "box":
            pairs[b["match_key"]].append(b)
    dupes = {k: v for k, v in pairs.items() if len(v) > 1}
    out.append(f"6. box fixtures with more than one booking row: {len(dupes)}")

    # 7: a third set after a 2-0 lead
    threes = []
    for m in matches:
        s = m["sets"] or []
        if len(s) == 3 and ((s[0][0] > s[0][1] and s[1][0] > s[1][1]) or (s[0][0] < s[0][1] and s[1][0] < s[1][1])):
            threes.append(f"box {m['box']:2} {box_teams.get(m['team1_id'], {}).get('name', '?')} v {box_teams.get(m['team2_id'], {}).get('name', '?')} — {s}")
    out.append(f"7. results with a third set after a 2-0 lead: {len(threes)}")
    out += ["   " + x for x in threes]

    # 8: teams nobody can enter scores for
    have = {k: {e.lower() for e in v if not e.lower().endswith(RELAY)} for k, v in contacts_by_team_name().items()}
    noemail = [t for t in box_teams.values() if t["active"] and t["box"] < 90 and not have.get(t["name"])]
    out.append(f"8. active box teams with no usable email: {len(noemail)}")
    for t in sorted(noemail, key=lambda t: t["box"]):
        out.append(f"   box {t['box']:2} {t['name']}")

    # 9: bookings for an inactive box team
    inactive = [b for b in bookings if b["kind"] == "box" and b["match_key"] in by_id
                and not all(box_teams.get(by_id[b["match_key"]][k], {}).get("active") for k in ("team1_id", "team2_id"))]
    out.append(f"9. box bookings involving an inactive team: {len(inactive)}")
    for b in inactive:
        out.append(f"   {b['starts_at'][:16]}  {b['team1']} v {b['team2']}")

    # 10: "change my email" requests players have submitted on the site and nobody has approved.
    # box_contact_requests is admin-read only, so this needs the passcode RPC from
    # box_contact_requests_admin_16Sep2026.sql (Richie, 16 Sep 2026: Eoin Tiernan's request sat
    # unseen because nothing outside the Supabase editor could read the table).
    try:
        import json
        import urllib.request
        key = os.environ.get("SITE_ADMIN_KEY", "")
        req = urllib.request.Request(
            f"{os.environ['NEXT_PUBLIC_SUPABASE_URL']}/rest/v1/rpc/box_admin_contact_requests",
            data=json.dumps({"p_key": key}).encode(), method="POST",
            headers={"apikey": os.environ["NEXT_PUBLIC_SUPABASE_ANON_KEY"],
                     "Authorization": f"Bearer {os.environ['NEXT_PUBLIC_SUPABASE_ANON_KEY']}",
                     "Content-Type": "application/json"})
        pend = json.loads(urllib.request.urlopen(req, timeout=30).read())
        out.append(f"10. email changes players asked for, still waiting: {len(pend)}")
        for r in pend:
            out.append(f"   box {r['box']:2} {r['team']} — asked {str(r['created_at'])[:10]}"
                       + (f" · {r['note']}" if r.get("note") else ""))
    except Exception as exc:
        out.append(f"10. email change requests: not available ({type(exc).__name__}) — run box_contact_requests_admin_16Sep2026.sql")

    print("\n".join(out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
