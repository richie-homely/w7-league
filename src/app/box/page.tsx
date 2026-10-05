import type { Metadata } from "next";
import { BoxLeaguePage } from "@/components/BoxLeaguePage";
import { BOX_LEAGUE } from "@/lib/competitions";
import { fetchBoxStatus } from "@/lib/boxStatus";

/* This page needs its OWN openGraph block. Without one it inherits the sitewide
 * card, so a link pasted into a WhatsApp group showed the generic "Leagues &
 * Competitions" tile — and WhatsApp is where this league actually recruits.
 *
 * The card is drawn on request at /box/og (Richie, 5 Oct 2026: the sub-heading should carry
 * this week's status). Chat apps cache a preview per URL and never re-fetch a known one, so
 * the URL carries a version that changes once a week: a link pasted in week 4 shows week 4. */
export async function generateMetadata(): Promise<Metadata> {
  const s = await fetchBoxStatus();
  const description =
    `${s.sentence} Boxes of five by combined Playtomic rating: four games over four weeks, ` +
    "then the top two go up a box and the bottom two go down. " +
    `€${BOX_LEAGUE.entryPerTeam} per team, ${BOX_LEAGUE.durationMonths} months. Wicklow Town.`;
  const image = `/box/og?v=${s.version}`;
  return {
    title: "W7 Padel · Autumn/Winter Padel Box League",
    description,
    openGraph: {
      title: "Autumn/Winter Padel Box League · W7 Padel",
      description,
      url: "https://league.w7padel.com/box",
      siteName: "W7 Padel Leagues",
      images: [{ url: image, width: 1200, height: 630, alt: `W7 Padel Autumn/Winter Box League — ${s.headline}` }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Autumn/Winter Padel Box League · W7 Padel",
      description,
      images: [image],
    },
  };
}

export default function BoxLeague() {
  return <BoxLeaguePage />;
}
