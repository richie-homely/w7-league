import type { Metadata } from "next";
import { BoxLeaguePage } from "@/components/BoxLeaguePage";
import { BOX_LEAGUE } from "@/lib/competitions";

const description =
  `Sold out in five days — 40 more teams released. Up to ${BOX_LEAGUE.maxTeams} teams ` +
  `in boxes by combined Playtomic rating, €${BOX_LEAGUE.entryPerTeam} per team. ` +
  `Starts Mon 14 Sep, runs ${BOX_LEAGUE.durationMonths} months. Wicklow Town.`;

/* This page needs its OWN openGraph block. Without one it inherits the sitewide
 * card, so a link pasted into a WhatsApp group showed the generic "Leagues &
 * Competitions" tile — and WhatsApp is where this league actually recruits.
 *
 * og-box.png is a NEW filename rather than a rewrite of the existing card:
 * every chat app caches these hard, and changing the bytes behind a known URL
 * leaves the stale card in circulation for days. */
export const metadata: Metadata = {
  title: "W7 Padel · Autumn/Winter Padel Box League",
  description,
  openGraph: {
    title: "Autumn/Winter Padel Box League · W7 Padel",
    description,
    url: "https://league.w7padel.com/box",
    siteName: "W7 Padel Leagues",
    images: [
      {
        url: "/og-box.png",
        width: 1200,
        height: 630,
        alt: "W7 Padel Autumn/Winter Box League",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Autumn/Winter Padel Box League · W7 Padel",
    description,
    images: ["/og-box.png"],
  },
};

export default function BoxLeague() {
  return <BoxLeaguePage />;
}
