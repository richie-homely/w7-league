"use client";

import { useMemo, useState } from "react";
import { C, F } from "@/theme/tokens";
import type { Fixture, Team } from "@/lib/types";
import { DIVISIONS, fmtDate, weekRangeForRound } from "@/lib/league";
import { setsWon } from "@/lib/scoring";
import { Badge, ScoreCell, tierColor } from "./ui";
import { ClickableTeam, TeamH2H } from "./TeamH2H";

// One completed fixture row: winner on top (bold), loser below, score to the right.
function ResultRow({
  fixture,
  divTeams,
  onTeam,
}: {
  fixture: Fixture;
  divTeams: Team[];
  onTeam: (team: Team) => void;
}) {
  const team = (id: string) => divTeams.find((t) => t.id === id);
  const walkover = fixture.status === "walkover";
  let winnerId = fixture.team1Id;
  let loserId = fixture.team2Id;
  let winnerSets = fixture.sets;
  if (fixture.sets && fixture.sets.length > 0) {
    const { s1, s2 } = setsWon(fixture.sets);
    if (s2 > s1) {
      winnerId = fixture.team2Id;
      loserId = fixture.team1Id;
      winnerSets = fixture.sets.map(([a, b]) => [b, a] as [number, number]);
    }
  }
  return (
    <div
      style={{
        background: C.bg2,
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        padding: "10px 12px",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ marginBottom: 4 }}>
          <ClickableTeam team={team(winnerId)} onClick={onTeam} />
        </div>
        <div style={{ opacity: 0.65 }}>
          <ClickableTeam team={team(loserId)} mute onClick={onTeam} />
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        {walkover && !fixture.sets ? (
          <Badge color={C.amber} dark>
            Walkover
          </Badge>
        ) : (
          <ScoreCell sets={winnerSets} />
        )}
        {fixture.enteredAt && (
          <div style={{ fontFamily: F.mono, fontSize: 10, color: C.mute, marginTop: 4 }}>
            {fmtDate(new Date(fixture.enteredAt), { short: true })}
          </div>
        )}
      </div>
    </div>
  );
}

export function ResultsView({
  teams,
  fixtures,
}: {
  teams: Record<string, Team[]>;
  fixtures: Fixture[];
}) {
  const [selectedDivId, setSelectedDivId] = useState(DIVISIONS[0].id);
  const [query, setQuery] = useState("");
  const [h2hTeam, setH2hTeam] = useState<Team | null>(null);
  const division = DIVISIONS.find((d) => d.id === selectedDivId)!;
  const divTeams = teams[selectedDivId] || [];

  const matchesQuery = (f: Fixture) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [f.team1Id, f.team2Id].some((id) => {
      const t = divTeams.find((x) => x.id === id);
      return t && `${t.p1} ${t.p2}`.toLowerCase().includes(q);
    });
  };

  const divFixtures = useMemo(
    () => fixtures.filter((f) => f.divisionId === selectedDivId),
    [fixtures, selectedDivId]
  );

  const played = divFixtures.filter(
    (f) => (f.status === "completed" || f.status === "walkover") && matchesQuery(f)
  );

  // Latest = most recently entered, regardless of round.
  const latest = [...played]
    .filter((f) => f.enteredAt)
    .sort((a, b) => (b.enteredAt ?? 0) - (a.enteredAt ?? 0))
    .slice(0, 4);

  // History = grouped by round, most recent round with results first.
  const rounds = useMemo(() => {
    const byRound = new Map<number, Fixture[]>();
    for (const f of played) {
      byRound.set(f.round, [...(byRound.get(f.round) ?? []), f]);
    }
    return [...byRound.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([round, list]) => ({
        round,
        list: list.sort((a, b) => (b.enteredAt ?? 0) - (a.enteredAt ?? 0)),
        scheduled: divFixtures.filter((f) => f.round === round).length,
      }));
  }, [played, divFixtures]);

  const totalPlayed = divFixtures.filter(
    (f) => f.status === "completed" || f.status === "walkover"
  ).length;

  return (
    <div style={{ padding: "24px 20px", maxWidth: 900, margin: "0 auto" }}>
      {/* Division picker — same pattern as Team View */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {DIVISIONS.map((d) => {
          const active = d.id === selectedDivId;
          const tc = tierColor(d.tier);
          return (
            <button
              key={d.id}
              onClick={() => setSelectedDivId(d.id)}
              style={{
                padding: "10px 16px",
                background: active ? C.card2 : C.card,
                color: C.text,
                border: `1px solid ${active ? tc : C.border}`,
                borderRadius: 6,
                fontFamily: F.body,
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: 3, background: tc }} />
              {d.name} <span style={{ color: C.mute, fontWeight: 400 }}>{d.tierLabel}</span>
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <div style={{ fontFamily: F.display, fontSize: 18, color: C.accent, letterSpacing: "0.08em" }}>
          RESULTS · {division.name} ({division.tierLabel})
        </div>
        <div style={{ fontSize: 12, color: C.mute }}>
          {totalPlayed} of {divFixtures.length} matches played · tap a team for head-to-head
        </div>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by player name…"
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          color: C.text,
          fontFamily: F.body,
          fontSize: 13,
          padding: "10px 14px",
          marginBottom: 18,
          outline: "none",
        }}
      />

      {played.length === 0 ? (
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: 24,
            fontSize: 13,
            color: C.mute,
          }}
        >
          {query
            ? "No results match that search."
            : "No results in this division yet — they will appear here as matches are played."}
        </div>
      ) : (
        <>
          {/* Latest results strip */}
          {!query && latest.length > 0 && (
            <div
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: 16,
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  fontFamily: F.display,
                  fontSize: 13,
                  color: C.accent,
                  letterSpacing: "0.1em",
                  marginBottom: 10,
                }}
              >
                LATEST IN {division.name}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {latest.map((f) => (
                  <ResultRow key={f.id} fixture={f} divTeams={divTeams} onTeam={setH2hTeam} />
                ))}
              </div>
            </div>
          )}

          {/* Full history by round */}
          {rounds.map(({ round, list, scheduled }) => {
            const wk = weekRangeForRound(round);
            return (
              <div key={round} style={{ marginBottom: 18 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: 10,
                    marginBottom: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      fontFamily: F.display,
                      fontSize: 14,
                      color: C.text,
                      letterSpacing: "0.08em",
                    }}
                  >
                    ROUND {round}
                    <span style={{ color: C.mute, fontFamily: F.body, fontSize: 11, marginLeft: 10 }}>
                      week of {fmtDate(wk.start, { short: true })}
                    </span>
                  </div>
                  <div style={{ fontFamily: F.mono, fontSize: 11, color: C.mute }}>
                    {list.length}/{scheduled} in
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {list.map((f) => (
                    <ResultRow key={f.id} fixture={f} divTeams={divTeams} onTeam={setH2hTeam} />
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}

      {h2hTeam && (
        <TeamH2H
          team={h2hTeam}
          fixtures={fixtures}
          teams={teams}
          onClose={() => setH2hTeam(null)}
          onTeam={setH2hTeam}
        />
      )}
    </div>
  );
}
