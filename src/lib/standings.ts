// Standings computation — ported from the v0.8 artifact.
// Win = 3 pts | Straight-sets (2-0) bonus = +1 pt
// Tiebreak: Points -> H2H -> Set diff -> Game diff
import type { Fixture, StandingRow, Team } from "./types";

export function computeStandings(
  divisionId: string,
  teamsByDiv: Record<string, Team[]>,
  fixtures: Fixture[]
): StandingRow[] {
  const divTeams = teamsByDiv[divisionId] ?? [];
  const rows: StandingRow[] = divTeams.map((t) => ({
    teamId: t.id,
    team: t,
    P: 0,
    W: 0,
    L: 0,
    Pts: 0,
    Bonus: 0,
    SF: 0,
    SA: 0,
    GF: 0,
    GA: 0,
    h2h: {},
    rank: 0,
  }));
  const byId = Object.fromEntries(rows.map((r) => [r.teamId, r]));

  fixtures
    .filter(
      (f) =>
        f.divisionId === divisionId && f.status === "completed" && f.sets
    )
    .forEach((f) => {
      const r1 = byId[f.team1Id];
      const r2 = byId[f.team2Id];
      if (!r1 || !r2) return;
      let s1 = 0;
      let s2 = 0;
      let g1 = 0;
      let g2 = 0;
      f.sets!.forEach(([a, b], idx) => {
        // The deciding 3rd set is a championship tiebreak (first to 10). It still
        // counts as a set won (match goes 2-1), but its points are NOT games —
        // exclude them from the games-for/against tally.
        const isChampionshipTiebreak = idx === 2;
        if (!isChampionshipTiebreak) {
          g1 += a;
          g2 += b;
        }
        if (a > b) s1++;
        else if (b > a) s2++;
      });
      r1.P++;
      r2.P++;
      r1.SF += s1;
      r1.SA += s2;
      r2.SF += s2;
      r2.SA += s1;
      r1.GF += g1;
      r1.GA += g2;
      r2.GF += g2;
      r2.GA += g1;
      const t1Won = s1 > s2;
      const winner = t1Won ? r1 : r2;
      const loser = t1Won ? r2 : r1;
      winner.W++;
      loser.L++;
      winner.Pts += 3;
      const straight = (t1Won && s2 === 0) || (!t1Won && s1 === 0);
      if (straight) {
        winner.Pts += 1;
        winner.Bonus++;
      }
      winner.h2h[loser.teamId] = (winner.h2h[loser.teamId] || 0) + 1;
    });

  rows.sort((a, b) => {
    if (b.Pts !== a.Pts) return b.Pts - a.Pts;
    const aWins = a.h2h[b.teamId] || 0;
    const bWins = b.h2h[a.teamId] || 0;
    if (aWins !== bWins) return bWins - aWins;
    const sdA = a.SF - a.SA;
    const sdB = b.SF - b.SA;
    if (sdB !== sdA) return sdB - sdA;
    return b.GF - b.GA - (a.GF - a.GA);
  });

  rows.forEach((r, i) => (r.rank = i + 1));
  return rows;
}
