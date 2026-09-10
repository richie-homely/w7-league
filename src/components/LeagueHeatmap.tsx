"use client";

import { useState } from "react";
import { C, F } from "@/theme/tokens";
import { useLeagueBookings, type LeagueBooking } from "@/lib/bookings";

// When league games get played (Richie, 10 Sep 2026, admin usage page): a weekday × hour
// grid of every league booking the detector has seen — box fixtures and summer-league
// games over the last 60 days plus the next three weeks — with the patterns spelled out.
// Useful for planning future leagues: which slots the league eats, which it leaves alone.

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 16 }, (_, i) => 7 + i);   // 07:00 .. 22:00

function cellOf(b: LeagueBooking, nowMs: number) {
  const d = new Date(b.startsAt);
  return { day: (d.getDay() + 6) % 7, hour: d.getHours(), past: d.getTime() < nowMs };
}

export function LeagueHeatmap() {
  const { bookings, loaded } = useLeagueBookings();
  const [nowMs] = useState(() => Date.now());   // snapshot at mount: a render must be pure
  const grid: number[][] = DAYS.map(() => HOURS.map(() => 0));
  const courts: Record<string, number> = {};
  let n = 0, evening = 0, weekend = 0, morning = 0, box = 0, summer = 0, played = 0;
  for (const b of bookings) {
    const c = cellOf(b, nowMs);
    if (c.hour < 7 || c.hour > 22) continue;
    grid[c.day][c.hour - 7]++;
    n++;
    if (c.day >= 5) weekend++;
    else if (c.hour >= 17 && c.hour < 22) evening++;
    if (c.hour < 12) morning++;
    if (b.kind === "box") box++; else summer++;
    if (c.past) played++;
    courts[b.court] = (courts[b.court] ?? 0) + 1;
  }
  const max = Math.max(1, ...grid.flat());
  const pct = (x: number) => (n ? Math.round((100 * x) / n) : 0);
  const top = grid.flatMap((row, di) => row.map((v, hi) => ({ v, label: `${DAYS[di]} ${HOURS[hi]}:00` })))
    .filter((x) => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 4);
  const busiestDay = DAYS.map((d, i) => ({ d, v: grid[i].reduce((a, b) => a + b, 0) })).sort((a, b) => b.v - a.v);
  const courtLine = Object.entries(courts).sort((a, b) => b[1] - a[1]).map(([c, v]) => `${c} ${pct(v)}%`).join(" · ");

  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ fontFamily: F.display, fontSize: 20, margin: 0, color: C.accent, letterSpacing: "0.03em" }}>WHEN LEAGUE GAMES GET PLAYED</h2>
      <p style={{ fontSize: 12, color: C.mute, margin: "4px 0 10px" }}>
        Every league booking the detector has matched: box fixtures and summer-league games, last 60 days plus the next three weeks
        ({n} bookings, {played} already played). Times are court start times.
      </p>
      {!loaded ? <div style={{ fontSize: 13, color: C.mute }}>Loading…</div> : n === 0 ? (
        <div style={{ fontSize: 13, color: C.mute }}>No league bookings matched yet.</div>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", fontFamily: F.mono, fontSize: 11 }}>
              <thead>
                <tr>
                  <th style={{ padding: "2px 6px", color: C.mute, textAlign: "left" }}></th>
                  {HOURS.map((h) => <th key={h} style={{ padding: "2px 3px", color: C.mute, fontWeight: 400, minWidth: 30 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((d, di) => (
                  <tr key={d}>
                    <td style={{ padding: "2px 6px", color: C.text }}>{d}</td>
                    {HOURS.map((h, hi) => {
                      const v = grid[di][hi];
                      const a = v ? 0.15 + 0.85 * (v / max) : 0;
                      return (
                        <td key={h} title={`${d} ${h}:00 — ${v} league game${v === 1 ? "" : "s"}`}
                            style={{ width: 30, height: 24, textAlign: "center", border: `1px solid ${C.border}`,
                                     background: v ? `rgba(195,216,46,${a.toFixed(2)})` : "transparent",
                                     color: a > 0.55 ? C.bg : C.text }}>
                          {v || ""}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul style={{ fontSize: 13, lineHeight: 1.7, margin: "10px 0 0", paddingLeft: 18 }}>
            <li><b>{pct(evening)}%</b> of league games are weekday evenings (5pm–10pm), <b>{pct(weekend)}%</b> at the weekend, <b>{pct(morning)}%</b> before noon.</li>
            <li>Busiest slots: {top.map((t) => `${t.label} (${t.v})`).join(", ")}. Busiest days: {busiestDay.slice(0, 3).map((x) => `${x.d} ${x.v}`).join(", ")}; quietest: {busiestDay[busiestDay.length - 1].d} {busiestDay[busiestDay.length - 1].v}.</li>
            <li>Courts: {courtLine}. Split: {box} box-league fixtures, {summer} summer-league games.</li>
            <li style={{ color: C.mute }}>Planning note: the peak cells are the hours a league removes from public sale. If a slot is consistently full here and the till shows unsold hours mid-afternoon, that is where a lunchtime or afternoon league could go next.</li>
          </ul>
        </>
      )}
    </section>
  );
}
