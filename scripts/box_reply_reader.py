# -*- coding: utf-8 -*-
"""Read team replies to the dispute follow-up and put the agreed score into the box league.

Richie, 15 Sep 2026: "we do want this project to be able to see the replies to be able to auto
reflect in the scoring system? can we hook up welcome@w7padel.com for monitoring?"

How it applies a reply, without giving email any more power than the site already has:
  * Only replies to "W7 Box League — please confirm the final score" / "scores differ" emails,
    for a match that is still disputed or submitted, are read.
  * The winner and the set scores are read from the reply. Anything unclear is NOT guessed:
    it is passed to welcome@ to set by hand.
  * The score is entered through submit_box_score with the SENDER's email, exactly as if that
    player had typed it on the site. So the sender must be registered to one of the two teams,
    and the other team still has to agree: they get the normal "please confirm" email, and if
    they reply with the same score too, the match confirms itself (the site's cross-submit rule).
  * Every processed email is recorded by Message-ID, so nothing is applied twice.
  * W7 gets one short summary email per run listing what was applied and what needs a human.

Mailbox: REPLY_IMAP_USER / REPLY_IMAP_PASSWORD in .env.local (an app password for the mailbox that
receives the replies). If REPLY_IMAP_USER is unset, the notifier's own Gmail is read, which works
once welcome@ forwards these replies to it. With no working login the reader does nothing.

Called from box_league_notify.py every 15 minutes. Standalone:
    python scripts/box_reply_reader.py --dry-run
    python scripts/box_reply_reader.py --test          (offline parser checks, no mailbox)
"""
import email
import imaplib
import io
import json
import os
import re
import sys
import urllib.request
from datetime import datetime, timedelta
from email.header import decode_header, make_header
from email.utils import parseaddr

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from box_league_mailout import RELAY, load_env, sb_get, contacts_by_team_name  # noqa: E402

STATE = os.path.join(ROOT, "data", "box_reply_state.json")
W7_INBOX = "welcome@w7padel.com"
W7_SENDERS = {"welcome@w7padel.com", "w7padel@gmail.com", "mike@w7padel.com", "richiecarroll65@gmail.com"}
SUBJECT_HINTS = ("please confirm the final score", "scores differ")
LOOKBACK_DAYS = 7

# a full stop only counts as part of a number when a digit follows it ("6-2." ends a sentence)
SET_RE = re.compile(r"(?<![\d:/])(?<!\d\.)(\d{1,2})\s*[-\u2013\u2014]\s*(\d{1,2})(?![\d:/]|\.\d)")
WIN_WORDS = re.compile(r"\b(won|win|winners?|winning|beat|bt|defeated)\b", re.I)
WE_WON = re.compile(r"\b(we|us)\s+(won|win|beat|were the winners)\b|\bwon by us\b", re.I)
WE_LOST = re.compile(r"\b(we|us)\s+(lost|lose|were beaten)\b|\bthey\s+(won|beat us)\b", re.I)


# ── parsing ──────────────────────────────────────────────────────────────────────────────────
def strip_quoted(body):
    """The new part of a reply: stop at the quoted original."""
    out = []
    for line in body.splitlines():
        s = line.strip()
        if s.startswith(">") or re.match(r"^On .+wrote:?$", s) or s.startswith("-----Original Message") \
                or re.match(r"^From:\s", s) or s.startswith("W7 Box League"):
            break
        out.append(line)
    return "\n".join(out)


def parse_sets(text):
    """[(a, b), ...] for the first 2-3 plausible set scores, in the order written."""
    sets = []
    for m in SET_RE.finditer(text):
        a, b = int(m.group(1)), int(m.group(2))
        if a == b or max(a, b) < 6 and max(a, b) != 0:
            continue                              # not a padel set or tie-break score
        sets.append((a, b))
        if len(sets) == 3:
            break
    return sets


def _names(team):
    """Lower-case tokens that identify a team: full names, surnames and first names."""
    toks = set()
    for p in (team.get("p1") or "", team.get("p2") or ""):
        p = p.strip().lower()
        if not p:
            continue
        toks.add(p)
        parts = [w for w in re.split(r"\s+", p) if len(w) >= 3 and not w.isdigit()]
        toks.update(parts)
    return toks


def _hits(text, team):
    low = text.lower()
    return [(m.start(), tok) for tok in _names(team) for m in re.finditer(r"\b" + re.escape(tok) + r"\b", low)]


def find_winner(text, t1, t2, sender_team_id):
    """(team, reason) — the winning team, or (None, why not)."""
    if sender_team_id:
        if WE_WON.search(text):
            return (t1 if sender_team_id == t1["id"] else t2), "sender says they won"
        if WE_LOST.search(text):
            return (t2 if sender_team_id == t1["id"] else t1), "sender says they lost"
    h1, h2 = _hits(text, t1), _hits(text, t2)
    # a name shared by both teams tells us nothing
    shared = {tok for _, tok in h1} & {tok for _, tok in h2}
    h1 = [h for h in h1 if h[1] not in shared]
    h2 = [h for h in h2 if h[1] not in shared]
    if not WIN_WORDS.search(text):
        return None, "no winner named"
    if h1 and not h2:
        return t1, "only one team named"
    if h2 and not h1:
        return t2, "only one team named"
    if not h1 and not h2:
        return None, "no team named"
    # both named: "X beat Y" / "X won" -> X is the first team named before the win word;
    # "won by X" / "winners: X" -> the first team named after it. With more than one win word
    # ("Helena won the toss, Caragh won 6-2 6-1") it is not safe to pick: W7 decides.
    if len(WIN_WORDS.findall(text)) > 1:
        return None, "both teams named, winner unclear"
    w = WIN_WORDS.search(text)
    word = w.group(1).lower()
    before1 = [p for p, _ in h1 if p < w.start()]
    before2 = [p for p, _ in h2 if p < w.start()]
    after1 = [p for p, _ in h1 if p > w.end()]
    after2 = [p for p, _ in h2 if p > w.end()]
    if word in ("won", "win", "beat", "bt", "defeated") and not re.match(r"\s*by\b", text[w.end():]):
        if before1 and (not before2 or max(before1) > max(before2)):
            return t1, "team named before '" + word + "'"
        if before2 and (not before1 or max(before2) > max(before1)):
            return t2, "team named before '" + word + "'"
    if after1 and (not after2 or min(after1) < min(after2)):
        return t1, "team named after '" + word + "'"
    if after2 and (not after1 or min(after2) < min(after1)):
        return t2, "team named after '" + word + "'"
    return None, "both teams named, winner unclear"


def orient(sets, winner, t1):
    """Sets as stored ([team1 games, team2 games]) given the winner. Scores are read the way they
    were written; if the written first numbers win the majority, the first number is the winner's."""
    first_wins = sum(1 for a, b in sets if a > b)
    if first_wins * 2 == len(sets):
        return None
    winner_first = first_wins * 2 > len(sets)
    rows = []
    for a, b in sets:
        w_games, l_games = (a, b) if winner_first else (b, a)
        rows.append([w_games, l_games] if winner["id"] == t1["id"] else [l_games, w_games])
    return rows


def valid(sets):
    if not sets or not 2 <= len(sets) <= 3:
        return False
    s1 = sum(1 for a, b in sets if a > b)
    s2 = len(sets) - s1
    return s1 != s2 and not (len(sets) == 3 and (s1 == 3 or s2 == 3))


def read_reply(text, t1, t2, sender_team_id):
    """(sets_as_stored, None) or (None, reason to pass it to W7)."""
    body = strip_quoted(text)
    sets = parse_sets(body)
    if len(sets) < 2:
        return None, "no score found in the reply"
    winner, why = find_winner(body, t1, t2, sender_team_id)
    if not winner:
        return None, why
    rows = orient(sets, winner, t1)
    if not rows or not valid(rows):
        return None, "score does not add up to a winner"
    return rows, None


def fmt(sets):
    return ", ".join(f"{a}-{b}" for a, b in sets)


# ── mailbox ──────────────────────────────────────────────────────────────────────────────────
def _plain(msg):
    parts = msg.walk() if msg.is_multipart() else [msg]
    for p in parts:
        if p.get_content_type() == "text/plain" and "attachment" not in str(p.get("Content-Disposition", "")):
            raw = p.get_payload(decode=True) or b""
            return raw.decode(p.get_content_charset() or "utf-8", "replace")
    for p in parts:
        if p.get_content_type() == "text/html":
            raw = (p.get_payload(decode=True) or b"").decode(p.get_content_charset() or "utf-8", "replace")
            return re.sub(r"<[^>]+>", " ", re.sub(r"(?i)<br\s*/?>|</p>|</div>", "\n", raw))
    return ""


def fetch_replies():
    """[{id, from, subject, text}] of recent replies, or None when there is no working mailbox."""
    user = os.environ.get("REPLY_IMAP_USER") or os.environ.get("GMAIL_USER")
    pw = os.environ.get("REPLY_IMAP_PASSWORD") or (
        os.environ.get("GMAIL_APP_PASSWORD") if user == os.environ.get("GMAIL_USER") else None)
    if not (user and pw):
        print("reply reader: no mailbox login configured, skipped")
        return None
    try:
        box = imaplib.IMAP4_SSL(os.environ.get("REPLY_IMAP_HOST", "imap.gmail.com"))
        box.login(user, pw)
    except Exception as exc:
        print(f"reply reader: mailbox login failed ({type(exc).__name__}), skipped")
        return None
    out = []
    try:
        box.select("INBOX", readonly=True)
        since = (datetime.now() - timedelta(days=LOOKBACK_DAYS)).strftime("%d-%b-%Y")
        _, ids = box.search(None, f'(SINCE "{since}" SUBJECT "W7 Box League")')
        for num in ids[0].split():
            _, data = box.fetch(num, "(RFC822)")
            msg = email.message_from_bytes(data[0][1])
            subject = str(make_header(decode_header(msg.get("Subject", ""))))
            sender = parseaddr(msg.get("From", ""))[1].lower()
            if sender in W7_SENDERS or not any(h in subject.lower() for h in SUBJECT_HINTS):
                continue
            out.append({"id": msg.get("Message-ID") or f"{sender}:{msg.get('Date')}", "from": sender,
                        "subject": subject, "text": _plain(msg)})
    finally:
        box.logout()
    return out


def match_for_subject(subject, matches, teams):
    low = subject.lower()
    found = [m for m in matches
             if teams.get(m["team1_id"]) and teams.get(m["team2_id"])
             and teams[m["team1_id"]]["name"].lower() in low and teams[m["team2_id"]]["name"].lower() in low]
    return found[0] if len(found) == 1 else None


def sb_rpc(fn, body):
    url, key = os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
    req = urllib.request.Request(f"{url}/rest/v1/rpc/{fn}", data=json.dumps(body).encode(), method="POST",
                                 headers={"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    return json.loads(urllib.request.urlopen(req).read())


# ── run ──────────────────────────────────────────────────────────────────────────────────────
def run(wh=None, dry=False, replies=None):
    """Apply what can be applied; return the number of scores entered."""
    replies = fetch_replies() if replies is None else replies
    if not replies:
        return 0
    state = json.load(open(STATE, encoding="utf-8")) if os.path.exists(STATE) else {}
    teams = {t["id"]: t for t in sb_get("box_teams?select=id,box,name,p1,p2")}
    matches = sb_get("box_matches?select=id,box,status,sets,team1_id,team2_id&status=in.(disputed,submitted)&box=lt.90")
    team_of_email = {}
    for name, addrs in contacts_by_team_name().items():
        for a in addrs:
            team_of_email.setdefault(a.lower(), name)
    by_name = {t["name"]: t for t in teams.values()}

    applied, for_w7 = [], []
    for r in replies:
        if r["id"] in state:
            continue
        m = match_for_subject(r["subject"], matches, teams)
        if not m:
            # already confirmed, or not a match we can place: nothing to do, remember it
            state[r["id"]] = "no-open-match"
            continue
        t1, t2 = teams[m["team1_id"]], teams[m["team2_id"]]
        sender_team = by_name.get(team_of_email.get(r["from"], ""))
        sender_team_id = sender_team["id"] if sender_team and sender_team["id"] in (t1["id"], t2["id"]) else None
        sets, why = read_reply(r["text"], t1, t2, sender_team_id)
        label = f"Box {m['box']}: {t1['name']} v {t2['name']}"
        if not sets:
            for_w7.append(f"{label}\n  from {r['from']}: {why}\n  reply: {strip_quoted(r['text']).strip()[:300]}")
            state[r["id"]] = "for-w7: " + why
            continue
        if dry:
            print(f"[dry-run] would enter {fmt(sets)} for {label} as {r['from']}")
            continue
        res = sb_rpc("submit_box_score", {"p_match": m["id"], "p_sets": sets, "p_email": r["from"]})
        if res in ("ok_submitted", "ok_confirmed", "ok_disputed"):
            outcome = {"ok_submitted": "entered, waiting for the other team to confirm",
                       "ok_confirmed": "both teams agree, result confirmed",
                       "ok_disputed": "the teams still disagree, left disputed"}[res]
            applied.append(f"{label}\n  {fmt(sets)} from {r['from']}: {outcome}")
            state[r["id"]] = res
        else:
            why = {"not_registered": "the sender's email is not registered to either team"}.get(res, res)
            for_w7.append(f"{label}\n  {fmt(sets)} from {r['from']} could not be entered: {why}")
            state[r["id"]] = "for-w7: " + str(res)

    if not dry:
        os.makedirs(os.path.dirname(STATE), exist_ok=True)
        json.dump(state, open(STATE, "w", encoding="utf-8"), indent=1)
    for line in applied + for_w7:
        print("reply reader:", line.replace("\n", " |"))
    if (applied or for_w7) and wh and not dry:
        text = "\n".join(
            (["ENTERED FROM EMAIL REPLIES", ""] + [a + "\n" for a in applied] if applied else [])
            + (["NEEDS YOU: set these by hand", ""] + [f + "\n" for f in for_w7] if for_w7 else [])
            + ["— W7 box league reply reader"])
        subject = f"W7 Box League replies — {len(applied)} entered, {len(for_w7)} need you"
        wh.send(subject, [W7_INBOX], text, wh.shell("Box League", "Score replies", wh.auto_body(text)))
    return len(applied)


def _self_test():
    t1 = {"id": "a", "name": "Caragh Daly & Kerry Callery", "p1": "Caragh Daly", "p2": "Kerry Callery"}
    t2 = {"id": "b", "name": "Helena Plower & Olive Ramsay", "p1": "Helena Plower", "p2": "Olive Ramsay"}
    quoted = "\n\nOn Mon, 14 Sep 2026 at 20:30, W7 Padel wrote:\n> Caragh Daly & Kerry Callery v Helena Plower & Olive Ramsay 1-6, 2-6"
    cases = [
        ("Helena and Olive won 6-1 6-2" + quoted, None, [[1, 6], [2, 6]]),
        ("Hi, we won 6-1, 6-2. Thanks Caragh", "a", [[6, 1], [6, 2]]),
        ("We lost 1-6 2-6 unfortunately", "a", [[1, 6], [2, 6]]),
        ("Caragh & Kerry beat Helena & Olive 6-4, 3-6, 10-8", None, [[6, 4], [3, 6], [10, 8]]),
        ("Winners: Plower and Ramsay, 6-3 6-4", None, [[3, 6], [4, 6]]),
        ("Won by Helena and Olive 7-5 6-2", None, [[5, 7], [2, 6]]),
        ("Final score 6-1 6-2", None, None),               # no winner: W7 decides
        ("Helena won the toss, Caragh won 6-2 6-1", None, None),   # both named ambiguously
        ("Olive and Helena won, booked at 18:30-20:00", None, None),  # a time is not a score
        ("we won 6-1 6-1 6-2", "a", None),                   # 3 straight sets does not add up
    ]
    bad = 0
    for text, sender, want in cases:
        got, why = read_reply(text, t1, t2, sender)
        ok = got == want
        bad += not ok
        print(("ok  " if ok else "FAIL"), repr(text.split("\n")[0])[:60], "->", got or why)
    print("all parser checks passed" if not bad else f"{bad} parser check(s) failed")
    return 1 if bad else 0


if __name__ == "__main__":
    if "--test" in sys.argv:
        raise SystemExit(_self_test())
    load_env()
    raise SystemExit(0 if run(dry="--dry-run" in sys.argv) >= 0 else 1)
