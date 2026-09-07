"use client";

import { createClient } from "@/lib/supabase/client";

// Site usage log (Richie, 7 Sep 2026): one random id per browser so we can count unique
// visitors for the sponsor numbers, and team-level events (find my box, submit, confirm)
// so we can see which teams have got on and which still need a link. Emails go to the
// RPC only to be resolved to a team id server-side; they are never stored. Fire-and-forget:
// tracking must never slow or break the page.

export type SiteEvent = "view" | "return" | "find_box" | "submit" | "confirm" | "dispute" | "add_contact";

const KEY = "w7-visitor";

export function visitorId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let v = window.localStorage.getItem(KEY);
    if (!v) {
      v = crypto.randomUUID();
      window.localStorage.setItem(KEY, v);
    }
    return v;
  } catch {
    return null;
  }
}

export function track(event: SiteEvent, email?: string | null, path?: string): void {
  const v = visitorId();
  if (!v) return;
  try {
    const supabase = createClient();
    void supabase
      .rpc("site_track", {
        p_visitor: v,
        p_path: path ?? window.location.pathname + window.location.search,
        p_event: event,
        p_email: email && email.includes("@") ? email.trim() : null,
      })
      .then(() => undefined, () => undefined);
  } catch {
    /* tracking is best-effort */
  }
}

// ── admin report ────────────────────────────────────────────────────────────────
export interface UsageReport {
  since: string;
  totals: { views: number; unique_visitors: number; teams_active: number; results_submitted: number; results_confirmed: number };
  by_day: { day: string; views: number; uniques: number }[];
  by_path: { path: string; views: number; uniques: number }[];
  teams: { team_id: string; box: number; name: string; first_seen: string | null; last_seen: string | null; events: number; submits: number; confirms: number; visitors: number }[];
}

/** site_usage_report(p_key, p_days) — the passcode is checked in the database. */
export async function siteUsageReport(key: string, days: number): Promise<UsageReport | "bad_key" | "unavailable"> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("site_usage_report", { p_key: key, p_days: days });
  if (error) return "unavailable";
  const d = data as (UsageReport & { status?: string }) | null;
  if (!d) return "unavailable";
  if (d.status === "bad_key") return "bad_key";
  return d;
}
