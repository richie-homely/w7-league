"use client";

import { C, F } from "@/theme/tokens";
import { formatScore } from "@/lib/scoring";
import { fmtBooking, resultBooking, useLeagueBookings } from "@/lib/bookings";
import type { BoxMatch, BoxTeam } from "@/lib/box";

// Admin usage page (Richie, 11 Sep 2026): every result entered, with the W7 court booking
// the Playtomic participant lists tie to that fixture — so a game played somewhere else
// (or on a booking without the players' names) stands out. Detector limits: it needs at
// least one full team named on the booking, and looks back 60 days.
export function ResultsAudit({ teams, matches }: { teams: BoxTeam[]; matches: BoxMatch[] }) {
  const { byKey, loaded } = useLeagueBookings();
  const teamById = Object.fromEntries(teams.map((t) => [t.id, t]));
  const rows = matches
    .filter((m) => m.box < 90 && m.status !== "pending" && m.sets)
    .map((m) => ({ m, rb: resultBooking(m, byKey) }))
    .sort((a, b) => ((a.m.updatedAt ?? "") < (b.m.updatedAt ?? "") ? 1 : -1));
  const none = rows.filter((r) => r.rb.state === "none").length;
  const th: React.CSSProperties = { padding: "4px 8px", textAlign: "left" };
  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ fontFamily: F.display, fontSize: 20, margin: 0, color: C.accent, letterSpacing: "0.03em" }}>
        RESULTS vs W7 BOOKINGS{" "}
        <span style={{ color: C.mute, fontSize: 14 }}>
          · {rows.length} results · {rows.length - none} on a W7 booking · <span style={{ color: none ? C.red : C.mute }}>{none} with no booking found</span>
        </span>
      </h2>
      <div style={{ fontSize: 12, color: C.mute, margin: "4px 0 8px" }}>
        A result should sit on a W7 court booking with the players named on it. No booking found means the game was played elsewhere, or the booking did not carry the players&apos; names — worth a word with the teams either way.
      </div>
      {!loaded ? (
        <div style={{ fontSize: 13, color: C.mute }}>Loading bookings…</div>
      ) : rows.length === 0 ? (
        <div style={{ fontSize: 13, color: C.mute }}>No results entered yet.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ color: C.mute, fontSize: 10.5, letterSpacing: "0.08em" }}>
                <th style={th}>ENTERED</th><th style={th}>BOX</th><th style={th}>FIXTURE</th><th style={th}>SCORE</th><th style={th}>STATUS</th><th style={th}>W7 BOOKING</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ m, rb }) => {
                const t1 = teamById[m.team1Id], t2 = teamById[m.team2Id];
                const bad = rb.state === "none";
                return (
                  <tr key={m.id} style={{ borderTop: `1px solid ${C.border}`, color: bad ? C.red : C.text }}>
                    <td style={{ padding: "5px 8px", fontFamily: F.mono, fontSize: 12 }}>
                      {m.updatedAt ? new Date(m.updatedAt).toLocaleString("en-IE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                    <td style={{ padding: "5px 8px", fontFamily: F.mono }}>{m.box}</td>
                    <td style={{ padding: "5px 8px" }}><b>{t1?.name ?? "?"}</b> v <b>{t2?.name ?? "?"}</b></td>
                    <td style={{ padding: "5px 8px", fontFamily: F.mono, fontSize: 12.5 }}>{formatScore(m.sets)}</td>
                    <td style={{ padding: "5px 8px", fontSize: 11.5, letterSpacing: "0.04em" }}>{m.status.toUpperCase()}</td>
                    <td style={{ padding: "5px 8px", fontWeight: bad ? 700 : 400 }}>
                      {rb.booking
                        ? `${fmtBooking(rb.booking.startsAt)} · ${rb.booking.court}${rb.booking.confidence === "probable" ? " · not all four named" : ""}${rb.state === "future" ? " · booking is AFTER the result" : ""}`
                        : "NO W7 BOOKING FOUND"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
