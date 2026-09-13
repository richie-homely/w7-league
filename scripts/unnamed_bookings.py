# -*- coding: utf-8 -*-
"""Likely box league games hiding in bookings that do not name opponents yet.

Richie, 13 Sep 2026: "players book a court in their name and don't add opponents straight
away", then "what's the estimate for those 1 person bookings which could become box league
games?" and "we can mention these in the usage stats and emails".

Until both teams are named the fixture detector cannot see a booking as a league game, so
"already booked" undercounts and "left to book" overstates. This scores each such booking with
the chance it becomes its team's league fixture, using rates measured from the club's own
bookings since the box league opened:

  * a whole box pair on a fully named booking turns out to be a league fixture  -> pair rate
  * a box player's partner is on their booking at all                            -> partner rate
    so a lone booker scores partner rate x pair rate
  * a team books a second league game in the same week                           -> second rate

Ruled out: one person holding several courts at the same time (a group session), a team with
no fixtures left, under an hour, and a pair still alive in the summer knockouts (it is
probably that tie). Each team gets at most one extra likely game per week beyond what it has.

estimate() is called by league_bookings.py with the bookings it has already pulled, so it
costs no extra Playtomic call. Per week: low = pair bookings weighted, central = all weighted,
high = every booking still plausible.
"""
import io
import os
import re
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IE = ZoneInfo("Europe/Dublin")
LEAGUE_OPEN = datetime(2026, 9, 10, tzinfo=IE)
norm = lambda n: re.sub(r"[^a-z]", "", (n or "").lower())   # noqa: E731


def _alive_knockout_players(sb_get):
    """Normalised names of summer players whose knockout run is still going."""
    # results_check reads Supabase through box_league_mailout, which needs the site env loaded.
    # league_bookings.py never loads it into os.environ, so without this the lookup failed and the
    # exclusion silently did nothing (Earls & Keogh's Tuesday knockout booking was being scored).
    try:
        from box_league_mailout import load_env
        load_env()
        import results_check
        quals = results_check.qualifiers()
    except Exception as exc:
        print(f"unnamed_bookings: knockout lookup failed, no pairs excluded ({type(exc).__name__}: {exc})")
        return set()
    src = io.open(os.path.join(ROOT, "src", "lib", "bracket.ts"), encoding="utf-8").read()
    src = src[src.index("KNOCKOUT_RESULTS"):]
    out = set()
    for block in re.findall(r"\{(.*?)playedOn", src, re.S):
        ids = re.findall(r'"([0-9a-f-]{36})"', block)
        win = re.search(r'winnerTeamId:\s*"([0-9a-f-]{36})"', block)
        if len(ids) >= 2 and win:
            quals.discard(next(i for i in ids[:2] if i != win.group(1)))
    for t in sb_get("teams?select=id,p1,p2&limit=300"):
        if t["id"] in quals:
            out.add(frozenset((norm(t["p1"]), norm(t["p2"]))))
    return out


def estimate(all_bookings, detected_keys, sb_get, now=None):
    """Score every future booking involving a box team that does not name both teams.

    all_bookings   raw Playtomic bookings (the list league_bookings.py already fetched)
    detected_keys  {(Dublin "YYYY-MM-DD HH:MM", court)} of bookings matched to a box fixture
    Returns (rows, rates): rows ready for league_unnamed_set, rates for reporting."""
    now = now or datetime.now(timezone.utc)
    teams = [t for t in sb_get("box_teams?select=id,box,name,p1,p2,active&box=lt.90&limit=500") if t["active"]]
    tby = {t["id"]: t for t in teams}
    by_player = {}
    for t in teams:
        by_player[norm(t["p1"])] = t
        by_player[norm(t["p2"])] = t
    pend_n = defaultdict(int)
    for m in sb_get("box_matches?select=team1_id,team2_id&status=eq.pending&box=lt.90&limit=2000"):
        pend_n[m["team1_id"]] += 1
        pend_n[m["team2_id"]] += 1
    alive_ko = _alive_knockout_players(sb_get)

    bk = []
    for b in all_bookings:
        if b.get("is_canceled"):
            continue
        st = datetime.fromisoformat(b["booking_start_date"]).replace(tzinfo=timezone.utc).astimezone(IE)
        if st < LEAGUE_OPEN:
            continue
        en = datetime.fromisoformat(b["booking_end_date"]).replace(tzinfo=timezone.utc).astimezone(IE)
        names = [p.get("name") for p in ((b.get("participant_info") or {}).get("participants") or [])]
        cnt = defaultdict(int)
        for n in names:
            t = by_player.get(norm(n))
            if t:
                cnt[t["id"]] += 1
        if not cnt:
            continue
        court = b.get("resource_name") or ""
        bk.append({"st": st, "mins": (en - st).total_seconds() / 60, "court": court, "names": names,
                   "cnt": dict(cnt), "league": (st.strftime("%Y-%m-%d %H:%M"), court) in detected_keys,
                   "future": st > now, "week": (st - timedelta(days=st.weekday())).strftime("%Y-%m-%d")})

    # Rates, measured.
    resolved = [x for x in bk if len(x["names"]) >= 4 or x["league"]]
    pair_res = [x for x in resolved if any(v >= 2 for v in x["cnt"].values())]
    p_pair = sum(1 for x in pair_res if x["league"]) / len(pair_res) if pair_res else 0.0
    multi = [x for x in bk if len(x["names"]) >= 2]
    p_partner = sum(1 for x in multi if any(v >= 2 for v in x["cnt"].values())) / len(multi) if multi else 0.0
    lg_team_week = defaultdict(int)
    for x in bk:
        if x["league"]:
            for tid, v in x["cnt"].items():
                if v >= 1:
                    lg_team_week[(tid, x["week"])] += 1
    had1 = sum(1 for v in lg_team_week.values() if v >= 1)
    had2 = sum(1 for v in lg_team_week.values() if v >= 2)
    p_second = had2 / had1 if had1 else 0.0

    group = defaultdict(int)
    for x in bk:
        group[(norm(x["names"][0]) if x["names"] else "", x["st"])] += 1

    cands = []
    for x in bk:
        if not x["future"] or x["league"] or len(x["names"]) >= 4 or len(x["cnt"]) != 1:
            continue
        tid = next(iter(x["cnt"]))
        t = tby[tid]
        shape = "pair" if x["cnt"][tid] >= 2 else "single"
        p = p_pair if shape == "pair" else p_partner * p_pair
        reason = ""
        if group[(norm(x["names"][0]), x["st"])] >= 2:
            p, reason = 0.0, "one booker holds several courts at that time: a group session"
        elif pend_n[tid] == 0:
            p, reason = 0.0, "team has no box fixtures left"
        elif x["mins"] < 60:
            p, reason = 0.0, "under an hour"
        elif frozenset((norm(t["p1"]), norm(t["p2"]))) in alive_ko:
            p, reason = 0.0, "pair is still in the summer knockouts: probably that tie"
        elif lg_team_week.get((tid, x["week"]), 0) >= 1:
            p, reason = p * p_second, "team already has a league game booked that week"
        cands.append({"x": x, "tid": tid, "team": t["name"], "box": t["box"], "shape": shape, "p": p, "reason": reason})

    # At most one extra likely game per team per week: keep the likeliest.
    kept = set()
    for c in sorted(cands, key=lambda c: -c["p"]):
        k = (c["tid"], c["x"]["week"])
        if c["p"] <= 0:
            continue
        if k in kept:
            c["p"], c["reason"] = 0.0, "same team has a likelier booking missing opponents that week"
        else:
            kept.add(k)

    rows = [{"starts_at": c["x"]["st"].astimezone(timezone.utc).isoformat(), "court": c["x"]["court"],
             "box": c["box"], "team": c["team"], "shape": c["shape"], "p": round(c["p"], 3),
             "week": c["x"]["week"], "reason": c["reason"]} for c in cands]
    # league_unnamed is keyed on (starts_at, court); one court can only hold one booking at a time.
    uniq = {}
    for r in rows:
        k = (r["starts_at"], r["court"])
        if k not in uniq or r["p"] > uniq[k]["p"]:
            uniq[k] = r
    rows = sorted(uniq.values(), key=lambda r: r["starts_at"])
    rates = {"pair": p_pair, "partner": p_partner, "second": p_second,
             "n_pair": len(pair_res), "n_multi": len(multi), "n_team_weeks": had1}
    return rows, rates


def summarise(rows):
    """{week: {"low", "central", "high", "n"}} from league_unnamed rows (as stored or computed)."""
    out = defaultdict(lambda: {"low": 0.0, "central": 0.0, "high": 0, "n": 0})
    for r in rows:
        w = str(r["week"])[:10]
        p = float(r["p"] or 0)
        out[w]["n"] += 1
        if p > 0:
            out[w]["central"] += p
            out[w]["high"] += 1
            if r["shape"] == "pair":
                out[w]["low"] += p
    return dict(out)
