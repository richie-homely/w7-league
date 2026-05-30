// Maps Supabase rows (snake_case) to app domain types (camelCase) and fetches league state.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Fixture, SetScore, Settings, Team } from "./types";

export interface LeagueData {
  teams: Team[];
  teamsByDiv: Record<string, Team[]>;
  fixtures: Fixture[];
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
  lowerStatus: "full",
  upperStatus: "available",
};

interface TeamRow {
  id: string;
  division_id: string;
  seed: number;
  p1: string;
  p2: string;
  r1: number | null;
  r2: number | null;
  placeholder: boolean;
}

interface FixtureRow {
  id: string;
  code: string | null;
  division_id: string;
  round: number;
  team1_id: string;
  team2_id: string;
  status: Fixture["status"];
  sets: SetScore[] | null;
  tbc: "both" | "one" | null;
  home_team_id: string | null;
  entered_by: string | null;
  entered_at: string | null;
  notes: string | null;
}

interface SettingsRow {
  lower_status: Settings["lowerStatus"];
  upper_status: Settings["upperStatus"];
}

export function mapTeamRow(r: TeamRow): Team {
  return {
    id: r.id,
    divisionId: r.division_id,
    seed: r.seed,
    p1: r.p1,
    p2: r.p2,
    r1: r.r1,
    r2: r.r2,
    placeholder: r.placeholder,
  };
}

export function mapFixtureRow(r: FixtureRow): Fixture {
  return {
    id: r.id,
    code: r.code,
    divisionId: r.division_id,
    round: r.round,
    team1Id: r.team1_id,
    team2Id: r.team2_id,
    status: r.status,
    sets: r.sets,
    tbc: r.tbc,
    homeTeamId: r.home_team_id,
    enteredBy: r.entered_by,
    enteredAt: r.entered_at ? new Date(r.entered_at).getTime() : null,
    notes: r.notes ?? "",
  };
}

export function groupByDivision(teams: Team[]): Record<string, Team[]> {
  const out: Record<string, Team[]> = {};
  for (const t of teams) {
    (out[t.divisionId] ??= []).push(t);
  }
  for (const k of Object.keys(out)) out[k].sort((a, b) => a.seed - b.seed);
  return out;
}

export async function fetchLeague(supabase: SupabaseClient): Promise<LeagueData> {
  const [teamsRes, fixturesRes, settingsRes] = await Promise.all([
    supabase.from("teams").select("*").order("division_id").order("seed"),
    supabase.from("fixtures").select("*").order("division_id").order("round"),
    supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  if (teamsRes.error) throw teamsRes.error;
  if (fixturesRes.error) throw fixturesRes.error;
  if (settingsRes.error) throw settingsRes.error;

  const teams = (teamsRes.data as TeamRow[]).map(mapTeamRow);
  const fixtures = (fixturesRes.data as FixtureRow[]).map(mapFixtureRow);
  const s = settingsRes.data as SettingsRow | null;
  const settings: Settings = s
    ? { lowerStatus: s.lower_status, upperStatus: s.upper_status }
    : DEFAULT_SETTINGS;

  return { teams, teamsByDiv: groupByDivision(teams), fixtures, settings };
}
