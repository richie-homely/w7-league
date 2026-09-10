import Link from "next/link";
import { C, F } from "@/theme/tokens";
import { FINALS } from "@/lib/sponsors";

// Site-wide banner (Richie, 10 Sep 2026): W7's first birthday party, Sunday 27 September,
// the same day as the summer league finals. Mounted in the root layout so every page
// carries it; retire it by removing the mount after the day.
export function PartyBanner() {
  if (!FINALS.event) return null;
  return (
    <Link
      href="/summer-2026/knockouts"
      style={{
        display: "block", textDecoration: "none", background: C.accent, color: C.bg,
        padding: "12px 18px", textAlign: "center", borderBottom: `2px solid ${C.bg}`,
      }}
    >
      <div style={{ fontFamily: F.display, fontSize: "clamp(18px, 3.4vw, 28px)", letterSpacing: "0.04em", textTransform: "uppercase", lineHeight: 1.1 }}>
        🎂 {FINALS.event} · {FINALS.eventDate}
      </div>
      <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, marginTop: 3, opacity: 0.85 }}>
        Summer league finals day at the club, then the party · {FINALS.eventNote} · tap for the brackets
      </div>
    </Link>
  );
}
