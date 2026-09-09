"use client";

import Link from "next/link";
import { useState } from "react";
import { C, F } from "@/theme/tokens";
import { fmtBooking, summerKey, useLeagueBookings, type LeagueBooking } from "@/lib/bookings";
import { useLeagueData } from "@/lib/useLeagueData";
import { buildBracket, isPlaceholderSlot, tierQualifiers } from "@/lib/bracket";
import type { BracketMatch } from "@/lib/types";
import { useBoxData } from "@/lib/box";

// "Who's playing, what the fixture is, time and court" (Richie, 8 Sep 2026) — a summary of
// the league matches the Playtomic bookings show as booked over the next two weeks.
// Read from league_bookings (public), which the detector refreshes hourly.

function label(b: LeagueBooking, boxByKey?: Map<string, number>, tieLabel?: Map<string, string>): string {
  if (b.kind === "box") {
    const box = boxByKey?.get(b.matchKey);
    return box ? `Box ${box}` : "Box league";
  }
  return tieLabel?.get(b.matchKey) ?? "Summer knockouts";
}

function tieLabelFor(b: LeagueBooking, tieLabel?: Map<string, string>, tieByTeam?: Map<string, { label: string; opponent: string; count: number }>): string | undefined {
  if (b.matchKey.startsWith("tie:summer1:")) return tieByTeam?.get(b.matchKey.split(":")[2])?.label;
  return tieLabel?.get(b.matchKey);
}

/** Hub version: only summer bookings that are a real, unplayed bracket tie are shown —
 *  two qualifiers booking a friendly is not a fixture (Richie, 9 Sep 2026: Carthy & Dunne
 *  did not qualify, yet a booking with them appeared in the list). */
export function UpcomingLeagueFixtures() {
  const { teamsByDiv, fixtures, loading } = useLeagueData();
  const { matches: boxMatches } = useBoxData();
  const tieLabel = new Map<string, string>();
  // team id -> its one unplayed tie (label + opponent), for bookings that name only that team
  const tieByTeam = new Map<string, { label: string; opponent: string; count: number }>();
  if (!loading) {
    for (const tier of ["upper", "lower"] as const) {
      const b = buildBracket(tierQualifiers(tier, teamsByDiv, fixtures));
      const rounds: BracketMatch[][] = [b.r1, b.qf, b.sf, b.f, b.third];
      for (const round of rounds) {
        for (const m of round) {
          if (m.result || !m.a || !m.b || isPlaceholderSlot(m.a) || isPlaceholderSlot(m.b)) continue;
          const label = `${tier === "upper" ? "Upper" : "Lower"} ${m.id}`;
          tieLabel.set(summerKey(m.a.teamId, m.b.teamId), label);
          const nameOf = (s: typeof m.a) => (s && !isPlaceholderSlot(s) ? `${s.team.p1} & ${s.team.p2}` : "");
          for (const [id, opp] of [[m.a.teamId, nameOf(m.b)], [m.b.teamId, nameOf(m.a)]] as const) {
            const prev = tieByTeam.get(id);
            tieByTeam.set(id, { label, opponent: opp, count: (prev?.count ?? 0) + 1 });
          }
        }
      }
    }
  }
  return (
    <UpcomingFixtures
      tieLabel={tieLabel}
      tieByTeam={tieByTeam}
      summerReady={!loading}
      boxByKey={new Map(boxMatches.map((m) => [m.id, m.box]))}
    />
  );
}

export function UpcomingFixtures({
  compact = false,
  boxByKey,
  limit,
  tieLabel,
  tieByTeam,
  summerReady,
  showSummer = true,
}: {
  /** smaller heading, for the top of the box league page */
  compact?: boolean;
  /** box_matches.id -> box number, so a box fixture can be labelled "Box 7" */
  boxByKey?: Map<string, number>;
  limit?: number;
  /** summer bookings are shown only if their key is a current bracket tie (hub) */
  tieLabel?: Map<string, string>;
  /** for bookings naming one bracket team only: that team's single unplayed tie */
  tieByTeam?: Map<string, { label: string; opponent: string; count: number }>;
  /** false while the bracket is still loading, so summer rows do not flash in and out */
  summerReady?: boolean;
  /** box league page: box fixtures only */
  showSummer?: boolean;
}) {
  const { bookings, loaded } = useLeagueBookings();
  // snapshot of "now" at mount (a render must be pure); a match stays visible for two hours after it starts
  const [now] = useState(() => Date.now() - 2 * 3600 * 1000);
  // a summer booking that names only one bracket team ("summer1:<teamId>:<time>") becomes
  // that team's unplayed tie, if it has exactly one; otherwise it is dropped
  const resolved: LeagueBooking[] = bookings.flatMap((b) => {
    if (!b.matchKey.startsWith("summer1:")) return [b];
    if (!tieByTeam) return [];
    const tie = tieByTeam.get(b.matchKey.split(":")[1]);
    if (!tie || tie.count !== 1) return [];
    return [{ ...b, matchKey: "tie:" + b.matchKey, team2: tie.opponent, confidence: "probable" as const }];
  });
  const isTie = (b: LeagueBooking) => b.matchKey.startsWith("tie:") || (tieLabel?.has(b.matchKey) ?? false);
  const upcoming = resolved
    .filter((b) => new Date(b.startsAt.length === 16 ? b.startsAt + ":00" : b.startsAt).getTime() >= now)
    .filter((b) => b.kind === "box" || (showSummer && (tieLabel ? summerReady !== false && isTie(b) : true)))
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
          No {showSummer ? "league" : "box"} matches are booked in yet. A booking shows here once all four players are on it in Playtomic.
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
                    {(b.kind === "box" ? label(b, boxByKey) : tieLabelFor(b, tieLabel, tieByTeam) ?? "Summer knockouts").toUpperCase()}
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
