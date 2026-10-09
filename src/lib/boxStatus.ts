// Live one-line status of the box league, for the share card and the page description
// (Richie, 5 Oct 2026: "update the sub heading on the thumbnail ... to update every week ...
// with a more up to date status or summary"). Server-side only: reads Supabase over REST with
// the public key and caches for half an hour, so a WhatsApp preview is never more than that
// behind the site.

import { BOX_CYCLES, currentCycle, dayOf, type Cycle } from "./boxCalendar";

const DAY = 86_400_000;

export interface BoxStatus {
  cycle: Cycle;
  state: "upcoming" | "live" | "over" | "finished";
  week: number;      // Monday-to-Sunday week of the cycle, 1-based (0 when not live)
  nWeeks: number;
  total: number;
  confirmed: number;
  submitted: number;
  pending: number;
  bookedAhead: number;
  /** changes once a week (and once a cycle): the cache-buster on the share-card URL */
  version: string;
  /** "CYCLE 1 · WEEK 4 OF 4" */
  headline: string;
  /** "123 OF 200 RESULTS IN · 37 BOOKED · DEADLINE SUN 11 OCT" */
  statusLine: string;
  /** the sentence for the og:description */
  sentence: string;
}

/** Weeks of a cycle run Monday to Sunday; week 1 takes any early-opening days with it. */
export function weekBounds(cycle: Cycle): { firstMonday: number; nWeeks: number; start: number; end: number } {
  const start = dayOf(cycle.start) - DAY / 2;          // local midnight at the start of the cycle
  const end = dayOf(cycle.end) + DAY / 2;              // local midnight after the cycle's Sunday
  const dow = new Date(start + DAY / 2).getDay();
  const firstMonday = dow === 1 ? start : start + ((8 - dow) % 7) * DAY;
  return { firstMonday, nWeeks: Math.max(1, Math.ceil((end - firstMonday) / (7 * DAY))), start, end };
}

export function weekOf(cycle: Cycle, now: Date): number {
  const { firstMonday, nWeeks, start } = weekBounds(cycle);
  const t = now.getTime();
  if (t < start) return 0;
  if (t < firstMonday) return 1;
  return Math.min(nWeeks, Math.floor((t - firstMonday) / (7 * DAY)) + 1);
}

function fmtDeadline(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short" }).replace(",", "");
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

export async function fetchBoxStatus(now: Date = new Date()): Promise<BoxStatus> {
  const cur = currentCycle(now);
  const cycle = cur?.cycle ?? BOX_CYCLES[BOX_CYCLES.length - 1];
  const state: BoxStatus["state"] = cur ? cur.state : "finished";
  const { nWeeks } = weekBounds(cycle);
  const week = state === "live" ? weekOf(cycle, now) : 0;

  const matches = (await sb<{ status: string; cycle: number }[]>(
    `box_matches?select=status,cycle&box=lt.90&cycle=eq.${cycle.n}&limit=1000`
  )) ?? [];
  const counts = { confirmed: 0, submitted: 0, pending: 0, disputed: 0, void: 0, walkover: 0 };
  for (const m of matches) counts[m.status as keyof typeof counts] = (counts[m.status as keyof typeof counts] ?? 0) + 1;
  counts.confirmed += counts.walkover;   // a walkover is a result in, for the status line
  const total = matches.length;
  const nowIso = now.toISOString();
  const booked = (await sb<{ match_key: string }[]>(
    `league_bookings?select=match_key&kind=eq.box&starts_at=gte.${encodeURIComponent(nowIso)}&limit=1000`
  )) ?? [];
  const bookedAhead = booked.length;

  const deadline = fmtDeadline(cycle.end).toUpperCase();
  let headline: string;
  let statusLine: string;
  let sentence: string;
  if (state === "live") {
    headline = `CYCLE ${cycle.n} · WEEK ${week} OF ${nWeeks}`;
    statusLine = `${counts.confirmed} OF ${total} RESULTS IN · ${bookedAhead} BOOKED · DEADLINE ${deadline}`;
    sentence = `Cycle ${cycle.n}, week ${week} of ${nWeeks}: ${counts.confirmed} of ${total} results in, ${bookedAhead} games booked, deadline ${fmtDeadline(cycle.end)}.`;
  } else if (state === "upcoming") {
    headline = `CYCLE ${cycle.n} STARTS ${fmtDeadline(cycle.start).toUpperCase()}`;
    statusLine = `${total} FIXTURES · RUNS TO ${deadline}`;
    sentence = `Cycle ${cycle.n} starts ${fmtDeadline(cycle.start)} and runs to ${fmtDeadline(cycle.end)}.`;
  } else if (state === "over") {
    headline = `CYCLE ${cycle.n} CLOSED`;
    statusLine = `${counts.confirmed} OF ${total} PLAYED · PROMOTION & RELEGATION APPLIED`;
    sentence = `Cycle ${cycle.n} is closed: ${counts.confirmed} of ${total} played, promotion and relegation applied.`;
  } else {
    headline = "SEASON COMPLETE";
    statusLine = `${BOX_CYCLES.length} CYCLES · SEP ${BOX_CYCLES[0].start.slice(0, 4)} TO APR ${BOX_CYCLES[BOX_CYCLES.length - 1].end.slice(0, 4)}`;
    sentence = "The Autumn/Winter season is complete.";
  }
  const version = `c${cycle.n}-w${week}-${state}`;
  return { cycle, state, week, nWeeks, total, confirmed: counts.confirmed, submitted: counts.submitted, pending: counts.pending,
           bookedAhead, version, headline, statusLine, sentence };
}
