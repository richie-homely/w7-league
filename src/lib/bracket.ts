// Tier knockout: top 4 from each division qualify into a tier-wide bracket.
// Ported from the v0.8 artifact.
import type { Bracket, BracketSlot, Fixture, Qualifier, Team, Tier } from "./types";
import { DIVISIONS } from "./league";
import { computeStandings } from "./standings";

export const TIER_PRIZES = [
  { rank: 1, label: "CHAMPIONS", amount: "€500" },
  { rank: 2, label: "RUNNERS-UP", amount: "€250" },
  { rank: 3, label: "3RD PLACE", amount: "€100" },
  { rank: 4, label: "4TH PLACE", amount: "€50" },
] as const;

export function tierQualifiers(
  tier: Tier,
  teamsByDiv: Record<string, Team[]>,
  fixtures: Fixture[]
): Qualifier[] {
  const tierDivs = DIVISIONS.filter((d) => d.tier === tier);
  const all: Qualifier[] = [];
  tierDivs.forEach((d) => {
    const rows = computeStandings(d.id, teamsByDiv, fixtures);
    rows.slice(0, 4).forEach((r) =>
      all.push({ ...r, divName: d.name, divId: d.id, seed: 0 })
    );
  });
  // Sort across tier by points -> set diff -> game diff
  all.sort((a, b) => {
    if (b.Pts !== a.Pts) return b.Pts - a.Pts;
    const sdA = a.SF - a.SA;
    const sdB = b.SF - b.SA;
    if (sdB !== sdA) return sdB - sdA;
    return b.GF - b.GA - (a.GF - a.GA);
  });
  all.forEach((q, i) => (q.seed = i + 1));
  return all;
}

export function buildBracket(qualifiers: Qualifier[]): Bracket {
  const n = qualifiers.length;
  const get = (seed: number): BracketSlot => qualifiers[seed - 1] || null;
  const placeholder = (label: string): BracketSlot => ({
    placeholder: true,
    label,
  });

  if (n <= 8) {
    return {
      r1: [],
      qf: [
        { id: "QF1", a: get(1), b: get(8) },
        { id: "QF2", a: get(4), b: get(5) },
        { id: "QF3", a: get(2), b: get(7) },
        { id: "QF4", a: get(3), b: get(6) },
      ],
      sf: [
        { id: "SF1", a: placeholder("Winner QF1"), b: placeholder("Winner QF2") },
        { id: "SF2", a: placeholder("Winner QF3"), b: placeholder("Winner QF4") },
      ],
      f: [{ id: "F1", a: placeholder("Winner SF1"), b: placeholder("Winner SF2") }],
      third: [{ id: "P3", a: placeholder("Loser SF1"), b: placeholder("Loser SF2") }],
    };
  }
  // 12-team bracket: top 4 get byes, 5-12 play R1
  return {
    r1: [
      { id: "R1A", a: get(5), b: get(12) },
      { id: "R1B", a: get(8), b: get(9) },
      { id: "R1C", a: get(6), b: get(11) },
      { id: "R1D", a: get(7), b: get(10) },
    ],
    qf: [
      { id: "QF1", a: get(1), b: placeholder("Winner R1A") },
      { id: "QF2", a: get(4), b: placeholder("Winner R1B") },
      { id: "QF3", a: get(2), b: placeholder("Winner R1C") },
      { id: "QF4", a: get(3), b: placeholder("Winner R1D") },
    ],
    sf: [
      { id: "SF1", a: placeholder("Winner QF1"), b: placeholder("Winner QF2") },
      { id: "SF2", a: placeholder("Winner QF3"), b: placeholder("Winner QF4") },
    ],
    f: [{ id: "F1", a: placeholder("Winner SF1"), b: placeholder("Winner SF2") }],
    third: [{ id: "P3", a: placeholder("Loser SF1"), b: placeholder("Loser SF2") }],
  };
}

export function isPlaceholderSlot(
  slot: BracketSlot
): slot is { placeholder: true; label: string } {
  return !!slot && "placeholder" in slot && slot.placeholder === true;
}
