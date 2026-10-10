"use client";

import { useMemo, useState } from "react";
import { C, F } from "@/theme/tokens";
import { createClient } from "@/lib/supabase/client";
import { useBoxData, type BoxMatch } from "@/lib/box";
import { currentCycle } from "@/lib/boxCalendar";
import { formatScore } from "@/lib/scoring";

// Box-league walkovers from the admin page (Richie, 10 Oct 2026: "did the walkover button get
// sorted?"). Pick a box, pick the fixture, press the team that was ready to play. Calls
// box_walkover_by_admin (supabase/box_walkover_09Oct2026.sql), gated on the signed-in admin
// email. A walkover is 3 points to that team, 0 to the side conceding; Undo puts the fixture
// back to unplayed.

const btn = (bg: string, fg: string, border = bg): React.CSSProperties => ({
  padding: "6px 10px", background: bg, color: fg, border: `1px solid ${border}`, borderRadius: 6,
  fontFamily: F.body, fontSize: 12, fontWeight: 600, cursor: "pointer",
});

export function BoxWalkoverPanel({ supabase }: { supabase: ReturnType<typeof createClient> }) {
  const { teams, matches, refresh } = useBoxData();
  const cycle = currentCycle(new Date())?.cycle.n ?? 1;
  const [box, setBox] = useState<number>(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const name = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t.name])), [teams]);
  const boxes = useMemo(() => Array.from(new Set(teams.filter((t) => t.box < 90).map((t) => t.box))).sort((a, b) => a - b), [teams]);
  const fixtures = matches.filter((m) => m.box === box && m.cycle === cycle);

  async function act(m: BoxMatch, winner: string | null) {
    const what = winner ? `walkover to ${name[winner]}` : "undo the walkover";
    const reason = window.prompt(`Reason for the log (${what}):`, winner ? `${name[winner === m.team1Id ? m.team2Id : m.team1Id]} conceded` : "entered in error");
    if (!reason) return;
    setBusy(m.id); setMsg(null);
    const { data, error } = await supabase.rpc("box_walkover_by_admin", { p_match: m.id, p_winner: winner, p_reason: reason });
    setBusy(null);
    if (error) {
      setMsg(error.message.includes("box_walkover_by_admin") || error.code === "PGRST202"
        ? "Not switched on yet: paste supabase/box_walkover_09Oct2026.sql into the Supabase SQL editor once."
        : `Failed: ${error.message}`);
      return;
    }
    const code = String(data);
    setMsg(code === "ok_walkover" ? `Done: walkover to ${name[winner!]}, 3 points.` : code === "ok_cleared" ? "Undone: fixture back to unplayed." : `Not done: ${code}`);
    refresh();
  }

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, margin: "0 0 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <div style={{ fontFamily: F.display, fontSize: 18, letterSpacing: "0.04em" }}>BOX LEAGUE · WALKOVERS</div>
        <div style={{ fontSize: 12, color: C.mute }}>Cycle {cycle}. Press the team that was ready to play: 3 points to them, 0 to the side conceding.</div>
        <div style={{ flex: 1 }} />
        <select value={box} onChange={(e) => setBox(Number(e.target.value))}
          style={{ background: C.bg2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 8px", fontFamily: F.body }}>
          {boxes.map((b) => <option key={b} value={b}>Box {b}</option>)}
        </select>
      </div>
      {fixtures.length === 0 && <div style={{ color: C.mute, fontSize: 13 }}>No fixtures for this box in cycle {cycle}.</div>}
      {fixtures.map((m) => (
        <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "8px 0", borderTop: `1px solid ${C.border}`, fontSize: 13 }}>
          <div style={{ flex: "1 1 260px" }}>
            {name[m.team1Id]} <span style={{ color: C.mute }}>v</span> {name[m.team2Id]}
          </div>
          <div style={{ fontFamily: F.mono, fontSize: 12, color: C.mute, minWidth: 110 }}>
            {m.status === "walkover" ? `W/O · ${name[m.walkoverTo ?? ""] ?? ""}` : m.sets ? `${formatScore(m.sets)} · ${m.status}` : m.status}
          </div>
          {m.status === "walkover" ? (
            <button disabled={busy === m.id} onClick={() => act(m, null)} style={btn("transparent", C.mute, C.border)}>Undo walkover</button>
          ) : (
            <>
              <button disabled={busy === m.id} onClick={() => act(m, m.team1Id)} style={btn(C.amber, "#0a0a0a")}>W/O to {name[m.team1Id]?.split(" & ")[0]}</button>
              <button disabled={busy === m.id} onClick={() => act(m, m.team2Id)} style={btn(C.amber, "#0a0a0a")}>W/O to {name[m.team2Id]?.split(" & ")[0]}</button>
            </>
          )}
        </div>
      ))}
      {msg && <div style={{ marginTop: 10, fontSize: 13, color: msg.startsWith("Done") || msg.startsWith("Undone") ? C.green : C.amber }}>{msg}</div>}
    </div>
  );
}
