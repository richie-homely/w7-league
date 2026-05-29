import type { CSSProperties } from "react";
import { C, F } from "@/theme/tokens";
import type { SetScore, Team, Tier } from "@/lib/types";

export function tierColor(tier: Tier): string {
  return tier === "lower" ? C.accent : C.info;
}

// CSS wordmark stand-in for the W7 tennis-ball logo. Drop the real asset into
// /public and swap this out when ready.
export function Logo({ style = {} }: { style?: CSSProperties }) {
  return (
    <div
      style={{
        background: C.accent,
        color: C.bg,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: F.display,
        fontWeight: 700,
        letterSpacing: "0.02em",
        width: 44,
        height: 44,
        fontSize: 18,
        ...style,
      }}
    >
      W7
    </div>
  );
}

export function Badge({
  children,
  color = C.accent,
  dark = false,
}: {
  children: React.ReactNode;
  color?: string;
  dark?: boolean;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 8px",
        background: dark ? "transparent" : color,
        color: dark ? color : C.bg,
        border: dark ? `1px solid ${color}` : "none",
        borderRadius: 4,
        fontFamily: F.body,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
}

// Playtomic ratings render to 2 dp; null (unknown) shows an en-dash.
export function fmtRating(r: number | null): string {
  return r === null ? "–" : r.toFixed(2);
}

// Small monospace rating chip shown beside a player's name in fixture lists.
function RatingChip({ r, fontSize = 10 }: { r: number | null; fontSize?: number }) {
  return (
    <span
      style={{
        fontFamily: F.mono,
        fontSize,
        fontWeight: 600,
        color: r === null ? C.mute : C.accentDim,
        marginLeft: 6,
        letterSpacing: "0.02em",
      }}
    >
      {fmtRating(r)}
    </span>
  );
}

export function TeamName({
  team,
  size = "md",
  mute = false,
  showRatings = false,
}: {
  team: Team | undefined;
  size?: "sm" | "md" | "lg";
  mute?: boolean;
  showRatings?: boolean;
}) {
  if (!team) return null;
  const fs = size === "lg" ? 17 : size === "sm" ? 12 : 14;
  const rfs = size === "lg" ? 12 : size === "sm" ? 10 : 11;
  // Placeholder (TBC) teams have no meaningful ratings — never show chips.
  const ratings = showRatings && !team.placeholder;
  return (
    <div
      style={{
        fontFamily: F.body,
        fontSize: fs,
        lineHeight: 1.25,
        color: mute ? C.mute : C.text,
      }}
    >
      <div style={{ fontWeight: 600 }}>
        {team.p1}
        {ratings && <RatingChip r={team.r1} fontSize={rfs} />}
      </div>
      <div style={{ fontWeight: 400, opacity: 0.75 }}>
        {team.p2}
        {ratings && <RatingChip r={team.r2} fontSize={rfs} />}
      </div>
    </div>
  );
}

export function ScoreCell({ sets }: { sets: SetScore[] | null }) {
  if (!sets) return <span style={{ color: C.mute }}>—</span>;
  return (
    <div style={{ fontFamily: F.mono, fontSize: 14, display: "flex", gap: 8 }}>
      {sets.map(([a, b], i) => (
        <span key={i} style={{ display: "flex", gap: 2 }}>
          <span style={{ fontWeight: a > b ? 700 : 400, color: a > b ? C.accent : C.mute }}>{a}</span>
          <span style={{ color: C.mute }}>-</span>
          <span style={{ fontWeight: b > a ? 700 : 400, color: b > a ? C.accent : C.mute }}>{b}</span>
        </span>
      ))}
    </div>
  );
}
