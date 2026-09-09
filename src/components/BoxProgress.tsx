"use client";

import { useState } from "react";
import { C, F } from "@/theme/tokens";
import type { BoxMatch, BoxTeam } from "@/lib/box";
import type { LeagueBooking } from "@/lib/bookings";
import { useLeagueBookings } from "@/lib/bookings";
import { BOX_CYCLES, currentCycle, daysLeft } from "@/lib/boxCalendar";

// Cycle progress by box (Richie, 9 Sep 2026): how many of each box's ten fixtures are
// played, awaiting confirmation, booked on the courts, or have nothing arranged yet —
// so teams falling behind show up before the −1 rule bites. Public version on the box
// league page; the admin usage page adds the per-team table.

type Seg = { played: number; awaiting: number; booked: number; unbooked: number; total: number };

function tally(ms: BoxMatch[], bookings: Map<string, LeagueBooking>): Seg {
  const s: Seg = { played: 0, awaiting: 0, booked: 0, unbooked: 0, total: ms.length };
  for (const m of ms) {
    if (m.status === "confirmed") s.played++;
    else if (m.status === "submitted" || m.status === "disputed") s.awaiting++;
    else if (bookings.has(m.id)) s.booked++;
    else s.unbooked++;
  }
  return s;
}

function Bar({ s, width = 220 }: { s: Seg; width?: number }) {
  const w = (n: number) => (s.total ? (width * n) / s.total : 0);
  return (
    <div style={{ display: "flex", width, height: 12, borderRadius: 3, overflow: "hidden", background: C.border }} title={`${s.played} played · ${s.awaiting} awaiting confirmation · ${s.booked} booked · ${s.unbooked} not arranged`}>
      <div style={{ width: w(s.played), background: C.green }} />
      <div style={{ width: w(s.awaiting), background: C.info }} />
      <div style={{ width: w(s.booked), background: C.accent }} />
    </div>
  );
}

export function BoxProgress({
  matches,
  teams,
  detailed = false,
}: {
  matches: BoxMatch[];
  teams: BoxTeam[];
  /** admin: add the per-team table */
  detailed?: boolean;
}) {
  const { byKey: bookings } = useLeagueBookings();
  const [now] = useState(() => new Date());   // snapshot at mount: a render must be pure
  const cur = currentCycle(now) ?? { cycle: BOX_CYCLES[0], state: "upcoming" as const };
  const cycleN = cur.cycle.n;
  const ms = matches.filter((m) => m.cycle === cycleN && m.box < 90);
  const left = daysLeft(cur.cycle, now);
  const elapsed = Math.max(0, Math.round((now.getTime() - new Date(cur.cycle.start + "T00:00:00").getTime()) / 86400000));
  const all = tally(ms, bookings);
  const boxes = [...new Set(ms.map((m) => m.box))].sort((a, b) => a - b);

  // "behind" once the cycle is under way: by day 14 a box should have most fixtures
  // arranged; by day 21 anything unarranged is at real risk of the −1
  const flag = (s: Seg) => {
    if (cur.state !== "live") return null;
    if (elapsed >= 21 && s.unbooked > 0) return { text: "at risk of −1", color: C.red };
    if (elapsed >= 14 && s.unbooked >= 4) return { text: "falling behind", color: C.amber ?? "#e0a030" };
    return null;
  };

  // per-team (admin)
  const teamRows = detailed
    ? teams.filter((t) => t.active && t.box < 90).map((t) => {
        const mine = ms.filter((m) => m.team1Id === t.id || m.team2Id === t.id);
        return { team: t, s: tally(mine, bookings) };
      }).sort((a, b) => a.team.box - b.team.box || b.s.unbooked - a.s.unbooked)
    : [];

  return (
    <section id="progress" style={{ marginTop: 22, scrollMarginTop: 60 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontFamily: F.display, fontSize: 22, letterSpacing: "0.02em", textTransform: "uppercase" }}>
          Cycle {cycleN} <span style={{ color: C.accent }}>progress</span>
        </div>
        <div style={{ fontSize: 12, color: C.mute }}>
          {cur.state === "upcoming" ? `starts ${new Date(cur.cycle.start + "T12:00:00").toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short" })}` :
           cur.state === "live" ? `day ${elapsed} of 28 · ${left} days to the deadline` : "cycle over"}
          {" · "}{all.played} played · {all.awaiting} awaiting confirmation · {all.booked} booked · {all.unbooked} not yet arranged, of {all.total}
        </div>
      </div>
      <div style={{ display: "flex", gap: 14, fontSize: 11, color: C.mute, margin: "6px 0 8px", flexWrap: "wrap" }}>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: C.green, marginRight: 4 }} />played</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: C.info, marginRight: 4 }} />awaiting confirmation</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: C.accent, marginRight: 4 }} />court booked</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: C.border, marginRight: 4 }} />not arranged</span>
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 14px" }}>
        {boxes.map((b) => {
          const s = tally(ms.filter((m) => m.box === b), bookings);
          const f = flag(s);
          return (
            <div key={b} style={{ display: "grid", gridTemplateColumns: "64px 1fr 150px", alignItems: "center", gap: 10, padding: "4px 0", borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontFamily: F.mono, fontSize: 12.5 }}>Box {b}</div>
              <Bar s={s} />
              <div style={{ fontSize: 11.5, color: f ? f.color : C.mute, fontWeight: f ? 700 : 400 }}>
                {f ? f.text : `${s.played + s.awaiting} done · ${s.booked} booked · ${s.unbooked} to arrange`}
              </div>
            </div>
          );
        })}
      </div>

      {detailed && (
        <div style={{ overflowX: "auto", marginTop: 14 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ color: C.mute, fontSize: 10.5, letterSpacing: "0.08em", textAlign: "left" }}>
                <th style={{ padding: "4px 8px" }}>BOX</th><th style={{ padding: "4px 8px" }}>TEAM</th>
                <th style={{ padding: "4px 8px", textAlign: "right" }}>PLAYED</th><th style={{ padding: "4px 8px", textAlign: "right" }}>AWAITING</th>
                <th style={{ padding: "4px 8px", textAlign: "right" }}>BOOKED</th><th style={{ padding: "4px 8px", textAlign: "right" }}>TO ARRANGE</th>
              </tr>
            </thead>
            <tbody>
              {teamRows.map(({ team, s }) => {
                const f = flag(s);
                return (
                  <tr key={team.id} style={{ borderTop: `1px solid ${C.border}`, color: f ? f.color : C.text }}>
                    <td style={{ padding: "5px 8px", fontFamily: F.mono }}>{team.box}</td>
                    <td style={{ padding: "5px 8px", fontWeight: 600 }}>{team.name}{f && <span style={{ fontSize: 11, marginLeft: 8 }}>· {f.text}</span>}</td>
                    <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: F.mono }}>{s.played}</td>
                    <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: F.mono }}>{s.awaiting}</td>
                    <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: F.mono }}>{s.booked}</td>
                    <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: F.mono }}>{s.unbooked}</td>
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
