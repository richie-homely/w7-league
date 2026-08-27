// W7 Leagues & Competitions hub — the roster of formats shown on the homepage.
// The Summer League keeps its own config in lib/league.ts; this file only owns
// the hub cards and the Box League key facts (announcement of 27 Aug 2026).

import { CONTACT } from "./league";

export const BOX_LEAGUE = {
  name: "Autumn/Winter Box League",
  start: new Date("2026-09-14"), // Monday
  regClose: new Date("2026-09-08T00:00:00+01:00"), // closes end of Mon 7 Sep
  maxTeams: 60,
  entryPerPerson: 20, // EUR
  entryPerTeam: 40, // EUR
  durationMonths: 6,
  // Registration is handled in Playtomic under Events.
  registerUrl: CONTACT.playtomic,
} as const;

export type CompetitionStatus = "live" | "open" | "soon";

export interface Competition {
  id: string;
  title: string;
  status: CompetitionStatus;
  tagline: string;
  detail: string;
  href?: string; // internal page, when one exists
  cta?: { label: string; href: string; external?: boolean };
}

const interestMailto = (format: string) =>
  `mailto:${CONTACT.email}?subject=${encodeURIComponent(
    `Register interest: ${format}`
  )}&body=${encodeURIComponent(
    `Hi W7,\n\nI'd be interested in the ${format}.\n\nName:\nPlaytomic rating (if known):\nPreferred nights:\n\nThanks!`
  )}`;

// ---------------------------------------------------------------------------
// Roll of honour — past seasons & winners, newest first. Append a season here
// when its final is played and it appears on the hub automatically. Until the
// first entry exists the hub shows a teaser instead.
// ---------------------------------------------------------------------------
export interface PastSeason {
  season: string; // e.g. "Summer 2026"
  format: string; // e.g. "5-division league + tier knockouts"
  winners: { title: string; team: string }[]; // e.g. { title: "Lower Tier Champions", team: "..." }
  href?: string; // link to the archived standings, when kept
}

export const PAST_SEASONS: PastSeason[] = [
  // { season: "Summer 2026", format: "5 divisions · tier knockouts",
  //   winners: [
  //     { title: "Lower Tier Champions", team: "TBD" },
  //     { title: "Upper Tier Champions", team: "TBD" },
  //   ],
  //   href: "/summer-2026" },
];

export const COMPETITIONS: Competition[] = [
  {
    id: "summer-2026",
    title: "Summer Leagues 2026",
    status: "live",
    tagline: "5 divisions · 60 teams · knockouts underway",
    detail:
      "Live standings, fixtures and the tier knockout brackets for the inaugural W7 summer leagues.",
    href: "/summer-2026",
    cta: { label: "Standings & fixtures", href: "/summer-2026" },
  },
  {
    id: "box-autumn-2026",
    title: "Autumn/Winter Box League",
    status: "open",
    tagline: "Starts Mon 14 Sep · up to 60 teams · €40 per team",
    detail:
      "Teams placed into boxes by combined Playtomic rating for competitive matches at your level, over 6 months. Registration closes Mon 7 Sep — first come, first served.",
    href: "/box",
    cta: { label: "Details & how to enter", href: "/box" },
  },
  {
    id: "mixed",
    title: "Mixed League",
    status: "soon",
    tagline: "One of each · all levels",
    detail:
      "Mixed pairs league night. Tell us you're in and we'll build it around the demand.",
    cta: { label: "Register interest", href: interestMailto("Mixed League"), external: true },
  },
  {
    id: "parent-child",
    title: "Parent & Child League",
    status: "soon",
    tagline: "Family doubles",
    detail:
      "Play alongside your kid (or your parent). Weekend slots, friendly format, all ages.",
    cta: {
      label: "Register interest",
      href: interestMailto("Parent & Child League"),
      external: true,
    },
  },
  {
    id: "over-50s",
    title: "Over 50s League",
    status: "soon",
    tagline: "Daytime padel, proper competition",
    detail:
      "A daytime league for the over-50s crowd. Social first, competitive close behind.",
    cta: { label: "Register interest", href: interestMailto("Over 50s League"), external: true },
  },
  {
    id: "suggest",
    title: "Your idea here",
    status: "soon",
    tagline: "Ladies' night? Corporate? Juniors?",
    detail:
      "If there's a format you'd sign up for that isn't listed, tell us — the formats that run are the ones people ask for.",
    cta: {
      label: "Suggest a format",
      href: interestMailto("a new league format (my suggestion inside)"),
      external: true,
    },
  },
];
