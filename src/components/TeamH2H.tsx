"use client";

import { C, F } from "@/theme/tokens";
import type { Fixture, Team } from "@/lib/types";
import { DIVISIONS } from "@/lib/league";
import { setsWon } from "@/lib/scoring";
import { computeStandings } from "@/lib/standings";
import { Badge, ScoreCell, TeamName, tierColor } from "./ui";

// A team name that opens the head-to-head card when tapped. Used across the
// public views (results, standings, fixtures, bracket, latest results).
export function ClickableTeam({
  team,
  size = "sm",
  mute = false,
  showRatings = true,
  onClick,
}: {
  team: Team | undefined;
  size?: "sm" | "md" | "lg";
  mute?: boolean;
  showRatings?: boolean;
  onClick?: (team: Team) => void;
}) {
  if (!team || !onClick || team.placeholder) {
    return <TeamName team={team} size={size} mute={mute} showRatings={showRatings} />;
  }
  return (
    <button
      onClick={() => onClick(team)}
      style={{
        background: "transparent",
        border: "none",
        padding: 0,
        textAlign: "left",
        cursor: "pointer",
        display: "block",
        width: "100%",
      }}
      title="View head-to-head record"
    >
      <TeamName team={team} size={size} mute={mute} showRatings={showRatings} />
    </button>
  );
}

// Head-to-head card: the team's record and their result vs every opponent.
export function TeamH2H({
  team,
  fixtures,
  teams,
  onClose,
  onTeam,
}: {
  team: Team;
  fixtures: Fixture[];
  teams: Record<string, Team[]>;
  onClose: () => void;
  onTeam: (team: Team) => void;
}) {
  const divTeams = teams[team.divisionId] || [];
  const standings = computeStandings(team.divisionId, teams, fixtures);
  const row = standings.find((r) => r.teamId === team.id);
  const division = DIVISIONS.find((d) => d.id === team.divisionId);

  const h2h = divTeams
    .filter((t) => t.id !== team.id)
    .map((opp) => {
      const f = fixtures.find(
        (x) =>
          x.divisionId === team.divisionId &&
          ((x.team1Id === team.id && x.team2Id === opp.id) ||
            (x.team1Id === opp.id && x.team2Id === team.id))
      );
      const done = f && (f.status === "completed" || f.status === "walkover");
      let result: "W" | "L" | null = null;
      let mySets = f?.sets ?? null;
      if (f && done && f.sets && f.sets.length > 0) {
        const { s1, s2 } = setsWon(f.sets);
        const iAmT1 = f.team1Id === team.id;
        result = (iAmT1 ? s1 > s2 : s2 > s1) ? "W" : "L";
        mySets = iAmT1 ? f.sets : f.sets.map(([a, b]) => [b, a] as [number, number]);
      }
      return { opp, fixture: f, done: !!done, result, mySets };
    })
    .sort((a, b) => (a.fixture?.round ?? 99) - (b.fixture?.round ?? 99));

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          maxWidth: 560,
          width: "100%",
          maxHeight: "85vh",
          overflowY: "auto",
          padding: 20,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: C.mute, letterSpacing: "0.08em", marginBottom: 4 }}>
              <span style={{ color: division ? tierColor(division.tier) : C.accent, fontWeight: 700 }}>
                {division?.name}
              </span>{" "}
              · SEED #{team.seed} · HEAD-TO-HEAD
            </div>
            <TeamName team={team} size="lg" showRatings />
          </div>
          <button
            onClick={onClose}
            style={{
              background: C.bg2,
              color: C.text,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: "6px 12px",
              cursor: "pointer",
              fontFamily: F.body,
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>

        {row && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "14px 0 16px" }}>
            {[
              [`#${row.rank}`, "rank"],
              [row.P, "played"],
              [row.W, "won"],
              [row.L, "lost"],
              [row.Pts, "points"],
              [`${row.SF}-${row.SA}`, "sets"],
            ].map(([v, l]) => (
              <div
                key={l as string}
                style={{
                  background: C.bg2,
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  padding: "6px 12px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontFamily: F.mono, fontSize: 15, fontWeight: 700, color: C.text }}>{v}</div>
                <div style={{ fontSize: 9, color: C.mute, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  {l}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {h2h.map(({ opp, fixture, done, result, mySets }) => (
            <div
              key={opp.id}
              style={{
                background: C.bg2,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                padding: "8px 12px",
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ fontFamily: F.mono, fontSize: 10, color: C.mute, minWidth: 26 }}>
                R{fixture?.round ?? "–"}
              </div>
              <ClickableTeam team={opp} onClick={onTeam} />
              <div style={{ textAlign: "right" }}>
                {done ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                    {result && <Badge color={result === "W" ? C.green : C.red}>{result}</Badge>}
                    {mySets && mySets.length > 0 && fixture?.status !== "walkover" ? (
                      <ScoreCell sets={mySets} />
                    ) : (
                      <Badge color={C.amber} dark>
                        Walkover
                      </Badge>
                    )}
                  </div>
                ) : (
                  <Badge color={C.amber} dark>
                    Pending
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
