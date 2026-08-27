"use client";

// Socials calendar data: read-only view of the `socials` (scheduled) and
// `social_cadence` (usual weekly rhythm) tables, which the w7-morning-brief
// pipeline refreshes from Playtomic a few times a day.

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "./supabase/client";

export interface Social {
  id: string;
  startsAt: Date;
  timeLabel: string;
  courts: number;
  capacity: number;
  players: number;
  price: string;
  durationMin: number;
}

export interface CadenceSlot {
  weekday: number; // ISO: 1 = Monday .. 7 = Sunday
  timeLabel: string;
  weeksOf4: number;
}

export const WEEKDAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Optional friendly names for recurring slots, keyed "isoWeekday|HH:MM".
 *  Unlabelled slots just render as "Social". */
export const SOCIAL_LABELS: Record<string, string> = {
  // "1|19:00": "Monday Night Social",
};

export function socialLabel(weekday: number, timeLabel: string): string {
  return SOCIAL_LABELS[`${weekday}|${timeLabel}`] ?? "Social";
}

export function useSocialsData() {
  const [socials, setSocials] = useState<Social[]>([]);
  const [cadence, setCadence] = useState<CadenceSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());

  const refresh = useCallback(async () => {
    try {
      const supabase = supabaseRef.current;
      const [s, c] = await Promise.all([
        supabase.from("socials").select("*").order("starts_at"),
        supabase.from("social_cadence").select("*").order("weekday").order("time_label"),
      ]);
      if (!s.error) {
        const now = Date.now();
        setSocials(
          (s.data ?? [])
            /* eslint-disable @typescript-eslint/no-explicit-any */
            .map((r: any) => ({
              id: r.id,
              startsAt: new Date(r.starts_at),
              timeLabel: r.time_label,
              courts: r.courts,
              capacity: r.capacity,
              players: r.players,
              price: r.price ?? "",
              durationMin: r.duration_min ?? 0,
            }))
            /* eslint-enable @typescript-eslint/no-explicit-any */
            .filter((x: Social) => x.startsAt.getTime() > now - 3 * 3600_000)
        );
      }
      if (!c.error) {
        setCadence(
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          (c.data ?? []).map((r: any) => ({
            weekday: r.weekday,
            timeLabel: r.time_label,
            weeksOf4: r.weeks_of_4,
          }))
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const supabase = supabaseRef.current;
    refresh();
    const channel = supabase
      .channel("socials-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "socials" }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { socials, cadence, loading };
}
