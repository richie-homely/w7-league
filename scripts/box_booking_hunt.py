# -*- coding: utf-8 -*-
"""Hunt for the W7 bookings behind box fixtures the site shows as "no W7 booking found".

Richie, 4 Oct 2026: "for the box league games that are showing as no w7 booking found, can you
check if there are games booked in any of the individual players' names that they might be
using, and we can check playtomic results - if they played in w7".

league_bookings.py only credits a fixture when both players of BOTH teams are named on one
booking. This looks wider: every W7 booking since the league opened whose participants include
ANY of the four players, by registered email first (Playtomic puts the email on each named
participant) and then by name. Each candidate is graded by how many of the four it carries and
from which team, so a 2+2 with two unnamed slots reads as "probably their game" and a lone
player in a social four reads as what it is.

Nothing is written to Supabase. Playtomic's manager API carries no scores, so a candidate that
looks like the game still has to be checked in the Playtomic app for the result.

    python scripts/box_booking_hunt.py                 # cycle 1, fixtures with no booking found
    python scripts/box_booking_hunt.py --cycle 2 --all # every fixture, not just the unmatched
"""
import io, os, re, sys
from collections import defaultdict
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
import league_bookings as lb                                   # noqa: E402
from box_league_mailout import load_env, sb_get, contacts_by_team_name   # noqa: E402

DUB = ZoneInfo("Europe/Dublin")
norm = lb.norm


def name_keys(n):
    """Keys for one name: the full normalised name, plus first+surname-initial ONLY when the
    surname is itself an initial ("Dawn B", "Ana J", "Leanne S"). A full surname never
    collapses to its initial: Dylan Furlong and Dylan Frazer share a box and must not match."""
    toks = [t for t in re.split(r"[^A-Za-z']+", n or "") if t]
    keys = {norm(n)}
    if len(toks) >= 2 and len(norm(toks[-1])) == 1:
        keys.add(norm(toks[0]) + "|" + norm(toks[-1]))   # "dawn|b": meets "Dawn Byrne" through initial_key()
    return keys


def initial_key(n):
    """first|surname-initial for a full name, so an initial-surname name can meet it one way only."""
    toks = [t for t in re.split(r"[^A-Za-z']+", n or "") if t]
    return norm(toks[0]) + "|" + norm(toks[-1])[:1] if len(toks) >= 2 else None


def main():
    load_env()
    args = sys.argv[1:]
    cycle = int(args[args.index("--cycle") + 1]) if "--cycle" in args else 1
    everything = "--all" in args
    teams = {t["id"]: t for t in sb_get("box_teams?select=id,box,seed,name,p1,p2,active&box=lt.90")}
    fixtures = sb_get(f"box_matches?select=id,box,status,team1_id,team2_id,updated_at&cycle=eq.{cycle}&box=lt.90&order=box")
    found = {r["match_key"] for r in sb_get("league_bookings?select=match_key&kind=eq.box&limit=5000")}
    targets = [m for m in fixtures if everything or m["id"] not in found]
    contacts = contacts_by_team_name()
    excluded = lb.not_fixtures()

    # every W7 booking since the league opened, by participant email and by loose name
    bookings = [b for b in lb.fetch_bookings(0, back=(datetime.now(DUB).date() - datetime.fromisoformat(lb.BOX_OPEN).date()).days + 1)]
    by_email, by_name = defaultdict(set), defaultdict(set)
    rec = {}
    for b in bookings:
        parts = (b.get("participant_info") or {}).get("participants") or []
        when = datetime.fromisoformat(b["booking_start_date"]).replace(tzinfo=timezone.utc).astimezone(DUB)
        if when.strftime("%Y-%m-%d") < lb.BOX_OPEN:
            continue
        key = b["booking_id"]
        rec[key] = {"when": when, "court": b.get("resource_name") or "", "names": [p.get("name") or "?" for p in parts],
                    "n_named": len(parts), "type": b.get("booking_type") or "", "excluded": (when.strftime("%Y-%m-%d %H:%M"), b.get("resource_name") or "") in excluded}
        for p in parts:
            if p.get("email"):
                by_email[p["email"].strip().lower()].add(key)
            for k in name_keys(p.get("name")):
                by_name[k].add(key)
            # a full booking name is also findable by a player whose registered surname is an initial
            ik = initial_key(p.get("name"))
            if ik and len(norm(p.get("name").split()[-1])) > 1:
                by_name["~" + ik].add(key)

    now = datetime.now(DUB)
    out = [f"BOX LEAGUE - BOOKING HUNT, cycle {cycle} ({'every fixture' if everything else 'fixtures with no W7 booking found'}) - {now:%a %d %b %H:%M}",
           f"{len(targets)} fixtures checked against {len(rec)} W7 bookings since {lb.BOX_OPEN}", ""]
    grades = defaultdict(int)
    for m in targets:
        t1, t2 = teams[m["team1_id"]], teams[m["team2_id"]]
        players = [(t1, t1["p1"]), (t1, t1["p2"]), (t2, t2["p1"]), (t2, t2["p2"])]
        # evidence per booking per team: named players, plus registered emails seen on the
        # booking (an email proves ONE person of that team is there, not both of them)
        hits = defaultdict(lambda: {"players": set(), "emails": defaultdict(set), "via": set()})
        for team, pname in players:
            keys = set(name_keys(pname))
            if initial_key(pname) and len(norm(pname.split()[-1])) == 1:
                keys.add("~" + initial_key(pname))    # "Dawn B" meets "Dawn Byrne"; "Dylan Furlong" never meets "Dylan Frazer"
            for nk in keys:
                for k in by_name.get(nk, ()):
                    hits[k]["players"].add((team["id"], pname)); hits[k]["via"].add("name")
        for team in (t1, t2):
            for e in contacts.get(team["name"], []):
                for k in by_email.get(e.lower(), ()):
                    hits[k]["emails"][team["id"]].add(e.lower()); hits[k]["via"].add("email")
        cands = []
        for k, h in hits.items():
            r = rec[k]
            if r["n_named"] > 4:
                continue   # a course or an event list, not a game
            def count(team):
                named = {p for tid, p in h["players"] if tid == team["id"]}
                return min(2, max(len(named), len(h["emails"][team["id"]])))
            n1, n2 = count(t1), count(t2)
            h["who"] = sorted({p for _, p in h["players"]}) + ([f"{len(h['emails'][t1['id']])} email(s) of {t1['name']}"] if not any(tid == t1["id"] for tid, _ in h["players"]) and h["emails"][t1["id"]] else []) \
                       + ([f"{len(h['emails'][t2['id']])} email(s) of {t2['name']}"] if not any(tid == t2["id"] for tid, _ in h["players"]) and h["emails"][t2["id"]] else [])
            if n1 and n2:
                grade = "ALL FOUR" if n1 == 2 and n2 == 2 else ("3 of 4" if n1 + n2 == 3 else "one from each team")
            else:
                grade = "same team only" if n1 + n2 == 2 else "one player"
            cands.append((grade, r, h))
        order = {"ALL FOUR": 0, "3 of 4": 1, "one from each team": 2, "same team only": 3, "one player": 4}
        cands.sort(key=lambda c: (order[c[0]], -c[1]["when"].timestamp()))
        best = cands[0][0] if cands else "nothing"
        grades[best] += 1
        out.append(f"BOX {m['box']} [{m['status']}]  {t1['name']}  v  {t2['name']}   -> {best}")
        shown_weak = 0
        for grade, r, h in cands:
            if grade == "one player" and best != "one player":
                continue   # a lone player in somebody else's social is noise once a better candidate exists
            if grade in ("same team only", "one player"):
                shown_weak += 1
                if shown_weak > 3:
                    continue   # the team's own socials: three most relevant are enough
            who = ", ".join(h["who"])
            flag = "  [listed in not_fixtures.csv]" if r["excluded"] else ""
            played = "played" if r["when"] < now else "booked"
            out.append(f"    {grade:<18} {played} {r['when']:%a %d %b %H:%M} {r['court']:<8} {r['n_named']} named: {', '.join(r['names'])}   <- {who} (by {'/'.join(sorted(h['via']))}){flag}")
        if not cands:
            out.append("    no W7 booking with any of the four players named")
    out += ["", "SUMMARY: " + ", ".join(f"{k}: {v}" for k, v in sorted(grades.items(), key=lambda x: order.get(x[0], 9))),
            "Grades: ALL FOUR = both teams fully named (should have matched - check spelling or the outsiders rule);",
            "3 of 4 / one from each team = probably their game with a sub or an unnamed slot - check the Playtomic app for the score;",
            "same team only / one player = a social or someone else's game, not evidence the fixture was played."]
    text = "\n".join(out)
    print(text)
    os.makedirs(os.path.join(ROOT, "data"), exist_ok=True)
    p = os.path.join(ROOT, "data", f"box_booking_hunt_cycle{cycle}_{now:%Y%m%d}.md")
    io.open(p, "w", encoding="utf-8").write(text + "\n")
    print(f"\nsaved {p}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
