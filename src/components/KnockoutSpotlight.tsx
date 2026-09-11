"use client";

import Link from "next/link";
import { C, F, divColor } from "@/theme/tokens";
import { buildBracket, tierQualifiers, TIER_PRIZES } from "@/lib/bracket";
import { useLeagueData } from "@/lib/useLeagueData";
import { FINALS } from "@/lib/sponsors";
import type { BracketMatch, BracketSlot, Qualifier } from "@/lib/types";

/* The knockouts are the point of the whole season, so they lead the page rather
 * than sitting three clicks away. This shows the first round of each tier as it
 * actually stands — real names, real seeds, live from the same data as the
 * bracket page — plus what is at stake. Empty until qualifiers exist, so it
 * degrades to nothing rather than to a grid of placeholders. */

function named(slot: BracketSlot): Qualifier | null {
  return slot && !("placeholder" in slot) ? slot : null;
}

function Tie({ match, dim }: { match: BracketMatch; dim: boolean }) {
  const a = named(match.a);
  const b = named(match.b);
  if (!a && !b) return null;
  // Both players, on their own lines. A padel team is two people and the fixture
  // list is the thing players scan for their own name, so showing only the first
  // hides half the field.
  // undefined until the tie is played; then true for the winner, false for the
  // loser. The loser is dimmed rather than removed — this panel is the first
  // thing on the page and a half-empty tie reads as a data bug.
  const side = (q: Qualifier | null, right: boolean, won?: boolean) => {
    if (!q) return <span style={{ color: C.mute, fontStyle: "italic" }}>TBC</span>;
    const dc = divColor(q.divName);
    const badge = (
      <span
        style={{
          fontFamily: F.mono, fontSize: 9, fontWeight: 700, color: dc,
          background: `${dc}1f`, border: `1px solid ${dc}55`, borderRadius: 3,
          padding: "0 4px", flexShrink: 0, lineHeight: "16px",
        }}
      >
        {q.seed}
      </span>
    );
    // Richie, 11 Sep 2026 (phone screenshot): names were truncated on the left and pushed
    // off the card on the right. Names now WRAP and the type scales with the viewport
    // (clamp), so every iPhone width shows both full names.
    const names = (
      <span style={{ minWidth: 0, flex: "1 1 auto", textAlign: right ? "right" : "left" }}>
        {[q.team.p1, q.team.p2].filter(Boolean).map((n, i) => (
          <span
            key={i}
            style={{
              display: "block", fontSize: "clamp(11px, 3.4vw, 12.5px)", lineHeight: 1.3,
              color: i === 0 ? C.text : C.mute,
              fontWeight: won ? 800 : i === 0 ? 600 : 500,
              overflowWrap: "anywhere", whiteSpace: "normal",
            }}
          >
            {n}
          </span>
        ))}
      </span>
    );
    return (
      <span
        style={{
          display: "flex", alignItems: "flex-start", gap: 6, minWidth: 0, width: "100%",
          flexDirection: right ? "row-reverse" : "row",
          opacity: won === false ? 0.5 : 1,
        }}
      >
        {badge}
        {names}
      </span>
    );
  };
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
        alignItems: "center",
        gap: "clamp(4px, 1.6vw, 8px)",
        padding: "7px clamp(6px, 2vw, 10px)",
        background: C.card2,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        opacity: dim ? 0.55 : 1,
        minWidth: 0,
      }}
    >
      {side(a, false, match.result ? match.result.winner === "a" : undefined)}
      {match.result ? (
        <span
          style={{
            fontFamily: F.mono, fontSize: "clamp(9.5px, 2.8vw, 10.5px)", fontWeight: 700, color: C.accent,
            textAlign: "center", lineHeight: 1.3, maxWidth: "min(110px, 26vw)", whiteSpace: "normal",
          }}
        >
          {match.result.score}
        </span>
      ) : (
        <span style={{ fontFamily: F.mono, fontSize: 9.5, color: C.mute }}>v</span>
      )}
      <span style={{ display: "flex", justifyContent: "flex-end", minWidth: 0 }}>
        {side(b, true, match.result ? match.result.winner === "b" : undefined)}
      </span>
    </div>
  );
}

function TierBlock({
  label, range, color, ties, roundName, teams,
}: {
  label: string; range: string; color: string;
  ties: BracketMatch[]; roundName: string; teams: number;
}) {
  const shown = ties.slice(0, 8);
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderTop: `3px solid ${color}`,
        borderRadius: 10,
        padding: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontFamily: F.display, fontSize: 22, color, letterSpacing: "0.03em" }}>
          {label}
        </div>
        <div style={{ fontSize: 11.5, color: C.mute }}>
          {range} · {teams} teams · {roundName}
        </div>
      </div>
      <div style={{ display: "grid", gap: 6, marginTop: 12 }}>
        {shown.map((m) => (
          <Tie key={m.id} match={m} dim={false} />
        ))}
      </div>
    </div>
  );
}

export function KnockoutSpotlight() {
  const { teamsByDiv, fixtures, loading } = useLeagueData();
  if (loading) return null;

  const upper = tierQualifiers("upper", teamsByDiv, fixtures);
  const lower = tierQualifiers("lower", teamsByDiv, fixtures);
  if (upper.length < 2 && lower.length < 2) return null;

  const ub = buildBracket(upper);
  const lb = buildBracket(lower);
  const upperTies = ub.r1.length ? ub.r1 : ub.qf;
  const lowerTies = lb.r1.length ? lb.r1 : lb.qf;
  const pot = TIER_PRIZES.reduce(
    (n, p) => n + Number(p.amount.replace(/[^0-9]/g, "")), 0);

  return (
    <div style={{ margin: "4px 0 34px" }}>
      <div
        style={{
          display: "flex", alignItems: "flex-end", justifyContent: "space-between",
          gap: 16, flexWrap: "wrap", marginBottom: 14,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11.5, fontWeight: 700, letterSpacing: "0.18em",
              color: C.accent,
            }}
          >
            NEXT UP · SUMMER LEAGUES 2026
          </div>
          <div
            style={{
              fontFamily: F.display,
              fontSize: "clamp(26px, 5vw, 40px)",
              textTransform: "uppercase",
              lineHeight: 1.05,
              marginTop: 4,
            }}
          >
            The <span style={{ color: C.accent }}>knockouts</span>
          </div>
          <div style={{ fontSize: 13.5, color: C.mute, marginTop: 6, maxWidth: 560 }}>
            Into the final stages: {upper.length + lower.length} teams started across both tiers, playing for
            €{(pot * 2).toLocaleString()} in prizes. Semi-finals and finals are played on finals weekend,{" "}
            <span style={{ color: C.text }}>{FINALS.dates}</span>{FINALS.provisional ? " (provisional)" : ""}.
          </div>
          {FINALS.event && (
            <div style={{ fontSize: 13, color: C.accent, marginTop: 6, fontWeight: 700 }}>
              🎂 {FINALS.event} — {FINALS.eventDate}, finals day <span style={{ color: C.mute, fontWeight: 400 }}>· {FINALS.eventNote}</span>
            </div>
          )}
        </div>
        <Link
          href="/summer-2026"
          style={{
            background: C.accent, color: C.bg, borderRadius: 10,
            padding: "12px 20px", fontWeight: 700, fontSize: 13.5,
            textDecoration: "none", whiteSpace: "nowrap",
          }}
        >
          Full bracket →
        </Link>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 14,
        }}
      >
        {upper.length >= 2 && (
          <TierBlock
            label="UPPER TIER" range="Rating 2.5 – 5.5" color={C.info}
            ties={upperTies} teams={upper.length}
            roundName={ub.r1.length ? "Round 1" : "Quarter-finals"}
          />
        )}
        {lower.length >= 2 && (
          <TierBlock
            label="LOWER TIER" range="Rating 0.5 – 2.4" color={C.accent}
            ties={lowerTies} teams={lower.length}
            roundName={lb.r1.length ? "Round 1" : "Quarter-finals"}
          />
        )}
      </div>
    </div>
  );
}
