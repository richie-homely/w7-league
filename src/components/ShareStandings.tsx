"use client";

import type { CSSProperties } from "react";
import { C, F } from "@/theme/tokens";
import type { Division, StandingRow } from "@/lib/types";
import { Logo } from "./ui";

// A self-contained, branded standings card sized for a phone screenshot to
// paste into the division WhatsApp groups. The dark overlay + close/hint sit
// OUTSIDE the card so a screenshot of the card alone stays clean.
export function ShareStandings({
  division,
  rows,
  onClose,
}: {
  division: Division;
  rows: StandingRow[];
  onClose: () => void;
}) {
  const today = new Date().toLocaleDateString("en-IE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const tColor = division.tier === "lower" ? C.accent : C.info;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.88)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "14px 12px 28px",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <span style={{ color: C.mute, fontSize: 12 }}>📸 Screenshot &amp; share to your group</span>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            color: C.text,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            padding: "6px 12px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ✕ Close
        </button>
      </div>

      {/* The card = the screenshot target */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 440,
          background: C.bg,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          padding: 18,
          boxShadow: "0 12px 48px rgba(0,0,0,0.55)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <Logo style={{ width: 42, height: 42 }} />
          <div>
            <div
              style={{
                fontFamily: F.display,
                fontSize: 21,
                color: C.text,
                letterSpacing: "0.03em",
                lineHeight: 1,
              }}
            >
              W7 SUMMER LEAGUE
            </div>
            <div style={{ fontSize: 12, color: C.mute, marginTop: 5 }}>
              <span style={{ color: tColor, fontWeight: 700 }}>{division.name}</span> · {division.tierLabel}{" "}
              · as of {today}
            </div>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ color: C.mute, fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              <th style={{ textAlign: "left", padding: "4px 3px" }}>#</th>
              <th style={{ textAlign: "left", padding: "4px 6px" }}>Team</th>
              <th style={th}>P</th>
              <th style={th}>W</th>
              <th style={th}>L</th>
              <th style={th}>Sets</th>
              <th style={{ ...th, color: C.accent }}>Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const inPlayoff = r.rank <= 4;
              return (
                <tr key={r.teamId} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: "5px 3px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        width: 18,
                        height: 18,
                        lineHeight: "18px",
                        textAlign: "center",
                        borderRadius: 3,
                        fontSize: 10,
                        fontWeight: 700,
                        background: inPlayoff ? C.accent : C.card2,
                        color: inPlayoff ? C.bg : C.mute,
                      }}
                    >
                      {r.rank}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "5px 6px",
                      fontSize: 12,
                      lineHeight: 1.2,
                      color: r.team.placeholder ? C.mute : C.text,
                    }}
                  >
                    {r.team.placeholder ? "TBC" : `${r.team.p1} / ${r.team.p2}`}
                  </td>
                  <td style={td}>{r.P}</td>
                  <td style={td}>{r.W}</td>
                  <td style={td}>{r.L}</td>
                  <td style={{ ...td, color: C.mute }}>
                    {r.SF}-{r.SA}
                  </td>
                  <td style={{ ...td, color: C.accent, fontWeight: 700, fontSize: 14 }}>{r.Pts}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div
          style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: `1px solid ${C.border}`,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10,
            color: C.mute,
          }}
        >
          <span>Top 4 → tier knockout</span>
          <span style={{ color: tColor, fontWeight: 700 }}>league.w7padel.com</span>
        </div>
      </div>
    </div>
  );
}

const th: CSSProperties = { textAlign: "center", padding: "4px 4px" };
const td: CSSProperties = {
  textAlign: "center",
  padding: "5px 4px",
  fontFamily: F.mono,
  fontSize: 12,
  color: C.text,
};
