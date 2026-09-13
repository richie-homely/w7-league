"use client";

import { useMemo, useState } from "react";
import { C, F } from "@/theme/tokens";
import { useLeagueBookings } from "@/lib/bookings";
import { freeRuns, useCourtSlots, type CourtSlot } from "@/lib/slots";
import { currentCycle } from "@/lib/boxCalendar";
import type { BoxMatch } from "@/lib/box";

/* Courts free vs games to book (Richie, 13 Sep 2026):
 *
 *   "We need fifty games next week. We have twenty booked in already. There's thirty left
 *    to go. This is what'll be available — and show the windows then that you're looking
 *    at to book."
 *
 * The three numbers, then the actual free half-hours behind a click. Needs court_slots,
 * which is written hourly from Playtomic; until that table exists the whole section hides
 * rather than showing a half-picture. */

const DAY_MS = 86400000;

function monday(d: Date): Date {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
}

const fmtDay = (d: Date) => d.toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short" });
const fmtTime = (d: Date) => d.toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit", hour12: false });

function weekLabel(mon: Date): string {
  const end = new Date(mon.getTime() + 6 * DAY_MS);
  return `${mon.toLocaleDateString("en-IE", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-IE", { day: "numeric", month: "short" })}`;
}

export function CourtAvailability({ matches, bare = false }: { matches: BoxMatch[];
  /** hide the internal heading: the collapsible wrapper on the usage page supplies it */
  bare?: boolean }) {
  const { slots, ready } = useCourtSlots();
  const { bookings } = useLeagueBookings();
  const [pick, setPick] = useState(1);          // 0 = this week, 1 = next week
  const [open, setOpen] = useState(false);
  const [band, setBand] = useState<"all" | "peak" | "off">("all");
  // One snapshot of "now" for the whole component: a render has to be pure, and every week
  // boundary below has to agree with every other one.
  const [nowMs] = useState(() => Date.now());

  const thisMon = useMemo(() => monday(new Date(nowMs)), [nowMs]);

  const weeks = useMemo(() => {
    const cyc = currentCycle(new Date(nowMs));
    const cycleEnd = cyc ? new Date(cyc.cycle.end + "T23:59:59") : null;
    const pending = matches.filter((m) => m.status === "pending" && m.box < 90).length;
    // Whole weeks still ahead carry the target; this week is already part spent.
    let wholeAhead = 0;
    for (let i = 1; i < 12; i++) {
      const m = new Date(thisMon.getTime() + i * 7 * DAY_MS);
      if (cycleEnd && m <= cycleEnd) wholeAhead++;
    }
    const perWeek = wholeAhead > 0 ? Math.round(pending / wholeAhead) : pending;
    return [0, 1, 2].map((i) => {
      const mon = new Date(thisMon.getTime() + i * 7 * DAY_MS);
      const next = new Date(mon.getTime() + 7 * DAY_MS);
      const booked = bookings.filter((b) => {
        if (b.kind !== "box") return false;
        const t = new Date(b.startsAt.length === 16 ? b.startsAt + ":00" : b.startsAt);
        return t >= mon && t < next;
      }).length;
      return { mon, label: weekLabel(mon), current: i === 0, need: i === 0 ? 0 : perWeek, booked };
    });
  }, [matches, bookings, thisMon, nowMs]);

  const week = weeks[pick];

  const days = useMemo(() => {
    if (!week) return [];
    const out: { day: Date; runs: ReturnType<typeof freeRuns> }[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(week.mon.getTime() + i * DAY_MS);
      if (day.getTime() + DAY_MS < nowMs) continue;        // a day already gone
      const runs = freeRuns(slots as CourtSlot[], day);
      if (runs.length) out.push({ day, runs });
    }
    return out;
  }, [slots, week, nowMs]);

  if (!ready || !week) return null;

  const toGo = Math.max(week.need - week.booked, 0);
  const hoursOf = (peakOnly: boolean | null) =>
    days.reduce((n, d) => n + d.runs.reduce(
      (m, r) => m + (peakOnly === null || r.peak === peakOnly
        ? (r.to.getTime() - r.from.getTime()) / 3600000 : 0), 0), 0);
  const freeHours = hoursOf(null);
  const peakHours = hoursOf(true);
  const offHours = hoursOf(false);
  // Filtered view: drop blocks outside the chosen band, then days left with nothing.
  const shownDays = days
    .map((d) => ({ ...d, runs: d.runs.filter((r) => band === "all" || (band === "peak") === r.peak) }))
    .filter((d) => d.runs.length > 0);

  const tile = (v: string, label: string, colour: string) => (
    <div style={{ flex: "1 1 90px", minWidth: 90 }}>
      <div style={{ fontFamily: F.mono, fontSize: 24, fontWeight: 700, color: colour, lineHeight: 1.1 }}>{v}</div>
      <div style={{ fontSize: 11, color: C.mute, marginTop: 2 }}>{label}</div>
    </div>
  );

  return (
    <section id="availability" style={{ marginTop: 22, scrollMarginTop: 60 }}>
      {!bare && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontFamily: F.display, fontSize: 22, letterSpacing: "0.02em", textTransform: "uppercase" }}>
            Courts <span style={{ color: C.accent }}>free</span> to book
          </div>
          <div style={{ fontSize: 12, color: C.mute }}>what the league still has to fit in, and the hours it can go into</div>
        </div>
      )}

      <div style={{ display: "flex", gap: 6, margin: "10px 0 0", flexWrap: "wrap" }}>
        {weeks.map((w, i) => (
          <button
            key={w.label}
            onClick={() => setPick(i)}
            style={{
              padding: "5px 12px", borderRadius: 999, cursor: "pointer", fontSize: 12, fontWeight: 700,
              border: `1px solid ${i === pick ? C.accent : C.border}`,
              background: i === pick ? C.accent : C.card,
              color: i === pick ? C.bg : C.text,
            }}
          >
            {w.current ? "This week" : i === 1 ? "Next week" : "Week after"}
          </button>
        ))}
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", marginTop: 10 }}>
        <div style={{ fontSize: 12.5, color: C.mute, marginBottom: 10 }}>{week.label}</div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {week.current
            ? tile(String(week.booked), "league games booked", C.accent)
            : (
              <>
                {tile(String(week.need), "games needed", C.text)}
                {tile(String(week.booked), "already booked", C.accent)}
                {tile(String(toGo), "left to book", toGo > 0 ? C.amber : C.green)}
              </>
            )}
          {tile(`${freeHours}h`, "court time free", C.info)}
          {tile(`${peakHours}h`, "of it at peak", peakHours > 0 ? C.amber : C.mute)}
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          style={{
            marginTop: 12, padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12.5,
            fontWeight: 700, border: `1px solid ${C.accent}66`, background: "transparent", color: C.accent,
          }}
        >
          {open ? "Hide the free hours" : "Show the free hours"} {open ? "▴" : "▾"}
        </button>

        {open && (
          <div style={{ marginTop: 12 }}>
            {/* Richie, 13 Sep 2026: "distinguish between peak and off peak availability by
                colour code and maybe add a filter", then "call all of weekend peak
                availability — people aren't in work". Off-peak is weekday daytime only. */}
            <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
              {([["all", `All · ${freeHours}h`], ["peak", `Peak · ${peakHours}h`], ["off", `Off-peak · ${offHours}h`]] as const).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setBand(k)}
                  style={{
                    padding: "4px 11px", borderRadius: 999, cursor: "pointer", fontSize: 11.5, fontWeight: 700,
                    border: `1px solid ${band === k ? (k === "peak" ? C.amber : k === "off" ? C.info : C.accent) : C.border}`,
                    background: band === k ? (k === "peak" ? C.amber : k === "off" ? C.info : C.accent) : "transparent",
                    color: band === k ? C.bg : C.mute,
                  }}
                >
                  {label}
                </button>
              ))}
              <span style={{ fontSize: 11, color: C.mute, marginLeft: 2 }}>
                peak = weekday evenings from 17:00, and all weekend
              </span>
            </div>
            {shownDays.length === 0 && (
              <div style={{ fontSize: 13, color: C.mute }}>
                {band === "all" ? "Nothing free left in this week." : "Nothing free in that band this week."}
              </div>
            )}
            {shownDays.map(({ day, runs }) => (
              <div
                key={day.toDateString()}
                style={{
                  display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap",
                  padding: "8px 0", borderTop: `1px solid ${C.border}`,
                }}
              >
                <div style={{ fontFamily: F.mono, fontSize: 12, color: C.text, minWidth: 92, fontWeight: 700 }}>
                  {fmtDay(day)}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: "1 1 240px" }}>
                  {runs.map((r) => {
                    const hue = r.peak ? C.amber : C.info;
                    return (
                    <span
                      key={r.from.toISOString()}
                      title={`${r.courts} court${r.courts === 1 ? "" : "s"} free · ${r.peak ? "peak" : "off-peak"}`}
                      style={{
                        fontFamily: F.mono, fontSize: 11.5, padding: "3px 7px", borderRadius: 4,
                        background: `${hue}1a`, border: `1px solid ${hue}44`, color: hue,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {fmtTime(r.from)}–{fmtTime(r.to)}
                      <span style={{ color: C.mute }}> · {r.courts}</span>
                    </span>
                    );
                  })}
                </div>
              </div>
            ))}
            <div style={{ fontSize: 11.5, color: C.mute, marginTop: 10 }}>
              Each block is a stretch with a court free; the number after the dot is how many of the three.
              <span style={{ color: C.amber }}> Amber is peak</span>,<span style={{ color: C.info }}> blue is off-peak</span>.
              Updated hourly from Playtomic, so book on Playtomic to claim one.
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
