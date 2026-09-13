"use client";

import { useEffect, useState } from "react";
import { createClient } from "./supabase/client";

// Likely box league games hiding in bookings that do not name opponents yet (Richie, 13 Sep
// 2026: "players book a court in their name and don't add opponents straight away", "what's
// the estimate for those 1 person bookings", "mention these in the usage stats and emails").
// Scored hourly by scripts/unnamed_bookings.py and stored in league_unnamed.

export interface UnnamedBooking {
  startsAt: Date;
  court: string;
  box: number;
  team: string;
  shape: "pair" | "single";
  p: number;          // chance it becomes the team's league fixture, 0-1
  week: string;       // Monday of its week, YYYY-MM-DD (Dublin)
  reason: string;     // why it was marked down, if it was
}

/** `ready` stays false until league_unnamed_13Sep2026.sql has run, so callers hide the line. */
export function useUnnamedBookings(): { rows: UnnamedBooking[]; ready: boolean } {
  const [rows, setRows] = useState<UnnamedBooking[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    createClient()
      .from("league_unnamed")
      .select("starts_at,court,box,team,shape,p,week,reason")
      .order("starts_at")
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        setRows(data.map((r) => ({
          startsAt: new Date(r.starts_at as string),
          court: r.court as string,
          box: r.box as number,
          team: r.team as string,
          shape: r.shape as "pair" | "single",
          p: Number(r.p) || 0,
          week: String(r.week).slice(0, 10),
          reason: (r.reason as string) ?? "",
        })));
        setReady(true);
      });
    return () => { cancelled = true; };
  }, []);
  return { rows, ready };
}

export interface UnnamedWeek { low: number; central: number; high: number; likely: UnnamedBooking[] }

/** Low = whole-pair bookings weighted, central = everything weighted, high = every booking
 *  still plausible. `weekStart` is the Monday as YYYY-MM-DD. */
export function unnamedForWeek(rows: UnnamedBooking[], weekStart: string): UnnamedWeek {
  const mine = rows.filter((r) => r.week === weekStart && r.p > 0);
  return {
    low: mine.filter((r) => r.shape === "pair").reduce((n, r) => n + r.p, 0),
    central: mine.reduce((n, r) => n + r.p, 0),
    high: mine.length,
    likely: [...mine].sort((a, b) => b.p - a.p || a.startsAt.getTime() - b.startsAt.getTime()),
  };
}
