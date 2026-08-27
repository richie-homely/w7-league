"use client";

// Site-wide navigation for the W7 hub: Leagues (home), Socials, Coaching,
// Box League. Active tab derived from the pathname.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { C, F } from "@/theme/tokens";
import { Logo } from "./ui";

const TABS = [
  { href: "/", label: "Leagues" },
  { href: "/socials", label: "Socials" },
  { href: "/coaching", label: "Coaching" },
  { href: "/box", label: "Box League" },
];

export function SiteNav() {
  const pathname = usePathname() ?? "/";
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div style={{ borderBottom: `1px solid ${C.border}`, padding: "14px 20px", background: C.bg }}>
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          gap: 18,
          flexWrap: "wrap",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
          <Logo style={{ width: 44, height: 44 }} />
          <div>
            <div
              style={{
                fontFamily: F.display,
                fontSize: 19,
                color: C.text,
                letterSpacing: "0.03em",
                lineHeight: 1,
              }}
            >
              W7 PADEL
            </div>
            <div style={{ fontFamily: F.body, fontSize: 10.5, color: C.mute, marginTop: 3 }}>
              Wicklow Town
            </div>
          </div>
        </Link>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 4, background: C.card, borderRadius: 8, padding: 4, flexWrap: "wrap" }}>
          {TABS.map((t) => {
            const active = isActive(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                style={{
                  padding: "8px 15px",
                  background: active ? C.accent : "transparent",
                  color: active ? C.bg : C.text,
                  borderRadius: 6,
                  fontFamily: F.body,
                  fontWeight: 600,
                  fontSize: 13,
                  letterSpacing: "0.02em",
                  textDecoration: "none",
                }}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
