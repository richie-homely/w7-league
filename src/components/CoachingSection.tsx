"use client";

// Coaching hub section: the types of lesson on offer, each with a one-tap
// "book" that opens WhatsApp pre-filled (or email as the fallback link).

import { C, F } from "@/theme/tokens";
import { CONTACT } from "@/lib/league";
import { COACHING, type CoachingOption } from "@/lib/competitions";

function bookLink(option: CoachingOption): string {
  const msg = `Hi W7! I'd like to book a lesson — ${option.title}. When's the next availability?`;
  return `${CONTACT.whatsapp}?text=${encodeURIComponent(msg)}`;
}

function CoachingCard({ option }: { option: CoachingOption }) {
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: "20px 20px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          fontFamily: F.display,
          fontSize: 21,
          letterSpacing: "0.02em",
          textTransform: "uppercase",
          lineHeight: 1.05,
        }}
      >
        {option.title}
      </div>
      <div style={{ fontSize: 12.5, color: C.accent, fontWeight: 600 }}>{option.blurb}</div>
      <div style={{ fontSize: 13, color: C.text, opacity: 0.85, lineHeight: 1.55, flex: 1 }}>
        {option.detail}
      </div>
      <div>
        <a
          href={bookLink(option)}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-block",
            marginTop: 4,
            padding: "8px 14px",
            background: "transparent",
            color: C.text,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            fontSize: 12.5,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Book your lesson →
        </a>
      </div>
    </div>
  );
}

export function CoachingSection() {
  return (
    <div style={{ marginTop: 40 }}>
      <div
        style={{
          fontFamily: F.body,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.15em",
          color: C.mute,
          marginBottom: 14,
        }}
      >
        COACHING · LEVEL UP YOUR GAME
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 14,
        }}
      >
        {COACHING.map((o) => (
          <CoachingCard key={o.id} option={o} />
        ))}
      </div>
      <div style={{ fontSize: 12, color: C.mute, marginTop: 10, lineHeight: 1.5 }}>
        Booking opens WhatsApp ({CONTACT.phoneDisplay}) with your request ready to send — or email{" "}
        <a href={`mailto:${CONTACT.email}?subject=${encodeURIComponent("Lesson enquiry")}`} style={{ color: C.info }}>
          {CONTACT.email}
        </a>
        .
      </div>
    </div>
  );
}
