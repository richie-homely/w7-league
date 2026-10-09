"use client";

import { useState } from "react";
import { C, F } from "@/theme/tokens";
import { LADDER, hoursOf, monthLabel, progress } from "@/lib/rewards";

// Opt in to the Court Points board, and look up your own points, with the email you book with on
// Playtomic (Richie, 9 Oct 2026: "players could opt in and we would track their usage via
// playtomic"). Both calls are anon RPCs defined in supabase/court_points_09Oct2026.sql: joining
// flips the player's rows visible; the lookup only answers for an email that has joined.

type MyRow = { month: string; display: string; points: number; sessions: number };

async function rpc<T>(fn: string, body: Record<string, unknown>): Promise<T | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const r = await fetch(`${url}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

const input: React.CSSProperties = {
  background: C.bg2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: "9px 10px",
  fontSize: 14, fontFamily: F.body, width: "100%", boxSizing: "border-box",
};
const button: React.CSSProperties = {
  background: C.accent, color: "#0a0a0a", border: "none", borderRadius: 6, padding: "10px 16px",
  fontFamily: F.display, fontSize: 16, letterSpacing: "0.04em", cursor: "pointer",
};

export function CourtPointsJoin() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [mine, setMine] = useState<MyRow[] | null>(null);

  async function join(leave = false) {
    setBusy(true); setMsg(null); setMine(null);
    const r = await rpc<{ status: string; known?: boolean }>("court_points_join", { p_email: email, p_name: name, p_leave: leave });
    setBusy(false);
    if (!r) return setMsg("That didn't go through. Try again in a minute, or email welcome@w7padel.com.");
    if (r.status === "bad_email") return setMsg("That doesn't look like an email address.");
    if (r.status === "left") return setMsg("You're off the board. Your points are still counted if you come back.");
    setMsg(r.known
      ? "You're in. Your points show on the board from the next update (every morning)."
      : "You're in. That email hasn't been on a booking yet, so there are no points to show until it is. Make sure it's the email you use on Playtomic, and that you're named on the booking.");
  }

  async function lookup() {
    setBusy(true); setMsg(null); setMine(null);
    const r = await rpc<{ status: string; rows?: MyRow[] }>("court_points_mine", { p_email: email });
    setBusy(false);
    if (!r) return setMsg("That didn't go through. Try again in a minute.");
    if (r.status !== "ok") return setMsg("That email hasn't joined the board yet. Join first and your points appear.");
    setMine(r.rows ?? []);
  }

  const all = mine?.find((r) => r.month === "all");

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 18px" }}>
      <div style={{ fontFamily: F.display, fontSize: 20, letterSpacing: "0.03em", marginBottom: 4 }}>JOIN THE BOARD</div>
      <p style={{ color: C.mute, fontSize: 13, margin: "0 0 12px", lineHeight: 1.5 }}>
        Your minutes are counted whether or not you join. Joining puts your first name and initial on the board and lets you
        check your total. Use the email you book with on Playtomic; that is how we match you.
      </p>
      <form
        onSubmit={(e) => { e.preventDefault(); if (agree) void join(); }}
        style={{ display: "grid", gap: 8 }}
      >
        <input style={input} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        <input style={input} type="email" placeholder="Email on your Playtomic account" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: C.mute, lineHeight: 1.4 }}>
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 3 }} />
          <span>Show me on the Court Points board as first name and initial. I can leave at any time from this form.</span>
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
          <button type="submit" style={{ ...button, opacity: agree && !busy ? 1 : 0.5 }} disabled={!agree || busy}>JOIN</button>
          <button type="button" onClick={() => void lookup()} disabled={busy || !email} style={{ ...button, background: "transparent", color: C.text, border: `1px solid ${C.border}` }}>
            MY POINTS
          </button>
          <button type="button" onClick={() => void join(true)} disabled={busy || !email} style={{ ...button, background: "transparent", color: C.mute, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: F.body }}>
            Leave the board
          </button>
        </div>
      </form>
      {msg && <p style={{ fontSize: 13, color: C.info, margin: "10px 0 0", lineHeight: 1.5 }}>{msg}</p>}
      {mine && (
        <div style={{ marginTop: 12, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
          {all ? (
            <>
              <div style={{ fontFamily: F.mono, fontSize: 26, color: C.accent }}>{all.points.toLocaleString("en-IE")} <span style={{ fontSize: 13, color: C.mute }}>points · {hoursOf(all.points).toFixed(1)} h · {all.sessions} sessions</span></div>
              {progress(all.points).map((r) => (
                <div key={r.key} style={{ marginTop: 8, fontSize: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", color: C.mute }}>
                    <span>{r.prize}: {r.unlocked} unlocked</span>
                    <span>{r.toNext.toLocaleString("en-IE")} to the next</span>
                  </div>
                  <div style={{ height: 4, background: C.border, borderRadius: 2, marginTop: 4 }}>
                    <div style={{ height: 4, width: `${r.pct}%`, background: C.accentDim, borderRadius: 2 }} />
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 10, fontSize: 12, color: C.mute }}>
                {mine.filter((r) => r.month !== "all").sort((a, b) => (a.month < b.month ? 1 : -1)).map((r) => (
                  <span key={r.month} style={{ marginRight: 12 }}>{monthLabel(r.month)}: {r.points.toLocaleString("en-IE")}</span>
                ))}
              </div>
            </>
          ) : (
            <p style={{ fontSize: 13, color: C.mute, margin: 0 }}>No points yet for that email. Points land the morning after a booking you are named on.</p>
          )}
          <div style={{ fontSize: 11, color: C.mute, marginTop: 8 }}>The ladder: {LADDER.map((r) => `${r.prize.toLowerCase()} every ${r.every.toLocaleString("en-IE")}`).join(", ")}.</div>
        </div>
      )}
    </div>
  );
}
