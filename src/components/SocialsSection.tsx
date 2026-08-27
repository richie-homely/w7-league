"use client";

// "Socials at W7" hub section: what's actually scheduled (live from the
// Playtomic-fed `socials` table) plus the usual weekly rhythm. Renders
// nothing until the sync has published data, so the hub is safe pre-launch.

import { C, F } from "@/theme/tokens";
import { CONTACT } from "@/lib/league";
import { socialLabel, useSocialsData, WEEKDAYS, type Social } from "@/lib/socials";

function fmtDay(d: Date): string {
  return d.toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short" });
}

function SocialRow({ s }: { s: Social }) {
  const spotsLeft = Math.max(0, s.capacity - s.players);
  const full = s.capacity > 0 && spotsLeft === 0;
  const iso = ((s.startsAt.getDay() + 6) % 7) + 1; // JS Sunday=0 -> ISO 1..7
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
        borderTop: `1px solid ${C.border}`,
        padding: "10px 0",
      }}
    >
      <div style={{ fontFamily: F.mono, fontSize: 13, color: C.mute, minWidth: 92 }}>
        {fmtDay(s.startsAt)}
      </div>
      <div style={{ fontFamily: F.mono, fontSize: 14, color: C.text, fontWeight: 700, minWidth: 48 }}>
        {s.timeLabel}
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 600, flex: "1 1 140px" }}>
        {socialLabel(iso, s.timeLabel)}
        <span style={{ color: C.mute, fontWeight: 400 }}>
          {" "}
          · {s.courts} court{s.courts === 1 ? "" : "s"}
        </span>
      </div>
      {s.capacity > 0 && (
        <div style={{ fontFamily: F.mono, fontSize: 12.5, color: C.mute }}>
          {s.players}/{s.capacity} in
        </div>
      )}
      <span
        style={{
          padding: "2px 10px",
          border: `1px solid ${full ? C.red : C.green}`,
          borderRadius: 999,
          color: full ? C.red : C.green,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.1em",
        }}
      >
        {full ? "FULL" : s.capacity > 0 ? `${spotsLeft} SPOT${spotsLeft === 1 ? "" : "S"} LEFT` : "OPEN"}
      </span>
    </div>
  );
}

export function SocialsSection() {
  const { socials, cadence } = useSocialsData();
  if (socials.length === 0 && cadence.length === 0) return null;

  const byDay = new Map<number, string[]>();
  for (const c of cadence) {
    byDay.set(c.weekday, [...(byDay.get(c.weekday) ?? []), c.timeLabel]);
  }

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
        SOCIALS AT W7 · JUMP INTO A GAME
      </div>
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: "18px 22px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontFamily: F.display, fontSize: 24, letterSpacing: "0.02em", textTransform: "uppercase" }}>
            This week&apos;s <span style={{ color: C.accent }}>socials</span>
          </div>
          <div style={{ flex: 1 }} />
          <a
            href={CONTACT.playtomic}
            target="_blank"
            rel="noreferrer"
            style={{
              background: C.accent,
              color: C.bg,
              borderRadius: 8,
              padding: "9px 16px",
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Book on Playtomic →
          </a>
        </div>
        <p style={{ fontSize: 13, color: C.mute, lineHeight: 1.55, maxWidth: 620, margin: "8px 0 12px" }}>
          Drop-in doubles with players around your level — no partner needed, courts and balls
          sorted. Live sign-up counts straight from Playtomic.
        </p>

        {socials.length > 0 ? (
          socials.map((s) => <SocialRow key={s.id} s={s} />)
        ) : (
          <div style={{ fontSize: 13, color: C.mute, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
            Nothing in the diary right now — new socials land on Playtomic through the week.
          </div>
        )}

        {cadence.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 10.5, color: C.mute, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 8 }}>
              THE USUAL WEEKLY RHYTHM
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[1, 2, 3, 4, 5, 6, 7]
                .filter((d) => byDay.has(d))
                .map((d) => (
                  <span
                    key={d}
                    style={{
                      background: C.bg2,
                      border: `1px solid ${C.border}`,
                      borderRadius: 999,
                      padding: "6px 12px",
                      fontSize: 12,
                      color: C.text,
                    }}
                  >
                    <strong style={{ color: C.accent }}>{WEEKDAYS[d].slice(0, 3)}</strong>{" "}
                    {byDay.get(d)!.join(" · ")}
                  </span>
                ))}
            </div>
            <div style={{ fontSize: 11, color: C.mute, marginTop: 8 }}>
              Based on what has actually run over the last few weeks — the odd slot moves, the
              Playtomic diary is always the truth.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
