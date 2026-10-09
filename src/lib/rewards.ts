// W7 Court Points: a point for every minute on court, rewards unlocked on a ladder.
// Richie, 9 Oct 2026: "for every minute on court you get a point - free balls and court hours
// for top players ... free balls after x many points - free hour on court after x many - and
// have a points system". Points only go up; every time a player's total crosses a multiple of a
// rung they unlock that reward. The numbers here must match LADDER in scripts/court_points.py,
// which computes the points from the Playtomic extract and pushes them to court_points.
// The rungs are placeholders until the owners settle them (see the proposal of 9 Oct 2026).

export const POINTS_PER_MINUTE = 1;

export interface Rung {
  key: "balls" | "hour";
  every: number;
  prize: string;
  detail: string;
}

export const LADDER: Rung[] = [
  { key: "balls", every: 1500, prize: "A tube of balls", detail: "25 hours on court" },
  { key: "hour", every: 5000, prize: "A free court hour", detail: "83 hours on court, as Playtomic credit" },
];

export interface PointsRow {
  player: string;
  month: string;     // "YYYY-MM" or "all"
  display: string;
  points: number;
  sessions: number;
  updated_at?: string;
}

export function hoursOf(points: number): number {
  return points / POINTS_PER_MINUTE / 60;
}

/** How many of each reward a total has unlocked, and how far to the next one. */
export function progress(points: number) {
  return LADDER.map((r) => ({
    ...r,
    unlocked: Math.floor(points / r.every),
    toNext: r.every - (points % r.every),
    pct: ((points % r.every) / r.every) * 100,
  }));
}

/** Dublin-time "YYYY-MM" for a date. */
export function monthKey(d: Date = new Date()): string {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Dublin", year: "numeric", month: "2-digit" }).formatToParts(d);
  const y = p.find((x) => x.type === "year")?.value;
  const m = p.find((x) => x.type === "month")?.value;
  return `${y}-${m}`;
}

export function monthLabel(key: string): string {
  if (key === "all") return "All time";
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

async function sb<T>(path: string): Promise<T | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const r = await fetch(`${url}/rest/v1/${path}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: 1800 },
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

/** Top rows for one month key ("all" for the all-time board). Empty until the table exists. */
export async function fetchBoard(month: string, limit = 25): Promise<PointsRow[]> {
  const rows = await sb<PointsRow[]>(
    `court_points?month=eq.${encodeURIComponent(month)}&order=points.desc,sessions.desc&limit=${limit}&select=player,month,display,points,sessions,updated_at`,
  );
  return rows ?? [];
}

/** Month keys present, newest first, excluding "all". */
export async function fetchMonths(): Promise<string[]> {
  const rows = await sb<{ month: string }[]>(`court_points?select=month&month=neq.all&limit=5000`);
  return Array.from(new Set((rows ?? []).map((r) => r.month))).sort().reverse();
}
