"use client";

import { useState } from "react";
import { C, F, divColor } from "@/theme/tokens";
import type { BracketMatch as BracketMatchType, BracketSlot, Fixture, Team, Tier } from "@/lib/types";
import { TIER_PRIZES, buildBracket, isPlaceholderSlot, tierQualifiers } from "@/lib/bracket";
import { upperTierSlotsRemaining } from "@/lib/league";
import { Logo } from "./ui";
import { ConfirmationBanner } from "./Countdown";
import { TeamH2H } from "./TeamH2H";

function TeamSlot({
  slot,
  tierColor,
  onTeam,
}: {
  slot: BracketSlot;
  tierColor: string;
  onTeam?: (team: Team) => void;
}) {
  if (!slot) return null;
  if (isPlaceholderSlot(slot)) {
    return (
      <div style={{ padding: "8px 10px", fontSize: 11, color: C.mute, fontStyle: "italic" }}>
        {slot.label}
      </div>
    );
  }
  const t = slot.team;
  const clickable = onTeam && !t.placeholder;
  const dc = divColor(slot.divName);
  return (
    <div
      onClick={clickable ? () => onTeam(t) : undefined}
      title={clickable ? `${slot.divName} · view head-to-head record` : slot.divName}
      style={{
        padding: "8px 10px 8px 7px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        cursor: clickable ? "pointer" : "default",
        borderLeft: `3px solid ${dc}`,
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          background: tierColor,
          color: C.bg,
          borderRadius: 4,
          fontFamily: F.mono,
          fontWeight: 700,
          fontSize: 11,
          textAlign: "center",
          lineHeight: "22px",
          flexShrink: 0,
        }}
      >
        {slot.seed}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: C.text,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            opacity: t.placeholder ? 0.45 : 1,
          }}
        >
          {t.p1}
        </div>
        <div
          style={{
            fontSize: 11,
            color: C.mute,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            opacity: t.placeholder ? 0.45 : 1,
          }}
        >
          {t.p2}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
          <span
            style={{
              fontFamily: F.mono,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.06em",
              color: dc,
              background: `${dc}1f`,
              border: `1px solid ${dc}59`,
              borderRadius: 3,
              padding: "1px 4px",
              lineHeight: 1.4,
            }}
          >
            {slot.divName}
          </span>
          <span style={{ fontSize: 9, color: C.mute, letterSpacing: "0.1em" }}>
            {slot.Pts} PTS
          </span>
        </div>
      </div>
    </div>
  );
}

function BracketMatch({
  match,
  tierColor,
  onTeam,
}: {
  match: BracketMatchType;
  tierColor: string;
  onTeam?: (team: Team) => void;
}) {
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderLeft: `3px solid ${tierColor}`,
        borderRadius: 6,
        marginBottom: 10,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "4px 10px",
          background: C.bg2,
          fontSize: 9,
          color: C.mute,
          letterSpacing: "0.15em",
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        {match.id}
      </div>
      <TeamSlot slot={match.a} tierColor={tierColor} onTeam={onTeam} />
      <div style={{ height: 1, background: C.border, margin: "0 10px" }} />
      <TeamSlot slot={match.b} tierColor={tierColor} onTeam={onTeam} />
    </div>
  );
}

function TierBracket({
  tier,
  teams,
  fixtures,
  onTeam,
}: {
  tier: Tier;
  teams: Record<string, Team[]>;
  fixtures: Fixture[];
  onTeam?: (team: Team) => void;
}) {
  const tierLabel = tier === "lower" ? "LOWER TIER" : "UPPER TIER";
  const tierRange = tier === "lower" ? "0.5 – 2.4" : "2.5 – 5.5";
  const tierColor = tier === "lower" ? C.accent : C.info;
  const qualifiers = tierQualifiers(tier, teams, fixtures);
  const bracket = buildBracket(qualifiers);

  const stages: { label: string; matches: BracketMatchType[] }[] = [];
  if (bracket.r1.length) stages.push({ label: "ROUND 1", matches: bracket.r1 });
  stages.push({ label: "QUARTER FINALS", matches: bracket.qf });
  stages.push({ label: "SEMI FINALS", matches: bracket.sf });
  stages.push({ label: "FINAL", matches: bracket.f });

  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderTop: `4px solid ${tierColor}`,
        borderRadius: 10,
        padding: 20,
        marginBottom: 24,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <Logo style={{ width: 48, height: 48, flexShrink: 0 }} />
        <div style={{ flex: "1 1 240px" }}>
          <div style={{ fontFamily: F.display, fontSize: 28, color: tierColor, letterSpacing: "0.04em", lineHeight: 1 }}>
            {tierLabel} KNOCKOUTS
          </div>
          <div style={{ fontSize: 13, color: C.mute, marginTop: 6 }}>
            Playtomic rating {tierRange} · {tier === "lower"
              ? "Top 5 from each division + best 6th"
              : "Top 4 from each division"} qualify · {qualifiers.length} teams in the bracket · Dates TBC
          </div>
          {bracket.meta && (
            <div
              style={{
                fontSize: 12,
                color: bracket.meta.crossDivision ? C.green : C.amber,
                marginTop: 6,
                display: "flex",
                alignItems: "flex-start",
                gap: 6,
              }}
            >
              <span aria-hidden="true">{bracket.meta.crossDivision ? "✓" : "⚠"}</span>
              <span>{bracket.meta.note}</span>
            </div>
          )}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, auto)",
            gap: 16,
            background: C.bg2,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: "10px 18px",
          }}
        >
          {TIER_PRIZES.map((p) => (
            <div key={p.rank} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 9, color: C.mute, letterSpacing: "0.15em" }}>{p.label}</div>
              <div style={{ fontFamily: F.display, fontSize: 26, color: tierColor, lineHeight: 1, marginTop: 4 }}>
                {p.amount}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${stages.length}, 1fr)`,
          gap: 16,
          alignItems: "start",
        }}
      >
        {stages.map((s) => (
          <div key={s.label}>
            <div
              style={{
                fontSize: 10,
                color: C.mute,
                letterSpacing: "0.15em",
                marginBottom: 8,
                paddingBottom: 6,
                borderBottom: `1px solid ${C.border}`,
              }}
            >
              {s.label}
            </div>
            {s.matches.map((m) => (
              <BracketMatch key={m.id} match={m} tierColor={tierColor} onTeam={onTeam} />
            ))}
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 16,
          padding: "12px 16px",
          background: C.bg2,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div style={{ fontSize: 10, color: C.mute, letterSpacing: "0.15em" }}>3RD PLACE PLAYOFF</div>
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <TeamSlot slot={bracket.third[0].a} tierColor={tierColor} onTeam={onTeam} />
          <TeamSlot slot={bracket.third[0].b} tierColor={tierColor} onTeam={onTeam} />
        </div>
      </div>
    </div>
  );
}

export function KnockoutView({
  teams,
  fixtures,
}: {
  teams: Record<string, Team[]>;
  fixtures: Fixture[];
}) {
  const [h2hTeam, setH2hTeam] = useState<Team | null>(null);
  return (
    <div style={{ padding: "20px", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: F.display, fontSize: 28, color: C.accent, letterSpacing: "0.04em", lineHeight: 1 }}>
            KNOCKOUT BRACKETS
          </div>
          <div style={{ fontSize: 12, color: C.mute, marginTop: 6 }}>
            Two tier brackets. Two prize pots. Top 4 from each division feed into the tier knockout once the league stage closes (Sat 15 Aug 2026).
          </div>
        </div>
      </div>
      <TierBracket tier="upper" teams={teams} fixtures={fixtures} onTeam={setH2hTeam} />
      <TierBracket tier="lower" teams={teams} fixtures={fixtures} onTeam={setH2hTeam} />
      <ConfirmationBanner upperSlotsRemaining={upperTierSlotsRemaining(teams)} />
      <div style={{ fontSize: 11, color: C.mute, lineHeight: 1.6, padding: "8px 4px" }}>
        <strong style={{ color: C.text }}>Seeding:</strong> Qualifiers ranked by points across the tier, tiebreak: set difference → game difference.&nbsp;&nbsp;
        <strong style={{ color: C.text }}>Bracket:</strong> the upper tier runs QF→SF→F with its 8 qualifiers. The lower tier fills a 16-team bracket — top 5 from each division plus the best 6th-placed team across the tier — so <em>every</em> qualifier plays in Round 1 and nobody gets a bye.&nbsp;&nbsp;
        <strong style={{ color: C.text }}>Draw:</strong> the first knockout round is arranged so teams avoid division rivals they already met in the round robin — a division winner draws another division&rsquo;s fourth place, and so on. Seeds are never changed, only which side of the draw a team sits on; the higher seed stays put and the lower seed moves.&nbsp;&nbsp;
        <strong style={{ color: C.text }}>Note:</strong> qualifying teams update live as league results are entered.
      </div>
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
