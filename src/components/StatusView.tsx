import { C, F } from "@/theme/tokens";
import type { Settings, Team, Tier } from "@/lib/types";
import { CONTACT, upperTierSlotsRemaining } from "@/lib/league";
import { Logo } from "./ui";
import { ConfirmationBanner } from "./Countdown";

export function ContactBar({ compact = false }: { compact?: boolean }) {
  const items = [
    { label: "Email", value: CONTACT.email, href: `mailto:${CONTACT.email}`, accent: false },
    { label: "Call", value: CONTACT.phoneDisplay, href: `tel:${CONTACT.phoneTel}`, accent: false },
    { label: "WhatsApp", value: CONTACT.phoneDisplay, href: CONTACT.whatsapp, accent: true },
    { label: "Book a court", value: "Playtomic", href: CONTACT.playtomic, accent: true },
  ];
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: compact ? 10 : 14,
        alignItems: "center",
        justifyContent: compact ? "center" : "flex-start",
      }}
    >
      {items.map((it) => (
        <a
          key={it.label}
          href={it.href}
          target={it.href.startsWith("http") ? "_blank" : undefined}
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            flexDirection: "column",
            textDecoration: "none",
            padding: compact ? "6px 12px" : "8px 14px",
            background: it.accent ? "rgba(212,255,58,0.08)" : C.bg2,
            border: `1px solid ${it.accent ? C.accentDim : C.border}`,
            borderRadius: 8,
          }}
        >
          <span style={{ fontSize: 9, color: C.mute, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            {it.label}
          </span>
          <span style={{ fontSize: compact ? 12 : 13, color: it.accent ? C.accent : C.text, fontWeight: 600, fontFamily: F.body }}>
            {it.value}
          </span>
        </a>
      ))}
    </div>
  );
}

function TierStatusCard({ tier, status }: { tier: Tier; status: "full" | "available" }) {
  const tierLabel = tier === "lower" ? "LOWER TIER" : "UPPER TIER";
  const tierRange = tier === "lower" ? "0.5 – 2.4" : "2.5 – 5.5";
  const tierColor = tier === "lower" ? C.accent : C.info;
  const isFull = status === "full";
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderTop: `4px solid ${tierColor}`,
        borderRadius: 12,
        padding: 24,
        flex: "1 1 280px",
      }}
    >
      <div style={{ fontFamily: F.display, fontSize: 30, color: tierColor, letterSpacing: "0.04em", lineHeight: 1 }}>
        {tierLabel}
      </div>
      <div style={{ fontSize: 13, color: C.mute, marginTop: 6 }}>Playtomic rating {tierRange}</div>
      <div
        style={{
          marginTop: 18,
          padding: "14px 18px",
          background: isFull ? "rgba(255,82,82,0.08)" : "rgba(74,222,128,0.08)",
          border: `1px solid ${isFull ? "rgba(255,82,82,0.4)" : "rgba(74,222,128,0.4)"}`,
          borderRadius: 8,
        }}
      >
        <div
          style={{
            fontFamily: F.display,
            fontSize: 22,
            color: isFull ? C.red : C.green,
            letterSpacing: "0.03em",
          }}
        >
          {isFull ? "COMPETITION FULL" : "LAST FEW SLOTS AVAILABLE"}
        </div>
        <div style={{ fontSize: 12.5, color: C.text, marginTop: 6, lineHeight: 1.5 }}>
          {isFull
            ? "All slots in this tier are taken. Get in touch to join the waitlist for any drop-outs."
            : "Spaces remain in this tier — secure your slot before the league launches."}
        </div>
      </div>
      {!isFull && (
        <a
          href={CONTACT.playtomic}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            marginTop: 14,
            padding: "10px 20px",
            background: tierColor,
            color: C.bg,
            borderRadius: 8,
            fontFamily: F.body,
            fontWeight: 700,
            fontSize: 13,
            textDecoration: "none",
            letterSpacing: "0.04em",
          }}
        >
          Book in here →
        </a>
      )}
    </div>
  );
}

export function StatusView({
  settings,
  teams,
}: {
  settings: Settings;
  teams: Record<string, Team[]>;
}) {
  return (
    <div style={{ padding: "24px 20px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
        <Logo style={{ width: 48, height: 48 }} />
        <div>
          <div style={{ fontFamily: F.display, fontSize: 30, color: C.accent, letterSpacing: "0.04em", lineHeight: 1 }}>
            COMPETITION STATUS
          </div>
          <div style={{ fontSize: 13, color: C.mute, marginTop: 6 }}>
            W7 Padel Summer Leagues 2026 · Live entry status
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, marginBottom: 20 }}>
        <ConfirmationBanner upperSlotsRemaining={upperTierSlotsRemaining(teams)} />
      </div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <TierStatusCard tier="lower" status={settings.lowerStatus || "available"} />
        <TierStatusCard tier="upper" status={settings.upperStatus || "available"} />
      </div>

      <div
        style={{
          marginTop: 24,
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: 24,
          textAlign: "center",
        }}
      >
        <div style={{ fontFamily: F.display, fontSize: 20, color: C.text, letterSpacing: "0.03em" }}>
          SEE ALL OUR COMPETITIONS & SOCIALS — BOOK IN HERE
        </div>
        <div style={{ marginTop: 8, fontSize: 13 }}>
          <a
            href={CONTACT.playtomic}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: C.accent, textDecoration: "underline", wordBreak: "break-word" }}
          >
            playtomic.com/clubs/w7-padel-hub-wicklow
          </a>
        </div>
        <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
          <ContactBar compact />
        </div>
      </div>
    </div>
  );
}
