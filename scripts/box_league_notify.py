# -*- coding: utf-8 -*-
"""Box League result notifications — the email a team gets when there is something to confirm.

Richie, 5 Sep 2026: "when you are asked to confirm a result presume you get an email."

Polls box_matches and emails on three transitions, once each:
  submitted -> the OPPOSING team: "confirm or dispute", with the link that opens that match
  confirmed -> BOTH teams: the final score and the box table link
  disputed  -> BOTH teams + welcome@: scores differ, W7 will resolve

Runs from the laptop every 15 minutes (Task Scheduler "W7 Box Notify"); state in
data/box_notify_state.json keyed by match id + status + updated_at, so a re-run
never re-sends and a correction (new updated_at) does. Recipients come from the
same source as the mail-out (launch pack SQL + data/box_extra_contacts.csv);
Apple relay addresses are skipped. Nothing is sent for the test box (99) unless
--include-test is passed.

    python scripts/box_league_notify.py [--dry-run] [--include-test]
"""
import io, json, os, sys, urllib.request
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from box_league_mailout import SITE, RELAY, load_env, sb_get, contacts_by_team_name  # noqa: E402

STATE = os.path.join(ROOT, "data", "box_notify_state.json")
W7_INBOX = "welcome@w7padel.com"


def fmt_sets(sets):
    return ", ".join(f"{a}-{b}" for a, b in (sets or []))


def main():
    load_env()
    sys.path.insert(0, os.path.join(os.path.dirname(ROOT), "w7-padel", "scripts"))
    import w7_email_html as wh
    dry = "--dry-run" in sys.argv
    include_test = "--include-test" in sys.argv
    state = json.load(open(STATE, encoding="utf-8")) if os.path.exists(STATE) else {}
    teams = {t["id"]: t for t in sb_get("box_teams?select=id,box,seed,name,p1,p2,active")}
    contacts = contacts_by_team_name()
    matches = sb_get("box_matches?select=id,box,status,sets,team1_id,team2_id,submitted_team,updated_at&status=in.(submitted,confirmed,disputed)")
    sent = 0
    for m in sorted(matches, key=lambda x: x["updated_at"]):
        if m["box"] >= 90 and not include_test:
            continue
        key = f"{m['id']}:{m['status']}:{m['updated_at']}"
        if key in state:
            continue
        t1, t2 = teams.get(m["team1_id"]), teams.get(m["team2_id"])
        if not t1 or not t2:
            continue
        sub = teams.get(m["submitted_team"])
        opp = t2 if sub and sub["id"] == t1["id"] else t1
        score = fmt_sets(m["sets"])
        link = f"{SITE}/box?match={m['id']}"
        def addrs(*ts):
            out = []
            for t in ts:
                out += [e for e in contacts.get(t["name"], []) if not e.endswith(RELAY)]
            return sorted(set(out))
        if m["status"] == "submitted":
            to = addrs(opp)
            subject = f"W7 Box League — please confirm: {t1['name']} v {t2['name']} {score}"
            text = "\n".join([
                f"Hi {opp['p1'].split()[0]} and {opp['p2'].split()[0]},",
                "",
                f"{sub['name'] if sub else 'Your opponents'} have entered a result for your Box {m['box']} match:",
                f"  {t1['name']} v {t2['name']}  —  {score}",
                "",
                "PLEASE CONFIRM OR DISPUTE",
                f"  {link}",
                "  Tap Confirm result, enter the email you registered with, and Confirm — or Dispute if the score is wrong.",
                "  The result only counts in the table once it is confirmed.",
                "",
                "— W7 Padel · Wicklow Town · welcome@w7padel.com",
            ])
            headline, subline, color = "Result awaiting your confirmation", f"Box {m['box']} · {score}", wh.GOLD
        elif m["status"] == "confirmed":
            to = addrs(t1, t2)
            subject = f"W7 Box League — confirmed: {t1['name']} v {t2['name']} {score}"
            text = "\n".join([
                f"Result confirmed in Box {m['box']}:",
                f"  {t1['name']} v {t2['name']}  —  {score}",
                "",
                f"The box table is updated: {SITE}/box?box={m['box']}",
                "",
                "— W7 Padel · Wicklow Town",
            ])
            headline, subline, color = "Result confirmed", f"Box {m['box']} · {score}", wh.LIME_DK
        else:
            to = addrs(t1, t2) + [W7_INBOX]
            subject = f"W7 Box League — scores differ: {t1['name']} v {t2['name']}"
            text = "\n".join([
                f"The two teams entered different scores for their Box {m['box']} match:",
                f"  {t1['name']} v {t2['name']}  —  currently showing {score}",
                "",
                "The W7 team will check with both teams and set the result. Either team can also",
                f"re-enter the agreed score here: {link}",
                "",
                "— W7 Padel · Wicklow Town · welcome@w7padel.com",
            ])
            headline, subline, color = "Scores differ — W7 will resolve", f"Box {m['box']}", "#b91c1c"
        if not to:
            print(f"  no deliverable address for {m['status']} {t1['name']} v {t2['name']} (box {m['box']}) - skipped")
            if not dry:
                state[key] = "no-recipient"
            continue
        button = (f'<div style="text-align:center;margin:6px 0 14px;"><a href="{link}" style="display:inline-block;'
                  f'background:{color};color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;'
                  f'border-radius:8px;font-size:15px;">Open the match &rarr;</a></div>')
        html = wh.shell("Box League", headline + " · " + subline, button + wh.auto_body(text))
        if dry:
            print(f"[dry-run] {m['status']:9} -> {', '.join(to)} | {subject}")
        else:
            wh.send(subject, to, text, html)
            state[key] = datetime.now().isoformat(timespec="seconds")
            sent += 1
    if not dry:
        os.makedirs(os.path.dirname(STATE), exist_ok=True)
        json.dump(state, open(STATE, "w", encoding="utf-8"), indent=1)
    print(f"{'would send' if dry else 'sent'} {sent if not dry else ''} notification(s) at {datetime.now():%H:%M}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
