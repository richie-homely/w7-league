"use client";

import Link from "next/link";
import { C, F, divColor } from "@/theme/tokens";
import { buildBracket, tierQualifiers, TIER_PRIZES } from "@/lib/bracket";
import { useLeagueData } from "@/lib/useLeagueData";
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
    const names = (
      <span style={{ minWidth: 0, textAlign: right ? "right" : "left" }}>
        {[q.team.p1, q.team.p2].filter(Boolean).map((n, i) => (
          <span
            key={i}
            style={{
              display: "block", fontSize: 12.5, lineHeight: 1.35,
              color: i === 0 ? C.text : C.mute,
              fontWeight: won ? 800 : i === 0 ? 600 : 500,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
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
          display: "inline-flex", alignItems: "flex-start", gap: 6, minWidth: 0,
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
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        gap: 8,
        padding: "7px 10px",
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
            fontFamily: F.mono, fontSize: 10.5, fontWeight: 700, color: C.accent,
            whiteSpace: "nowrap", textAlign: "center", lineHeight: 1.25,
          }}
        >
          {match.result.score}
        </span>
      ) : (
        <span style={{ fontFamily: F.mono, fontSize: 9.5, color: C.mute }}>v</span>
      )}
      <span style={{ textAlign: "right", minWidth: 0 }}>
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
            {upper.length + lower.length} teams through across both tiers, playing for
            €{(pot * 2).toLocaleString()} in prizes. First round is drawn cross-division,
            so nobody meets a division rival before the semi-finals.
          </div>
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
