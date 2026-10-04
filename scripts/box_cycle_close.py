# -*- coding: utf-8 -*-
"""Box League cycle close: final tables, promotion and relegation, the next cycle's fixtures,
and the draft emails that tell every team where they are going.

Richie, 4 Oct 2026: "align cycle dates to end on these dates, then process the next box
overnight that night. Well then have draft emails to - give teams their new box - you've been
promoted for the promoters, then your new box is x for the relegated, you stay in box x etc."

What happens at a close (rules of 5 Sep 2026):
  * fixtures still 'pending' at the deadline are VOID: -1 point to both teams;
  * a result that was entered but never confirmed by the other team ('submitted') is taken as
    confirmed - it was on the site for them to dispute;
  * a 'disputed' fixture is left as it is (counts for nothing) and listed for Richie;
  * standings per box: 4 pts straight-sets win, 3 pts tiebreak win, 1 pt to losers who took a
    set, then head-to-head, set difference, game difference - the same as src/lib/box.ts;
  * 1st and 2nd go up a box, 4th and 5th go down, 3rd stays (box 1 and box 20 keep their ends);
  * the team that topped its box gets EUR20 Playtomic credit per player;
  * seeds in the new box: the two who came down from above, then the stayer, then the two who
    came up, so the fixture list reads top-down.

The move itself is one Supabase transaction (box_admin_close_cycle, supabase/
box_cycle_close_04Oct2026.sql), so the site never shows a half-moved league.

    python scripts/box_cycle_close.py --cycle 1 --dry-run     # the pack, nothing written (default)
    python scripts/box_cycle_close.py --cycle 1 --commit      # close it: void, move, open cycle 2
    python scripts/box_cycle_close.py --cycle 1 --emails      # render the per-team drafts (after a commit)
    python scripts/box_cycle_close.py --cycle 1 --send [--yes]  # send the drafts to the teams
    python scripts/box_cycle_close.py --auto                  # the overnight run (Task Scheduler,
                                                              # "W7 Box Cycle Close", 00:30 daily):
        closes the cycle that ended yesterday, if any, renders the drafts, and emails Richie
        the pack with the send command. Nothing goes to a player until --send is run.

Outputs (data/, gitignored): data/cycle_close/cycle<N>_pack.md, data/mailout/cycle<N+1>/*.html
"""
import functools, io, json, os, re, sys, urllib.request
from collections import defaultdict
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from box_league_mailout import SITE, RELAY, load_env, sb_get, contacts_by_team_name  # noqa: E402

DUB = ZoneInfo("Europe/Dublin")
RICHIE = "richiecarroll65@gmail.com"
PACK_DIR = os.path.join(ROOT, "data", "cycle_close")
CREDIT_PER_PLAYER = 20   # rules page: EUR20 Playtomic credit per player for topping the box
NL = "\n"


# ── calendar: read src/lib/boxCalendar.ts so the two never drift ─────────────────────────────
def cycles():
    src = io.open(os.path.join(ROOT, "src", "lib", "boxCalendar.ts"), encoding="utf-8").read()
    out = []
    for m in re.finditer(r'\{\s*n:\s*(\d+),\s*start:\s*"(\d{4}-\d{2}-\d{2})",\s*end:\s*"(\d{4}-\d{2}-\d{2})"', src):
        out.append({"n": int(m.group(1)), "start": m.group(2), "end": m.group(3)})
    if not out:
        raise SystemExit("could not read BOX_CYCLES from src/lib/boxCalendar.ts")
    return out


def fmt_day(iso, with_year=False):
    d = date.fromisoformat(iso)
    return d.strftime("%A %-d %B" if os.name != "nt" else "%A %#d %B") + (f" {d.year}" if with_year else "")


# ── Supabase ─────────────────────────────────────────────────────────────────────────────────
def sb_rpc(fn, body):
    url, key = os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
    req = urllib.request.Request(f"{url}/rest/v1/rpc/{fn}", data=json.dumps(body).encode(), method="POST",
                                 headers={"apikey": key, "Authorization": f"Bearer {key}",
                                          "Content-Type": "application/json"})
    return json.loads(urllib.request.urlopen(req, timeout=60).read())


def closed_cycles():
    try:
        return {r["cycle"]: r for r in sb_get("box_cycle_log?select=cycle,closed_at,summary")}
    except Exception:
        return {}   # table not created yet: nothing is closed


# ── standings: mirrors computeBoxStandings in src/lib/box.ts ─────────────────────────────────
def standings(teams, matches, at_deadline):
    """Rows for one box. at_deadline=True applies the close rules to the live statuses:
    submitted counts as confirmed, pending counts as void (-1 each)."""
    rows = {t["id"]: {"team": t, "P": 0, "W": 0, "L": 0, "Pts": 0, "SF": 0, "SA": 0, "GF": 0, "GA": 0,
                      "h2h": defaultdict(int), "void": 0} for t in teams}
    for m in matches:
        r1, r2 = rows.get(m["team1_id"]), rows.get(m["team2_id"])
        if not r1 or not r2:
            continue
        st = m["status"]
        if at_deadline and st == "submitted":
            st = "confirmed"
        if at_deadline and st == "pending":
            st = "void"
        if st == "void":
            r1["Pts"] -= 1; r2["Pts"] -= 1; r1["void"] += 1; r2["void"] += 1
            continue
        if st != "confirmed" or not m.get("sets"):
            continue
        s1 = s2 = g1 = g2 = 0
        for idx, (a, b) in enumerate(m["sets"]):
            if idx != 2:            # the third set is a championship tiebreak: a set, not games
                g1 += a; g2 += b
            if a > b: s1 += 1
            elif b > a: s2 += 1
        r1["P"] += 1; r2["P"] += 1
        r1["SF"] += s1; r1["SA"] += s2; r2["SF"] += s2; r2["SA"] += s1
        r1["GF"] += g1; r1["GA"] += g2; r2["GF"] += g2; r2["GA"] += g1
        t1_won = s1 > s2
        win, lose = (r1, r2) if t1_won else (r2, r1)
        win["W"] += 1; lose["L"] += 1
        straight = (s2 == 0) if t1_won else (s1 == 0)
        win["Pts"] += 4 if straight else 3
        if not straight:
            lose["Pts"] += 1
        win["h2h"][lose["team"]["id"]] += 1

    def cmp(a, b):
        if b["Pts"] != a["Pts"]: return b["Pts"] - a["Pts"]
        aw, bw = a["h2h"][b["team"]["id"]], b["h2h"][a["team"]["id"]]
        if aw != bw: return bw - aw
        sda, sdb = a["SF"] - a["SA"], b["SF"] - b["SA"]
        if sdb != sda: return sdb - sda
        return (b["GF"] - b["GA"]) - (a["GF"] - a["GA"])
    out = sorted(rows.values(), key=functools.cmp_to_key(cmp))
    for i, r in enumerate(out, start=1):
        r["place"] = i
    return out


# ── the moves ────────────────────────────────────────────────────────────────────────────────
def plan_moves(teams, matches):
    """[{team_id, box_from, box_to, seed_to, place, pts, played, won, outcome, winner, name, p1, p2}]"""
    boxes = sorted({t["box"] for t in teams})
    top, bottom = boxes[0], boxes[-1]
    tables = {}
    for b in boxes:
        tb = [t for t in teams if t["box"] == b]
        tables[b] = standings(tb, [m for m in matches if m["box"] == b], at_deadline=True)
    moves = {}
    for b in boxes:
        rows = tables[b]
        k = len(rows)
        n_down = 2 if k >= 5 else (1 if k == 4 else 0)
        for r in rows:
            p = r["place"]
            if p <= 2 and b != top:
                outcome, box_to = "up", b - 1
            elif p > k - n_down and b != bottom:
                outcome, box_to = "down", b + 1
            else:
                outcome, box_to = "stay", b
            moves[r["team"]["id"]] = {
                "team_id": r["team"]["id"], "name": r["team"]["name"], "p1": r["team"]["p1"], "p2": r["team"]["p2"],
                "box_from": b, "box_to": box_to, "place": p, "pts": r["Pts"], "played": r["P"], "won": r["W"],
                "lost": r["L"], "void": r["void"], "voided": r["void"], "outcome": outcome, "winner": p == 1,
            }
    # seeds in the new box: came down from above (by place), stayers (by place), came up (by place)
    for b in boxes:
        incoming = [m for m in moves.values() if m["box_to"] == b]
        order = sorted(incoming, key=lambda m: ({"down": 0, "stay": 1, "up": 2}[m["outcome"]], m["place"]))
        for seed, m in enumerate(order, start=1):
            m["seed_to"] = seed
    return tables, list(moves.values())


# ── the pack (what Richie reads) ─────────────────────────────────────────────────────────────
def pack_text(cycle, tables, moves, matches, teams_by_id, result=None):
    c = cycle
    out = [f"W7 BOX LEAGUE - CYCLE {c['n']} CLOSE ({fmt_day(c['start'])} - {fmt_day(c['end'], True)})", ""]
    if result:
        out += [f"APPLIED: {json.dumps(result)}", ""]
    st = defaultdict(int)
    for m in matches:
        st[m["status"]] += 1
    out.append(f"Fixtures: {st['confirmed']} confirmed, {st['submitted']} entered-not-confirmed (taken as confirmed), "
               f"{st['pending']} unplayed (VOID, -1 each), {st['disputed']} disputed (left for Richie), {st.get('void', 0)} already void")
    disputed = [m for m in matches if m["status"] == "disputed"]
    if disputed:
        out.append("DISPUTED - fix with box_admin_set_result, then adjust moves by hand if it changes a place:")
        for m in disputed:
            out.append(f"  box {m['box']}: {teams_by_id[m['team1_id']]['name']} v {teams_by_id[m['team2_id']]['name']}  {SITE}/box?match={m['id']}")
    out.append("")
    for b in sorted(tables):
        out.append(f"BOX {b}")
        for r in tables[b]:
            mv = next(x for x in moves if x["team_id"] == r["team"]["id"])
            arrow = {"up": "UP  ", "down": "DOWN", "stay": "stay"}[mv["outcome"]]
            out.append(f"  {r['place']}. {r['team']['name']:<44} {r['Pts']:>3} pts  P{r['P']} W{r['W']} L{r['L']}"
                       f"{'  void ' + str(r['void']) if r['void'] else ''}   -> {arrow} box {mv['box_to']} seed {mv['seed_to']}"
                       f"{'   WINNER EUR' + str(CREDIT_PER_PLAYER) + ' credit each' if mv['winner'] else ''}")
        out.append("")
    ups = sum(1 for m in moves if m["outcome"] == "up"); downs = sum(1 for m in moves if m["outcome"] == "down")
    out.append(f"{len(moves)} teams: {ups} up, {downs} down, {len(moves) - ups - downs} stay. "
               f"{sum(1 for m in moves if m['winner'])} box winners x EUR{CREDIT_PER_PLAYER * 2} credit = EUR{sum(1 for m in moves if m['winner']) * CREDIT_PER_PLAYER * 2}.")
    return NL.join(out)


# ── the team emails ──────────────────────────────────────────────────────────────────────────
def email_for(team, mv, next_cycle, fixtures, teams_by_id):
    """Plain text + subject for one team. Three voices: promoted / relegated / staying."""
    c = next_cycle
    n_from, n_to = mv["box_from"], mv["box_to"]
    first = f"Hi {team['p1'].split()[0]} and {team['p2'].split()[0]},"
    finish = (f"You finished {ordinal(mv['place'])} in Box {n_from} with {mv['pts']} points "
              f"(won {mv['won']}, lost {mv['lost']}{', ' + str(mv['void']) + ' unplayed = -1 each' if mv['void'] else ''}).")
    if mv["outcome"] == "up":
        subject = f"W7 Box League - you've been promoted to Box {n_to}"
        headline = f"YOU'VE BEEN PROMOTED. {finish} Top two go up, so you start Cycle {c['n']} in BOX {n_to}."
    elif mv["outcome"] == "down":
        subject = f"W7 Box League - your new box is Box {n_to}"
        headline = f"YOUR NEW BOX IS BOX {n_to}. {finish} Bottom two go down, so Cycle {c['n']} is in Box {n_to} - four new opponents and a fresh start."
    else:
        subject = f"W7 Box League - you stay in Box {n_to} for Cycle {c['n']}"
        if mv["place"] <= 2 and n_from == n_to:
            headline = f"YOU STAY IN BOX {n_to} - there is nowhere higher to go. {finish}"
        elif mv["place"] >= 4 and n_from == n_to:
            headline = f"YOU STAY IN BOX {n_to}. {finish}"
        else:
            headline = f"YOU STAY IN BOX {n_to}. {finish} Third place holds its box."
    lines = [first, "", headline]
    if mv["winner"]:
        lines += ["", f"BOX WINNERS: you topped Box {n_from}, so each of you gets EUR{CREDIT_PER_PLAYER} Playtomic credit - "
                      f"EUR{CREDIT_PER_PLAYER * 2} for the team. W7 will add it to your Playtomic accounts over the coming days."]
    lines += ["", f"YOUR CYCLE-{c['n']} FIXTURES ({len(fixtures)} games - {fmt_day(c['start'])} to {fmt_day(c['end'])})"]
    for m in fixtures:
        opp = teams_by_id[m["team2_id"] if m["team1_id"] == team["id"] else m["team1_id"]]
        players = "" if opp["name"] == f"{opp['p1']} & {opp['p2']}" else f"  ({opp['p1']} & {opp['p2']})"
        lines.append(f"  vs {opp['name']}{players} - log this score: {SITE}/box?match={m['id']}")
    lines += [
        "",
        "  Matches are arranged directly between the two teams - message your opponents and book a court.",
        f"  DEADLINE: all {len(fixtures)} must be played by {fmt_day(c['end'])}. Unplayed = void and -1 point to BOTH teams,",
        "  no individual extensions (weather only) - so fix your dates this week.",
        "",
        "YOUR BOX ON THE SITE",
        f"  {SITE}/box?team={team['id']}",
        f"  Your new box, your fixtures and the score forms. Last cycle's table is still there under Cycle {c['n'] - 1}.",
        "",
        "HOW TO LOG A SCORE",
        "  Open the match link, type the set scores (third set = championship tiebreak), enter the email you registered",
        "  with and Submit. Your opponents confirm from their registered email - or enter the same score, which confirms it.",
        "",
        "POINTS, UP OR DOWN",
        "  4 points for a 2-0 win - 3 for a win in the championship tiebreak - 1 to the losers if they took a set.",
        f"  Top of your box wins EUR{CREDIT_PER_PLAYER} Playtomic credit per player. Top two go up a box, bottom two go down, 3rd stays.",
        f"  Full rules and calendar: {SITE}/box/rules",
        "",
        "- W7 Padel - Wicklow Town - welcome@w7padel.com - WhatsApp 085 135 4570",
    ]
    return subject, NL.join(lines)


def ordinal(n):
    return f"{n}{'th' if 11 <= n % 100 <= 13 else {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')}"


def render_emails(cycle_n, wh):
    """After a commit: read box_cycle_moves + the new cycle's fixtures and write every draft."""
    nxt = next(c for c in cycles() if c["n"] == cycle_n + 1)
    teams = {t["id"]: t for t in sb_get("box_teams?select=id,box,seed,name,p1,p2,active")}
    moves = sb_get(f"box_cycle_moves?select=*&cycle=eq.{cycle_n}")
    fixtures = sb_get(f"box_matches?select=id,box,cycle,team1_id,team2_id,status&cycle=eq.{cycle_n + 1}&box=lt.90")
    contacts = contacts_by_team_name()
    out_dir = os.path.join(ROOT, "data", "mailout", f"cycle{cycle_n + 1}")
    os.makedirs(out_dir, exist_ok=True)
    emails = []
    for mv in sorted(moves, key=lambda m: (m["box_to"], m["seed_to"])):
        t = teams[mv["team_id"]]
        mine = [m for m in fixtures if t["id"] in (m["team1_id"], m["team2_id"])]
        mv = dict(mv, lost=mv["played"] - mv["won"], void=mv.get("voided", 0))
        subject, text = email_for(t, mv, nxt, mine, teams)
        label = {"up": "PROMOTED", "down": "RELEGATED", "stay": "STAYS"}[mv["outcome"]]
        tiles = wh.tiles([
            {"v": f"BOX {mv['box_to']}", "label": f"Cycle {nxt['n']}", "sub": t["name"], "color": wh.LIME_DK},
            {"v": label, "label": f"Cycle {cycle_n} result", "sub": f"{ordinal(mv['place'])} in Box {mv['box_from']} - {mv['pts']} pts"},
            {"v": f"{len(mine)}", "label": "Fixtures", "sub": f"by {fmt_day(nxt['end'])}"},
        ])
        button = (f'<div style="text-align:center;margin:6px 0 14px;"><a href="{SITE}/box?team={t["id"]}" '
                  f'style="display:inline-block;background:{wh.NAVY};color:#ffffff;text-decoration:none;font-weight:700;'
                  f'padding:12px 22px;border-radius:8px;font-size:15px;">Open my box &amp; enter scores &rarr;</a></div>')
        html = wh.shell("Box League - new cycle", f"Box {mv['box_to']} - {t['name']}", tiles + button + wh.auto_body(text))
        to = [e for e in contacts.get(t["name"], []) if not e.endswith(RELAY)]
        emails.append({"team": t, "to": to, "subject": subject, "text": text, "html": html, "outcome": mv["outcome"]})
        fn = f"box{mv['box_to']:02d}_seed{mv['seed_to']}_{mv['outcome']}_{re.sub(r'[^A-Za-z0-9]+', '_', t['name'])[:40]}.html"
        io.open(os.path.join(out_dir, fn), "w", encoding="utf-8").write(html)
    no_contact = [e["team"]["name"] for e in emails if not e["to"]]
    summary = [f"{len(emails)} drafts in {out_dir} - {sum(len(e['to']) for e in emails)} recipients",
               f"promoted {sum(1 for e in emails if e['outcome'] == 'up')}, relegated {sum(1 for e in emails if e['outcome'] == 'down')}, "
               f"staying {sum(1 for e in emails if e['outcome'] == 'stay')}",
               f"teams with NO deliverable address: {len(no_contact)} - {', '.join(no_contact) or 'none'}"]
    io.open(os.path.join(out_dir, "_summary.txt"), "w", encoding="utf-8").write(NL.join(summary) + NL)
    return emails, out_dir, summary


def send_emails(emails, out_dir, wh, yes):
    n_to = sum(len(e["to"]) for e in emails)
    if not yes and input(f"Type SEND to email {n_to} recipients across {len(emails)} teams: ").strip() != "SEND":
        print("not sent"); return 1
    log = io.open(os.path.join(out_dir, f"_sent_{datetime.now():%Y%m%d_%H%M}.log"), "w", encoding="utf-8")
    for e in emails:
        if not e["to"]:
            continue
        wh.send(e["subject"], e["to"], e["text"], e["html"])
        log.write(f"{e['team']['name']}\t{e['outcome']}\t{', '.join(e['to'])}{NL}")
    log.close()
    print(f"sent {n_to} emails; log in {out_dir}")
    return 0


# ── main ─────────────────────────────────────────────────────────────────────────────────────
def main():
    load_env()
    sys.path.insert(0, os.path.join(os.path.dirname(ROOT), "w7-padel", "scripts"))
    import w7_email_html as wh
    args = sys.argv[1:]
    auto = "--auto" in args
    cyc = cycles()
    done = closed_cycles()

    if auto:
        today = datetime.now(DUB).date()
        due = [c for c in cyc if c["n"] not in done
               and date.fromisoformat(c["end"]) < today <= date.fromisoformat(c["end"]) + timedelta(days=7)]
        if not due:
            print(f"{today}: no cycle ended yesterday and left to close - nothing to do")
            return 0
        cycle = due[0]
        mode = "commit"
    else:
        if "--cycle" not in args:
            raise SystemExit("--cycle N is required (or --auto)")
        n = int(args[args.index("--cycle") + 1])
        cycle = next(c for c in cyc if c["n"] == n)
        mode = ("commit" if "--commit" in args else "send" if "--send" in args
                else "emails" if "--emails" in args else "dry-run")

    n = cycle["n"]
    if mode in ("emails", "send"):
        if n not in done:
            raise SystemExit(f"cycle {n} is not closed yet - run --commit first")
        emails, out_dir, summary = render_emails(n, wh)
        print(NL.join(summary))
        if mode == "send":
            return send_emails(emails, out_dir, wh, yes="--yes" in args)
        return 0

    if n in done:
        print(f"cycle {n} was closed at {done[n]['closed_at']}: {done[n]['summary']}")
        return 0

    teams = [t for t in sb_get("box_teams?select=id,box,seed,name,p1,p2,active&order=box,seed") if t["active"] and t["box"] < 90]
    matches = sb_get(f"box_matches?select=id,box,cycle,team1_id,team2_id,sets,status&cycle=eq.{n}&box=lt.90")
    teams_by_id = {t["id"]: t for t in teams}
    tables, moves = plan_moves(teams, matches)
    os.makedirs(PACK_DIR, exist_ok=True)

    if mode == "dry-run":
        text = pack_text(cycle, tables, moves, matches, teams_by_id)
        print(text)
        io.open(os.path.join(PACK_DIR, f"cycle{n}_dryrun.md"), "w", encoding="utf-8").write(text)
        print(f"{NL}DRY RUN - nothing written. To close: python scripts/box_cycle_close.py --cycle {n} --commit")
        return 0

    # commit
    payload = [{k: m[k] for k in ("team_id", "box_from", "box_to", "seed_to", "place", "pts", "played", "won", "voided", "outcome", "winner")} for m in moves]
    result = sb_rpc("box_admin_close_cycle", {"p_key": os.environ.get("SITE_ADMIN_KEY", ""), "p_cycle": n, "p_moves": payload})
    text = pack_text(cycle, tables, moves, matches, teams_by_id, result)
    io.open(os.path.join(PACK_DIR, f"cycle{n}_pack.md"), "w", encoding="utf-8").write(text)
    print(text)
    if result.get("status") != "ok":
        print(f"{NL}CLOSE REFUSED: {result}")
        if auto:
            wh.send(f"W7 Box League - cycle {n} close FAILED: {result.get('status')}", [RICHIE],
                    f"The overnight close of cycle {n} was refused by Supabase: {json.dumps(result)}{NL}{NL}"
                    f"If the SQL in supabase/box_cycle_close_04Oct2026.sql has not been run yet, run it, then:{NL}"
                    f"  python scripts/box_cycle_close.py --cycle {n} --commit{NL}{NL}{text}")
        return 1

    emails, out_dir, summary = render_emails(n, wh)
    print(NL.join(summary))
    if auto or "--notify" in args:
        samples = []
        for outcome in ("up", "down", "stay"):
            e = next((e for e in emails if e["outcome"] == outcome), None)
            if e:
                p = os.path.join(out_dir, f"_sample_{outcome}.html"); io.open(p, "w", encoding="utf-8").write(e["html"]); samples.append(p)
        body = NL.join([
            f"Cycle {n} is closed and cycle {n + 1} is live on the site: {result}",
            "",
            NL.join(summary),
            "",
            "The three sample drafts are attached (promoted / relegated / staying). To send all of them:",
            f"  python C:\\Users\\Richie\\w7-league\\scripts\\box_cycle_close.py --cycle {n} --send --yes",
            "or tell Claude to send them.",
            "",
            text,
        ])
        wh.send(f"W7 Box League - cycle {n} closed: {sum(1 for m in moves if m['outcome'] == 'up')} up, "
                f"{sum(1 for m in moves if m['outcome'] == 'down')} down - drafts ready", [RICHIE], body, attachments=samples)
        print("pack emailed to Richie")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
