"use client";

import { useEffect, useState } from "react";
import { createClient } from "./supabase/client";

// League courts booked (Richie, 8 Sep 2026): fixtures the Playtomic bookings show as
// booked, written hourly by scripts/league_bookings.py. Public, fixture-level only.

export interface LeagueBooking {
  matchKey: string;      // box: box_matches.id · summer: "summer:<teamId>:<teamId>" (sorted)
  kind: "box" | "summer";
  startsAt: string;      // ISO, Dublin wall-clock as booked
  court: string;
  team1: string;
  team2: string;
  confidence: "certain" | "probable";
}

export function useLeagueBookings(): { bookings: LeagueBooking[]; byKey: Map<string, LeagueBooking>; loaded: boolean } {
  const [bookings, setBookings] = useState<LeagueBooking[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("league_bookings")
      .select("match_key,kind,starts_at,court,team1,team2,confidence")
      .order("starts_at")
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) {
          setBookings(
            data.map((r) => ({
              matchKey: r.match_key as string,
              kind: r.kind as "box" | "summer",
              startsAt: r.starts_at as string,
              court: (r.court as string) ?? "",
              team1: r.team1 as string,
              team2: r.team2 as string,
              confidence: (r.confidence as "certain" | "probable") ?? "certain",
            }))
          );
        }
        setLoaded(true);
      });
    return () => { cancelled = true; };
  }, []);
  const byKey = new Map(bookings.map((b) => [b.matchKey, b]));
  return { bookings, byKey, loaded };
}

export function summerKey(teamIdA: string, teamIdB: string): string {
  return "summer:" + [teamIdA, teamIdB].sort().join(":");
}

/** "Thu 10 Sep · 17:30" from the booking's wall-clock time. */
export function fmtBooking(iso: string): string {
  const d = new Date(iso.length === 16 ? iso + ":00" : iso);
  const day = d.toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short" });
  const hm = d.toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${day} · ${hm}`;
}
