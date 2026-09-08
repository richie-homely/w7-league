"use client";

import Link from "next/link";
import { useState } from "react";
import { C, F } from "@/theme/tokens";
import { fmtBooking, useLeagueBookings, type LeagueBooking } from "@/lib/bookings";

// "Who's playing, what the fixture is, time and court" (Richie, 8 Sep 2026) — a summary of
// the league matches the Playtomic bookings show as booked over the next two weeks.
// Read from league_bookings (public), which the detector refreshes hourly.

function label(b: LeagueBooking, boxByKey?: Map<string, number>): string {
  if (b.kind === "box") {
    const box = boxByKey?.get(b.matchKey);
    return box ? `Box ${box}` : "Box league";
  }
  return "Summer knockouts";
}

export function UpcomingFixtures({
  compact = false,
  boxByKey,
  limit,
}: {
  /** smaller heading, for the top of the box league page */
  compact?: boolean;
  /** box_matches.id -> box number, so a box fixture can be labelled "Box 7" */
  boxByKey?: Map<string, number>;
  limit?: number;
}) {
  const { bookings, loaded } = useLeagueBookings();
  // snapshot of "now" at mount (a render must be pure); a match stays visible for two hours after it starts
  const [now] = useState(() => Date.now() - 2 * 3600 * 1000);
  const upcoming = bookings
    .filter((b) => new Date(b.startsAt.length === 16 ? b.startsAt + ":00" : b.startsAt).getTime() >= now)
    .slice(0, limit ?? 40);

  // group by day
  const days = new Map<string, LeagueBooking[]>();
  for (const b of upcoming) {
    const d = new Date(b.startsAt.length === 16 ? b.startsAt + ":00" : b.startsAt);
    const k = d.toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "long" });
    days.set(k, [...(days.get(k) ?? []), b]);
  }

  return (
    <section id="fixtures" style={{ marginTop: compact ? 22 : 36, scrollMarginTop: 60 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontFamily: F.display, fontSize: compact ? 22 : 28, letterSpacing: "0.02em", textTransform: "uppercase" }}>
          Upcoming <span style={{ color: C.accent }}>league fixtures</span>
        </div>
        <div style={{ fontSize: 12, color: C.mute }}>
          courts booked on Playtomic · next 14 days · updated hourly
        </div>
      </div>

      {!loaded ? (
        <div style={{ fontSize: 13, color: C.mute, marginTop: 10 }}>Loading…</div>
      ) : upcoming.length === 0 ? (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, fontSize: 13, color: C.mute, marginTop: 10 }}>
          No league matches are booked in yet. A booking shows here once all four players are on it in Playtomic.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          {[...days.entries()].map(([day, list]) => (
            <div key={day} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: C.mute, marginBottom: 6 }}>{day.toUpperCase()}</div>
              {list.map((b) => (
                <div key={b.matchKey} style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap", padding: "5px 0", borderTop: `1px solid ${C.border}` }}>
                  <div style={{ fontFamily: F.mono, fontSize: 13, minWidth: 48 }}>{fmtBooking(b.startsAt).split(" · ")[1]}</div>
                  <div style={{ fontSize: 11.5, color: C.mute, minWidth: 60 }}>{b.court}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: b.kind === "box" ? C.accent : C.info, minWidth: 110, letterSpacing: "0.04em" }}>
                    {label(b, boxByKey).toUpperCase()}
                  </div>
                  <div style={{ fontSize: 13.5, flex: "1 1 260px" }}>
                    <b>{b.team1}</b> <span style={{ color: C.mute }}>v</span> <b>{b.team2}</b>
                    {b.confidence === "probable" && <span style={{ fontSize: 11, color: C.mute }}> · probable</span>}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      {!compact && (
        <p style={{ fontSize: 12, color: C.mute, marginTop: 8 }}>
          Box league boxes and results: <Link href="/box" style={{ color: C.info }}>league.w7padel.com/box</Link> · Summer knockouts:{" "}
          <Link href="/summer-2026/knockouts" style={{ color: C.info }}>bracket</Link>. “Probable” means not all four players were named on the booking.
        </p>
      )}
    </section>
  );
}
