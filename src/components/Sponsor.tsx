"use client";

import { C, F } from "@/theme/tokens";
import { SPONSOR_CONTACT, type SponsorSlot } from "@/lib/sponsors";

/* Sponsor furniture, in three sizes so slots can be placed tactically without
 * the page turning into an advertising hoarding.
 *
 * A placeholder slot is always tagged AVAILABLE and reads as an invitation, not
 * a claim. That matters on a live page: a prospective sponsor needs to see the
 * placement, but no visitor should come away thinking a deal exists that does
 * not, and no business should find its name apparently endorsing us without
 * having agreed to anything. */

function mailto(subject: string) {
  return `mailto:${SPONSOR_CONTACT.email}?subject=${encodeURIComponent(subject)}`;
}

function AvailableTag() {
  return (
    <span
      style={{
        fontFamily: F.mono, fontSize: 8.5, fontWeight: 700, letterSpacing: "0.12em",
        color: C.amber, background: "rgba(255,184,77,0.13)",
        border: `1px solid ${C.amber}55`, borderRadius: 3, padding: "1px 5px",
        whiteSpace: "nowrap",
      }}
    >
      SLOT AVAILABLE
    </span>
  );
}

/** Full-width band — for the top of a competition page. */
export function SponsorBanner({ slot }: { slot: SponsorSlot }) {
  return (
    <a
      href={mailto(`Sponsorship enquiry — ${slot.context ?? slot.name}`)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 14, flexWrap: "wrap", textDecoration: "none",
        background: C.card, border: `1px dashed ${slot.placeholder ? C.border : C.accent}`,
        borderRadius: 10, padding: "12px 16px",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10.5, color: C.mute, letterSpacing: "0.16em", fontWeight: 700 }}>
          IN ASSOCIATION WITH
        </span>
        {slot.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={slot.logo} alt={slot.name} style={{ height: 26 }} />
        ) : (
          <span style={{ fontFamily: F.display, fontSize: 21, color: C.text, letterSpacing: "0.02em" }}>
            {slot.name}
          </span>
        )}
        {slot.placeholder && <AvailableTag />}
      </span>
      <span style={{ fontSize: 12.5, color: C.accent, fontWeight: 600 }}>
        {slot.placeholder ? "Put your brand here →" : SPONSOR_CONTACT.label + " →"}
      </span>
    </a>
  );
}

/** Inline credit — for a court name, a match card, a table caption. */
export function SponsorInline({ slot, prefix }: { slot: SponsorSlot; prefix?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <span style={{ fontSize: 12.5, color: C.text, fontWeight: 600 }}>
        {prefix ? `${prefix} · ` : ""}
        {slot.name}
      </span>
      {slot.placeholder && <AvailableTag />}
    </span>
  );
}

/** Quiet prompt — for the foot of a page or between sections. */
export function SponsorCta({
  headline = "Sponsorship opportunities",
  body = "Court naming rights, competition title sponsorship, and match-night packages across our leagues.",
  subject = "Sponsorship enquiry",
}: {
  headline?: string;
  body?: string;
  subject?: string;
}) {
  return (
    <a
      href={mailto(subject)}
      style={{
        display: "block", textDecoration: "none",
        background: C.card, border: `1px solid ${C.border}`,
        borderLeft: `3px solid ${C.accent}`, borderRadius: 10, padding: "14px 16px",
      }}
    >
      <div style={{ fontFamily: F.display, fontSize: 18, color: C.text, letterSpacing: "0.02em" }}>
        {headline}
      </div>
      <div style={{ fontSize: 13, color: C.mute, marginTop: 4, lineHeight: 1.55, maxWidth: 560 }}>
        {body}
      </div>
      <div style={{ fontSize: 12.5, color: C.accent, fontWeight: 700, marginTop: 8 }}>
        {SPONSOR_CONTACT.label} →
      </div>
    </a>
  );
}
