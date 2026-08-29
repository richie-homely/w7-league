// /home — draft of the W7 Padel main marketing homepage (w7padel.com), restyled
// in the club's dark/neon brand. Standalone: mirrors the Wix homepage content and
// reuses only theme tokens + the CONTACT constants. Nothing else links here yet —
// it's a preview for the eventual migration of w7padel.com onto Vercel.

import type { CSSProperties } from "react";
import { C, F } from "@/theme/tokens";
import { CONTACT } from "@/lib/league";

export const metadata = {
  title: "W7 Padel · Padel for Wicklow",
  description:
    "W7 Padel, Wicklow Town. Three brand-new padel courts — the first of their kind in the area. Book a court, join the summer league, or get in touch.",
};

const LEAGUE_URL = "https://league.w7padel.com";

export default function HomePage() {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: F.body }}>
      <Header />
      <Hero />
      <About />
      <Classes />
      <Footer />
    </div>
  );
}

// ── Header ───────────────────────────────────────────────────────────────────

function Header() {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
        padding: "16px 24px",
        borderBottom: `1px solid ${C.border}`,
        background: C.bg,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/w7-logo.png"
        alt="W7 Padel"
        style={{ width: 40, height: 40, objectFit: "contain", display: "block" }}
      />
      <div
        style={{
          fontFamily: F.display,
          fontSize: 22,
          letterSpacing: "0.05em",
          color: C.text,
          textTransform: "uppercase",
        }}
      >
        W7&nbsp;Padel
      </div>
      <div style={{ flex: 1 }} />
      <nav style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <NavLink href={CONTACT.playtomic} external accent>
          Book a court
        </NavLink>
        <NavLink href={LEAGUE_URL} external>
          Leagues
        </NavLink>
        {/* Vouchers stay on Wix checkout until Stripe is wired in. */}
        <NavLink href="https://www.w7padel.com/gift-card" external>
          Vouchers
        </NavLink>
        <NavLink href={`mailto:${CONTACT.email}`}>Get in touch</NavLink>
      </nav>
    </header>
  );
}

function NavLink({
  href,
  children,
  external = false,
  accent = false,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
  accent?: boolean;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      style={{
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: accent ? C.bg : C.text,
        background: accent ? C.accent : "transparent",
        border: `1px solid ${accent ? C.accent : C.border}`,
        borderRadius: 6,
        padding: "8px 14px",
        textDecoration: "none",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </a>
  );
}

// ── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section
      style={{
        background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${C.bg2} 0%, ${C.bg} 70%)`,
        borderBottom: `1px solid ${C.border}`,
        padding: "72px 24px 80px",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div
          style={{
            display: "inline-block",
            fontFamily: F.mono,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: C.accent,
            border: `1px solid ${C.accentDim}`,
            borderRadius: 999,
            padding: "6px 16px",
            marginBottom: 24,
          }}
        >
          Now Open!
        </div>
        <h1
          style={{
            fontFamily: F.display,
            fontSize: "clamp(56px, 11vw, 120px)",
            lineHeight: 0.95,
            letterSpacing: "0.02em",
            textTransform: "uppercase",
            color: C.text,
            margin: 0,
          }}
        >
          Padel for{" "}
          <span style={{ color: C.accent }}>Wicklow</span>
        </h1>
        <p style={{ fontSize: 16, color: C.mute, margin: "20px auto 36px", maxWidth: 520, lineHeight: 1.6 }}>
          Wicklow Town&rsquo;s first padel courts. Three brand-new courts, open now
          at W7 Padel.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a href={CONTACT.playtomic} target="_blank" rel="noopener noreferrer" style={ctaPrimary}>
            Book your court here
          </a>
          <a href={LEAGUE_URL} target="_blank" rel="noopener noreferrer" style={ctaSecondary}>
            W7 Summer League — Live Fixtures &amp; Leaderboards
          </a>
          <a
            href={`${LEAGUE_URL}/socials`}
            target="_blank"
            rel="noopener noreferrer"
            style={ctaSecondary}
          >
            Coaching and Socials Calendar
          </a>
        </div>
      </div>
    </section>
  );
}

const ctaBase: CSSProperties = {
  display: "inline-block",
  fontFamily: F.body,
  fontSize: 14,
  fontWeight: 700,
  letterSpacing: "0.04em",
  borderRadius: 8,
  padding: "14px 26px",
  textDecoration: "none",
};

const ctaPrimary: CSSProperties = {
  ...ctaBase,
  background: C.accent,
  color: C.bg,
  border: `1px solid ${C.accent}`,
};

const ctaSecondary: CSSProperties = {
  ...ctaBase,
  background: "transparent",
  color: C.text,
  border: `1px solid ${C.border}`,
};

// ── About ────────────────────────────────────────────────────────────────────

function About() {
  return (
    <section style={{ padding: "72px 24px", borderBottom: `1px solid ${C.border}` }}>
      <div
        style={{
          maxWidth: 1000,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 40,
          alignItems: "center",
        }}
      >
        <div>
          <SectionHeading>Padel has arrived in Wicklow Town!</SectionHeading>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: C.text, margin: "0 0 12px" }}>
            We&rsquo;re excited to announce that three brand-new padel courts are
            now open — the first of their kind in the area.
          </p>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: C.mute, margin: 0 }}>
            Whether you&rsquo;re picking up a racket for the first time or
            chasing league glory, there&rsquo;s a court waiting for you at W7.
          </p>
        </div>
        {/* Image placeholder — swap for a real photo of the courts. */}
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            minHeight: 260,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/w7-logo.png"
            alt=""
            style={{ width: 72, height: 72, objectFit: "contain", opacity: 0.9 }}
          />
          <div
            style={{
              fontFamily: F.mono,
              fontSize: 11,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: C.mute,
            }}
          >
            Court photo coming soon
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Classes ──────────────────────────────────────────────────────────────────

function Classes() {
  const cards: { title: string; body: string }[] = [
    {
      title: "Beginner sessions",
      body: "Never played? Padel is the easiest racket sport to pick up. Intro sessions cover the basics — serves, walls and scoring — in a relaxed group setting.",
    },
    {
      title: "Improver coaching",
      body: "Sharpen your lobs, volleys and court positioning with structured coaching blocks designed to move your Playtomic rating in the right direction.",
    },
    {
      title: "Private lessons",
      body: "One-to-one or two-to-one time with a coach, built around your game. Ideal preparation for league season.",
    },
  ];
  return (
    <section style={{ padding: "72px 24px", borderBottom: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <SectionHeading>Padel Classes</SectionHeading>
        <p style={{ fontSize: 14, color: C.mute, lineHeight: 1.7, margin: "0 0 28px", maxWidth: 640 }}>
          Coaching for every level, from first-timers to league regulars. Get in
          touch to hear about upcoming classes and availability.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          {cards.map(({ title, body }) => (
            <div
              key={title}
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: "24px 22px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div
                style={{
                  fontFamily: F.display,
                  fontSize: 18,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: C.accent,
                }}
              >
                {title}
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.65, color: C.text, margin: 0, flex: 1 }}>{body}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 28 }}>
          <a href={`mailto:${CONTACT.email}?subject=Padel%20classes`} style={ctaSecondary}>
            Enquire about coaching
          </a>
        </div>
      </div>
    </section>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: F.display,
        fontSize: "clamp(26px, 4vw, 36px)",
        lineHeight: 1.1,
        letterSpacing: "0.03em",
        textTransform: "uppercase",
        color: C.text,
        margin: "0 0 16px",
      }}
    >
      {children}
    </h2>
  );
}

// ── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer
      style={{
        padding: "36px 24px 48px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/w7-logo.png"
        alt=""
        style={{ width: 32, height: 32, objectFit: "contain", opacity: 0.8 }}
      />
      <div style={{ fontSize: 13, color: C.mute }}>
        W7 Padel · Wicklow Town, Ireland
      </div>
      <div
        style={{
          fontSize: 13,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <a href={`mailto:${CONTACT.email}`} style={footerLink}>
          {CONTACT.email}
        </a>
        <span style={{ color: C.border }}>·</span>
        <a href={LEAGUE_URL} target="_blank" rel="noopener noreferrer" style={footerLink}>
          league.w7padel.com
        </a>
      </div>
    </footer>
  );
}

const footerLink: CSSProperties = {
  color: C.accentDim,
  textDecoration: "none",
};
