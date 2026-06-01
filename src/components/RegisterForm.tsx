"use client";

import { useState } from "react";
import Link from "next/link";
import { C, F } from "@/theme/tokens";

const REGISTER_EMAIL = "welcome@w7padel.com";

const FORMATS = ["Men's", "Women's", "Mixed", "Open"] as const;
const INTERESTS = ["Beginner", "Medium", "Advanced", "Big prize tournaments!"] as const;

export function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [partner, setPartner] = useState("");
  const [format, setFormat] = useState<string>("");
  const [interests, setInterests] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const toggleInterest = (v: string) =>
    setInterests((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]));

  function buildMailto() {
    const subject = `W7 League registration${format ? ` — ${format}` : ""}`;
    const lines = [
      "New W7 League registration enquiry",
      "",
      `Name: ${name}`,
      `Email: ${email}`,
      `Phone: ${phone || "—"}`,
      `Partner: ${partner || "—"}`,
      `Format: ${format}`,
      `Level / interest: ${interests.join(", ")}`,
      "",
      "Message:",
      message || "—",
    ];
    const body = lines.join("\r\n");
    return `mailto:${REGISTER_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !format || interests.length === 0) {
      setError("Please add your name, email, a format, and at least one level/interest.");
      return;
    }
    setError(null);
    setSent(true);
    // Open the registrant's email app with everything pre-filled.
    window.location.href = buildMailto();
  }

  if (sent) {
    return (
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.accent}`,
          borderRadius: 10,
          padding: "24px 22px",
        }}
      >
        <div style={{ fontFamily: F.display, fontSize: 22, color: C.accent, letterSpacing: "0.04em" }}>
          ALMOST THERE
        </div>
        <p style={{ fontSize: 14, color: C.text, lineHeight: 1.6, marginTop: 12 }}>
          Your email app should have opened with your registration ready to send to{" "}
          <strong style={{ color: C.accent }}>{REGISTER_EMAIL}</strong>. Just hit send and the W7 team
          will be in touch.
        </p>
        <p style={{ fontSize: 13, color: C.mute, lineHeight: 1.6, marginTop: 8 }}>
          Nothing happened? Email{" "}
          <a href={buildMailto()} style={{ color: C.info }}>
            {REGISTER_EMAIL}
          </a>{" "}
          directly with your name, format, and level.
        </p>
        <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
          <button onClick={() => setSent(false)} style={ghostBtn}>
            ← Edit details
          </button>
          <Link href="/" style={{ ...ghostBtn, textDecoration: "none" }}>
            Back to league
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Field label="Your name" required>
        <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="First & last name" />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Email" required>
          <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </Field>
        <Field label="Phone">
          <input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
        </Field>
      </div>

      <Field label="Partner" hint="Leagues are doubles — name your partner if you have one">
        <input style={inputStyle} value={partner} onChange={(e) => setPartner(e.target.value)} placeholder="Optional" />
      </Field>

      <Field label="League format" required>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {FORMATS.map((f) => (
            <Chip key={f} active={format === f} onClick={() => setFormat(f)}>
              {f}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Level / interest" hint="Select all that apply" required>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {INTERESTS.map((i) => (
            <Chip key={i} active={interests.includes(i)} onClick={() => toggleInterest(i)}>
              {i}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Anything else?">
        <textarea
          style={{ ...inputStyle, minHeight: 90, resize: "vertical", fontFamily: F.body }}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Availability, preferred division, questions…"
        />
      </Field>

      {error && <div style={{ color: C.red, fontSize: 13 }}>{error}</div>}

      <button type="submit" style={submitBtn}>
        Send registration →
      </button>
      <p style={{ fontSize: 12, color: C.mute, lineHeight: 1.5, margin: 0 }}>
        This opens your email app with the details pre-filled, addressed to {REGISTER_EMAIL}. You stay in
        control — nothing is sent until you press send.
      </p>
    </form>
  );
}

// ── Local sub-components & styles ────────────────────────────────────────────

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
        {label}
        {required && <span style={{ color: C.accent }}> *</span>}
        {hint && <span style={{ fontWeight: 400, color: C.mute }}> · {hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "9px 14px",
        background: active ? C.accent : C.bg2,
        color: active ? C.bg : C.text,
        border: `1px solid ${active ? C.accent : C.border}`,
        borderRadius: 6,
        fontFamily: F.body,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  background: C.bg2,
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  padding: "10px 12px",
  color: C.text,
  fontFamily: F.body,
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
};

const submitBtn: React.CSSProperties = {
  background: C.accent,
  color: C.bg,
  border: "none",
  borderRadius: 8,
  padding: "13px 18px",
  fontFamily: F.body,
  fontSize: 15,
  fontWeight: 700,
  letterSpacing: "0.02em",
  cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  background: "transparent",
  color: C.text,
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  padding: "9px 14px",
  fontFamily: F.body,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};
