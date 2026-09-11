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

    python scripts/box_league_notify.py [--dry-run] [--include-test] [--remind]

Results watch (Richie, 11 Sep 2026: "we'll have to make sure there are results"): a box
fixture whose Playtomic booking started 3h+ ago and is still pending is a game played with
no score entered. Every run prints that list; with PLAYER_REMINDERS on (or --remind) both
teams get one reminder email 3h after the booking and a second one 48h later, each once
(state keys remind:<match> / remind2:<match>).
"""
import io, json, os, sys, urllib.request
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from box_league_mailout import SITE, RELAY, load_env, sb_get, contacts_by_team_name  # noqa: E402

STATE = os.path.join(ROOT, "data", "box_notify_state.json")
W7_INBOX = "welcome@w7padel.com"
PLAYER_REMINDERS = False          # flip to True once Richie has approved the reminder text
REMIND_AFTER_H, REMIND2_AFTER_H = 3, 48
from datetime import timezone as _tz
LEAGUE_OPEN = datetime(2026, 9, 10, tzinfo=_tz.utc)   # cycle 1 opened early on 10 Sep 2026 (lib/boxCalendar.ts)


def played_no_result(matches_pending, teams):
    """[(match, booking)] — pending fixtures whose detected W7 booking is 3h+ in the past."""
    from datetime import timezone, timedelta
    now = datetime.now(timezone.utc)
    # never earlier than the league opening (10 Sep 2026): games before that were friendlies
    since = max(now - timedelta(days=14), LEAGUE_OPEN).strftime("%Y-%m-%dT%H:%M:%SZ")   # no '+' in the URL
    bk = {b["match_key"]: b for b in sb_get(f"league_bookings?select=match_key,starts_at,court,confidence&kind=eq.box&starts_at=gte.{since}&limit=2000")}
    out = []
    for m in matches_pending:
        b = bk.get(m["id"])
        if not b:
            continue
        start = datetime.fromisoformat(b["starts_at"])
        if (now - start).total_seconds() >= REMIND_AFTER_H * 3600:
            out.append((m, b, (now - start).total_seconds() / 3600))
    return sorted(out, key=lambda x: x[1]["starts_at"])


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

    def addrs(*ts):
        out = []
        for t in ts:
            out += [e for e in contacts.get(t["name"], []) if not e.endswith(RELAY)]
        return sorted(set(out))

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
    # ── results watch: booked, played, no score yet ──
    from zoneinfo import ZoneInfo
    dub = ZoneInfo("Europe/Dublin")
    pending = [m for m in sb_get("box_matches?select=id,box,team1_id,team2_id,status&status=eq.pending&box=lt.90&limit=2000")]
    overdue = played_no_result(pending, teams)
    remind = PLAYER_REMINDERS or "--remind" in sys.argv
    print(f"PLAYED, NO RESULT YET: {len(overdue)} fixture(s)")
    for m, b, hrs in overdue:
        t1, t2 = teams.get(m["team1_id"]), teams.get(m["team2_id"])
        if not t1 or not t2:
            continue
        when = datetime.fromisoformat(b["starts_at"]).astimezone(dub)
        print(f"  box {m['box']:2}  {t1['name']} v {t2['name']}  played {when:%a %d %b %H:%M} {b['court']}  ({hrs:.0f}h ago)")
        stage = "remind2" if hrs >= REMIND2_AFTER_H else "remind"
        key = f"{stage}:{m['id']}"
        if key in state or not remind:
            continue
        to = addrs(t1, t2)
        link = f"{SITE}/box?match={m['id']}"
        second = stage == "remind2"
        subject = (f"W7 Box League — still no score for {t1['name']} v {t2['name']}" if second
                   else f"W7 Box League — enter your score: {t1['name']} v {t2['name']}")
        text = "\n".join([
            f"Hi {t1['p1'].split()[0]}, {t1['p2'].split()[0]}, {t2['p1'].split()[0]} and {t2['p2'].split()[0]},",
            "",
            f"Playtomic shows your Box {m['box']} match was played on {when:%A %d %B} at {when:%H:%M} on {b['court']},"
            + (" and two days on there is still no score in the table." if second else " but no score has been entered yet."),
            "",
            "ENTER THE RESULT — either team can do it, it takes a minute",
            f"  {link}",
            "  Tap Enter result, type the games for each set, enter the email you registered with, Submit.",
            "  The other team then gets an email to confirm it, and the box table updates.",
            "",
            "If the match did not go ahead after all, reply to this email and we will sort it.",
            "Unplayed fixtures are void at the cycle deadline and both teams get -1, so do not leave it.",
            "",
            "— W7 Padel · Wicklow Town · welcome@w7padel.com",
        ])
        if not to:
            print(f"    no deliverable address — skipped")
            if not dry:
                state[key] = "no-recipient"
            continue
        button = (f'<div style="text-align:center;margin:6px 0 14px;"><a href="{link}" style="display:inline-block;'
                  f'background:{wh.GOLD};color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;'
                  f'border-radius:8px;font-size:15px;">Enter the result &rarr;</a></div>')
        html = wh.shell("Box League", ("Still no score" if second else "Enter your score") + f" · Box {m['box']}", button + wh.auto_body(text))
        if dry:
            print(f"    [dry-run] {stage} -> {', '.join(to)} | {subject}")
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
