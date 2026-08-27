"use client";

// Register-interest form for upcoming league formats. Writes straight into the
// `interest` table (anonymous insert allowed by RLS; only admins can read it
// back). Falls back to a pre-filled email if the insert fails.

import { useState } from "react";
import { C, F } from "@/theme/tokens";
import { CONTACT } from "@/lib/league";
import { createClient } from "@/lib/supabase/client";

const inputStyle: React.CSSProperties = {
  background: C.bg2,
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  padding: "9px 11px",
  color: C.text,
  fontFamily: F.body,
  fontSize: 13,
  width: "100%",
  boxSizing: "border-box",
};

export function InterestForm({ format }: { format: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const fallbackMailto = `mailto:${CONTACT.email}?subject=${encodeURIComponent(
    `Register interest: ${format}`
  )}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${note}`)}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!name.trim() || !email.includes("@")) {
      setError("Add your name and a valid email.");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.from("interest").insert({
      format,
      name: name.trim(),
      email: email.trim(),
      note: note.trim(),
    });
    setBusy(false);
    if (err) {
      setError(`Couldn't save that just now — you can email us instead.`);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div style={{ fontSize: 13, color: C.green, lineHeight: 1.5, fontWeight: 600 }}>
        ✓ You&apos;re on the list for the {format}. We&apos;ll email you when it&apos;s ready to
        launch.
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      onClick={(e) => e.stopPropagation()}
      style={{ display: "flex", flexDirection: "column", gap: 8 }}
    >
      <input
        style={inputStyle}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
      />
      <input
        style={inputStyle}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email"
      />
      <textarea
        style={{ ...inputStyle, minHeight: 52, resize: "vertical" }}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Anything to add? Partner, availability, your idea… (optional)"
      />
      {error && (
        <div style={{ fontSize: 12, color: C.red }}>
          {error}{" "}
          <a href={fallbackMailto} style={{ color: C.info }}>
            Email {CONTACT.email}
          </a>
        </div>
      )}
      <button
        type="submit"
        disabled={busy}
        style={{
          background: C.accent,
          color: C.bg,
          border: "none",
          borderRadius: 6,
          padding: "10px 14px",
          fontFamily: F.body,
          fontSize: 13,
          fontWeight: 700,
          cursor: busy ? "wait" : "pointer",
          opacity: busy ? 0.7 : 1,
        }}
      >
        {busy ? "Saving…" : "Count me in →"}
      </button>
    </form>
  );
}
