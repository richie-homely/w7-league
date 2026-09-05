# -*- coding: utf-8 -*-
"""Per-team Box League emails: your box, your fixtures, and how to log a score.

Every team gets its own email with a button that opens ONLY its box on the site
and a link on each fixture that opens that match's score form. The link names
the TEAM (public), never the person — the registered email stays the credential.

    python scripts/box_league_mailout.py --render            # write every email to data/mailout/ for review
    python scripts/box_league_mailout.py --send-test you@x   # send ONE team's email (first box) to a test address
    python scripts/box_league_mailout.py --send              # send to every registered contact (asks to type SEND)

Contacts: box_team_contacts is not publicly readable, so the recipient list is
rebuilt from the launch pack SQL (supabase/box_league_launch_pack_*.sql) — the
same file that seeded the table — joined to the live teams by team name. Anyone
added by hand in the SQL editor since should be appended to
data/box_extra_contacts.csv (team name,email).

Apple "Hide My Email" relay addresses (@privaterelay.appleid.com) will not
receive mail from us (Apple only forwards from senders Playtomic registered), so
they are skipped and listed in the summary — post the same instructions through
Playtomic's event messaging for those players.
"""
import csv, glob, io, json, os, re, sys, urllib.request
from collections import defaultdict
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W7 = os.path.join(os.path.dirname(ROOT), "w7-padel")
sys.path.insert(0, os.path.join(W7, "scripts"))
SITE = "https://league.w7padel.com"
START = "Monday 14 September"
OUT = os.path.join(ROOT, "data", "mailout")
RELAY = "@privaterelay.appleid.com"


def load_env():
    for path in (os.path.join(ROOT, ".env.local"), os.path.join(W7, ".env")):
        if not os.path.exists(path):
            continue
        for line in io.open(path, encoding="utf-8-sig"):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def sb_get(q):
    url, key = os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
    req = urllib.request.Request(f"{url}/rest/v1/{q}", headers={"apikey": key, "Authorization": f"Bearer {key}"})
    return json.loads(urllib.request.urlopen(req).read())


def contacts_by_team_name():
    """{team name: [emails]} from the newest launch pack + the extras CSV."""
    # the pack lives in data/ (gitignored) because it carries player emails — the repo is public
    packs = sorted(glob.glob(os.path.join(ROOT, "data", "box_league_launch_pack_*.sql"))
                   + glob.glob(os.path.join(ROOT, "supabase", "box_league_launch_pack_*.sql")))
    out = defaultdict(list)
    if packs:
        for m in re.finditer(r"select id, '([^']+)' from public\.box_teams where name = '((?:[^']|'')+)'", open(packs[-1], encoding="utf-8").read()):
            out[m.group(2).replace("''", "'")].append(m.group(1))
    extra = os.path.join(ROOT, "data", "box_extra_contacts.csv")
    if os.path.exists(extra):
        for row in csv.reader(io.open(extra, encoding="utf-8-sig")):
            if len(row) >= 2 and "@" in row[1]:
                out[row[0].strip()].append(row[1].strip().lower())
    return out


def build(team, opponents, matches_for_team):
    box = team["box"]
    n_games = len(matches_for_team)
    lines = [
        f"Hi {team['p1'].split()[0]} and {team['p2'].split()[0]},",
        "",
        f"The W7 Autumn/Winter Box League starts {START}. You are in BOX {box} as {team['name']}.",
        "",
        f"YOUR CYCLE-1 FIXTURES ({n_games} games · Mon 14 Sep – Sun 11 Oct)",
    ]
    for m in matches_for_team:
        opp = opponents[m["id"]]
        lines.append(f"  vs {opp['name']}  ({opp['p1']} & {opp['p2']}) — log this score: {SITE}/box?match={m['id']}")
    lines += [
        "",
        "  Matches are arranged directly between the two teams — message your opponents and book a court.",
        "  DEADLINE: all four must be played by Sunday 11 October. Unplayed = void and -1 point to BOTH teams, no",
        "  individual extensions (weather only) — so fix your four dates this week.",
        "",
        "YOUR BOX ON THE SITE",
        f"  {SITE}/box?team={team['id']}",
        "  This link opens your box only: the table, your fixtures and the score forms.",
        "",
        "HOW TO LOG A SCORE",
        "  1. Open the match link above (or tap Enter result on the match).",
        "  2. Type the set scores — best of three, the third set is a championship tiebreak; leave it blank for a 2-0 win.",
        "  3. Enter the email you registered with (either player) and tap Submit result. It is remembered on your phone after the first time.",
        "  4. The result shows as AWAITING CONFIRMATION until your opponents confirm it from their registered email. Entering the same score also confirms it; a different score is flagged for the W7 team to resolve.",
        "",
        "CONFIRMING AN OPPONENT'S RESULT",
        "  Open the match, tap Confirm result, enter your registered email, and Confirm — or Dispute if the score is wrong.",
        "",
        "POINTS, PRIZES, UP OR DOWN",
        "  4 points for a 2-0 win · 3 for a win in the championship tiebreak · 1 to the losers if they took a set · 0 for losing in two.",
        "  Top of your box at the end of the cycle wins EUR15 Playtomic credit per player. Top two go up a box, bottom two go down, 3rd stays.",
        "  A substitute is fine if their Playtomic rating is within 0.75 of the player they replace.",
        f"  Seven cycles to April — full rules and calendar: {SITE}/box/rules",
        "",
        "EMAIL NOT RECOGNISED?",
        "  The address must match the one used to enter the league on Playtomic. If yours is not recognised, your partner can add it from the box page, or reply to this email.",
        "",
        "— W7 Padel · Wicklow Town · welcome@w7padel.com · WhatsApp 085 135 4570",
    ]
    return "\n".join(lines)


def main():
    load_env()
    import w7_email_html as wh
    mode = "--render"
    test_to = None
    if "--send" in sys.argv:
        mode = "--send"
    elif "--send-test" in sys.argv:
        mode = "--send-test"
        test_to = sys.argv[sys.argv.index("--send-test") + 1]

    teams = [t for t in sb_get("box_teams?select=id,box,seed,name,p1,p2,active&order=box,seed") if t["active"] and t["box"] < 90]
    matches = sb_get("box_matches?select=id,box,cycle,team1_id,team2_id,status&cycle=eq.1")
    by_id = {t["id"]: t for t in teams}
    contacts = contacts_by_team_name()

    os.makedirs(OUT, exist_ok=True)
    emails, skipped_relay, no_contact = [], [], []
    for t in teams:
        mine = [m for m in matches if t["id"] in (m["team1_id"], m["team2_id"]) and m["box"] == t["box"]]
        opp = {m["id"]: by_id[m["team2_id"] if m["team1_id"] == t["id"] else m["team1_id"]] for m in mine}
        text = build(t, opp, mine)
        tiles = wh.tiles([
            {"v": f"BOX {t['box']}", "label": "Your box", "sub": t["name"], "color": wh.LIME_DK},
            {"v": START.split(" ", 1)[1].upper(), "label": "League starts", "sub": f"{len(mine)} games in 4 weeks"},
            {"v": f"{len(mine)}", "label": "Opponents", "sub": "arrange each match directly"},
        ])
        button = (f'<div style="text-align:center;margin:6px 0 14px;"><a href="{SITE}/box?team={t["id"]}" '
                  f'style="display:inline-block;background:{wh.NAVY};color:#ffffff;text-decoration:none;font-weight:700;'
                  f'padding:12px 22px;border-radius:8px;font-size:15px;">Open my box &amp; enter scores &rarr;</a></div>')
        html = wh.shell("Box League · your team", f"Box {t['box']} · {t['name']}", tiles + button + wh.auto_body(text))
        subject = f"W7 Box League — Box {t['box']}: your fixtures and how to log scores"
        to = [e for e in contacts.get(t["name"], []) if not e.endswith(RELAY)]
        skipped_relay += [(t["name"], e) for e in contacts.get(t["name"], []) if e.endswith(RELAY)]
        if not to:
            no_contact.append(t["name"])
        emails.append({"team": t, "to": to, "subject": subject, "text": text, "html": html})
        with io.open(os.path.join(OUT, f"box{t['box']:02d}_seed{t['seed']}_{re.sub(r'[^A-Za-z0-9]+', '_', t['name'])[:40]}.html"), "w", encoding="utf-8") as f:
            f.write(html)

    summary = [f"{len(emails)} team emails · {sum(len(e['to']) for e in emails)} recipients",
               f"teams with NO deliverable address: {len(no_contact)} — {', '.join(no_contact) or 'none'}",
               f"Apple relay addresses skipped (post via Playtomic instead): {len(skipped_relay)}"]
    summary += [f"  {n} · {e}" for n, e in skipped_relay]
    print("\n".join(summary))
    io.open(os.path.join(OUT, "_summary.txt"), "w", encoding="utf-8").write("\n".join(summary) + "\n")

    if mode == "--render":
        print(f"rendered to {OUT} — open any .html to review; nothing sent")
        return 0
    if mode == "--send-test":
        e = emails[0]
        wh.send("[TEST] " + e["subject"], [test_to], e["text"], e["html"])
        print(f"test email ({e['team']['name']}) sent to {test_to}")
        return 0
    n_to = sum(len(e["to"]) for e in emails)
    if input(f"Type SEND to email {n_to} recipients across {len(emails)} teams: ").strip() != "SEND":
        print("not sent")
        return 1
    log = io.open(os.path.join(OUT, f"_sent_{datetime.now():%Y%m%d_%H%M}.log"), "w", encoding="utf-8")
    for e in emails:
        if not e["to"]:
            continue
        wh.send(e["subject"], e["to"], e["text"], e["html"])
        log.write(f"{e['team']['name']}\t{', '.join(e['to'])}\n")
    log.close()
    print(f"sent {n_to} emails; log in {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
