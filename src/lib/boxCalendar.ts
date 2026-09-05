// Autumn/Winter Padel Box League — the season calendar (rules of 5 Sep 2026).
// Seven four-week cycles from Mon 14 Sep 2026; a two-week Christmas break that does
// NOT count against Cycle 4's playing window (so Cycle 4 runs six calendar weeks).
// Dates are Dublin local; each cycle runs Monday 00:00 to Sunday 23:59.

export interface Cycle {
  n: number;
  start: string; // ISO date, Monday
  end: string; // ISO date, Sunday
  note?: string;
}

export const BOX_CYCLES: Cycle[] = [
  { n: 1, start: "2026-09-14", end: "2026-10-11" },
  { n: 2, start: "2026-10-12", end: "2026-11-08" },
  { n: 3, start: "2026-11-09", end: "2026-12-06" },
  { n: 4, start: "2026-12-07", end: "2027-01-17", note: "six calendar weeks — the Christmas break does not count" },
  { n: 5, start: "2027-01-18", end: "2027-02-14" },
  { n: 6, start: "2027-02-15", end: "2027-03-14" },
  { n: 7, start: "2027-03-15", end: "2027-04-11" },
];

export const CHRISTMAS_BREAK = {
  start: "2026-12-23", // Wednesday
  end: "2027-01-05", // Tuesday
  note: "Courts stay open — play if you wish — but these two weeks are not part of Cycle 4's four-week window.",
};

export const SEASON = { start: BOX_CYCLES[0].start, end: BOX_CYCLES[BOX_CYCLES.length - 1].end };

const DAY = 86_400_000;

export function dayOf(iso: string): number {
  return new Date(iso + "T12:00:00").getTime();
}

/** The cycle that contains `now`, or the next one to start, or null after the season. */
export function currentCycle(now: Date = new Date()): { cycle: Cycle; state: "upcoming" | "live" | "over" } | null {
  const t = now.getTime();
  for (const c of BOX_CYCLES) {
    if (t < dayOf(c.start) - DAY / 2) return { cycle: c, state: "upcoming" };
    if (t <= dayOf(c.end) + DAY / 2) return { cycle: c, state: "live" };
  }
  return null;
}

/** Whole days from `now` to the end of the cycle (0 on the last day). */
export function daysLeft(c: Cycle, now: Date = new Date()): number {
  return Math.max(0, Math.round((dayOf(c.end) + DAY / 2 - now.getTime()) / DAY));
}

export function inBreak(now: Date = new Date()): boolean {
  const t = now.getTime();
  return t >= dayOf(CHRISTMAS_BREAK.start) - DAY / 2 && t <= dayOf(CHRISTMAS_BREAK.end) + DAY / 2;
}

export function fmtRange(start: string, end: string): string {
  const f = (iso: string, withYear: boolean) =>
    new Date(iso + "T12:00:00").toLocaleDateString("en-IE", {
      weekday: "short",
      day: "numeric",
      month: "short",
      ...(withYear ? { year: "numeric" } : {}),
    });
  return `${f(start, false)} – ${f(end, start.slice(0, 4) !== end.slice(0, 4))}`;
}
