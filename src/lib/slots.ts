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

export interface CourtSlot {
  startsAt: string;    // ISO, start of the half-hour
  free: number;        // courts with nothing booked (0-3)
}

/** `ready` is false until court_slots_13Sep2026.sql has been run in Supabase, so the UI can
 *  simply not render rather than showing an empty or wrong picture. */
export function useCourtSlots(): { slots: CourtSlot[]; loaded: boolean; ready: boolean } {
  const [slots, setSlots] = useState<CourtSlot[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    createClient()
      .from("court_slots")
      .select("slot_at,free")
      .order("slot_at")
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) {
          setSlots(data.map((r) => ({ startsAt: r.slot_at as string, free: r.free as number })));
          setReady(true);
        }
        setLoaded(true);
      });
    return () => { cancelled = true; };
  }, []);
  return { slots, loaded, ready };
}

/** Peak is the time members actually compete for: weekday evenings, and weekend daytime.
 *  Everything else is off-peak — where there is room, and where the league has to overflow
 *  to. Matches the windows the capacity report measures (scripts/court_capacity.py):
 *  weekday peak ran 94% used against weekday midday at 49%. */
export function isPeak(d: Date): boolean {
  const day = d.getDay();                      // 0 Sun … 6 Sat
  const h = d.getHours();
  return day === 0 || day === 6 ? h >= 8 && h < 18 : h >= 17 && h < 22;
}

export interface FreeRun {
  from: Date;
  to: Date;
  courts: number;      // fewest courts free at any point in the run
  peak: boolean;
}

/** Contiguous half-hours with a court free, merged into runs a player can read as "book
 *  between these times". Runs break when the number of free courts changes, so the count
 *  shown is always true for the whole run rather than an average. */
export function freeRuns(slots: CourtSlot[], day: Date): FreeRun[] {
  const key = day.toDateString();
  const mine = slots
    .map((s) => ({ at: new Date(s.startsAt), free: s.free }))
    .filter((s) => s.at.toDateString() === key && s.free > 0)
    .sort((a, b) => a.at.getTime() - b.at.getTime());
  const runs: FreeRun[] = [];
  for (const s of mine) {
    const peak = isPeak(s.at);
    const last = runs[runs.length - 1];
    // A run also breaks at the peak boundary, so every block shown is wholly peak or
    // wholly off-peak and can be coloured and filtered without qualification.
    const contiguous =
      last && last.to.getTime() === s.at.getTime() && last.courts === s.free && last.peak === peak;
    if (contiguous) {
      last.to = new Date(s.at.getTime() + SLOT_MINUTES * 60000);
    } else {
      runs.push({ from: s.at, to: new Date(s.at.getTime() + SLOT_MINUTES * 60000), courts: s.free, peak });
    }
  }
  return runs;
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
