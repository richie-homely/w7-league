"use client";

import { useEffect, useState } from "react";
import { C, F } from "@/theme/tokens";
import {
  CONFIRMATION_NOTE_LOWER,
  confirmationNoteUpper,
  currentRound,
  daysUntilDeadline,
  timeUntilStart,
} from "@/lib/league";
import { Logo } from "./ui";

export function Countdown({ size = "md" as "md" | "lg", showSeconds = true }) {
  const [mounted, setMounted] = useState(false);
  const [, setTick] = useState(0);
  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  // Time-derived values diverge between the server render and the first client
  // render (different clocks → hydration mismatch). Render dashes until mounted
  // so the initial client paint matches the server HTML, then fill in real values.
  const t = mounted ? timeUntilStart() : null;
  // Once mounted, a null result means the league has already started — hide.
  if (mounted && !t) return null;
  const big = size === "lg" ? 96 : 48;
  const lbl = size === "lg" ? 13 : 10;
  const gap = size === "lg" ? 28 : 14;
  const units: { v: number | null; l: string }[] = [
    { v: t?.days ?? null, l: "DAYS" },
    { v: t?.hours ?? null, l: "HOURS" },
    { v: t?.mins ?? null, l: "MINS" },
  ];
  if (showSeconds) units.push({ v: t?.secs ?? null, l: "SECS" });
  return (
    <div style={{ display: "flex", gap, alignItems: "flex-end", fontFamily: F.display }}>
      {units.map((u, i) => (
        <div key={i} style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: big,
              lineHeight: 0.9,
              color: C.accent,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.02em",
            }}
          >
            {u.v === null ? "--" : String(u.v).padStart(2, "0")}
          </div>
          <div
            style={{
              fontSize: lbl,
              color: C.mute,
              fontFamily: F.body,
              fontWeight: 600,
              letterSpacing: "0.15em",
              marginTop: 4,
            }}
          >
            {u.l}
          </div>
        </div>
      ))}
    </div>
  );
}

export function CountdownBanner() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const t = timeUntilStart();
  const round = currentRound();
  const daysLeft = daysUntilDeadline();

  if (t) {
    return (
      <div
        style={{
          background: `linear-gradient(135deg, ${C.card} 0%, #1a2010 100%)`,
          border: `1px solid ${C.border}`,
          borderLeft: `4px solid ${C.accent}`,
          borderRadius: 10,
          padding: "18px 24px",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        <Logo style={{ width: 56, height: 56, flexShrink: 0, fontSize: 22 }} />
        <div style={{ flex: "1 1 auto", minWidth: 180 }}>
          <div style={{ fontFamily: F.body, fontSize: 11, color: C.mute, letterSpacing: "0.15em", marginBottom: 4 }}>
            FIRST WHISTLE
          </div>
          <div style={{ fontFamily: F.display, fontSize: 30, color: C.text, lineHeight: 1, letterSpacing: "0.02em" }}>
            SATURDAY · 6 JUNE 2026
          </div>
          <div style={{ fontFamily: F.body, fontSize: 12, color: C.mute, marginTop: 6 }}>
            Round 1 fixtures released the morning of. Bring your A game.
          </div>
        </div>
        <div style={{ flex: "0 0 auto" }}>
          <Countdown size="md" />
        </div>
      </div>
    );
  }
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderLeft: `4px solid ${C.accent}`,
        borderRadius: 10,
        padding: "12px 18px",
        marginBottom: 20,
        display: "flex",
        alignItems: "center",
        gap: 18,
        flexWrap: "wrap",
      }}
    >
      <Logo style={{ width: 36, height: 36, fontSize: 15 }} />
      <div>
        <div style={{ fontFamily: F.display, fontSize: 18, color: C.text, lineHeight: 1 }}>
          ROUND {round} · LEAGUE LIVE
        </div>
        <div style={{ fontSize: 11, color: C.mute, marginTop: 3 }}>
          {daysLeft > 0 ? `${daysLeft} days to deadline (Sat 15 Aug)` : "Deadline reached — knockouts ahead"}
        </div>
      </div>
    </div>
  );
}

export function ConfirmationBanner({
  upperSlotsRemaining,
}: {
  upperSlotsRemaining?: number;
}) {
  return (
    <div
      style={{
        background: "rgba(255,184,77,0.06)",
        border: "1px solid rgba(255,184,77,0.3)",
        borderLeft: `4px solid ${C.amber}`,
        borderRadius: 8,
        padding: "10px 16px",
        marginBottom: 16,
        fontSize: 12.5,
        color: C.text,
        lineHeight: 1.5,
      }}
    >
      <span style={{ color: C.amber, fontWeight: 700, letterSpacing: "0.05em" }}>PLEASE NOTE&nbsp;·&nbsp;</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ color: C.green, flexShrink: 0 }}>●</span>
          <span>{CONFIRMATION_NOTE_LOWER}</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ color: C.info, flexShrink: 0 }}>●</span>
          <span>{confirmationNoteUpper(upperSlotsRemaining)}</span>
        </div>
      </div>
    </div>
  );
}
