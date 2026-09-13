"use client";

import { useMemo, useState } from "react";
import { C, F } from "@/theme/tokens";
import { useLeadTimes, type LeadRow } from "@/lib/leadtime";

/* Booking lead time (Richie, 13 Sep 2026): "a chart on the usage tab of when the games are
 * being booked in and how many days in advance, to find trends", and "spot trends on our
 * average booking ahead time and see if it improves with the league".
 *
 * Two views over the same rows, one row per booking made:
 *   - By day booked: how many bookings were made each day, and how far ahead they were for.
 *     This is the trend line — if the league pulls behaviour forward, the median climbs.
 *   - How far ahead: the spread of lead times, league against everything else.
 *
 * Median, not mean: one member booking a court six weeks out would drag an average and hide
 * what most people do. Days are Dublin calendar days. The league opened on 10 Sep, marked. */

const DAY = 86400000;
const LEAGUE_OPEN = new Date("2026-09-10T00:00:00");

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}
const leadDays = (r: LeadRow) => (r.startsAt.getTime() - r.bookedAt.getTime()) / DAY;
const fmtDay = (d: Date) => d.toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short" });

// Lead-time bands for the spread view.
const BANDS: { label: string; lo: number; hi: number }[] = [
  { label: "same day", lo: -Infinity, hi: 1 },
  { label: "1–2 days", lo: 1, hi: 3 },
  { label: "3–6 days", lo: 3, hi: 7 },
  { label: "1–2 weeks", lo: 7, hi: 14 },
  { label: "2 weeks +", lo: 14, hi: Infinity },
];

export function LeadTimeChart() {
  const { rows, ready } = useLeadTimes();
  const [view, setView] = useState<"trend" | "spread">("trend");
  const [who, setWho] = useState<"all" | "league" | "social">("all");
  const [nowMs] = useState(() => Date.now());

  // Only bookings made up to today count, and only ones that play after they were made —
  // a detector first-seen for a booking already on the books can land after its start.
  const pool = useMemo(
    () => rows.filter((r) => r.bookedAt.getTime() <= nowMs && leadDays(r) >= 0)
      .filter((r) => who === "all" || (who === "league") === r.isLeague),
    [rows, who, nowMs],
  );

  const byDay = useMemo(() => {
    const m = new Map<string, { day: Date; leads: number[]; league: number }>();
    for (const r of pool) {
      const d = new Date(r.bookedAt.getFullYear(), r.bookedAt.getMonth(), r.bookedAt.getDate());
      const cur = m.get(d.toDateString()) ?? { day: d, leads: [], league: 0 };
      cur.leads.push(leadDays(r));
      if (r.isLeague) cur.league++;
      m.set(d.toDateString(), cur);
    }
    return [...m.values()].sort((a, b) => a.day.getTime() - b.day.getTime()).slice(-28);
  }, [pool]);

  const spread = useMemo(() => {
    const count = (xs: LeadRow[]) => BANDS.map((b) => xs.filter((r) => leadDays(r) >= b.lo && leadDays(r) < b.hi).length);
    const lg = rows.filter((r) => r.isLeague && leadDays(r) >= 0 && r.bookedAt.getTime() <= nowMs);
    const so = rows.filter((r) => !r.isLeague && leadDays(r) >= 0 && r.bookedAt.getTime() <= nowMs);
    return { lg, so, lgBands: count(lg), soBands: count(so) };
  }, [rows, nowMs]);

  if (!ready) return null;

  const before = pool.filter((r) => r.bookedAt < LEAGUE_OPEN).map(leadDays);
  const after = pool.filter((r) => r.bookedAt >= LEAGUE_OPEN).map(leadDays);
  const mBefore = median(before);
  const mAfter = median(after);
  const maxCount = Math.max(1, ...byDay.map((d) => d.leads.length));
  const maxLead = Math.max(1, ...byDay.map((d) => median(d.leads) ?? 0));

  const pill = (on: boolean, label: string, onClick: () => void, colour: string = C.accent) => (
    <button
      onClick={onClick}
      style={{
        padding: "4px 11px", borderRadius: 999, cursor: "pointer", fontSize: 11.5, fontWeight: 700,
        border: `1px solid ${on ? colour : C.border}`, background: on ? colour : "transparent",
        color: on ? C.bg : C.mute,
      }}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 12 }}>
        {[
          ["before the league", mBefore, before.length],
          ["since the league opened", mAfter, after.length],
        ].map(([label, m, n]) => (
          <div key={String(label)} style={{ minWidth: 150 }}>
            <div style={{ fontFamily: F.mono, fontSize: 24, fontWeight: 700, color: C.accent, lineHeight: 1.1 }}>
              {m === null ? "—" : `${(m as number).toFixed(1)}d`}
            </div>
            <div style={{ fontSize: 11, color: C.mute }}>median days ahead, {label} · {String(n)} bookings</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10, alignItems: "center" }}>
        {pill(view === "trend", "By day booked", () => setView("trend"))}
        {pill(view === "spread", "How far ahead", () => setView("spread"))}
        {view === "trend" && (
          <>
            <span style={{ width: 8 }} />
            {pill(who === "all", "All", () => setWho("all"), C.info)}
            {pill(who === "league", "League", () => setWho("league"), C.info)}
            {pill(who === "social", "Social", () => setWho("social"), C.info)}
          </>
        )}
      </div>

      {view === "trend" ? (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["", "BOOKINGS MADE", "", "MEDIAN DAYS AHEAD", ""].map((h, i) => (
                  <th key={i} style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", color: C.mute, textAlign: "left", padding: "0 6px 5px 0" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byDay.map((d) => {
                const med = median(d.leads) ?? 0;
                const isOpen = d.day.toDateString() === LEAGUE_OPEN.toDateString();
                return (
                  <tr key={d.day.toDateString()} style={{ borderTop: isOpen ? `1px dashed ${C.accent}` : undefined }}>
                    <td style={{ fontSize: 11, whiteSpace: "nowrap", padding: "2px 8px 2px 0", color: C.text }}>
                      {fmtDay(d.day)}{isOpen && <span style={{ color: C.accent, fontSize: 9.5 }}> league opens</span>}
                    </td>
                    <td style={{ padding: "2px 6px 2px 0" }}>
                      <div style={{ width: 110, height: 10, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: `${(d.leads.length / maxCount) * 100}%`, height: "100%", background: C.info }} />
                      </div>
                    </td>
                    <td style={{ fontFamily: F.mono, fontSize: 11, textAlign: "right", padding: "2px 12px 2px 0", width: 52, color: C.text }}>
                      {d.leads.length}{d.league ? <span style={{ color: C.amber }}> ·{d.league}L</span> : null}
                    </td>
                    <td style={{ padding: "2px 6px 2px 0" }}>
                      <div style={{ width: 110, height: 10, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: `${(med / maxLead) * 100}%`, height: "100%", background: C.accent }} />
                      </div>
                    </td>
                    <td style={{ fontFamily: F.mono, fontSize: 11, textAlign: "right", padding: "2px 0", width: 40, color: C.text }}>
                      {med.toFixed(1)}d
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["BOOKED AHEAD", "LEAGUE", "", "SOCIAL", ""].map((h, i) => (
                  <th key={i} style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", color: i === 1 ? C.amber : i === 3 ? C.info : C.mute, textAlign: "left", padding: "0 6px 5px 0" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BANDS.map((b, i) => {
                const lgPct = spread.lg.length ? (spread.lgBands[i] / spread.lg.length) * 100 : 0;
                const soPct = spread.so.length ? (spread.soBands[i] / spread.so.length) * 100 : 0;
                const bar = (pct: number, colour: string) => (
                  <div style={{ width: 120, height: 11, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: colour }} />
                  </div>
                );
                return (
                  <tr key={b.label}>
                    <td style={{ fontSize: 11.5, padding: "3px 10px 3px 0", color: C.text, whiteSpace: "nowrap" }}>{b.label}</td>
                    <td style={{ padding: "3px 6px 3px 0" }}>{bar(lgPct, C.amber)}</td>
                    <td style={{ fontFamily: F.mono, fontSize: 11, padding: "3px 14px 3px 0", width: 40, textAlign: "right", color: C.text }}>{lgPct.toFixed(0)}%</td>
                    <td style={{ padding: "3px 6px 3px 0" }}>{bar(soPct, C.info)}</td>
                    <td style={{ fontFamily: F.mono, fontSize: 11, padding: "3px 0", width: 40, textAlign: "right", color: C.text }}>{soPct.toFixed(0)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ fontSize: 11, color: C.mute, marginTop: 6 }}>
            {spread.lg.length} league and {spread.so.length} social bookings.
          </div>
        </div>
      )}

      <p style={{ fontSize: 11.5, color: C.mute, margin: "10px 0 0" }}>
        Median, not average, so one booking six weeks out does not hide what most people do. History comes from the
        Playtomic reservation emails; from 13 Sep the hourly check records new bookings within the hour. “L” is league fixtures booked that day.
      </p>
    </div>
  );
}
