"use client";

import { useEffect, useState } from "react";
import { createClient } from "./supabase/client";

// Court availability (Richie, 13 Sep 2026): "can that be clickable to show the available
// hours? So you go right, we need fifty games next week, we have twenty booked in already,
// there's thirty left to go, this is what'll be available — and show the windows then that
// you're looking at to book."
//
// One row per half-hour for the next three weeks, written hourly by
// scripts/league_bookings.py --push. Half-hours, not hours: courts go out at :00 and :30,
// so an hourly grid would call 17:00 fully booked when the only game starts at 17:30.

export const COURTS = 3;
export const SLOT_MINUTES = 30;
/** A game needs at least an hour on one court (Richie, 13 Sep 2026: "slots need to be at
 *  least an hour long ... 30 min slots no use"). */
export const MIN_GAME_MINUTES = 60;

export interface CourtSlot {
  startsAt: string;    // ISO, start of the half-hour
  free: number;        // courts with nothing booked (0-3) — occupancy reads this
  /** courts on which a game of at least an hour can start here */
  startable: number;
  /** courts free here AND inside a stretch of at least an hour on that same court */
  usable: number;
}

/** Until court_slots_bookable_13Sep2026.sql has run, the table has no per-court columns.
 *  Rather than hide the view, approximate: a half-hour counts as usable when free courts run
 *  on for at least an hour. That can overstate when "one free, then one free" is two
 *  different courts — the per-court columns remove that — so it is only a stopgap. */
function approximate(rows: { slot_at: string; free: number }[]): CourtSlot[] {
  const out: CourtSlot[] = rows.map((r) => ({ startsAt: r.slot_at, free: r.free, startable: 0, usable: 0 }));
  const need = MIN_GAME_MINUTES / SLOT_MINUTES;
  let i = 0;
  while (i < out.length) {
    if (out[i].free === 0) { i++; continue; }
    let j = i;
    while (j + 1 < out.length && out[j + 1].free > 0
      && new Date(out[j + 1].startsAt).getTime() - new Date(out[j].startsAt).getTime() === SLOT_MINUTES * 60000) j++;
    if (j - i + 1 >= need) {
      for (let k = i; k <= j; k++) out[k].usable = Math.min(...out.slice(i, j + 1).map((s) => s.free));
      for (let k = i; k <= j - need + 1; k++) out[k].startable = out[k].usable;
    }
    i = j + 1;
  }
  return out;
}

/** `ready` is false until court_slots exists, so the UI can simply not render rather than
 *  showing an empty or wrong picture. `exact` says whether the per-court columns are in. */
export function useCourtSlots(): { slots: CourtSlot[]; loaded: boolean; ready: boolean; exact: boolean } {
  const [slots, setSlots] = useState<CourtSlot[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [ready, setReady] = useState(false);
  const [exact, setExact] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    (async () => {
      const full = await supabase.from("court_slots").select("slot_at,free,startable,usable").order("slot_at");
      if (cancelled) return;
      if (!full.error && full.data) {
        setSlots(full.data.map((r) => ({
          startsAt: r.slot_at as string, free: r.free as number,
          startable: (r.startable as number) ?? 0, usable: (r.usable as number) ?? 0,
        })));
        setExact(true);
        setReady(true);
        setLoaded(true);
        return;
      }
      const basic = await supabase.from("court_slots").select("slot_at,free").order("slot_at");
      if (cancelled) return;
      if (!basic.error && basic.data) {
        setSlots(approximate(basic.data as { slot_at: string; free: number }[]));
        setReady(true);
      }
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, []);
  return { slots, loaded, ready, exact };
}

/** Peak is the time members can actually play: weekday evenings, and the whole weekend.
 *
 *  Richie, 13 Sep 2026: "for the purposes of the free hours let's call all of weekend peak
 *  availability — people aren't in work." So a Saturday 10:00 slot counts as peak even
 *  though it is quiet by weekday-evening standards: what matters here is whether a working
 *  member could take it, not what the club would charge for it.
 *
 *  Off-peak is therefore weekday 07:00-17:00 only — the block that is plentiful and that
 *  most members cannot use. */
export function isPeak(d: Date): boolean {
  const day = d.getDay();                      // 0 Sun … 6 Sat
  return day === 0 || day === 6 ? true : d.getHours() >= 17;
}

export interface FreeRun {
  from: Date;
  to: Date;
  courts: number;      // most courts free at once anywhere in the window
  peak: boolean;
}

const HALF = SLOT_MINUTES * 60000;
const MIN_MS = MIN_GAME_MINUTES * 60000;

/** Bookable windows on one day: stretches where at least one court has an hour or more free.
 *
 *  Every half-hour marked usable already belongs to an hour-plus run on a single court, so a
 *  run of usable half-hours is always at least an hour long — no 30-minute scraps. Unlike the
 *  first version, a window does NOT break when the number of free courts changes; that is
 *  what cut Tuesday 11:00–12:30 into a useless 11:00–11:30 and 11:30–12:30.
 *
 *  It splits at the peak boundary only when both halves are still at least an hour, so the
 *  colour and filter stay honest without bringing scraps back. Otherwise the whole window
 *  takes the band that holds most of it. */
export function freeRuns(slots: CourtSlot[], day: Date): FreeRun[] {
  const key = day.toDateString();
  const mine = slots
    .map((s) => ({ at: new Date(s.startsAt), usable: s.usable }))
    .filter((s) => s.at.toDateString() === key && s.usable > 0)
    .sort((a, b) => a.at.getTime() - b.at.getTime());

  // 1. merge contiguous usable half-hours
  const windows: { from: Date; to: Date; halves: { at: Date; usable: number }[] }[] = [];
  for (const s of mine) {
    const last = windows[windows.length - 1];
    if (last && last.to.getTime() === s.at.getTime()) {
      last.to = new Date(s.at.getTime() + HALF);
      last.halves.push(s);
    } else {
      windows.push({ from: s.at, to: new Date(s.at.getTime() + HALF), halves: [s] });
    }
  }

  // 2. split or assign at the peak boundary
  const out: FreeRun[] = [];
  const make = (halves: { at: Date; usable: number }[]): FreeRun => ({
    from: halves[0].at,
    to: new Date(halves[halves.length - 1].at.getTime() + HALF),
    courts: Math.max(...halves.map((h) => h.usable)),
    peak: halves.filter((h) => isPeak(h.at)).length * 2 >= halves.length,
  });
  for (const w of windows) {
    const cut = w.halves.findIndex((h, i) => i > 0 && isPeak(h.at) !== isPeak(w.halves[i - 1].at));
    if (cut > 0) {
      const a = w.halves.slice(0, cut), b = w.halves.slice(cut);
      if (a.length * HALF >= MIN_MS && b.length * HALF >= MIN_MS) {
        out.push(make(a), make(b));
        continue;
      }
    }
    out.push(make(w.halves));
  }
  return out;
}

/** Genuinely bookable court-hours on one day, split by band. Counted per half-hour from
 *  `usable`, so a window that straddles 17:00 still puts each half-hour in its true band. */
export function bookableHours(slots: CourtSlot[], day: Date): { peak: number; off: number } {
  const key = day.toDateString();
  let peak = 0, off = 0;
  for (const s of slots) {
    const at = new Date(s.startsAt);
    if (at.toDateString() !== key || s.usable === 0) continue;
    if (isPeak(at)) peak += s.usable / 2; else off += s.usable / 2;
  }
  return { peak, off };
}

/** The days the slot feed covers, from today forward. */
export function slotDays(slots: CourtSlot[]): Date[] {
  const seen = new Map<string, Date>();
  for (const s of slots) {
    const d = new Date(s.startsAt);
    const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (!seen.has(midnight.toDateString())) seen.set(midnight.toDateString(), midnight);
  }
  return [...seen.values()].sort((a, b) => a.getTime() - b.getTime());
}
