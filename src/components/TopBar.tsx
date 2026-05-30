"use client";

import Link from "next/link";
import { C, F } from "@/theme/tokens";
import { VERSION, BUILD_DATE } from "@/lib/league";
import { Logo } from "./ui";

export type PublicMode = "team" | "status" | "knockout";

export function TopBar({
  mode,
  setMode,
}: {
  mode: PublicMode;
  setMode: (m: PublicMode) => void;
}) {
  const tabs: { id: PublicMode; label: string }[] = [
    { id: "team", label: "Team View" },
    { id: "status", label: "Status" },
    { id: "knockout", label: "Knockout" },
  ];
  return (
    <div
      style={{
        background: C.bg,
        borderBottom: `1px solid ${C.border}`,
        padding: "14px 20px",
        display: "flex",
        alignItems: "center",
        gap: 24,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Logo style={{ width: 44, height: 44 }} />
        <div>
          <div
            style={{
              fontFamily: F.display,
              fontSize: 20,
              color: C.text,
              letterSpacing: "0.03em",
              lineHeight: 1,
            }}
          >
            SUMMER LEAGUES 2026
          </div>
          <div style={{ fontFamily: F.body, fontSize: 11, color: C.mute, marginTop: 3 }}>
            League Tracker {VERSION} · {BUILD_DATE}
          </div>
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", gap: 4, background: C.card, borderRadius: 8, padding: 4 }}>
        {tabs.map((t) => {
          const active = mode === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setMode(t.id)}
              style={{
                padding: "8px 16px",
                background: active ? C.accent : "transparent",
                color: active ? C.bg : C.text,
                border: "none",
                borderRadius: 6,
                fontFamily: F.body,
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                letterSpacing: "0.02em",
              }}
            >
              {t.label}
            </button>
          );
        })}
        <Link
          href="/rules"
          style={{
            padding: "8px 16px",
            background: "transparent",
            color: C.text,
            borderRadius: 6,
            fontFamily: F.body,
            fontWeight: 600,
            fontSize: 13,
            letterSpacing: "0.02em",
            textDecoration: "none",
          }}
        >
          Rules
        </Link>
        <Link
          href="/live"
          style={{
            padding: "8px 16px",
            background: "transparent",
            color: C.text,
            borderRadius: 6,
            fontFamily: F.body,
            fontWeight: 600,
            fontSize: 13,
            letterSpacing: "0.02em",
            textDecoration: "none",
          }}
        >
          Live Screen
        </Link>
        <Link
          href="/admin"
          style={{
            padding: "8px 16px",
            background: "transparent",
            color: C.mute,
            borderRadius: 6,
            fontFamily: F.body,
            fontWeight: 600,
            fontSize: 13,
            letterSpacing: "0.02em",
            textDecoration: "none",
          }}
        >
          Admin
        </Link>
      </div>
    </div>
  );
}
