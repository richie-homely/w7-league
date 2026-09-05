import type { Metadata } from "next";
import { LeagueApp } from "@/components/LeagueApp";

// Dedicated link for the knockout stages (Richie, 5 Sep 2026) — opens the league
// app straight on the Knockout tab, with its own WhatsApp / link-preview card.
// The card filename carries a version: chat apps cache previews hard, so a
// changed card needs a changed filename, not new bytes.
const OG = "/og-knockouts-v1.png";

export const metadata: Metadata = {
  title: "W7 Padel · Summer Leagues 2026 · Knockouts",
  description:
    "Summer Leagues 2026 knockout brackets — upper and lower tier, live scores as the ties are played. Finals weekend 26 / 27 September at W7 Padel, Wicklow Town.",
  openGraph: {
    title: "W7 Padel · Summer Leagues 2026 Knockouts",
    description: "Live knockout brackets — upper and lower tier. Finals 26 / 27 September.",
    images: [{ url: OG, width: 1200, height: 630, alt: "W7 Padel Summer Leagues 2026 Knockouts" }],
  },
  twitter: { card: "summary_large_image", images: [OG] },
};

export default function SummerLeagueKnockouts() {
  return <LeagueApp initialMode="knockout" />;
}
