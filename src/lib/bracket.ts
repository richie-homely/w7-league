// Tier knockout: top 4 from each division qualify into a tier-wide bracket.
// Ported from the v0.8 artifact.
import type {
  Bracket,
  BracketMeta,
  BracketSlot,
  Fixture,
  Qualifier,
  Team,
  Tier,
} from "./types";
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

/* ── Cross-division protection ───────────────────────────────────────────────
 *
 * Division rivals have already played each other in the round robin, so pairing
 * them again in the first knockout round is the least interesting tie in the
 * draw — and it knocks one of them out before the tier has really been tested.
 * The first round is therefore arranged so that, wherever the maths allows,
 * every tie is cross-division: a division winner meets another division's
 * fourth place, and so on down.
 *
 * Two things are deliberately preserved:
 *   - Seeds are never rewritten. A team keeps the seed it earned from the
 *     combined tier standings; we only choose which bracket slot it sits in,
 *     so the cards still show the real seed and division.
 *   - The higher seed in each tie is held still and the lower seed moves, so
 *     finishing high still buys the easier draw.
 *
 * Upper tier (2 divisions, 4+4) is always solvable. Lower tier (3 divisions,
 * 12 teams) is always solvable for Round 1, but a quarter-final can still
 * produce a rematch because the Round 1 winner isn't known yet — there we
 * minimise it and report what's left in `meta`.
 */

/** Seed pairs that meet in the first round of each bracket size. */
function firstRoundPairs(n: number): [number, number][] {
  return n <= 8
    ? [
        [1, 8],
        [4, 5],
        [2, 7],
        [3, 6],
      ]
    : [
        [5, 12],
        [8, 9],
        [6, 11],
        [7, 10],
      ];
}

/** Which bye seed meets each Round 1 winner in the 12-team bracket (QF1..QF4). */
const BYE_SEEDS = [1, 4, 2, 3];

function divOf(slot: Qualifier | undefined): string | null {
  return slot ? slot.divId : null;
}

/**
 * Reorder which qualifier occupies each bracket slot so that first-round ties
 * are cross-division. Returns the slot order (index 0 = seed slot 1) plus the
 * number of same-division ties that could not be avoided.
 */
function separateDivisions(qualifiers: Qualifier[]): {
  order: Qualifier[];
  clashes: number;
} {
  const order = [...qualifiers];
  const pairs = firstRoundPairs(qualifiers.length);
  const at = (seed: number) => order[seed - 1];
  const isClash = (p: [number, number]) => {
    const a = divOf(at(p[0]));
    const b = divOf(at(p[1]));
    return !!a && !!b && a === b;
  };
  const total = () => pairs.filter(isClash).length;
  const swap = (s1: number, s2: number) => {
    const t = order[s1 - 1];
    order[s1 - 1] = order[s2 - 1];
    order[s2 - 1] = t;
  };

  const participants = pairs.flat();
  // Move the lower seed of a clashing tie first; only disturb the higher seed
  // if nothing else resolves it.
  for (let pass = 0; pass < 12 && total() > 0; pass++) {
    let improved = false;
    for (const p of pairs) {
      if (!isClash(p)) continue;
      for (const mover of [p[1], p[0]]) {
        const candidates = participants
          .filter((s) => s !== p[0] && s !== p[1])
          .sort((x, y) => Math.abs(x - mover) - Math.abs(y - mover));
        for (const c of candidates) {
          const before = total();
          swap(mover, c);
          if (total() < before) {
            improved = true;
            break;
          }
          swap(mover, c); // revert
        }
        if (improved) break;
      }
      if (improved) break;
    }
    if (!improved) break; // no single swap helps — leave it and report
  }
  return { order, clashes: total() };
}

/**
 * For the 12-team bracket, choose which Round 1 tie feeds each quarter-final so
 * that a bye team is least likely to draw a division rival. A tie where BOTH
 * Round 1 teams share the bye team's division is a guaranteed rematch; one
 * shared is a possible one.
 */
function assignByes(
  order: Qualifier[],
  pairs: [number, number][]
): { pairs: [number, number][]; guaranteed: number; possible: number } {
  const at = (seed: number) => order[seed - 1];
  const score = (perm: [number, number][]) => {
    let guaranteed = 0;
    let possible = 0;
    perm.forEach((p, i) => {
      const byeDiv = divOf(at(BYE_SEEDS[i]));
      const shared = [p[0], p[1]].filter((s) => divOf(at(s)) === byeDiv).length;
      if (shared === 2) guaranteed++;
      else if (shared === 1) possible++;
    });
    return { guaranteed, possible };
  };

  // 4 ties -> 24 orderings; cheap to check them all. Ties are broken towards
  // the original ordering so the bracket only shifts when it actually helps.
  const perms: number[][] = [];
  const permute = (arr: number[], cur: number[] = []) => {
    if (!arr.length) return void perms.push(cur);
    arr.forEach((v, i) => permute([...arr.slice(0, i), ...arr.slice(i + 1)], [...cur, v]));
  };
  permute([0, 1, 2, 3]);

  let best = { order: [0, 1, 2, 3], guaranteed: Infinity, possible: Infinity, drift: 0 };
  for (const perm of perms) {
    const candidate = perm.map((i) => pairs[i]) as [number, number][];
    const { guaranteed, possible } = score(candidate);
    const drift = perm.reduce((acc, v, i) => acc + Math.abs(v - i), 0);
    const better =
      guaranteed < best.guaranteed ||
      (guaranteed === best.guaranteed && possible < best.possible) ||
      (guaranteed === best.guaranteed && possible === best.possible && drift < best.drift);
    if (better) best = { order: perm, guaranteed, possible, drift };
  }
  return {
    pairs: best.order.map((i) => pairs[i]) as [number, number][],
    guaranteed: best.guaranteed,
    possible: best.possible,
  };
}

function buildMeta(
  n: number,
  r1Clashes: number,
  qfGuaranteed: number,
  qfPossible: number,
  filled: number
): BracketMeta {
  const round = n <= 8 ? "quarter-final" : "Round 1";      // adjective form
  const inRound = n <= 8 ? "the quarter-finals" : "Round 1";
  if (filled < 2) {
    return {
      crossDivision: true,
      note: "Qualifiers are still being decided — the draw is arranged once divisions finish.",
    };
  }
  if (r1Clashes === 0 && qfGuaranteed === 0) {
    const tail =
      qfPossible > 0
        ? " A quarter-final could still pair division rivals depending on who comes through."
        : n > 8
        ? " No quarter-final can produce one either, whoever comes through."
        : "";
    return {
      crossDivision: true,
      note: `Draw is cross-division: no team meets a division rival in ${inRound}.${tail}`,
    };
  }
  if (r1Clashes === 0) {
    return {
      crossDivision: true,
      note: `Draw is cross-division in ${inRound}; ${qfGuaranteed} quarter-final${
        qfGuaranteed === 1 ? "" : "s"
      } will be a division rematch whoever comes through.`,
    };
  }
  return {
    crossDivision: false,
    note: `${r1Clashes} ${round} tie${
      r1Clashes === 1 ? "" : "s"
    } pair division rivals — unavoidable with how the qualifiers fell.`,
  };
}

export function buildBracket(qualifiers: Qualifier[]): Bracket {
  const n = qualifiers.length;
  const { order, clashes } = separateDivisions(qualifiers);
  const get = (seed: number): BracketSlot => order[seed - 1] || null;
  const placeholder = (label: string): BracketSlot => ({
    placeholder: true,
    label,
  });

  if (n <= 8) {
    const [p1, p2, p3, p4] = firstRoundPairs(n);
    return {
      r1: [],
      qf: [
        { id: "QF1", a: get(p1[0]), b: get(p1[1]) },
        { id: "QF2", a: get(p2[0]), b: get(p2[1]) },
        { id: "QF3", a: get(p3[0]), b: get(p3[1]) },
        { id: "QF4", a: get(p4[0]), b: get(p4[1]) },
      ],
      sf: [
        { id: "SF1", a: placeholder("Winner QF1"), b: placeholder("Winner QF2") },
        { id: "SF2", a: placeholder("Winner QF3"), b: placeholder("Winner QF4") },
      ],
      f: [{ id: "F1", a: placeholder("Winner SF1"), b: placeholder("Winner SF2") }],
      third: [{ id: "P3", a: placeholder("Loser SF1"), b: placeholder("Loser SF2") }],
      meta: buildMeta(n, clashes, 0, 0, qualifiers.length),
    };
  }

  // 12-team bracket: top 4 get byes, 5-12 play R1
  const arranged = assignByes(order, firstRoundPairs(n));
  const ties = arranged.pairs;
  const ids = ["R1A", "R1B", "R1C", "R1D"];
  return {
    r1: ties.map((p, i) => ({ id: ids[i], a: get(p[0]), b: get(p[1]) })),
    qf: [
      { id: "QF1", a: get(BYE_SEEDS[0]), b: placeholder("Winner R1A") },
      { id: "QF2", a: get(BYE_SEEDS[1]), b: placeholder("Winner R1B") },
      { id: "QF3", a: get(BYE_SEEDS[2]), b: placeholder("Winner R1C") },
      { id: "QF4", a: get(BYE_SEEDS[3]), b: placeholder("Winner R1D") },
    ],
    sf: [
      { id: "SF1", a: placeholder("Winner QF1"), b: placeholder("Winner QF2") },
      { id: "SF2", a: placeholder("Winner QF3"), b: placeholder("Winner QF4") },
    ],
    f: [{ id: "F1", a: placeholder("Winner SF1"), b: placeholder("Winner SF2") }],
    third: [{ id: "P3", a: placeholder("Loser SF1"), b: placeholder("Loser SF2") }],
    meta: buildMeta(n, clashes, arranged.guaranteed, arranged.possible, qualifiers.length),
  };
}

export function isPlaceholderSlot(
  slot: BracketSlot
): slot is { placeholder: true; label: string } {
  return !!slot && "placeholder" in slot && slot.placeholder === true;
}
