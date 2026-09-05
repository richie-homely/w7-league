"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { C, F } from "@/theme/tokens";
import { BOX_CYCLES, CHRISTMAS_BREAK, SEASON, currentCycle, dayOf, daysLeft, fmtRange, inBreak } from "@/lib/boxCalendar";

/* Season calendar for the Box League: seven cycles on one timeline, the
 * Christmas break marked, today's position shown, and the live cycle's deadline
 * counted down — because the unplayed-match rule is strict and the one thing a
 * team needs to know at a glance is how many days are left in the cycle. */
export function BoxCalendar() {
  // Render deterministically on the server, then place "today" on the client.
  const [now, setNow] = useState<Date | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- the clock only exists on the client
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const t0 = dayOf(SEASON.start);
  const t1 = dayOf(SEASON.end) + 86_400_000;
  const pct = (iso: string) => Math.min(100, Math.max(0, ((dayOf(iso) - t0) / (t1 - t0)) * 100));
  const cur = now ? currentCycle(now) : null;
  const onBreak = now ? inBreak(now) : false;

  return (
    <div id="calendar" style={{ scrollMarginTop: 60 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap", marginBottom: 10 }}>
        <div style={{ fontFamily: F.display, fontSize: 24, textTransform: "uppercase", letterSpacing: "0.02em" }}>
          Season <span style={{ color: C.accent }}>calendar</span>
        </div>
        <div style={{ fontSize: 12.5, color: C.mute }}>
          7 cycles · {fmtRange(SEASON.start, SEASON.end)} · up to 28 matches per team
        </div>
        <Link href="/box/rules" style={{ fontSize: 12.5, color: C.info, textDecoration: "none", fontWeight: 600 }}>
          Full rules →
        </Link>
      </div>

      {/* Status strip */}
      <div
        style={{
          background: C.card,
          border: `1px solid ${cur?.state === "live" ? C.accent + "88" : C.border}`,
          borderRadius: 10,
          padding: "12px 14px",
          marginBottom: 12,
          display: "flex",
          gap: 18,
          flexWrap: "wrap",
          alignItems: "baseline",
        }}
      >
        {!now && <span style={{ fontSize: 13, color: C.mute }}>Loading…</span>}
        {now && !cur && <span style={{ fontSize: 13, color: C.mute }}>Season complete.</span>}
        {now && cur && cur.state === "upcoming" && (
          <>
            <span style={{ fontFamily: F.display, fontSize: 20, color: C.accent }}>CYCLE {cur.cycle.n} STARTS</span>
            <span style={{ fontSize: 13 }}>{fmtRange(cur.cycle.start, cur.cycle.end)}</span>
            <span style={{ fontSize: 12.5, color: C.mute }}>
              {Math.round((dayOf(cur.cycle.start) - now.getTime()) / 86_400_000)} days away — arrange your four matches early
            </span>
          </>
        )}
        {now && cur && cur.state === "live" && (
          <>
            <span style={{ fontFamily: F.display, fontSize: 20, color: C.accent }}>CYCLE {cur.cycle.n} · LIVE</span>
            <span style={{ fontSize: 13 }}>{fmtRange(cur.cycle.start, cur.cycle.end)}</span>
            <span
              style={{
                fontFamily: F.mono,
                fontSize: 13,
                fontWeight: 700,
                color: daysLeft(cur.cycle, now) <= 7 ? C.red : C.text,
              }}
            >
              {daysLeft(cur.cycle, now)} days left
            </span>
            {onBreak && <span style={{ fontSize: 12.5, color: C.amber }}>Christmas break — the clock is paused</span>}
            <span style={{ fontSize: 12, color: C.mute }}>
              Unplayed at the deadline = void, −1 point each. No extensions except for weather.
            </span>
          </>
        )}
      </div>

      {/* Timeline */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 14px 10px" }}>
        <div style={{ position: "relative", height: 34 }}>
          {BOX_CYCLES.map((c, i) => {
            const left = pct(c.start);
            const right = pct(c.end) + (86_400_000 / (t1 - t0)) * 100;
            const live = cur?.cycle.n === c.n && cur.state === "live";
            const done = now ? now.getTime() > dayOf(c.end) + 43_200_000 : false;
            return (
              <div
                key={c.n}
                title={`Cycle ${c.n}: ${fmtRange(c.start, c.end)}`}
                style={{
                  position: "absolute",
                  left: `${left}%`,
                  width: `calc(${right - left}% - 3px)`,
                  top: 0,
                  height: 34,
                  borderRadius: 6,
                  background: live ? C.accent : done ? C.bg2 : "#1f2a1f",
                  border: `1px solid ${live ? C.accent : i % 2 ? "#2f3a2f" : C.border}`,
                  color: live ? C.bg : done ? C.mute : C.text,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: F.display,
                  fontSize: 15,
                  letterSpacing: "0.04em",
                }}
              >
                C{c.n}
              </div>
            );
          })}
          {/* Christmas break hatch */}
          <div
            title={`Christmas break ${fmtRange(CHRISTMAS_BREAK.start, CHRISTMAS_BREAK.end)}`}
            style={{
              position: "absolute",
              left: `${pct(CHRISTMAS_BREAK.start)}%`,
              width: `${pct(CHRISTMAS_BREAK.end) - pct(CHRISTMAS_BREAK.start) + (86_400_000 / (t1 - t0)) * 100}%`,
              top: -4,
              height: 42,
              borderRadius: 4,
              background: "repeating-linear-gradient(135deg, rgba(255,184,77,0.55) 0 4px, transparent 4px 8px)",
              border: `1px dashed ${C.amber}`,
              pointerEvents: "none",
            }}
          />
          {/* Today */}
          {now && now.getTime() >= t0 && now.getTime() <= t1 && (
            <div
              style={{
                position: "absolute",
                left: `${((now.getTime() - t0) / (t1 - t0)) * 100}%`,
                top: -8,
                height: 50,
                width: 2,
                background: C.red,
              }}
            >
              <div style={{ position: "absolute", top: -14, left: -16, fontSize: 9, color: C.red, fontWeight: 700, letterSpacing: "0.1em" }}>
                TODAY
              </div>
            </div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: C.mute, marginTop: 8 }}>
          <span>Mon 14 Sep 2026</span>
          <span style={{ color: C.amber }}>▨ Christmas break 23 Dec – 5 Jan (clock paused)</span>
          <span>Sun 11 Apr 2027</span>
        </div>
      </div>

      {/* Cycle list */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 8, marginTop: 12 }}>
        {BOX_CYCLES.map((c) => {
          const live = cur?.cycle.n === c.n && cur.state === "live";
          const done = now ? now.getTime() > dayOf(c.end) + 43_200_000 : false;
          return (
            <div
              key={c.n}
              style={{
                background: C.card,
                border: `1px solid ${live ? C.accent : C.border}`,
                borderRadius: 10,
                padding: "10px 12px",
                opacity: done ? 0.6 : 1,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontFamily: F.display, fontSize: 18, color: live ? C.accent : C.text }}>CYCLE {c.n}</span>
                <span style={{ fontSize: 10.5, color: live ? C.accent : done ? C.mute : C.green, fontWeight: 700, letterSpacing: "0.08em" }}>
                  {live ? "LIVE" : done ? "DONE" : "AHEAD"}
                </span>
              </div>
              <div style={{ fontSize: 12.5, marginTop: 4 }}>{fmtRange(c.start, c.end)}</div>
              <div style={{ fontSize: 11.5, color: C.mute, marginTop: 2 }}>
                {c.note ?? "4 matches · deadline Sunday night · top 2 up, bottom 2 down"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
