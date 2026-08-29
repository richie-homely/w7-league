"use client";

import { useState } from "react";
import Link from "next/link";
import { C, F } from "@/theme/tokens";
import { CONTACT } from "@/lib/league";
import {
  COMPETITIONS,
  PAST_SEASONS,
  type Competition,
  type CompetitionStatus,
} from "@/lib/competitions";
import { InterestForm } from "./InterestForm";
import { KnockoutSpotlight } from "./KnockoutSpotlight";
import { SponsorCta } from "./Sponsor";
import { SiteNav } from "./SiteNav";
import { SocialsSection } from "./SocialsSection";
import { CoachingSection } from "./CoachingSection";
import { KeanoCredit } from "./KeanoCredit";

const STATUS_STYLE: Record<CompetitionStatus, { label: string; color: string }> = {
  live: { label: "LIVE", color: C.green },
  open: { label: "REGISTRATION OPEN", color: C.accent },
  soon: { label: "COMING SOON", color: C.mute },
};

function StatusBadge({ status }: { status: CompetitionStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px",
        border: `1px solid ${s.color}`,
        borderRadius: 999,
        color: s.color,
        fontFamily: F.body,
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: "0.12em",
      }}
    >
      {status !== "soon" && (
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: s.color,
            boxShadow: status === "live" ? `0 0 6px ${s.color}` : undefined,
          }}
        />
      )}
      {s.label}
    </span>
  );
}

function CompetitionCard({ comp }: { comp: Competition }) {
  const featured = comp.status !== "soon";
  const [formOpen, setFormOpen] = useState(false);
  const body = (
    <div
      style={{
        background: C.card,
        border: `1px solid ${featured ? "rgba(212,255,58,0.35)" : C.border}`,
        borderRadius: 12,
        padding: "22px 22px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        height: "100%",
        boxSizing: "border-box",
        transition: "border-color .15s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div
          style={{
            fontFamily: F.display,
            fontSize: featured ? 26 : 22,
            color: C.text,
            letterSpacing: "0.02em",
            lineHeight: 1.05,
            textTransform: "uppercase",
          }}
        >
          {comp.title}
        </div>
        <StatusBadge status={comp.status} />
      </div>
      <div style={{ fontFamily: F.body, fontSize: 12.5, color: featured ? C.accent : C.mute, fontWeight: 600 }}>
        {comp.tagline}
      </div>
      {comp.entrants && (
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontFamily: F.display, fontSize: 19, color: C.accent, lineHeight: 1 }}>
              {comp.entrants.players}
            </span>
            <span style={{ fontSize: 12.5, color: C.text, fontWeight: 600 }}>
              players registered
            </span>
            <span style={{ fontSize: 12, color: C.mute }}>
              · {comp.entrants.teams} of {comp.entrants.maxTeams} teams
            </span>
          </div>
          <div
            style={{
              height: 4, borderRadius: 999, background: C.bg2,
              marginTop: 6, overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.min(100, (comp.entrants.teams / comp.entrants.maxTeams) * 100)}%`,
                background: C.accent,
              }}
            />
          </div>
        </div>
      )}
      <div style={{ fontFamily: F.body, fontSize: 13.5, color: C.text, lineHeight: 1.55, opacity: 0.9, flex: 1 }}>
        {comp.detail}
      </div>
      {comp.cta && (
        <div style={{ marginTop: 6 }}>
          <span
            style={{
              display: "inline-block",
              padding: featured ? "10px 18px" : "8px 14px",
              background: featured ? C.accent : "transparent",
              color: featured ? C.bg : C.text,
              border: featured ? "none" : `1px solid ${C.border}`,
              borderRadius: 8,
              fontFamily: F.body,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.02em",
            }}
          >
            {comp.cta.label} →
          </span>
        </div>
      )}
      {comp.interestFormat && (
        <div style={{ marginTop: 6 }}>
          {formOpen ? (
            <InterestForm format={comp.interestFormat} />
          ) : (
            <button
              onClick={() => setFormOpen(true)}
              style={{
                padding: "8px 14px",
                background: "transparent",
                color: C.text,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                fontFamily: F.body,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.02em",
                cursor: "pointer",
              }}
            >
              Register interest →
            </button>
          )}
        </div>
      )}
    </div>
  );

  if (!comp.cta) return body;
  return comp.cta.external ? (
    <a href={comp.cta.href} style={{ textDecoration: "none", display: "block", height: "100%" }}>
      {body}
    </a>
  ) : (
    <Link href={comp.cta.href} style={{ textDecoration: "none", display: "block", height: "100%" }}>
      {body}
    </Link>
  );
}

export function HubPage() {
  const featured = COMPETITIONS.filter((c) => c.status !== "soon");
  const upcoming = COMPETITIONS.filter((c) => c.status === "soon");

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: F.body }}>
      <SiteNav />

      {/* Hero — the W7 courts as a full-bleed backdrop, fading into the page.
          The photo lives at /public/courts.jpg; until it exists the gradient
          alone renders and the hero looks like the plain page. */}
      <div
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0.75) 55%, ${C.bg} 100%), url('/courts.jpg')`,
          backgroundSize: "cover",
          backgroundPosition: "center 35%",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 20px 40px" }}>
          <div
            style={{
              fontFamily: F.display,
              fontSize: "clamp(30px, 6vw, 52px)",
              lineHeight: 1,
              letterSpacing: "0.01em",
              textTransform: "uppercase",
              textShadow: "0 2px 18px rgba(0,0,0,0.8)",
            }}
          >
            Find your <span style={{ color: C.accent }}>league</span>.
          </div>
          <p
            style={{
              fontSize: 14.5,
              color: "#c8c8c8",
              lineHeight: 1.6,
              maxWidth: 640,
              marginTop: 10,
              textShadow: "0 1px 10px rgba(0,0,0,0.9)",
            }}
          >
            Competitive padel for every level at W7. The Summer Leagues are live, the
            Autumn/Winter Padel Box League is open for entry, and there&apos;s more on the way —
            tell us which formats you want and we&apos;ll run the ones you ask for.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "8px 20px" }}>
        {/* The knockouts lead the page — they are what the season is for. */}
        <KnockoutSpotlight />

        {/* Featured: live + open */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 16,
            marginBottom: 34,
          }}
        >
          {featured.map((c) => (
            <CompetitionCard key={c.id} comp={c} />
          ))}
        </div>

        <div style={{ marginBottom: 34 }}>
          <SponsorCta />
        </div>

        {/* Upcoming formats */}
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
          UPCOMING FORMATS · REGISTER YOUR INTEREST
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
            gap: 14,
          }}
        >
          {upcoming.map((c) => (
            <CompetitionCard key={c.id} comp={c} />
          ))}
        </div>

        {/* Socials calendar (live from Playtomic via the pipeline) */}
        <SocialsSection />

        {/* Coaching & lessons */}
        <CoachingSection />

        {/* Roll of honour: past seasons & winners */}
        <div
          style={{
            fontFamily: F.body,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.15em",
            color: C.mute,
            margin: "36px 0 14px",
          }}
        >
          ROLL OF HONOUR · PAST SEASONS &amp; WINNERS
        </div>
        {PAST_SEASONS.length === 0 ? (
          <div
            style={{
              background: C.card,
              border: `1px dashed ${C.border}`,
              borderRadius: 12,
              padding: "20px 22px",
              fontSize: 13.5,
              color: C.mute,
              lineHeight: 1.6,
            }}
          >
            <span style={{ color: C.accent, fontWeight: 700 }}>🏆 History starts here.</span>{" "}
            The first W7 champions will be crowned when the Summer Leagues 2026 knockouts
            finish — every season&apos;s winners and final standings will live on this page.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {PAST_SEASONS.map((s) => (
              <div
                key={s.season}
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: "18px 22px",
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ minWidth: 180 }}>
                  <div
                    style={{
                      fontFamily: F.display,
                      fontSize: 22,
                      letterSpacing: "0.02em",
                      textTransform: "uppercase",
                    }}
                  >
                    {s.season}
                  </div>
                  <div style={{ fontSize: 11.5, color: C.mute, marginTop: 3 }}>{s.format}</div>
                </div>
                <div style={{ flex: 1, display: "flex", gap: 20, flexWrap: "wrap" }}>
                  {s.winners.map((w) => (
                    <div key={w.title}>
                      <div style={{ fontSize: 10.5, color: C.mute, fontWeight: 700, letterSpacing: "0.12em" }}>
                        🏆 {w.title.toUpperCase()}
                      </div>
                      <div style={{ fontSize: 14.5, color: C.accent, fontWeight: 700, marginTop: 3 }}>
                        {w.team}
                      </div>
                    </div>
                  ))}
                </div>
                {s.href && (
                  <Link href={s.href} style={{ fontSize: 12.5, color: C.info, fontWeight: 600 }}>
                    Final standings →
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${C.border}`, padding: "24px 20px", marginTop: 40 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ fontSize: 13, color: C.text }}>
            Questions? Email{" "}
            <a href={`mailto:${CONTACT.email}`} style={{ color: C.info, fontWeight: 600 }}>
              {CONTACT.email}
            </a>{" "}
            or WhatsApp{" "}
            <a href={CONTACT.whatsapp} style={{ color: C.info, fontWeight: 600 }}>
              {CONTACT.phoneDisplay}
            </a>
            .
          </div>
          <div style={{ fontSize: 11, color: C.mute, marginTop: 10 }}>
            W7 Padel · Wicklow Town ·{" "}
            <a href={CONTACT.playtomic} style={{ color: C.mute }}>
              Book on Playtomic
            </a>
          </div>
          <KeanoCredit />
        </div>
      </footer>
    </div>
  );
}
