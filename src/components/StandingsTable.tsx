import { Fragment, type CSSProperties } from "react";
import { C, F } from "@/theme/tokens";
import type { StandingRow } from "@/lib/types";
import { TeamName } from "./ui";

export function StandingsTable({
  rows,
  highlightTeamId,
  dense = false,
}: {
  rows: StandingRow[];
  highlightTeamId?: string | null;
  dense?: boolean;
}) {
  const cell: CSSProperties = {
    padding: dense ? "6px 6px" : "10px 8px",
    textAlign: "left",
    borderBottom: `1px solid ${C.border}`,
  };
  const num: CSSProperties = {
    ...cell,
    textAlign: "center",
    fontFamily: F.mono,
    fontSize: dense ? 12 : 13,
  };
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: dense ? 12 : 13 }}>
      <thead>
        <tr style={{ color: C.mute, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          <th style={{ ...cell, width: 30 }}>#</th>
          <th style={cell}>Team</th>
          <th style={num}>P</th>
          <th style={num}>W</th>
          <th style={num}>L</th>
          <th style={num}>Sets</th>
          <th style={num}>Games</th>
          <th style={{ ...num, color: C.accent }}>Pts</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const inPlayoff = r.rank <= 4;
          const cutoffLine = r.rank === 4;
          const highlighted = r.teamId === highlightTeamId;
          return (
            <Fragment key={r.teamId}>
              <tr style={{ background: highlighted ? "rgba(212, 255, 58, 0.08)" : "transparent" }}>
                <td style={cell}>
                  <span
                    style={{
                      display: "inline-block",
                      width: 22,
                      height: 22,
                      lineHeight: "22px",
                      textAlign: "center",
                      background: inPlayoff ? C.accent : C.card2,
                      color: inPlayoff ? C.bg : C.mute,
                      borderRadius: 4,
                      fontWeight: 700,
                      fontSize: 11,
                    }}
                  >
                    {r.rank}
                  </span>
                </td>
                <td style={cell}>
                  <TeamName team={r.team} size={dense ? "sm" : "md"} mute={r.team.placeholder} />
                </td>
                <td style={num}>{r.P}</td>
                <td style={num}>{r.W}</td>
                <td style={num}>{r.L}</td>
                <td style={num}>{r.SF}-{r.SA}</td>
                <td style={num}>{r.GF}-{r.GA}</td>
                <td style={{ ...num, color: C.accent, fontWeight: 700, fontSize: dense ? 13 : 15 }}>
                  {r.Pts}
                  {r.Bonus > 0 && (
                    <span style={{ fontSize: 9, color: C.mute, marginLeft: 3 }}>+{r.Bonus}</span>
                  )}
                </td>
              </tr>
              {cutoffLine && (
                <tr>
                  <td colSpan={8} style={{ padding: 0 }}>
                    <div
                      style={{
                        height: 2,
                        background: `linear-gradient(90deg, ${C.accent}, transparent)`,
                        margin: "2px 0",
                        position: "relative",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          right: 0,
                          top: -7,
                          fontSize: 9,
                          color: C.accent,
                          background: C.card,
                          padding: "1px 6px",
                          letterSpacing: "0.1em",
                        }}
                      >
                        PLAYOFF CUT
                      </span>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
