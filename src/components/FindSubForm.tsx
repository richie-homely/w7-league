"use client";

import { useEffect, useState } from "react";
import { C } from "@/theme/tokens";
import type { BoxMatch, BoxTeam } from "@/lib/box";
import { eligibleSubs, rememberEmail, rememberedEmail, requestBoxSub } from "@/lib/box";

// Ask for a stand-in (Richie, 20 Sep 2026): "if one player's away they can take a sub in from the
// roster ... send an email to the two team members and then the sub and say would you like to
// play, when can you play." The team picks who is sitting out; the list narrows to stand-ins
// within 0.75 of that player, the league's own rule. Contact details never appear here — the
// notifier makes the introduction by email.

const input: React.CSSProperties = {
  background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text,
  padding: "8px 10px", fontSize: 14, fontFamily: "inherit",
};

export function FindSubForm({ match, team, onDone }: {
  match: BoxMatch; team: BoxTeam; onDone: (msg: { ok: boolean; text: string }) => void;
}) {
  const [replaced, setReplaced] = useState(team.p1);
  const [email, setEmail] = useState(() => rememberedEmail());
  const [subs, setSubs] = useState<{ name: string; rating: number | null; plays: string }[] | null>(null);
  const [picked, setPicked] = useState("");
  const [busy, setBusy] = useState(false);

  const replacedRating = replaced === team.p1 ? team.r1 : team.r2;

  useEffect(() => {
    // No reset to null here: clearing the list synchronously in an effect costs a cascading
    // render, and a stale list for a moment while the next one loads is harmless.
    let cancelled = false;
    eligibleSubs(replacedRating).then((rows) => {
      if (!cancelled) {
        setSubs(rows);
        setPicked(rows[0]?.name ?? "");
      }
    });
    return () => { cancelled = true; };
  }, [replacedRating]);

  async function submit() {
    if (!email.includes("@")) return onDone({ ok: false, text: "Enter the email you registered with." });
    if (!picked) return onDone({ ok: false, text: "Pick a stand-in first." });
    setBusy(true);
    const res = await requestBoxSub(match.id, email.trim(), replaced, picked);
    setBusy(false);
    if (res.ok) rememberEmail(email);
    onDone(res);
  }

  return (
    <div style={{ marginTop: 10, padding: 12, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: C.mute, marginBottom: 8 }}>
        FIND A STAND-IN · {team.name}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ fontSize: 12, color: C.mute }}>
          Away{" "}
          <select value={replaced} onChange={(e) => setReplaced(e.target.value)} style={{ ...input, width: "auto" }}>
            <option value={team.p1}>{team.p1} ({team.r1?.toFixed(2) ?? "n/a"})</option>
            <option value={team.p2}>{team.p2} ({team.r2?.toFixed(2) ?? "n/a"})</option>
          </select>
        </label>
        <label style={{ fontSize: 12, color: C.mute }}>
          Stand-in{" "}
          <select value={picked} onChange={(e) => setPicked(e.target.value)} style={{ ...input, width: "auto", maxWidth: 260 }} disabled={!subs?.length}>
            {(subs ?? []).map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}{s.rating !== null ? ` (${s.rating.toFixed(2)})` : " (rating to check)"}
              </option>
            ))}
            {subs && subs.length === 0 && <option value="">nobody at this level yet</option>}
          </select>
        </label>
        <input
          style={{ ...input, flex: "1 1 180px" }}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your registered email"
          aria-label="Your registered email"
        />
        <button
          onClick={submit}
          disabled={busy || !subs?.length}
          style={{ background: C.accent, color: C.bg, border: "none", borderRadius: 8, padding: "9px 16px", fontWeight: 700, fontSize: 13.5, cursor: busy ? "default" : "pointer" }}
        >
          {busy ? "Asking…" : "Ask them"}
        </button>
      </div>
      {picked && subs?.find((s) => s.name === picked)?.plays && (
        <div style={{ fontSize: 12, color: C.mute, marginTop: 8 }}>
          {picked} usually plays: {subs.find((s) => s.name === picked)?.plays}
        </div>
      )}
      <div style={{ fontSize: 11.5, color: C.mute, marginTop: 8, lineHeight: 1.5 }}>
        {subs === null
          ? "Looking for stand-ins at that level…"
          : subs.length === 0
            ? "Nobody on the stand-in list is within 0.75 of that player yet. Ask around and send them to /box/subs."
            : "We email you, your partner and the stand-in on one thread asking when you can all play. Nothing is booked until they say yes."}
      </div>
    </div>
  );
}
