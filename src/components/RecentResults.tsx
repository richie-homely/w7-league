"use client";

import Link from "next/link";
import { C, F } from "@/theme/tokens";
import { formatScore } from "@/lib/scoring";
import { KNOCKOUT_RESULTS } from "@/lib/bracket";
import { useLeagueData } from "@/lib/useLeagueData";
import { useBoxData, type BoxMatch, type BoxTeam } from "@/lib/box";

// Recent results (Richie, 9 Sep 2026): the latest confirmed box-league results and the
// latest summer knockout results, newest first. On the hub both lists are merged; on the
// box league page only box results, fed from the page's own data (no second subscription).

interface Row {
  key: string;
  when: string;          // ISO date or timestamp, for sorting
  label: string;         // "Box 7" / "Upper tier knockouts"
  isBox: boolean;
  winner: string;
  loser: string;
  score: string;
  href: string;
}

function fmtDay(iso: string): string {
  const d = new Date(iso.length === 10 ? iso + "T12:00:00" : iso);
  return d.toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short" });
}

export function boxRows(matches: BoxMatch[], teamsById: Record<string, BoxTeam>): Row[] {
  const rows: Row[] = [];
  for (const m of matches) {
    if (m.status !== "confirmed" || !m.sets || m.box >= 90) continue;
    const t1 = teamsById[m.team1Id], t2 = teamsById[m.team2Id];
    if (!t1 || !t2) continue;
    // sets won decides the winner; the third "set" may be a championship tiebreak
    let w1 = 0, w2 = 0;
    for (const [a, b] of m.sets) { if (a > b) w1++; else if (b > a) w2++; }
    const winnerFirst = w1 >= w2;
    rows.push({
      key: "box:" + m.id, when: m.updatedAt ?? "", label: `Box ${m.box}`, isBox: true,
      winner: winnerFirst ? t1.name : t2.name, loser: winnerFirst ? t2.name : t1.name,
      score: winnerFirst ? formatScore(m.sets) : formatScore(m.sets.map(([a, b]) => [b, a] as [number, number])),
      href: `/box?box=${m.box}`,
    });
  }
  return rows.sort((a, b) => (a.when < b.when ? 1 : -1));
}

function ResultsList({ rows, empty }: { rows: Row[]; empty: string }) {
  if (rows.length === 0) {
    return <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, fontSize: 13, color: C.mute, marginTop: 10 }}>{empty}</div>;
  }
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "6px 14px", marginTop: 10 }}>
      {rows.map((r) => (
        <div key={r.key} style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap", padding: "7px 0", borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontFamily: F.mono, fontSize: 12, color: C.mute, minWidth: 92 }}>{r.when ? fmtDay(r.when) : "—"}</div>
          <Link href={r.href} style={{ fontSize: 11, fontWeight: 700, color: r.isBox ? C.accent : C.info, minWidth: 150, letterSpacing: "0.04em", textDecoration: "none" }}>
            {r.label.toUpperCase()}
          </Link>
          <div style={{ fontSize: 13.5, flex: "1 1 260px" }}>
            <b>{r.winner}</b> <span style={{ color: C.mute }}>bt</span> {r.loser}
            <span style={{ fontFamily: F.mono, fontSize: 12.5, color: C.accent, marginLeft: 10 }}>{r.score}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Box league page: results from the page's own data. */
export function RecentBoxResults({ matches, teams, limit = 10 }: { matches: BoxMatch[]; teams: BoxTeam[]; limit?: number }) {
  const teamsById = Object.fromEntries(teams.map((t) => [t.id, t]));
  const rows = boxRows(matches, teamsById).slice(0, limit);
  return (
    <section id="results" style={{ marginTop: 22, scrollMarginTop: 60 }}>
      <div style={{ fontFamily: F.display, fontSize: 22, letterSpacing: "0.02em", textTransform: "uppercase" }}>
        Recent <span style={{ color: C.accent }}>results</span>
      </div>
      <ResultsList rows={rows} empty="No confirmed results yet — the first cycle starts Monday 14 September." />
    </section>
  );
}

/** Hub: box results and summer knockout results merged, newest first. */
export function RecentLeagueResults({ limit = 8 }: { limit?: number }) {
  const { teams: boxTeams, matches } = useBoxData();
  const { teams } = useLeagueData();
  const byId: Record<string, { name: string; tier: string }> = {};
  for (const t of teams) byId[t.id] = { name: `${t.p1} & ${t.p2}`, tier: t.divisionId.endsWith("low") ? "Lower tier knockouts" : "Upper tier knockouts" };
  const summer: Row[] = KNOCKOUT_RESULTS.map((r) => {
    const w = byId[r.winnerTeamId];
    const loserId = r.teams[0] === r.winnerTeamId ? r.teams[1] : r.teams[0];
    const l = byId[loserId];
    return {
      key: "sum:" + r.teams.join(":"), when: r.playedOn, label: w?.tier ?? "Summer knockouts", isBox: false,
      winner: w?.name ?? "—", loser: l?.name ?? "—", score: r.score, href: "/summer-2026/knockouts",
    };
  });
  const rows = [...boxRows(matches, Object.fromEntries(boxTeams.map((t) => [t.id, t]))), ...summer]
    .sort((a, b) => (a.when < b.when ? 1 : -1))
    .slice(0, limit);
  return (
    <section id="results" style={{ marginTop: 36, scrollMarginTop: 60 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontFamily: F.display, fontSize: 28, letterSpacing: "0.02em", textTransform: "uppercase" }}>
          Recent <span style={{ color: C.accent }}>results</span>
        </div>
        <div style={{ fontSize: 12, color: C.mute }}>box league and summer knockouts · newest first</div>
      </div>
      <ResultsList rows={rows} empty="No results yet." />
    </section>
  );
}
