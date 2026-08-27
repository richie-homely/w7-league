"use client";

import { C, F } from "@/theme/tokens";
import { SiteNav } from "./SiteNav";
import { SiteFooter } from "./SiteFooter";
import { SocialsSection } from "./SocialsSection";

export function SocialsPage() {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: F.body }}>
      <SiteNav />
      <div
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0.78) 60%, ${C.bg} 100%), url('/courts.jpg')`,
          backgroundSize: "cover",
          backgroundPosition: "center 35%",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 20px 36px" }}>
          <h1
            style={{
              fontFamily: F.display,
              fontSize: "clamp(32px, 6vw, 54px)",
              lineHeight: 1,
              letterSpacing: "0.01em",
              textTransform: "uppercase",
              margin: 0,
              textShadow: "0 2px 18px rgba(0,0,0,0.8)",
            }}
          >
            Socials at <span style={{ color: C.accent }}>W7</span>
          </h1>
          <p
            style={{
              fontSize: 14.5,
              color: "#d8d8d8",
              lineHeight: 1.6,
              maxWidth: 620,
              marginTop: 12,
              textShadow: "0 1px 10px rgba(0,0,0,0.9)",
            }}
          >
            The easiest way to play: turn up solo, get matched with players around your level, and
            play doubles for a couple of hours. Courts, balls and the matchmaking all sorted — just
            book your spot on Playtomic.
          </p>
        </div>
      </div>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px" }}>
        <SocialsSection />
      </div>
      <SiteFooter />
    </div>
  );
}
