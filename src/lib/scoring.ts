// Match score parsing / validation helpers — ported from the v0.8 artifact.
// A result is up to 3 sets [team1 games, team2 games]; the 3rd is a championship tiebreak.
import type { SetScore } from "./types";

// Clean raw string inputs into valid integer set scores, dropping incomplete sets.
export function parseSets(raw: [string, string][]): SetScore[] {
  return raw
    .map(([a, b]) => [parseInt(a, 10), parseInt(b, 10)] as SetScore)
    .filter(([a, b]) => !isNaN(a) && !isNaN(b));
}

// Returns an error message if the result is invalid, otherwise null.
export function validateSets(sets: SetScore[]): string | null {
  if (sets.length < 2) return "At least 2 sets required.";
  return null;
}

export function setsWon(sets: SetScore[]): { s1: number; s2: number } {
  let s1 = 0;
  let s2 = 0;
  for (const [a, b] of sets) {
    if (a > b) s1++;
    else if (b > a) s2++;
  }
  return { s1, s2 };
}

export function team1Won(sets: SetScore[]): boolean {
  const { s1, s2 } = setsWon(sets);
  return s1 > s2;
}

// A straight-sets win (2-0) earns the +1 bonus point.
export function isStraightSets(sets: SetScore[]): boolean {
  const { s1, s2 } = setsWon(sets);
  return (s1 > s2 && s2 === 0) || (s2 > s1 && s1 === 0);
}

export function formatScore(sets: SetScore[] | null): string {
  if (!sets || sets.length === 0) return "—";
  return sets.map(([a, b]) => `${a}-${b}`).join(", ");
}
