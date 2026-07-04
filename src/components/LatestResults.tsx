import type { CSSProperties } from "react";
import { C, F } from "@/theme/tokens";
import type { Fixture, Team } from "@/lib/types";
import { DIVISIONS } from "@/lib/league";
import { setsWon } from "@/lib/scoring";
import { ScoreCell } from "./ui";

// Most-recently-entered results across all divisions, winner shown first.
export function LatestResults({
  teams,
  fixtures,
  limit = 8,
  onTeam,
}: {
  teams: Record<string, Team[]>;
  fixtures: Fixture[];
  limit?: number;
  onTeam?: (team: Team) => void;
}) {
  const done = fixtures
    .filter((f) => f.status === "completed" && f.sets && f.sets.length > 0)
    .sort((a, b) => (b.enteredAt ?? 0) - (a.enteredAt ?? 0) || b.round - a.round)
    .slice(0, limit);

  const teamOf = (divId: string, id: string) =>
    (teams[divId] ?? []).find((x) => x.id === id);
  // Names become tap targets when a head-to-head handler is provided.
  const nameEl = (divId: string, id: string, style: CSSProperties) => {
    const t = teamOf(divId, id);
    const label = t ? `${t.p1} / ${t.p2}` : "TBC";
    if (!t || !onTeam || t.placeholder) return <div style={style}>{label}</div>;
    return (
      <button
        onClick={() => onTeam(t)}
        title="View head-to-head record"
        style={{
          background: "transparent",
          border: "none",
          padding: 0,
          textAlign: "left",
          cursor: "pointer",
          display: "block",
          width: "100%",
          fontFamily: F.body,
          ...style,
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
      <div style={{ fontFamily: F.display, fontSize: 14, color: C.accent, letterSpacing: "0.1em", marginBottom: 12 }}>
        LATEST RESULTS
      </div>
      {done.length === 0 ? (
        <div style={{ fontSize: 13, color: C.mute }}>
          No results in yet. They will appear here as matches are played.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {done.map((f, idx) => {
            const div = DIVISIONS.find((d) => d.id === f.divisionId);
            const tColor = div?.tier === "lower" ? C.accent : C.info;
            const { s1, s2 } = setsWon(f.sets!);
            const t1Won = s1 > s2;
            const winnerId = t1Won ? f.team1Id : f.team2Id;
            const loserId = t1Won ? f.team2Id : f.team1Id;
            const winnerSets = t1Won
              ? f.sets!
              : f.sets!.map(([a, b]) => [b, a] as [number, number]);
            return (
              <div
                key={f.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "9px 0",
                  borderTop: idx === 0 ? "none" : `1px solid ${C.border}`,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: C.mute, letterSpacing: "0.06em", marginBottom: 3 }}>
                    <span style={{ color: tColor, fontWeight: 700 }}>{div?.name}</span> · R{f.round}
                  </div>
                  {nameEl(f.divisionId, winnerId, {
                    fontSize: 13,
                    fontWeight: 700,
                    color: C.text,
                    lineHeight: 1.25,
                  })}
                  {nameEl(f.divisionId, loserId, { fontSize: 12, color: C.mute, lineHeight: 1.25 })}
                </div>
                <div style={{ alignSelf: "center" }}>
                  <ScoreCell sets={winnerSets} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
