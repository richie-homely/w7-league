"use client";

import { useState } from "react";
import { C, F } from "@/theme/tokens";
import { useLeagueBookings, type LeagueBooking } from "@/lib/bookings";

// When league games get played (Richie, 10 Sep 2026, admin usage page): a weekday × hour
// grid of every league booking the detector has seen — box fixtures and summer-league
// games over the last 60 days plus the next three weeks — with the patterns spelled out.
// "All" shows the whole window; step week by week to see how active a given week is,
// with totals per day, per hour and overall at the edges of the grid.

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 16 }, (_, i) => 7 + i);   // 07:00 .. 22:00
const DAY = 86400000;

function mondayOf(t: number): number {
  const d = new Date(t); d.setHours(0, 0, 0, 0);
  return d.getTime() - ((d.getDay() + 6) % 7) * DAY;
}
const fmt = (t: number) => new Date(t).toLocaleDateString("en-IE", { day: "numeric", month: "short" });

const pill = (on: boolean): React.CSSProperties => ({
  padding: "4px 11px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer",
  border: `1px solid ${on ? C.accent : C.border}`, background: on ? C.accent : C.card, color: on ? C.bg : C.text,
});

export function LeagueHeatmap() {
  const { bookings, loaded } = useLeagueBookings();
  const [nowMs] = useState(() => Date.now());   // snapshot at mount: a render must be pure
  const [mode, setMode] = useState<"all" | "week">("all");
  const [weekStart, setWeekStart] = useState(() => mondayOf(Date.now()));

  const inWindow = (b: LeagueBooking) => {
    if (mode === "all") return true;
    const t = new Date(b.startsAt).getTime();
    return t >= weekStart && t < weekStart + 7 * DAY;
  };
  const rows = bookings.filter(inWindow);

  const grid: number[][] = DAYS.map(() => HOURS.map(() => 0));
  const courts: Record<string, number> = {};
  let n = 0, evening = 0, weekend = 0, morning = 0, box = 0, summer = 0, played = 0;
  for (const b of rows) {
    const d = new Date(b.startsAt);
    const day = (d.getDay() + 6) % 7, hour = d.getHours();
    if (hour < 7 || hour > 22) continue;
    grid[day][hour - 7]++;
    n++;
    if (day >= 5) weekend++;
    else if (hour >= 17 && hour < 22) evening++;
    if (hour < 12) morning++;
    if (b.kind === "box") box++; else summer++;
    if (d.getTime() < nowMs) played++;
    courts[b.court] = (courts[b.court] ?? 0) + 1;
  }
  const dayTotals = grid.map((r) => r.reduce((a, b) => a + b, 0));
  const hourTotals = HOURS.map((_, hi) => grid.reduce((a, r) => a + r[hi], 0));
  const max = Math.max(1, ...grid.flat());
  const pct = (x: number) => (n ? Math.round((100 * x) / n) : 0);
  const top = grid.flatMap((row, di) => row.map((v, hi) => ({ v, label: `${DAYS[di]} ${HOURS[hi]}:00` })))
    .filter((x) => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 4);
  const byDay = DAYS.map((d, i) => ({ d, v: dayTotals[i] })).sort((a, b) => b.v - a.v);
  const courtLine = Object.entries(courts).sort((a, b) => b[1] - a[1]).map(([c, v]) => `${c} ${pct(v)}%`).join(" · ");
  const weekLabel = `${fmt(weekStart)} – ${fmt(weekStart + 6 * DAY)}`;
  const thisWeek = mondayOf(nowMs);

  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ fontFamily: F.display, fontSize: 20, margin: 0, color: C.accent, letterSpacing: "0.03em" }}>WHEN LEAGUE GAMES GET PLAYED</h2>
      <p style={{ fontSize: 12, color: C.mute, margin: "4px 0 10px" }}>
        Every league booking the detector has matched: box fixtures and summer-league games, last 60 days plus the next three weeks. Times are court start times.
      </p>

      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
        <button onClick={() => setMode("all")} style={pill(mode === "all")}>All ({bookings.length})</button>
        <button onClick={() => { setMode("week"); setWeekStart(weekStart - 7 * DAY); }} style={pill(false)} aria-label="Previous week">‹</button>
        <button onClick={() => setMode("week")} style={pill(mode === "week")}>
          Week of {weekLabel}{weekStart === thisWeek ? " · this week" : ""}
        </button>
        <button onClick={() => { setMode("week"); setWeekStart(weekStart + 7 * DAY); }} style={pill(false)} aria-label="Next week">›</button>
        {weekStart !== thisWeek && (
          <button onClick={() => { setMode("week"); setWeekStart(thisWeek); }} style={{ ...pill(false), fontWeight: 500 }}>back to this week</button>
        )}
      </div>

      {!loaded ? <div style={{ fontSize: 13, color: C.mute }}>Loading…</div> : n === 0 ? (
        <div style={{ fontSize: 13, color: C.mute }}>{mode === "week" ? `No league games matched in the week of ${weekLabel}.` : "No league bookings matched yet."}</div>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", fontFamily: F.mono, fontSize: 11 }}>
              <thead>
                <tr>
                  <th style={{ padding: "2px 6px", color: C.mute, textAlign: "left" }}></th>
                  {HOURS.map((h) => <th key={h} style={{ padding: "2px 3px", color: C.mute, fontWeight: 400, minWidth: 30 }}>{h}</th>)}
                  <th style={{ padding: "2px 6px", color: C.mute, fontWeight: 700 }}>day</th>
                </tr>
              </thead>
              <tbody>
                {DAYS.map((d, di) => (
                  <tr key={d}>
                    <td style={{ padding: "2px 6px", color: C.text }}>
                      {d}{mode === "week" && <span style={{ color: C.mute }}> {fmt(weekStart + di * DAY).split(" ")[0]}</span>}
                    </td>
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
                    <td style={{ padding: "2px 6px", textAlign: "right", fontWeight: 700, color: dayTotals[di] ? C.accent : C.mute }}>{dayTotals[di]}</td>
                  </tr>
                ))}
                <tr>
                  <td style={{ padding: "4px 6px", color: C.mute, fontWeight: 700, borderTop: `2px solid ${C.border}` }}>hour</td>
                  {hourTotals.map((v, hi) => (
                    <td key={hi} style={{ textAlign: "center", fontWeight: 700, borderTop: `2px solid ${C.border}`, color: v ? C.accent : C.mute, padding: "4px 0" }}>{v || ""}</td>
                  ))}
                  <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 700, borderTop: `2px solid ${C.border}`, color: C.accent }}>{n}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* summary totals */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginTop: 12 }}>
            {[
              ["League games", n, mode === "week" ? `week of ${weekLabel}` : "whole window"],
              ["Box league", box, "fixtures"],
              ["Summer league", summer, "games"],
              ["Played", played, "before now"],
              ["Still to come", n - played, "booked ahead"],
              ["Court-hours", `${(n * 1.5).toFixed(0)}h`, "at 90 min a game"],
            ].map(([l, v, s]) => (
              <div key={String(l)} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px" }}>
                <div style={{ fontSize: 10, letterSpacing: "0.1em", color: C.mute, fontWeight: 700 }}>{String(l).toUpperCase()}</div>
                <div style={{ fontFamily: F.display, fontSize: 24, color: C.accent }}>{v}</div>
                <div style={{ fontSize: 10.5, color: C.mute }}>{s}</div>
              </div>
            ))}
          </div>
          <ul style={{ fontSize: 13, lineHeight: 1.7, margin: "10px 0 0", paddingLeft: 18 }}>
            <li><b>{pct(evening)}%</b> weekday evenings (5pm–10pm), <b>{pct(weekend)}%</b> at the weekend, <b>{pct(morning)}%</b> before noon.</li>
            <li>Busiest slots: {top.map((t) => `${t.label} (${t.v})`).join(", ")}. Busiest days: {byDay.slice(0, 3).map((x) => `${x.d} ${x.v}`).join(", ")}; quietest: {byDay[byDay.length - 1].d} {byDay[byDay.length - 1].v}.</li>
            <li>Courts: {courtLine}.</li>
            {mode === "all" && (
              <li style={{ color: C.mute }}>Planning note: the peak cells are the hours a league removes from public sale. If a slot is consistently full here and the till shows unsold hours mid-afternoon, that is where a lunchtime or afternoon league could go next.</li>
            )}
          </ul>
        </>
      )}
    </section>
  );
}
