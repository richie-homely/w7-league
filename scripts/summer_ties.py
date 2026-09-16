# -*- coding: utf-8 -*-
"""What counts as a real summer league game — one copy of the rule, used by every script.

Richie, 16 Sep 2026: "The usage table said 10 summer league games were playing this week but
that can't be the case ... let's stop showing those as summer league and see what they actually
are - and tidy up the matching and cross checks".

The bookings detector matches any booking with four players from two same-tier summer teams, so
a social between two league pairs counted as a league game. A booking is a real game only when
the two teams owed each other one AT THE TIME OF THE BOOKING:

  * before the knockouts (group stage) — the pair is a fixture in the `fixtures` table
  * from 1 Sep 2026 (knockouts)        — the pair is a bracket tie: both qualified and neither
                                         is out, or the tie is already in KNOCKOUT_RESULTS

The date matters: two teams who met in the round-robin and book each other again in September
are playing a friendly, not their fixture — that is how a September rematch was being counted as
a summer league game. A booking naming only one league team is open: it may become that team's
next game once the opponents are added.
"""
import io
import os
import re
import sys
from datetime import date, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))

# First knockout tie played 1 Sep 2026 (src/lib/bracket.ts); the group stage ran to 31 Aug.
KNOCKOUTS_FROM = date(2026, 9, 1)


def _as_date(when):
    if when is None:
        return date.today()
    if isinstance(when, datetime):
        return when.date()
    if isinstance(when, date):
        return when
    return datetime.fromisoformat(str(when)[:19].replace("Z", "")).date()


def played_and_out(bracket_ts=None):
    """({frozenset(pair) already played}, {team ids knocked out}) from bracket.ts."""
    path = bracket_ts or os.path.join(ROOT, "src", "lib", "bracket.ts")
    src = io.open(path, encoding="utf-8").read()
    src = src[src.index("KNOCKOUT_RESULTS"):]
    played, out = set(), set()
    for block in re.findall(r"\{(.*?)playedOn", src, re.S):
        ids = re.findall(r'"([0-9a-f-]{36})"', block)
        win = re.search(r'winnerTeamId:\s*"([0-9a-f-]{36})"', block)
        if len(ids) >= 2:
            played.add(frozenset(ids[:2]))
            if win:
                out.update(i for i in ids[:2] if i != win.group(1))
    return played, out


class TieRule:
    """is_fixture(a, b, when) -> True when those two teams owed each other a game that day."""

    def __init__(self, sb_get=None, qualifiers_fn=None):
        if sb_get is None:
            from box_league_mailout import sb_get as _get
            sb_get = _get
        if qualifiers_fn is None:
            import results_check
            qualifiers_fn = results_check.qualifiers
        self.group = {frozenset((f["team1_id"], f["team2_id"]))
                      for f in sb_get("fixtures?select=team1_id,team2_id&limit=2000")
                      if f.get("team1_id") and f.get("team2_id")}
        self.quals = set(qualifiers_fn())
        self.played, self.out = played_and_out()

    def is_tie(self, a, b):
        """A knockout tie: already played, or both still alive in the bracket."""
        if frozenset((a, b)) in self.played:
            return True
        return {a, b} <= self.quals and not (self.out & {a, b})

    def is_group_fixture(self, a, b, when=None):
        return frozenset((a, b)) in self.group and _as_date(when) < KNOCKOUTS_FROM

    def is_fixture(self, a, b, when=None):
        return self.is_group_fixture(a, b, when) or self.is_tie(a, b)

    def why(self, a, b, when=None):
        if self.is_group_fixture(a, b, when):
            return "group-stage fixture"
        if self.is_tie(a, b):
            return "knockout tie"
        if frozenset((a, b)) in self.group:
            return "rematch of a group fixture, after the group stage"
        return "not a fixture"

    def kind_for(self, team_ids, when=None):
        """'summer' | 'open' | 'friendly' for a booking's summer team ids."""
        if len(team_ids) < 2:
            return "open"
        return "summer" if self.is_fixture(team_ids[0], team_ids[1], when) else "friendly"


def rule(sb_get=None, qualifiers_fn=None):
    """A TieRule, or None when the data cannot be read (callers then leave labels alone)."""
    try:
        return TieRule(sb_get, qualifiers_fn)
    except Exception as exc:
        print(f"summer_ties: rule unavailable, summer bookings stay labelled summer ({type(exc).__name__}: {exc})")
        return None
