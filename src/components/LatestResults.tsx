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
}: {
  teams: Record<string, Team[]>;
  fixtures: Fixture[];
  limit?: number;
}) {
  const done = fixtures
    .filter((f) => f.status === "completed" && f.sets && f.sets.length > 0)
    .sort((a, b) => (b.enteredAt ?? 0) - (a.enteredAt ?? 0) || b.round - a.round)
    .slice(0, limit);

  const teamName = (divId: string, id: string) => {
    const t = (teams[divId] ?? []).find((x) => x.id === id);
    return t ? `${t.p1} / ${t.p2}` : "TBC";
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
            const winnerName = teamName(f.divisionId, t1Won ? f.team1Id : f.team2Id);
            const loserName = teamName(f.divisionId, t1Won ? f.team2Id : f.team1Id);
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
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, lineHeight: 1.25 }}>
                    {winnerName}
                  </div>
                  <div style={{ fontSize: 12, color: C.mute, lineHeight: 1.25 }}>{loserName}</div>
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
