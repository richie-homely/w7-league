# -*- coding: utf-8 -*-
"""End-to-end test of box-league walkovers on the TEST box (99) only (Richie, 10 Oct 2026).

Runs every path a team or W7 can take, against the live database, on the three box-99 fixtures
that never appear on the public page, and puts each fixture back to its original confirmed score
afterwards. Registers throwaway test addresses on the test teams so the player functions accept
them. Notifier emails are not triggered (the notifier skips boxes 90+).

    python scripts/test_box_walkovers.py
"""
import json, os, sys, urllib.request
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from box_league_mailout import load_env  # noqa: E402

A, B, C_ = "1a780de2-0591-4126-9842-15ab724a0812", "4ced66f8-3351-491e-95a6-3aeb6af1dc54", "7cefbcd8-cd55-4ff2-a7d2-3d612e09f100"
EMAIL = {A: "test-team-a@w7padel.test", B: "test-team-b@w7padel.test", C_: "test-team-c@w7padel.test"}
AB, AC, BC = "bef8ff17-c9b3-41d0-ae18-2e2dc9c0bca1", "943e5029-0bf9-4ed3-8d3e-40c7974c015d", "b90e9651-6fa3-4f50-86a1-053f64d0c0b5"
results = []


def main():
    load_env()
    url, key, admin = os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["NEXT_PUBLIC_SUPABASE_ANON_KEY"], os.environ["SITE_ADMIN_KEY"]
    H = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}

    def rpc(fn, body):
        req = urllib.request.Request(f"{url}/rest/v1/rpc/{fn}", data=json.dumps(body).encode(), method="POST", headers=H)
        try:
            return json.loads(urllib.request.urlopen(req, timeout=60).read())
        except urllib.error.HTTPError as e:
            return f"HTTP {e.code}: {e.read().decode()[:120]}"

    def row(mid):
        req = urllib.request.Request(f"{url}/rest/v1/box_matches?select=status,sets,walkover_to&id=eq.{mid}", headers=H)
        return json.loads(urllib.request.urlopen(req, timeout=60).read())[0]

    def check(label, got, want):
        ok = got == want
        results.append(ok)
        print(f"  {'PASS' if ok else 'FAIL'}  {label}: {got}" + ("" if ok else f"   (wanted {want})"))

    originals = {mid: row(mid) for mid in (AB, AC, BC)}
    for t, e in EMAIL.items():
        rpc("box_admin_add_contact", {"p_key": admin, "p_team_id": t, "p_email": e})

    def reset(mid):
        rpc("box_admin_set_result", {"p_match": mid, "p_sets": None, "p_reason": "walkover test: reset to unplayed", "p_key": admin})

    try:
        print("1. A claims a walkover against B, B confirms it")
        reset(AB)
        check("claim", rpc("claim_box_walkover", {"p_match": AB, "p_email": EMAIL[A]}), "ok_walkover_claimed")
        r = row(AB); check("provisional", (r["status"], r["walkover_to"], r["sets"]), ("submitted", A, None))
        check("B confirms", rpc("confirm_box_score", {"p_match": AB, "p_email": EMAIL[B], "p_agree": True}), "ok_confirmed")
        r = row(AB); check("now a walkover to A", (r["status"], r["walkover_to"]), ("walkover", A))
        check("B can't put a score over it", rpc("submit_box_score", {"p_match": AB, "p_sets": [[6, 4], [6, 4]], "p_email": EMAIL[B]}), "already_confirmed")
        check("A can't concede it back", rpc("concede_box_match", {"p_match": AB, "p_email": EMAIL[A]}), "already_confirmed")

        print("2. C can't play A and gives the walkover away")
        reset(AC)
        check("concede", rpc("concede_box_match", {"p_match": AC, "p_email": EMAIL[C_]}), "ok_conceded")
        r = row(AC); check("walkover to A at once", (r["status"], r["walkover_to"]), ("walkover", A))

        print("3. B claims, C says they played and enters a score")
        reset(BC)
        check("claim", rpc("claim_box_walkover", {"p_match": BC, "p_email": EMAIL[B]}), "ok_walkover_claimed")
        check("C enters a score", rpc("submit_box_score", {"p_match": BC, "p_sets": [[6, 3], [6, 3]], "p_email": EMAIL[C_]}), "ok_disputed")
        r = row(BC); check("disputed, claim kept for W7 to see", (r["status"], r["walkover_to"]), ("disputed", B))
        check("B then enters the real score", rpc("submit_box_score", {"p_match": BC, "p_sets": [[3, 6], [3, 6]], "p_email": EMAIL[B]}), "ok_submitted")
        r = row(BC); check("score replaces the claim", (r["status"], r["walkover_to"]), ("submitted", None))
        check("C confirms the score", rpc("confirm_box_score", {"p_match": BC, "p_email": EMAIL[C_], "p_agree": True}), "ok_confirmed")
        r = row(BC); check("a normal confirmed result", (r["status"], r["walkover_to"], r["sets"]), ("confirmed", None, [[3, 6], [3, 6]]))

        print("4. B claims, C disputes the claim")
        reset(BC)
        rpc("claim_box_walkover", {"p_match": BC, "p_email": EMAIL[B]})
        check("C disputes", rpc("confirm_box_score", {"p_match": BC, "p_email": EMAIL[C_], "p_agree": False}), "ok_disputed")
        r = row(BC); check("disputed for W7", (r["status"], r["walkover_to"]), ("disputed", B))

        print("5. A walkover claim nobody answers, at the cycle deadline")
        reset(BC)
        rpc("claim_box_walkover", {"p_match": BC, "p_email": EMAIL[B]})
        sys.path.insert(0, os.path.join(ROOT, "scripts"))
        import box_cycle_close as bcc
        teams = [{"id": A, "name": "A"}, {"id": B, "name": "B"}, {"id": C_, "name": "C"}]
        live = [dict(row(BC), id=BC, team1_id=B, team2_id=C_, submitted_team=B)]
        pts = {r["team"]["id"]: r["Pts"] for r in bcc.standings(teams, live, at_deadline=True)}
        check("cycle close scores it 3-0 to B", (pts.get(B), pts.get(C_)), (3, 0))

        print("6. W7 sets and undoes a walkover from the admin side")
        check("admin walkover", rpc("box_admin_set_walkover", {"p_match": BC, "p_winner": C_, "p_reason": "walkover test: admin path", "p_key": admin}), "ok_walkover")
        r = row(BC); check("walkover to C", (r["status"], r["walkover_to"]), ("walkover", C_))
        check("admin undo", rpc("box_admin_set_walkover", {"p_match": BC, "p_winner": None, "p_reason": "walkover test: admin undo", "p_key": admin}), "ok_cleared")
        r = row(BC); check("back to unplayed", (r["status"], r["walkover_to"]), ("pending", None))
    finally:
        print("restoring the test fixtures")
        for mid, o in originals.items():
            res = rpc("box_admin_set_result", {"p_match": mid, "p_sets": o["sets"], "p_reason": "walkover test: restore original score", "p_key": admin})
            r = row(mid)
            print(f"  {mid[:8]} -> {res}, {r['status']} {r['sets']}")
    print(f"\n{sum(results)} of {len(results)} checks passed")
    return 0 if all(results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
