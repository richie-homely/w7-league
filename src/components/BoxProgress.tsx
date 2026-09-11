"use client";

import { useState } from "react";
import { C, F } from "@/theme/tokens";
import type { BoxMatch, BoxTeam } from "@/lib/box";
import type { LeagueBooking } from "@/lib/bookings";
import { fmtBooking, useLeagueBookings } from "@/lib/bookings";
import { formatScore } from "@/lib/scoring";
import { BOX_CYCLES, currentCycle, daysLeft, fmtRange } from "@/lib/boxCalendar";

// Cycle progress by box (Richie, 9 Sep 2026): how many of each box's ten fixtures are
// played, awaiting confirmation, booked on the courts, or have nothing arranged yet —
// so teams falling behind show up before the −1 rule bites. Click a box to see its
// fixtures (booked when and where, results as they land); step through cycles and the
// weeks within a cycle. Public on the box league page; the admin page adds a per-team table.

type Seg = { played: number; awaiting: number; booked: number; unbooked: number; total: number };
type Kind = "played" | "awaiting" | "booked" | "unbooked";

const DAY = 86400000;

// a booking only counts as "booked" while it is still ahead (3h grace): the table also
// holds past bookings for the admin heatmap, and a past booking against a pending
// fixture is not a plan
function kindOf(m: BoxMatch, bookings: Map<string, LeagueBooking>, nowMs = Date.now()): Kind {
  if (m.status === "confirmed") return "played";
  if (m.status === "submitted" || m.status === "disputed") return "awaiting";
  const b = bookings.get(m.id);
  if (b && new Date(b.startsAt).getTime() >= nowMs - 3 * 3600000) return "booked";
  return "unbooked";
}

/** the date a fixture "happens" for week filtering: result time if played, else booking time */
function whenOf(m: BoxMatch, bookings: Map<string, LeagueBooking>): number | null {
  if (m.status !== "pending" && m.updatedAt) return new Date(m.updatedAt).getTime();
  const b = bookings.get(m.id);
  return b ? new Date(b.startsAt).getTime() : null;
}

function tally(ms: BoxMatch[], bookings: Map<string, LeagueBooking>, nowMs = Date.now()): Seg {
  const s: Seg = { played: 0, awaiting: 0, booked: 0, unbooked: 0, total: ms.length };
  for (const m of ms) s[kindOf(m, bookings, nowMs)]++;
  return s;
}

function Bar({ s, width = "100%" }: { s: Seg; width?: number | string }) {
  // segments are percentages so the bar is fluid — it fills whatever the row gives it on a phone
  const w = (n: number) => `${s.total ? (100 * n) / s.total : 0}%`;
  return (
    <div style={{ display: "flex", width, height: 12, borderRadius: 3, overflow: "hidden", background: C.border }} title={`${s.played} played · ${s.awaiting} awaiting confirmation · ${s.booked} booked · ${s.unbooked} not arranged`}>
      <div style={{ width: w(s.played), background: C.green }} />
      <div style={{ width: w(s.awaiting), background: C.info }} />
      <div style={{ width: w(s.booked), background: C.accent }} />
    </div>
  );
}

const pill = (on: boolean): React.CSSProperties => ({
  padding: "4px 11px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer",
  border: `1px solid ${on ? C.accent : C.border}`, background: on ? C.accent : C.card, color: on ? C.bg : C.text,
});

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
  const live = currentCycle(now) ?? { cycle: BOX_CYCLES[0], state: "upcoming" as const };
  const [cycleN, setCycleN] = useState(live.cycle.n);
  const [week, setWeek] = useState(0);        // 0 = whole cycle, 1..4 = week of the cycle
  const [openBox, setOpenBox] = useState<number | null>(null);

  const cycle = BOX_CYCLES.find((c) => c.n === cycleN) ?? BOX_CYCLES[0];
  const cStart = new Date(cycle.start + "T00:00:00").getTime();
  const cEnd = new Date(cycle.end + "T23:59:59").getTime();
  const wkStart = week ? cStart + (week - 1) * 7 * DAY : cStart;
  const wkEnd = week ? Math.min(cStart + week * 7 * DAY, cEnd) : cEnd;
  const isCurrent = cycleN === live.cycle.n;
  const state = isCurrent ? live.state : cycleN < live.cycle.n ? "over" : "upcoming";
  const left = daysLeft(cycle, now);
  const elapsed = Math.max(0, Math.round((now.getTime() - cStart) / DAY));

  const inCycle = matches.filter((m) => m.cycle === cycleN && m.box < 90);
  // week view: fixtures that happen(ed) in that week; unarranged ones only in the whole-cycle view
  const inView = week
    ? inCycle.filter((m) => { const t = whenOf(m, bookings); return t !== null && t >= wkStart && t < wkEnd; })
    : inCycle;
  const all = tally(inView, bookings, now.getTime());
  const boxes = [...new Set(inCycle.map((m) => m.box))].sort((a, b) => a - b);
  const byId = Object.fromEntries(teams.map((t) => [t.id, t]));

  // "behind" once the cycle is under way: by day 14 a box should have most fixtures
  // arranged; by day 21 anything unarranged is at real risk of the −1
  const flag = (s: Seg) => {
    if (state !== "live" || week) return null;
    if (elapsed >= 21 && s.unbooked > 0) return { text: "at risk of −1", color: C.red };
    if (elapsed >= 14 && s.unbooked >= 4) return { text: "falling behind", color: C.amber };
    return null;
  };

  const fmtDay = (t: number) => new Date(t).toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short" });
  const ORDER: Record<Kind, number> = { played: 0, awaiting: 1, booked: 2, unbooked: 3 };
  const describe = (m: BoxMatch): { kind: Kind; text: string; color: string } => {
    const k = kindOf(m, bookings, now.getTime());
    const b = bookings.get(m.id);
    if (k === "played") return { kind: k, text: `Played · ${formatScore(m.sets)}${m.updatedAt ? " · " + fmtDay(new Date(m.updatedAt).getTime()) : ""}`, color: C.green };
    if (k === "awaiting") return { kind: k, text: `${m.status === "disputed" ? "Scores differ" : "Awaiting confirmation"} · ${formatScore(m.sets)}`, color: C.info };
    if (k === "booked" && b) return { kind: k, text: `${b.confidence === "probable" ? "Probably booked" : "Booked"} · ${fmtBooking(b.startsAt)} · ${b.court}`, color: C.accent };
    return { kind: k, text: "Not arranged yet", color: C.mute };
  };

  const teamRows = detailed
    ? teams.filter((t) => t.active && t.box < 90).map((t) => {
        const mine = inView.filter((m) => m.team1Id === t.id || m.team2Id === t.id);
        return { team: t, s: tally(mine, bookings, now.getTime()) };
      }).sort((a, b) => a.team.box - b.team.box || b.s.unbooked - a.s.unbooked)
    : [];

  const weekLabel = (w: number) => {
    const a = cStart + (w - 1) * 7 * DAY, b = Math.min(a + 6 * DAY, cEnd);
    return `Wk ${w} · ${new Date(a).toLocaleDateString("en-IE", { day: "numeric", month: "short" })}–${new Date(b).toLocaleDateString("en-IE", { day: "numeric", month: "short" })}`;
  };

  return (
    <section id="progress" style={{ marginTop: 22, scrollMarginTop: 60 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontFamily: F.display, fontSize: 22, letterSpacing: "0.02em", textTransform: "uppercase" }}>
          Cycle {cycleN} <span style={{ color: C.accent }}>progress</span>
        </div>
        <div style={{ fontSize: 12, color: C.mute }}>
          {fmtRange(cycle.start, cycle.end)}
          {state === "upcoming" ? " · not started" : state === "live" ? ` · day ${elapsed} of ${Math.round((cEnd - cStart) / DAY)} · ${left} days to the deadline` : " · cycle over"}
        </div>
      </div>

      {/* cycle stepper + week pills */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", margin: "8px 0" }}>
        <button onClick={() => { setCycleN(Math.max(1, cycleN - 1)); setWeek(0); setOpenBox(null); }} disabled={cycleN <= 1} style={{ ...pill(false), opacity: cycleN <= 1 ? 0.4 : 1 }} aria-label="Previous cycle">‹</button>
        {BOX_CYCLES.map((c) => (
          <button key={c.n} onClick={() => { setCycleN(c.n); setWeek(0); setOpenBox(null); }} style={pill(c.n === cycleN)} title={fmtRange(c.start, c.end)}>
            {c.n === live.cycle.n ? `Cycle ${c.n} · now` : `C${c.n}`}
          </button>
        ))}
        <button onClick={() => { setCycleN(Math.min(BOX_CYCLES.length, cycleN + 1)); setWeek(0); setOpenBox(null); }} disabled={cycleN >= BOX_CYCLES.length} style={{ ...pill(false), opacity: cycleN >= BOX_CYCLES.length ? 0.4 : 1 }} aria-label="Next cycle">›</button>
        <span style={{ width: 10 }} />
        <button onClick={() => setWeek(0)} style={pill(week === 0)}>Whole cycle</button>
        {[1, 2, 3, 4].map((w) => (
          <button key={w} onClick={() => setWeek(w)} style={pill(week === w)}>{weekLabel(w)}</button>
        ))}
      </div>

      <div style={{ fontSize: 12, color: C.mute, marginBottom: 6 }}>
        {week ? `Week ${week}: ` : ""}{all.played} played · {all.awaiting} awaiting confirmation · {all.booked} booked{week ? "" : ` · ${all.unbooked} not yet arranged`} · {week ? `${all.total} fixtures fall in this week` : `of ${all.total}`}
        {" · "}click a box for its fixtures
      </div>
      <div style={{ display: "flex", gap: 14, fontSize: 11, color: C.mute, margin: "0 0 8px", flexWrap: "wrap" }}>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: C.green, marginRight: 4 }} />played</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: C.info, marginRight: 4 }} />awaiting confirmation</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: C.accent, marginRight: 4 }} />court booked</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: C.border, marginRight: 4 }} />not arranged</span>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 14px" }}>
        {boxes.map((b) => {
          const ms = inView.filter((m) => m.box === b);
          const s = tally(ms, bookings, now.getTime());
          const f = flag(s);
          const open = openBox === b;
          const list = [...ms].sort((x, y) => {
            const kx = ORDER[kindOf(x, bookings, now.getTime())], ky = ORDER[kindOf(y, bookings, now.getTime())];
            if (kx !== ky) return kx - ky;
            return (whenOf(x, bookings) ?? Infinity) - (whenOf(y, bookings) ?? Infinity);
          });
          return (
            <div key={b} style={{ borderTop: `1px solid ${C.border}` }}>
              <button
                onClick={() => setOpenBox(open ? null : b)}
                aria-expanded={open}
                // flex + wrap (Richie, 11 Sep 2026): the fixed 72px/170px grid ran 120px past a
                // phone screen; now the bar shrinks and the status text drops under it when needed
                style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 10px", padding: "6px 0", width: "100%", minWidth: 0,
                         background: "transparent", border: 0, color: C.text, cursor: "pointer", textAlign: "left", fontFamily: F.body }}
              >
                <div style={{ fontFamily: F.mono, fontSize: 12.5, flex: "0 0 68px" }}>{open ? "▾" : "▸"} Box {b}</div>
                <div style={{ flex: "1 1 120px", minWidth: 0 }}><Bar s={s} /></div>
                <div style={{ fontSize: 11.5, color: f ? f.color : C.mute, fontWeight: f ? 700 : 400, flex: "1 1 150px", minWidth: 0 }}>
                  {f ? f.text : week ? `${s.played + s.awaiting} done · ${s.booked} booked` : `${s.played + s.awaiting} done · ${s.booked} booked · ${s.unbooked} to arrange`}
                </div>
              </button>
              {open && (
                <div style={{ padding: "2px 0 10px 18px" }}>
                  {list.length === 0 && <div style={{ fontSize: 12.5, color: C.mute }}>Nothing in this week for box {b}.</div>}
                  {list.map((m) => {
                    const t1 = byId[m.team1Id], t2 = byId[m.team2Id];
                    const d = describe(m);
                    return (
                      <div key={m.id} style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap", padding: "4px 0", fontSize: 13 }}>
                        <span style={{ flex: "1 1 260px" }}><b>{t1?.name ?? "?"}</b> <span style={{ color: C.mute }}>v</span> <b>{t2?.name ?? "?"}</b></span>
                        <span style={{ fontSize: 12, color: d.color, fontFamily: d.kind === "unbooked" ? F.body : F.mono }}>{d.text}</span>
                      </div>
                    );
                  })}
                </div>
              )}
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
