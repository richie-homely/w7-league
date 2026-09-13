"use client";

import { useEffect, useState } from "react";
import { createClient } from "./supabase/client";

// Booking lead time (Richie, 13 Sep 2026): "when the games are being booked in and how many
// days in advance, to find trends", and "see if our average booking ahead time improves with
// the league". One row per booking: when it was made and when it plays. Filled hourly by
// scripts/league_bookings.py (first-seen) and backfilled from the reservation emails by
// scripts/seed_leadtime.py, which carry the real send time.

export interface LeadRow {
  bookedAt: Date;
  startsAt: Date;
  isLeague: boolean;
  source: "detector" | "email";
}

/** The hourly detector first ran at 12:04 UTC on 13 Sep 2026 and stamped every booking
 *  already on the books as "first seen" then — so a court booked weeks earlier looked like it
 *  was booked that afternoon. A detector timestamp is only a real booking time for bookings
 *  that appeared after that first run. Email-sourced rows are always real. */
export const DETECTOR_TRUSTED_FROM = new Date("2026-09-13T13:00:00Z");

/** Supabase caps a select at 1000 rows, so page until a short page comes back. */
export function useLeadTimes(): { rows: LeadRow[]; ready: boolean } {
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const out: LeadRow[] = [];
      const PAGE = 1000;
      for (let from = 0; from < 20000; from += PAGE) {
        const { data, error } = await supabase
          .from("booking_leadtime")
          .select("booked_at,starts_at,is_league,source")
          .order("booked_at")
          .range(from, from + PAGE - 1);
        if (error || !data) break;
        for (const r of data) {
          const bookedAt = new Date(r.booked_at as string);
          if (r.source !== "email" && bookedAt < DETECTOR_TRUSTED_FROM) continue;
          out.push({
            bookedAt,
            startsAt: new Date(r.starts_at as string),
            isLeague: !!r.is_league,
            source: (r.source as "detector" | "email") ?? "detector",
          });
        }
        if (data.length < PAGE) break;
      }
      if (!cancelled) {
        setRows(out);
        setReady(out.length > 0);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return { rows, ready };
}
