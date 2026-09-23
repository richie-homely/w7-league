# -*- coding: utf-8 -*-
"""Send one sample 'please confirm this result' email to Richie, for testing the button.

Richie, 16 Sep 2026: "We should have the click button to confirm result setup now - can you send
a tester to me for that". Exactly the email box_league_notify.py sends a team when their
opponents enter a score, built from the same template, but addressed to Richie alone and
pointing at a fixture in the test box (99) so nothing real can be changed by tapping it.

    python scripts/send_confirm_tester.py [--dry-run] [--match <uuid>]
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from box_league_mailout import SITE, load_env, sb_get  # noqa: E402

TO = ["richiecarroll65@gmail.com"]
TEST_MATCH = "b90e9651-6fa3-4f50-86a1-053f64d0c0b5"   # box 99: TEST Team B v Richie Test & Partner Test


def main():
    load_env()
    sys.path.insert(0, os.path.join(os.path.dirname(ROOT), "w7-padel", "scripts"))
    import w7_email_html as wh
    dry = "--dry-run" in sys.argv
    match_id = sys.argv[sys.argv.index("--match") + 1] if "--match" in sys.argv else TEST_MATCH

    m = sb_get(f"box_matches?select=id,box,status,sets,team1_id,team2_id,submitted_team&id=eq.{match_id}")[0]
    teams = {t["id"]: t for t in sb_get("box_teams?select=id,box,name,p1,p2&limit=500")}
    t1, t2 = teams[m["team1_id"]], teams[m["team2_id"]]
    sub = teams.get(m["submitted_team"]) or t1
    opp = t2 if sub["id"] == t1["id"] else t1
    score = ", ".join(f"{a}-{b}" for a, b in (m["sets"] or [[6, 4], [6, 3]]))
    link = f"{SITE}/box?match={m['id']}"

    subject = f"[TESTER] W7 Box League — please confirm: {t1['name']} v {t2['name']} {score}"
    text = "\n".join([
        f"Hi {opp['p1'].split()[0]} and {opp['p2'].split()[0]},",
        "",
        f"{sub['name']} have entered a result for your Box {m['box']} match:",
        f"  {t1['name']} v {t2['name']}  —  {score}",
        "",
        "PLEASE CONFIRM OR DISPUTE",
        f"  {link}",
        "  Tap Confirm result, enter the email you registered with, and Confirm — or Dispute if the score is wrong.",
        "  The result only counts in the table once it is confirmed.",
        "",
        "— W7 Padel · Wicklow Town · welcome@w7padel.com",
        "",
        f"(Tester sent to {', '.join(TO)}. Box {m['box']} is the test box; status right now is '{m['status']}'.)",
    ])
    button = (f'<div style="text-align:center;margin:6px 0 14px;"><a href="{link}" style="display:inline-block;'
              f'background:{wh.GOLD};color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;'
              f'border-radius:8px;font-size:15px;">Open the match &rarr;</a></div>')
    html = wh.shell("Box League", f"Result awaiting your confirmation · Box {m['box']} · {score}",
                    button + wh.auto_body(text))
    if dry:
        print(f"[dry-run] would send to {', '.join(TO)}: {subject}")
        print(text)
        return 0
    wh.send(subject, TO, text, html)
    print(f"sent to {', '.join(TO)} | match status is '{m['status']}' | {link}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
