"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { track } from "@vercel/analytics";
import { C, F } from "@/theme/tokens";
import type { Fixture, Team } from "@/lib/types";
import { DIVISIONS, fmtDate, upperTierSlotsRemaining, weekRangeForRound } from "@/lib/league";
import { computeStandings } from "@/lib/standings";
import { Badge, ScoreCell, TeamName } from "./ui";
import { CountdownBanner, ConfirmationBanner } from "./Countdown";
import { StandingsTable } from "./StandingsTable";
import { ShareStandings } from "./ShareStandings";
import { LeagueProgress } from "./LeagueProgress";

export function TeamView({
  teams,
  fixtures,
}: {
  teams: Record<string, Team[]>;
  fixtures: Fixture[];
}) {
  const [selectedDivId, setSelectedDivId] = useState(DIVISIONS[0].id);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const division = DIVISIONS.find((d) => d.id === selectedDivId)!;
  const divTeams = teams[selectedDivId] || [];
  const selectedTeam = divTeams.find((t) => t.id === selectedTeamId);
  const standings = useMemo(
    () => computeStandings(selectedDivId, teams, fixtures),
    [selectedDivId, teams, fixtures]
  );

  // Open (placeholder) slots remaining across the whole upper tier.
  const upperSlotsRemaining = useMemo(() => upperTierSlotsRemaining(teams), [teams]);

  const myFixtures = useMemo(() => {
    if (!selectedTeam) return [];
    return fixtures
      .filter(
        (f) =>
          f.divisionId === selectedDivId &&
          (f.team1Id === selectedTeam.id || f.team2Id === selectedTeam.id)
      )
      .sort((a, b) => a.round - b.round);
  }, [selectedTeam, fixtures, selectedDivId]);

  return (
    <div style={{ padding: "24px 20px", maxWidth: 1400, margin: "0 auto" }}>
      <CountdownBanner />
      <ConfirmationBanner upperSlotsRemaining={upperSlotsRemaining} />

      <div
        style={{
          background: C.card,
          border: `1px solid ${C.accent}`,
          borderRadius: 8,
          padding: "12px 16px",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          fontSize: 13,
          color: C.text,
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: 4, background: C.accent, flexShrink: 0 }} />
        <span>
          <strong style={{ color: C.accent }}>Upcoming competitions across all divisions.</strong>{" "}
          Be first in line for the next leagues and tournaments.
        </span>
        <Link
          href="/register"
          onClick={() => track("register_interest", { source: "home", division: division.name })}
          style={{
            marginLeft: "auto",
            background: C.accent,
            color: C.bg,
            borderRadius: 6,
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 700,
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          Click here to register your interest →
        </Link>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {DIVISIONS.map((d) => {
          const active = d.id === selectedDivId;
          const tierColor = d.tier === "lower" ? C.accent : C.info;
          return (
            <button
              key={d.id}
              onClick={() => {
                setSelectedDivId(d.id);
                setSelectedTeamId(null);
              }}
              style={{
                padding: "10px 16px",
                background: active ? C.card2 : C.card,
                color: C.text,
                border: `1px solid ${active ? tierColor : C.border}`,
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
              <span
                style={{ width: 6, height: 6, borderRadius: 3, background: tierColor }}
              />
              {d.name} <span style={{ color: C.mute, fontWeight: 400 }}>{d.tierLabel}</span>
            </button>
          );
        })}
      </div>

      {division.tier === "upper" && upperSlotsRemaining > 0 && (
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.info}`,
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
            fontSize: 13,
            color: C.text,
          }}
        >
          <span
            style={{ width: 7, height: 7, borderRadius: 4, background: C.info, flexShrink: 0 }}
          />
          <span>
            <strong style={{ color: C.info }}>Upper tier</strong>:{" "}
            {upperSlotsRemaining === 1
              ? "final team slot"
              : `last ${upperSlotsRemaining} team slots`}{" "}
            remaining.
          </span>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <LeagueProgress fixtures={fixtures} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 20 }}>
        <div>
          <div
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontFamily: F.display,
                fontSize: 14,
                color: C.accent,
                letterSpacing: "0.1em",
                marginBottom: 12,
              }}
            >
              PICK YOUR TEAM
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
              {divTeams.map((t) => {
                const active = t.id === selectedTeamId;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTeamId(t.id)}
                    style={{
                      background: active ? C.accent : C.bg2,
                      color: active ? C.bg : C.text,
                      border: `1px solid ${active ? C.accent : C.border}`,
                      borderRadius: 6,
                      padding: "8px 10px",
                      textAlign: "left",
                      cursor: "pointer",
                      fontFamily: F.body,
                      fontSize: 12,
                      opacity: t.placeholder ? 0.5 : 1,
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>#{t.seed}</div>
                    <div>{t.p1}</div>
                    <div style={{ opacity: 0.7 }}>{t.p2}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedTeam && (
            <div
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: 16,
              }}
            >
              <div
                style={{
                  fontFamily: F.display,
                  fontSize: 14,
                  color: C.accent,
                  letterSpacing: "0.1em",
                  marginBottom: 12,
                }}
              >
                YOUR FIXTURES
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {myFixtures.map((f) => {
                  const opponent =
                    f.team1Id === selectedTeam.id
                      ? divTeams.find((t) => t.id === f.team2Id)
                      : divTeams.find((t) => t.id === f.team1Id);
                  const youAreT1 = f.team1Id === selectedTeam.id;
                  const isHome = f.homeTeamId === selectedTeam.id;
                  const wk = weekRangeForRound(f.round);
                  const done = f.status === "completed";
                  let result: "W" | "L" | null = null;
                  if (done && f.sets) {
                    let s1 = 0;
                    let s2 = 0;
                    f.sets.forEach(([a, b]) => {
                      if (a > b) s1++;
                      else s2++;
                    });
                    const youWon = youAreT1 ? s1 > s2 : s2 > s1;
                    result = youWon ? "W" : "L";
                  }
                  return (
                    <div
                      key={f.id}
                      style={{
                        background: C.bg2,
                        border: `1px solid ${C.border}`,
                        borderRadius: 6,
                        padding: "10px 12px",
                        display: "grid",
                        gridTemplateColumns: "auto 1fr auto",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <div style={{ fontFamily: F.mono, fontSize: 11, color: C.mute, minWidth: 50 }}>
                        R{f.round}
                        <div style={{ fontSize: 10 }}>{fmtDate(wk.start, { short: true })}</div>
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <span style={{ fontSize: 11, color: C.mute }}>vs</span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: "0.06em",
                              color: isHome ? C.bg : C.mute,
                              background: isHome ? C.accent : C.card2,
                              borderRadius: 3,
                              padding: "1px 5px",
                            }}
                          >
                            {isHome ? "HOME" : "AWAY"}
                          </span>
                        </div>
                        <TeamName team={opponent} size="sm" showRatings />
                      </div>
                      <div style={{ textAlign: "right" }}>
                        {done && f.sets ? (
                          <div>
                            <Badge color={result === "W" ? C.green : C.red}>{result}</Badge>
                            <div style={{ marginTop: 4 }}>
                              <ScoreCell
                                sets={
                                  youAreT1
                                    ? f.sets
                                    : f.sets.map(([a, b]) => [b, a] as [number, number])
                                }
                              />
                            </div>
                          </div>
                        ) : (
                          <Badge color={C.amber} dark>
                            Pending
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                fontFamily: F.display,
                fontSize: 14,
                color: C.accent,
                letterSpacing: "0.1em",
              }}
            >
              STANDINGS · {division.name} ({division.tierLabel})
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 11, color: C.mute }}>Top 4 → tier knockout</span>
              <button
                onClick={() => setShareOpen(true)}
                style={{
                  background: "transparent",
                  color: C.accent,
                  border: `1px solid ${C.accent}`,
                  borderRadius: 6,
                  padding: "5px 10px",
                  fontFamily: F.body,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                📸 Share table
              </button>
            </div>
          </div>
          <StandingsTable rows={standings} highlightTeamId={selectedTeamId} />
          <div style={{ marginTop: 12, fontSize: 11, color: C.mute, lineHeight: 1.5 }}>
            <span style={{ color: C.accent }}>●</span> Win = 3 pts &nbsp; · &nbsp;
            <span style={{ color: C.accent }}>+1</span> bonus for straight-sets win &nbsp; · &nbsp;
            Tiebreak: H2H → Set diff → Game diff
          </div>
        </div>
      </div>

      {shareOpen && (
        <ShareStandings division={division} rows={standings} onClose={() => setShareOpen(false)} />
      )}
    </div>
  );
}
