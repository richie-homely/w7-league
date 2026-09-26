"use client";

import { useState } from "react";
import { C, F } from "@/theme/tokens";

// Find the clips from your game (Richie, 26 Sep 2026: "a web page ready to add to the w7 site with
// find clips from my game ... link into the booking ... users can use their email as a password
// ... they can view their footage only on the court cameras").
//
// The email is the whole login, the same way the box league works. Every Playtomic booking carries
// each participant's email, so an email finds the bookings that player was on, and each booking is
// a court plus a start and end time. A clip belongs to a booking when it was cut on that court
// inside that window. Nobody sees a court they were not booked on, and nobody sees a clip from
// somebody else's hour on the same court.
//
// DEMO for now: `lookup` answers from the fixtures below instead of the database. The real version
// is one RPC, `replay_clips_for_email(p_email)`, security definer, which hashes the email server
// side and returns exactly this shape - so the page does not change when it goes live.

type Clip = { id: string; takenAt: string; url: string; poster?: string };
type Game = {
  bookingId: string;
  court: string;
  startsAt: string;   // ISO, Dublin local as the club sees it
  endsAt: string;
  players: string[];
  clips: Clip[];
};

const DEMO_GAMES: Game[] = [
  {
    bookingId: "demo-1",
    court: "Court 2",
    startsAt: "2026-09-26T17:30:00",
    endsAt: "2026-09-26T19:00:00",
    players: ["You", "Sharon McDevitt", "Elaine Kirwan", "Christina Reilly"],
    clips: [
      { id: "260926-181204-c2-a1", takenAt: "2026-09-26T18:12:04", url: "/replay/demo.mp4", poster: "/replay/demo-poster.jpg" },
      { id: "260926-183340-c2-b7", takenAt: "2026-09-26T18:33:40", url: "/replay/demo.mp4", poster: "/replay/demo-poster.jpg" },
      { id: "260926-185519-c2-c2", takenAt: "2026-09-26T18:55:19", url: "/replay/demo.mp4", poster: "/replay/demo-poster.jpg" },
    ],
  },
  {
    bookingId: "demo-2",
    court: "Court 1",
    startsAt: "2026-09-23T20:00:00",
    endsAt: "2026-09-23T21:30:00",
    players: ["You", "Mark O'Sullivan", "Andy Earls", "Robert Keogh"],
    clips: [
      { id: "260923-204711-c1-d9", takenAt: "2026-09-23T20:47:11", url: "/replay/demo.mp4", poster: "/replay/demo-poster.jpg" },
    ],
  },
  {
    bookingId: "demo-3",
    court: "Court 3",
    startsAt: "2026-09-20T10:00:00",
    endsAt: "2026-09-20T11:00:00",
    players: ["You", "Toby Wuyts", "Mel Maclaine"],
    clips: [],
  },
];

async function lookup(email: string): Promise<Game[]> {
  // the real call: createClient().rpc("replay_clips_for_email", { p_email: email })
  await new Promise((r) => setTimeout(r, 450));
  return /\S+@\S+\.\S+/.test(email) ? DEMO_GAMES : [];
}

const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short" });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit", hour12: false });

export function ReplayFinder() {
  const [email, setEmail] = useState("");
  const [games, setGames] = useState<Game[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function find(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setGames(await lookup(email.trim()));
    setBusy(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <form
        onSubmit={find}
        style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}
      >
        <label htmlFor="replay-email" style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.15em", color: C.mute }}>
          THE EMAIL ON YOUR PLAYTOMIC BOOKING
        </label>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            id="replay-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            style={{ flex: "1 1 240px", fontSize: 16, padding: "12px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.text }}
          />
          <button
            type="submit"
            disabled={busy}
            style={{ fontSize: 15, fontWeight: 700, padding: "12px 22px", borderRadius: 8, border: "none", background: C.accent, color: "#0a0a0a", cursor: "pointer", opacity: busy ? 0.6 : 1 }}
          >
            {busy ? "Looking…" : "Find my clips"}
          </button>
        </div>
        <div style={{ fontSize: 13, color: C.mute, lineHeight: 1.55 }}>
          No password, no account. Your email is on every booking you were part of, so it finds your
          games and nothing else. You only ever see the court you were on, for the time you were on it.
        </div>
      </form>

      {games !== null && games.length === 0 && (
        <div style={{ background: C.card, border: `1px dashed ${C.border}`, borderRadius: 12, padding: "18px 20px", fontSize: 14.5, color: C.mute, lineHeight: 1.6 }}>
          No bookings with that email in the last 14 days. It has to be the email on the Playtomic
          booking itself - if a friend booked, ask them to add you to the booking, or use their email.
        </div>
      )}

      {games && games.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.15em", color: C.mute }}>
            YOUR GAMES · LAST 14 DAYS
          </div>
          {games.map((g) => (
            <section key={g.bookingId} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 14, alignItems: "baseline", flexWrap: "wrap" }}>
                <div style={{ fontFamily: F.display, fontSize: 19, letterSpacing: "0.02em" }}>
                  {g.court.toUpperCase()}
                </div>
                <div style={{ fontFamily: F.mono, fontSize: 13, color: C.text }}>
                  {fmtDay(g.startsAt)} · {fmtTime(g.startsAt)}–{fmtTime(g.endsAt)}
                </div>
                <div style={{ fontSize: 12.5, color: C.mute }}>{g.players.join(" · ")}</div>
                <div style={{ marginLeft: "auto", fontFamily: F.mono, fontSize: 12, color: g.clips.length ? C.accent : C.mute }}>
                  {g.clips.length === 0 ? "no clips" : `${g.clips.length} clip${g.clips.length === 1 ? "" : "s"}`}
                </div>
              </div>
              {g.clips.length === 0 ? (
                <div style={{ padding: "14px 18px", fontSize: 13.5, color: C.mute, lineHeight: 1.55 }}>
                  Nobody pressed the button during this game. Clips only exist when someone on court
                  presses it - the cameras do not record otherwise.
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12, padding: 14 }}>
                  {g.clips.map((c) => (
                    <figure key={c.id} style={{ margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                      <video
                        controls
                        playsInline
                        preload="metadata"
                        poster={c.poster}
                        src={c.url}
                        style={{ width: "100%", aspectRatio: "16 / 9", borderRadius: 8, background: "#000", display: "block" }}
                      />
                      <figcaption style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <span style={{ fontFamily: F.mono, fontSize: 12.5, color: C.text }}>pressed at {fmtTime(c.takenAt)}</span>
                        <span style={{ display: "flex", gap: 10 }}>
                          <a
                            href={`https://wa.me/?text=${encodeURIComponent(`W7 replay, ${g.court} ${fmtDay(g.startsAt)}: ${typeof window === "undefined" ? "" : window.location.origin}${c.url}`)}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: 12.5, color: C.info, textDecoration: "none" }}
                          >
                            Share
                          </a>
                          <a href={c.url} download style={{ fontSize: 12.5, color: C.info, textDecoration: "none" }}>
                            Save
                          </a>
                        </span>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
