"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "./supabase/client";
import { fetchLeague, type LeagueData, DEFAULT_SETTINGS } from "./data";

// Subscribes to realtime changes on teams/fixtures/settings and keeps a fresh
// snapshot of the whole league. On any change it refetches (simple and robust at
// this data size). All viewers and the live screen stay in sync this way.
export function useLeagueData() {
  const [data, setData] = useState<LeagueData>({
    teams: [],
    teamsByDiv: {},
    fixtures: [],
    settings: DEFAULT_SETTINGS,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabaseRef = useRef(createClient());

  const refresh = useCallback(async () => {
    try {
      const next = await fetchLeague(supabaseRef.current);
      setData(next);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load league data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const supabase = supabaseRef.current;
    refresh();

    const channel = supabase
      .channel("league-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "fixtures" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "settings" }, refresh)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { ...data, loading, error, refresh };
}
