// League structure, schedule, and fixture generation, ported from the v0.8 artifact.
import type { Division, Team } from "./types";

export const VERSION = "v1.0";
export const BUILD_DATE = "29 May 2026";

export const LEAGUE_START = new Date("2026-06-06"); // Saturday
export const LEAGUE_DEADLINE = new Date("2026-08-15");
export const TEAMS_PER_DIVISION = 12;
export const ROUNDS = TEAMS_PER_DIVISION - 1; // 11 round-robin rounds

export const DIVISIONS: Division[] = [
  { id: "g1-low", name: "G1", tier: "lower", tierLabel: "0.5 – 2.4" },
  { id: "g2-low", name: "G2", tier: "lower", tierLabel: "0.5 – 2.4" },
  { id: "g3-low", name: "G3", tier: "lower", tierLabel: "0.5 – 2.4" },
  { id: "g3-high", name: "G4", tier: "upper", tierLabel: "2.5 – 5.5" },
  { id: "g4-high", name: "G5", tier: "upper", tierLabel: "2.5 – 5.5" },
];

export function divisionById(id: string): Division | undefined {
  return DIVISIONS.find((d) => d.id === id);
}

// ---------------------------------------------------------------------------
// Round-robin fixture generation (circle method)
// ---------------------------------------------------------------------------
export function generateRoundRobin(teamIds: string[]): string[][][] {
  const n = teamIds.length;
  const ids = [...teamIds];
  const rounds: string[][][] = [];
  for (let r = 0; r < n - 1; r++) {
    const round: string[][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = ids[i];
      const b = ids[n - 1 - i];
      // Alternate home/away for visual variety
      if (r % 2 === 0) round.push([a, b]);
      else round.push([b, a]);
    }
    rounds.push(round);
    // Rotate: keep first fixed, cycle the rest
    const fixed = ids[0];
    const rest = ids.slice(1);
    rest.unshift(rest.pop()!);
    ids.splice(0, ids.length, fixed, ...rest);
  }
  return rounds;
}

export interface GeneratedFixture {
  divisionId: string;
  round: number;
  team1Id: string;
  team2Id: string;
  tbc: "both" | "one" | null;
  homeTeamId: string;
}

// Build fixture rows for a single division's teams. TBC-heavy rounds sink to the
// end so the earliest rounds are the most playable (every real team gets an early
// fixture). Home team is assigned greedily to keep each team's home count as even
// as possible (target: 5–6 home games each over 11 rounds). Returns rows ready
// for insertion (no ids/codes assigned here).
export function buildFixturesForDivision(divTeams: Team[]): GeneratedFixture[] {
  const placeholderIds = new Set(
    divTeams.filter((t) => t.placeholder).map((t) => t.id)
  );
  const rounds = generateRoundRobin(divTeams.map((t) => t.id));

  const scored = rounds.map((round, origIdx) => {
    let dead = 0;
    let mixed = 0;
    for (const [a, b] of round) {
      const aPh = placeholderIds.has(a);
      const bPh = placeholderIds.has(b);
      if (aPh && bPh) dead++;
      else if (aPh || bPh) mixed++;
    }
    return { round, dead, mixed, origIdx };
  });
  scored.sort(
    (x, y) => x.dead - y.dead || x.mixed - y.mixed || x.origIdx - y.origIdx
  );

  // Track home game count per team to distribute evenly.
  const homeCount: Record<string, number> = {};
  for (const t of divTeams) homeCount[t.id] = 0;

  const out: GeneratedFixture[] = [];
  scored.forEach((entry, rIdx) => {
    entry.round.forEach(([t1, t2]) => {
      const bothTbc = placeholderIds.has(t1) && placeholderIds.has(t2);
      const oneTbc = placeholderIds.has(t1) || placeholderIds.has(t2);
      // Assign home to the team with fewer home games so far; ties go to t1.
      const homeTeamId = (homeCount[t1] ?? 0) <= (homeCount[t2] ?? 0) ? t1 : t2;
      homeCount[homeTeamId] = (homeCount[homeTeamId] ?? 0) + 1;
      out.push({
        divisionId: divTeams[0].divisionId,
        round: rIdx + 1,
        team1Id: t1,
        team2Id: t2,
        tbc: bothTbc ? "both" : oneTbc ? "one" : null,
        homeTeamId,
      });
    });
  });
  return out;
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------
export function weekRangeForRound(round: number): { start: Date; end: Date } {
  const start = new Date(LEAGUE_START);
  start.setDate(start.getDate() + (round - 1) * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start, end };
}

export function fmtDate(
  d: Date,
  opts: { short?: boolean; day?: boolean } = {}
): string {
  const { short = false, day = false } = opts;
  if (short)
    return d.toLocaleDateString("en-IE", { day: "numeric", month: "short" });
  if (day)
    return d.toLocaleDateString("en-IE", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  return d.toLocaleDateString("en-IE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function currentRound(now: Date = new Date()): number {
  if (now < LEAGUE_START) return 0; // pre-season
  const diff = Math.floor(
    (now.getTime() - LEAGUE_START.getTime()) / (1000 * 60 * 60 * 24 * 7)
  );
  return Math.min(diff + 1, ROUNDS);
}

export function daysUntilDeadline(now: Date = new Date()): number {
  return Math.ceil(
    (LEAGUE_DEADLINE.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
}

export interface TimeUntil {
  days: number;
  hours: number;
  mins: number;
  secs: number;
  totalMs: number;
}

export function timeUntilStart(now: Date = new Date()): TimeUntil | null {
  const ms = LEAGUE_START.getTime() - now.getTime();
  if (ms <= 0) return null;
  return {
    days: Math.floor(ms / 86400000),
    hours: Math.floor((ms % 86400000) / 3600000),
    mins: Math.floor((ms % 3600000) / 60000),
    secs: Math.floor((ms % 60000) / 1000),
    totalMs: ms,
  };
}

// Contact & booking details (footer, live status page, live screen)
export const CONTACT = {
  email: "welcome@w7padel.com",
  phoneDisplay: "085 135 4570",
  phoneTel: "+353851354570",
  whatsapp: "https://wa.me/353851354570",
  playtomic: "https://playtomic.com/clubs/w7-padel-hub-wicklow",
} as const;

// Open (placeholder/TBC) slots remaining across the whole upper tier.
export function upperTierSlotsRemaining(teamsByDiv: Record<string, Team[]>): number {
  return DIVISIONS.filter((d) => d.tier === "upper").reduce(
    (n, d) => n + (teamsByDiv[d.id] || []).filter((t) => t.placeholder).length,
    0
  );
}

// "Please note" banner copy, now tier-specific (Team View, Status, Knockout).
export const CONFIRMATION_NOTE_LOWER =
  "Lower tier: groupings and fixtures are now confirmed. Let the games begin.";

export const CONFIRMATION_NOTE_RESULTS =
  "Post your game results from Playtomic into the relevant league WhatsApp group and we'll update the leaderboards frequently.";

export function confirmationNoteUpper(slotsRemaining?: number): string {
  if (slotsRemaining === 0)
    return "Upper tier: all slots filled. Groupings and fixtures now confirmed.";
  const count =
    typeof slotsRemaining === "number"
      ? `${slotsRemaining} team slot${slotsRemaining === 1 ? "" : "s"} remaining`
      : "the last team slots still open";
  return `Upper tier: ${count}. The final ${
    slotsRemaining === 1 ? "team" : "teams"
  } will slot into the current fixture list once finalised, so games can commence on this basis.`;
}

// Mirror of the Postgres is_admin() allowlist. This is only for client-side UX
// (showing "not authorised" messaging); the real write gate is RLS in the DB.
export const ADMIN_EMAILS = [
  "richiecarroll65@gmail.com", // Richie Carroll
  "welcome@w7padel.com", // David Hennebry
  "mike@w7padel.com", // Mike Shanahan
] as const;
