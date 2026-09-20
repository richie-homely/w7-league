"use client";

import { useState } from "react";
import { C, F } from "@/theme/tokens";
import { createClient } from "@/lib/supabase/client";

// Standby subs (Richie, 20 Sep 2026): "a link to register your name as a sub that we can post to
// the community". Anyone can put their name down; W7 checks the Playtomic rating before anyone is
// called. Nothing here is shown publicly — a team looking for a sub sees a name, a rating and when
// that person can play, and the league does the introduction by email.

const input: React.CSSProperties = {
  background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text,
  padding: "10px 12px", fontSize: 15, width: "100%", fontFamily: "inherit",
};
const label: React.CSSProperties = { fontSize: 12.5, color: C.mute, display: "block", marginBottom: 5 };

export function SubRosterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [rating, setRating] = useState("");
  const [plays, setPlays] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | "ok" | "already_on">(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 3) return setError("Enter your full name.");
    if (!email.includes("@")) return setError("Enter an email address we can reach you on.");
    const r = rating.trim() === "" ? null : Number(rating.replace(",", "."));
    if (r !== null && (Number.isNaN(r) || r < 0 || r > 7)) return setError("A Playtomic rating looks like 2.4. Leave it blank if you are not sure.");
    setBusy(true);
    const { data, error: err } = await createClient().rpc("sub_roster_join", {
      p_name: name.trim(), p_email: email.trim(), p_phone: phone.trim(),
      p_rating: r, p_plays: plays.trim(), p_note: note.trim(),
    });
    setBusy(false);
    if (err) return setError("That did not save. Try again, or email welcome@w7padel.com.");
    if (data === "bad_input") return setError("Check the name, email and rating and try again.");
    setDone(data === "already_on" ? "already_on" : "ok");
  }

  if (done) {
    return (
      <div style={{ background: C.card, border: `1px solid ${C.accent}`, borderRadius: 12, padding: "22px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontFamily: F.display, fontSize: 22, color: C.accent, textTransform: "uppercase" }}>
          {done === "already_on" ? "Details updated" : "You are on the list"}
        </div>
        <p style={{ fontSize: 14.5, color: C.text, lineHeight: 1.6, margin: 0 }}>
          When a team needs a stand-in at your level, you will get an email asking whether you can play
          and when. Nothing is booked without you saying yes, and your email and phone number are never
          shown to anyone outside W7.
        </p>
        <p style={{ fontSize: 13, color: C.mute, margin: 0 }}>
          To come off the list, email welcome@w7padel.com and we will take you off the same day.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        <div>
          <label style={label} htmlFor="sub-name">Your name</label>
          <input id="sub-name" style={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="As it is on Playtomic" />
        </div>
        <div>
          <label style={label} htmlFor="sub-email">Email</label>
          <input id="sub-email" style={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="we ask you here first" />
        </div>
        <div>
          <label style={label} htmlFor="sub-phone">Phone (optional)</label>
          <input id="sub-phone" style={input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="for a last-minute game" />
        </div>
        <div>
          <label style={label} htmlFor="sub-rating">Playtomic rating (optional)</label>
          <input id="sub-rating" style={input} value={rating} onChange={(e) => setRating(e.target.value)} placeholder="e.g. 2.4" inputMode="decimal" />
        </div>
      </div>
      <div>
        <label style={label} htmlFor="sub-plays">When can you usually play?</label>
        <input id="sub-plays" style={input} value={plays} onChange={(e) => setPlays(e.target.value)} placeholder="e.g. weekday evenings after 6, and Sunday mornings" />
      </div>
      <div>
        <label style={label} htmlFor="sub-note">Anything else (optional)</label>
        <input id="sub-note" style={input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. happy to play men's, ladies' or mixed" />
      </div>
      {error && <div style={{ color: C.red, fontSize: 13 }}>{error}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <button
          type="submit"
          disabled={busy}
          style={{ background: C.accent, color: C.bg, border: "none", borderRadius: 10, padding: "12px 22px", fontWeight: 700, fontSize: 14.5, cursor: busy ? "default" : "pointer" }}
        >
          {busy ? "Adding you…" : "Put me on the list"}
        </button>
        <span style={{ fontSize: 12.5, color: C.mute }}>
          We contact you by email only when a team at your level needs someone.
        </span>
      </div>
    </form>
  );
}
