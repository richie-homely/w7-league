"use client";

// Box league data layer: types, live data hook, and box standings.
// Same scoring as the summer league: Win = 3 pts, straight-sets bonus = +1.
// Only CONFIRMED results count in standings; 'submitted' shows as provisional.

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "./supabase/client";
import type { SetScore } from "./types";

export type BoxMatchStatus = "pending" | "submitted" | "confirmed" | "disputed";

export interface BoxTeam {
  id: string;
  box: number;
  seed: number;
  name: string;
  p1: string;
  p2: string;
  r1: number | null;
  r2: number | null;
  active: boolean;
}

export interface BoxMatch {
  id: string;
  box: number;
  cycle: number;
  team1Id: string;
  team2Id: string;
  sets: SetScore[] | null;
  status: BoxMatchStatus;
  submittedTeam: string | null;
  notes: string;
}

export interface BoxStandingRow {
  teamId: string;
  team: BoxTeam;
  P: number;
  W: number;
  L: number;
  Pts: number;
  SF: number;
  SA: number;
  GF: number;
  GA: number;
  h2h: Record<string, number>;
  rank: number;
}

// Player-facing copy for the codes returned by the submit/confirm functions.
export const RPC_MESSAGES: Record<string, { ok: boolean; text: string }> = {
  ok_submitted: {
    ok: true,
    text: "Result submitted. It shows as provisional until your opponents confirm it.",
  },
  ok_confirmed: { ok: true, text: "Result confirmed. Standings updated — nice one." },
  ok_disputed: {
    ok: true,
    text: "Scores don't match — the result is flagged for the W7 team to resolve.",
  },
  not_registered: {
    ok: false,
    text: "That email isn't registered to either team in this match. Use the address you entered the league with, or contact the desk.",
  },
  not_opponent: {
    ok: false,
    text: "Only the opposing team can confirm a result. If your own entry is wrong, just resubmit it.",
  },
  bad_sets: { ok: false, text: "That score doesn't look right — check the set scores and try again." },
  already_confirmed: { ok: false, text: "This result is already confirmed." },
  bad_status: { ok: false, text: "This result isn't awaiting confirmation." },
  not_found: { ok: false, text: "Match not found — refresh and try again." },
};

// The email is the player's credential for scores, so remember it on the device
// after the first successful entry (Richie, 5 Sep 2026) — one less thing to type
// courtside. localStorage can throw in private browsing; fail quietly.
const EMAIL_KEY = "w7-box-email";
export function rememberedEmail(): string {
  try {
    return localStorage.getItem(EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}
export function rememberEmail(email: string): void {
  try {
    localStorage.setItem(EMAIL_KEY, email.trim());
  } catch {
    /* ignore */
  }
}

/** Which box is this email registered in? Uses the box_team_for_email function
 *  (security definer — contacts are not publicly readable). Returns null when the
 *  email is unknown and "unavailable" if the function is not deployed yet. */
export async function findBoxForEmail(
  email: string
): Promise<{ box: number; teamId: string } | null | "unavailable"> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("box_team_for_email", { p_email: email.trim() });
  if (error) return "unavailable";
  const d = data as { team_id?: string; box?: number } | null;
  if (!d || !d.team_id || typeof d.box !== "number") return null;
  return { box: d.box, teamId: d.team_id };
}

/** A registered player adds a teammate's email (box_add_contact). */
export async function addTeamContact(existingEmail: string, newEmail: string): Promise<{ ok: boolean; text: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("box_add_contact", {
    p_existing_email: existingEmail.trim(),
    p_new_email: newEmail.trim(),
  });
  if (error) return { ok: false, text: "Adding emails isn't switched on yet — contact the desk and we'll add it." };
  const code = data as string;
  return (
    {
      ok_added: { ok: true, text: "Added — your teammate can now log and confirm scores with that email." },
      not_registered: { ok: false, text: "Your own email isn't registered to a team. Use the address you entered the league with." },
      bad_email: { ok: false, text: "That doesn't look like an email address." },
    } as Record<string, { ok: boolean; text: string }>
  )[code] ?? { ok: false, text: "Something went wrong — try again or contact the desk." };
}

export function rpcMessage(code: string | null | undefined): { ok: boolean; text: string } {
  return (
    (code && RPC_MESSAGES[code]) || {
      ok: false,
      text: "Something went wrong — please try again or contact the desk.",
    }
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapTeam(r: any): BoxTeam {
  return {
    id: r.id,
    box: r.box,
    seed: r.seed,
    name: r.name,
    p1: r.p1,
    p2: r.p2,
    r1: r.r1 === null ? null : Number(r.r1),
    r2: r.r2 === null ? null : Number(r.r2),
    active: r.active,
  };
}

function mapMatch(r: any): BoxMatch {
  return {
    id: r.id,
    box: r.box,
    cycle: r.cycle,
    team1Id: r.team1_id,
    team2Id: r.team2_id,
    sets: r.sets ?? null,
    status: r.status,
    submittedTeam: r.submitted_team ?? null,
    notes: r.notes ?? "",
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function useBoxData() {
  const [teams, setTeams] = useState<BoxTeam[]>([]);
  const [matches, setMatches] = useState<BoxMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabaseRef = useRef(createClient());

  const refresh = useCallback(async () => {
    try {
      const supabase = supabaseRef.current;
      const [t, m] = await Promise.all([
        supabase.from("box_teams").select("*").order("box").order("seed"),
        supabase.from("box_matches").select("*").order("box"),
      ]);
      if (t.error) throw t.error;
      if (m.error) throw m.error;
      setTeams((t.data ?? []).map(mapTeam));
      setMatches((m.data ?? []).map(mapMatch));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load box league");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const supabase = supabaseRef.current;
    refresh();
    const channel = supabase
      .channel("box-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "box_teams" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "box_matches" }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { teams, matches, loading, error, refresh };
}

export async function submitBoxScore(
  matchId: string,
  sets: SetScore[],
  email: string
): Promise<{ ok: boolean; text: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("submit_box_score", {
    p_match: matchId,
    p_sets: sets,
    p_email: email,
  });
  if (error) return { ok: false, text: error.message };
  return rpcMessage(data as string);
}

export async function confirmBoxScore(
  matchId: string,
  email: string,
  agree: boolean
): Promise<{ ok: boolean; text: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("confirm_box_score", {
    p_match: matchId,
    p_email: email,
    p_agree: agree,
  });
  if (error) return { ok: false, text: error.message };
  return rpcMessage(data as string);
}

// Standings for one box, confirmed results only.
// Tiebreak matches the summer league: Points -> H2H -> set diff -> game diff.
// The deciding 3rd set is a championship tiebreak: counts as a set, its points
// are not games.
export function computeBoxStandings(
  boxTeams: BoxTeam[],
  boxMatches: BoxMatch[]
): BoxStandingRow[] {
  const rows: BoxStandingRow[] = boxTeams
    .filter((t) => t.active)
    .map((t) => ({
      teamId: t.id,
      team: t,
      P: 0,
      W: 0,
      L: 0,
      Pts: 0,
      SF: 0,
      SA: 0,
      GF: 0,
      GA: 0,
      h2h: {},
      rank: 0,
    }));
  const byId = Object.fromEntries(rows.map((r) => [r.teamId, r]));

  for (const m of boxMatches) {
    if (m.status !== "confirmed" || !m.sets) continue;
    const r1 = byId[m.team1Id];
    const r2 = byId[m.team2Id];
    if (!r1 || !r2) continue;
    let s1 = 0;
    let s2 = 0;
    let g1 = 0;
    let g2 = 0;
    m.sets.forEach(([a, b], idx) => {
      const isChampionshipTiebreak = idx === 2;
      if (!isChampionshipTiebreak) {
        g1 += a;
        g2 += b;
      }
      if (a > b) s1++;
      else if (b > a) s2++;
    });
    r1.P++;
    r2.P++;
    r1.SF += s1;
    r1.SA += s2;
    r2.SF += s2;
    r2.SA += s1;
    r1.GF += g1;
    r1.GA += g2;
    r2.GF += g2;
    r2.GA += g1;
    const t1Won = s1 > s2;
    const winner = t1Won ? r1 : r2;
    const loser = t1Won ? r2 : r1;
    winner.W++;
    loser.L++;
    winner.Pts += 3;
    if ((t1Won && s2 === 0) || (!t1Won && s1 === 0)) winner.Pts += 1;
    winner.h2h[loser.teamId] = (winner.h2h[loser.teamId] || 0) + 1;
  }

  rows.sort((a, b) => {
    if (b.Pts !== a.Pts) return b.Pts - a.Pts;
    const aWins = a.h2h[b.teamId] || 0;
    const bWins = b.h2h[a.teamId] || 0;
    if (aWins !== bWins) return bWins - aWins;
    const sdA = a.SF - a.SA;
    const sdB = b.SF - b.SA;
    if (sdB !== sdA) return sdB - sdA;
    return b.GF - b.GA - (a.GF - a.GA);
  });
  rows.forEach((r, i) => (r.rank = i + 1));
  return rows;
}
