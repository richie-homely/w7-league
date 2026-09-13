"use client";

import { useMemo, useState } from "react";
import { C, F } from "@/theme/tokens";
import { COURTS, isPeak, useCourtSlots } from "@/lib/slots";

/* Court occupancy day by day (Richie, 13 Sep 2026: "a proper chart of overall bookings and
 * occupancy for last week and forward by day, showing peak %, off peak %, total %, and how
 * that's filling up" — then "add the forward booking chart to the usage tab too").
 *
 * The same picture as the one in the daily email, built from court_slots rather than a
 * Playtomic call, so the page can draw it without the site ever touching Playtomic.
 *
 * Peak is weekday evenings from 17:00 and the whole weekend, so a weekend has no off-peak
 * hours at all and shows a dash rather than a misleading zero. Forward days are dimmed:
 * members book a few days out, so what is showing there is a floor, not a forecast. */

type Row = {
  day: Date;
  future: boolean;
  today: boolean;
  peak: number | null;
  off: number | null;
  total: number;
};

const fmtDay = (d: Date) => d.toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short" });

export function OccupancyChart() {
  const { slots, ready } = useCourtSlots();
  const [nowMs] = useState(() => Date.now());

  const rows = useMemo<Row[]>(() => {
    const today = new Date(nowMs);
    today.setHours(0, 0, 0, 0);
    const byDay = new Map<string, { pkUsed: number; pkAll: number; ofUsed: number; ofAll: number; day: Date }>();
    for (const s of slots) {
      const at = new Date(s.startsAt);
      const key = at.toDateString();
      const midnight = new Date(at.getFullYear(), at.getMonth(), at.getDate());
      const cur = byDay.get(key) ?? { pkUsed: 0, pkAll: 0, ofUsed: 0, ofAll: 0, day: midnight };
      const used = COURTS - s.free;
      if (isPeak(at)) {
        cur.pkUsed += used;
        cur.pkAll += COURTS;
      } else {
        cur.ofUsed += used;
        cur.ofAll += COURTS;
      }
      byDay.set(key, cur);
    }
    return [...byDay.values()]
      .sort((a, b) => a.day.getTime() - b.day.getTime())
      .map((v) => ({
        day: v.day,
        future: v.day.getTime() > today.getTime(),
        today: v.day.getTime() === today.getTime(),
        peak: v.pkAll ? (v.pkUsed / v.pkAll) * 100 : null,
        off: v.ofAll ? (v.ofUsed / v.ofAll) * 100 : null,
        total: v.pkAll + v.ofAll ? ((v.pkUsed + v.ofUsed) / (v.pkAll + v.ofAll)) * 100 : 0,
      }));
  }, [slots, nowMs]);

  if (!ready || rows.length === 0) return null;

  const done = rows.filter((r) => !r.future);
  const avg = (pick: (r: Row) => number | null) => {
    const vals = done.map(pick).filter((v): v is number => v !== null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };

  const bar = (pct: number | null, colour: string) => (
    <div style={{ width: 118, height: 10, background: C.border, borderRadius: 2, overflow: "hidden" }}>
      <div style={{ width: `${Math.max(Math.min(pct ?? 0, 100), 0)}%`, height: "100%", background: colour }} />
    </div>
  );
  const pct = (v: number | null) => (v === null ? "—" : `${v.toFixed(0)}%`);
  const head: React.CSSProperties = {
    fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", padding: "0 6px 5px 0", textAlign: "left",
  };
  const numCell: React.CSSProperties = {
    fontFamily: F.mono, fontSize: 11, fontWeight: 600, textAlign: "right", padding: "2px 10px 2px 0", width: 40,
  };

  return (
    <div>
      <p style={{ fontSize: 12, color: C.mute, margin: "0 0 10px" }}>
        Peak is weekday evenings from 17:00 and all weekend; off-peak is weekday daytime, so a weekend has no
        off-peak hours. The days already gone ran {avg((r) => r.peak).toFixed(0)}% at peak and{" "}
        {avg((r) => r.off).toFixed(0)}% off-peak. Forward days are still filling — what you see there is a floor,
        not a forecast.
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={head} />
              <th style={{ ...head, color: C.amber }} colSpan={2}>PEAK</th>
              <th style={{ ...head, color: C.info }} colSpan={2}>OFF-PEAK</th>
              <th style={{ ...head, color: C.mute, textAlign: "right" }}>ALL</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.day.toDateString()} style={{ opacity: r.future ? 0.7 : 1 }}>
                <td style={{
                  fontSize: 11, whiteSpace: "nowrap", padding: "2px 8px 2px 0",
                  color: r.future ? C.mute : C.text, fontWeight: r.today ? 700 : 400,
                }}>
                  {fmtDay(r.day)}{r.today ? " ·" : ""}
                </td>
                <td style={{ padding: "2px 6px 2px 0" }}>{bar(r.peak, C.amber)}</td>
                <td style={{ ...numCell, color: C.text }}>{pct(r.peak)}</td>
                <td style={{ padding: "2px 6px 2px 0" }}>{bar(r.off, C.info)}</td>
                <td style={{ ...numCell, color: C.mute }}>{pct(r.off)}</td>
                <td style={{ ...numCell, color: C.text, paddingRight: 0 }}>{pct(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
