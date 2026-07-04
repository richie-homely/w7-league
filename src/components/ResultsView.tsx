"use client";

import { useMemo, useState } from "react";
import { C, F } from "@/theme/tokens";
import type { Fixture, Team } from "@/lib/types";
import { DIVISIONS, fmtDate, weekRangeForRound } from "@/lib/league";
import { setsWon } from "@/lib/scoring";
import { computeStandings } from "@/lib/standings";
import { Badge, ScoreCell, TeamName, tierColor } from "./ui";

// A team name that opens the head-to-head card when tapped.
function ClickableTeam({
  team,
  mute = false,
  onClick,
}: {
  team: Team | undefined;
  mute?: boolean;
  onClick: (team: Team) => void;
}) {
  if (!team) return <TeamName team={team} size="sm" mute={mute} showRatings />;
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
      <TeamName team={team} size="sm" mute={mute} showRatings />
    </button>
  );
}

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

// Head-to-head card: the team's record and their result vs every opponent.
function TeamH2H({
  team,
  divTeams,
  fixtures,
  teams,
  onClose,
  onTeam,
}: {
  team: Team;
  divTeams: Team[];
  fixtures: Fixture[];
  teams: Record<string, Team[]>;
  onClose: () => void;
  onTeam: (team: Team) => void;
}) {
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
      } else if (f && done && f.status === "walkover") {
        result = null; // walkover without sets — show badge
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
                    {mySets && mySets.length > 0 ? (
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
          divTeams={teams[h2hTeam.divisionId] || []}
          fixtures={fixtures}
          teams={teams}
          onClose={() => setH2hTeam(null)}
          onTeam={setH2hTeam}
        />
      )}
    </div>
  );
}
