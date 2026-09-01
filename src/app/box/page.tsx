import type { Metadata } from "next";
import { BoxLeaguePage } from "@/components/BoxLeaguePage";
import { BOX_LEAGUE } from "@/lib/competitions";

const description =
  "Sold out in five days — 40 more teams released. Boxes of five by combined Playtomic " +
  "rating: four games over four weeks, then the top two go up a box and the bottom two go " +
  `down. €${BOX_LEAGUE.entryPerTeam} per team, ${BOX_LEAGUE.durationMonths} months. ` +
  "Starts Mon 14 Sep, Wicklow Town.";

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
        url: "/og-box-v2.png",
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
    images: ["/og-box-v2.png"],
  },
};

export default function BoxLeague() {
  return <BoxLeaguePage />;
}
