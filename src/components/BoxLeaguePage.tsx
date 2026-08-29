"use client";

import { useEffect, useState } from "react";
import { BoxGrid } from "./BoxGrid";
import { SponsorBanner, SponsorCta } from "./Sponsor";
import { BOX_LEAGUE_SPONSOR } from "@/lib/sponsors";
import { C, F } from "@/theme/tokens";
import { CONTACT } from "@/lib/league";
import { BOX_LEAGUE } from "@/lib/competitions";
import { useBoxData } from "@/lib/box";
import { BoxLeagueLive } from "./BoxLeagueLive";
import { SiteNav } from "./SiteNav";
import { KeanoCredit } from "./KeanoCredit";

// Clock kept in state and only ever set from timer callbacks: the server render
// and first client paint both show dashes (null), so there is no hydration
// mismatch, and render stays pure (no Date.now() during render).
function useNow(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const first = setTimeout(update, 0);
    const id = setInterval(update, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  return now;
}

// Generic countdown to a fixed date. Dashes until the clock ticks in.
function CountdownTo({ target }: { target: Date }) {
  const now = useNow();
  const ms = now === null ? null : target.getTime() - now;
  if (ms !== null && ms <= 0) return null;
  const units =
    ms === null
      ? [null, null, null, null]
      : [
          Math.floor(ms / 86400000),
          Math.floor((ms % 86400000) / 3600000),
          Math.floor((ms % 3600000) / 60000),
          Math.floor((ms % 60000) / 1000),
        ];
  const labels = ["DAYS", "HOURS", "MINS", "SECS"];
  return (
    <div style={{ display: "flex", gap: 18, alignItems: "flex-end", fontFamily: F.display }}>
      {units.map((v, i) => (
        <div key={i} style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 44,
              lineHeight: 0.9,
              color: C.accent,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.02em",
            }}
          >
            {v === null ? "--" : String(v).padStart(2, "0")}
          </div>
          <div
            style={{
              fontSize: 10,
              color: C.mute,
              fontFamily: F.body,
              fontWeight: 600,
              letterSpacing: "0.15em",
              marginTop: 4,
            }}
          >
            {labels[i]}
          </div>
        </div>
      ))}
    </div>
  );
}

function Fact({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: "16px 18px",
      }}
    >
      <div style={{ fontSize: 10.5, color: C.mute, fontWeight: 700, letterSpacing: "0.14em" }}>
        {label}
      </div>
      <div style={{ fontFamily: F.display, fontSize: 24, color: C.text, marginTop: 6, letterSpacing: "0.02em" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11.5, color: C.mute, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export function BoxLeaguePage() {
  // Treat registration as open until the client clock proves otherwise — the
  // pre-close state is the correct default for SSR while entries are live.
  const now = useNow();
  const regOpen = now === null || now < BOX_LEAGUE.regClose.getTime();
  // Boxes render automatically once teams are seeded after entries close.
  const { teams, matches } = useBoxData();

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: F.body }}>
      <SiteNav />

      {/* Hero over the courts photo (/public/courts.jpg) — gradient-only until
          the photo lands, so nothing breaks without it. */}
      <div
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0.78) 60%, ${C.bg} 100%), url('/courts.jpg')`,
          backgroundSize: "cover",
          backgroundPosition: "center 35%",
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 20px 36px" }}>
          <div style={{ fontSize: 11.5, color: C.accent, fontWeight: 700, letterSpacing: "0.18em" }}>
            {regOpen ? "REGISTRATION OPEN · FIRST COME, FIRST SERVED" : "REGISTRATION CLOSED"}
          </div>
          {BOX_LEAGUE.registeredPlayers > 0 && (
            <div
              style={{
                marginTop: 10,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(212,255,58,0.12)",
                border: `1px solid ${C.accent}55`,
                borderRadius: 999,
                padding: "5px 14px",
              }}
            >
              <span style={{ fontFamily: F.display, fontSize: 20, color: C.accent, lineHeight: 1 }}>
                {BOX_LEAGUE.registeredPlayers}
              </span>
              <span style={{ fontSize: 12.5, color: C.text, fontWeight: 600 }}>
                players registered
              </span>
              <span style={{ fontSize: 12.5, color: C.mute }}>
                · {Math.floor(BOX_LEAGUE.registeredPlayers / 2)} of {BOX_LEAGUE.maxTeams} teams
              </span>
            </div>
          )}
          <h1
            style={{
              fontFamily: F.display,
              fontSize: "clamp(34px, 7vw, 60px)",
              lineHeight: 1,
              letterSpacing: "0.01em",
              textTransform: "uppercase",
              margin: "10px 0 0",
              textShadow: "0 2px 18px rgba(0,0,0,0.8)",
            }}
          >
            Autumn/Winter Padel <span style={{ color: C.accent }}>Box League</span>
          </h1>
          <p
            style={{
              fontSize: 15,
              color: C.text,
              lineHeight: 1.65,
              maxWidth: 640,
              marginTop: 16,
              opacity: 0.95,
              textShadow: "0 1px 10px rgba(0,0,0,0.9)",
            }}
          >
            Our Autumn/Winter Padel Box League starts <strong>Monday 14 September</strong> 🎾 Teams
            are placed into boxes based on their <strong>combined Playtomic ratings</strong>, so
            every match is competitive and against players of a similar standard. It&apos;s a great
            way to play more competitive matches, meet new players and build your Playtomic rating
            over the next {BOX_LEAGUE.durationMonths} months.
          </p>
        </div>
        <div style={{ marginTop: 30 }}>
          <SponsorBanner slot={BOX_LEAGUE_SPONSOR} />
          <div
            style={{
              fontFamily: F.display, fontSize: 24, textTransform: "uppercase",
              letterSpacing: "0.02em", margin: "22px 0 4px",
            }}
          >
            Provisional <span style={{ color: C.accent }}>boxes</span>
          </div>
          <BoxGrid />
          <div style={{ marginTop: 24 }}>
            <SponsorCta
              headline="Sponsor a box"
              body="Six boxes, 37 teams and six months of league nights. Box naming rights, match-ball
                    and prize sponsorship available for the Autumn/Winter season."
              subject="Box League sponsorship enquiry"
            />
          </div>
        </div>

      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px 8px" }}>
        {/* Key facts */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            marginTop: 28,
          }}
        >
          <Fact label="STARTS" value="MON 14 SEP" sub={`Runs ~${BOX_LEAGUE.durationMonths} months`} />
          <Fact label="SPACES" value={`${BOX_LEAGUE.maxTeams} TEAMS`} sub="Fixed pairs · boxes by combined rating" />
          <Fact
            label="ENTRY"
            value={`€${BOX_LEAGUE.entryPerTeam} / TEAM`}
            sub={`€${BOX_LEAGUE.entryPerPerson} per person`}
          />
          <Fact label="ENTRIES CLOSE" value="MON 7 SEP" sub="First come, first served" />
        </div>

        {/* Countdown + CTA */}
        {regOpen && (
          <div
            style={{
              background: `linear-gradient(135deg, ${C.card} 0%, #1a2010 100%)`,
              border: `1px solid ${C.border}`,
              borderLeft: `4px solid ${C.accent}`,
              borderRadius: 12,
              padding: "22px 24px",
              marginTop: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 24,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: C.mute, fontWeight: 700, letterSpacing: "0.15em" }}>
                REGISTRATION CLOSES
              </div>
              <div style={{ marginTop: 12 }}>
                <CountdownTo target={BOX_LEAGUE.regClose} />
              </div>
            </div>
            <a
              href={BOX_LEAGUE.registerUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                background: C.accent,
                color: C.bg,
                borderRadius: 10,
                padding: "16px 26px",
                fontFamily: F.body,
                fontSize: 16,
                fontWeight: 800,
                letterSpacing: "0.02em",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              Enter on Playtomic →
            </a>
          </div>
        )}

        {/* How to enter */}
        <div style={{ marginTop: 30, maxWidth: 640 }}>
          <div style={{ fontFamily: F.display, fontSize: 20, letterSpacing: "0.03em", textTransform: "uppercase" }}>
            How to enter
          </div>
          <ol style={{ fontSize: 14, color: C.text, lineHeight: 1.8, paddingLeft: 20, marginTop: 10, opacity: 0.9 }}>
            <li>Get your partner sorted — entries are per team of two.</li>
            <li>
              Tap{" "}
              <a href={BOX_LEAGUE.registerUrl} style={{ color: C.info, fontWeight: 600 }}>
                Enter on Playtomic
              </a>{" "}
              — it opens the Box League directly. If you&apos;re browsing the Playtomic app
              instead, you&apos;ll find it under the <strong>Events</strong> section.
            </li>
            <li>Book your place — €{BOX_LEAGUE.entryPerPerson} per person.</li>
          </ol>
          <p style={{ fontSize: 12.5, color: C.mute, lineHeight: 1.6, marginTop: 8 }}>
            All league rules, format and full terms &amp; conditions can be viewed in Playtomic when
            signing up.{" "}
            {teams.length === 0 && "Boxes, fixtures and standings will appear on this page once entries close."}
          </p>
        </div>

        {teams.length > 0 && <BoxLeagueLive teams={teams} matches={matches} />}
      </div>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${C.border}`, padding: "24px 20px", marginTop: 40 }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
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
          <div style={{ fontSize: 11, color: C.mute, marginTop: 10 }}>W7 Padel · Wicklow Town</div>
          <KeanoCredit />
        </div>
      </footer>
    </div>
  );
}
