// W7 Leagues & Competitions hub — the roster of formats shown on the homepage.
// The Summer League keeps its own config in lib/league.ts; this file only owns
// the hub cards and the Box League key facts (announcement of 27 Aug 2026).

export const BOX_LEAGUE = {
  name: "Autumn/Winter Padel Box League",
  start: new Date("2026-09-14"), // Monday
  regClose: new Date("2026-09-08T00:00:00+01:00"), // closes end of Mon 7 Sep
  // Raised from 60 to 100 teams on 31 Aug 2026, after the original cap sold out
  // in five days. 200 player places.
  maxTeams: 100,
  // Players, not teams — the cap is in teams and a bare player count beside it
  // reads as twice as full as it is. NB the PUBLIC event page shows spots
  // REMAINING, which looks like a registered count and is not.
  registeredPlayers: 192, // 96 teams, Playtomic entrant list 6 Sep 2026 — boxes re-cut on latest ratings
  // Shown in place of the plain "registration open" strap while the released
  // places are the story. Selling out once is the best argument for the second
  // batch, so the page should say so rather than quietly reopening. Set to
  // undefined when it stops being news.
  extraPlacesNote: "SOLD OUT IN 5 DAYS · 40 MORE RELEASED · LAST SLOTS REMAINING",
  entryPerPerson: 20, // EUR
  entryPerTeam: 40, // EUR
  durationMonths: 7,
  cycles: 7, // 4-week cycles, Mon 14 Sep 2026 -> Sun 11 Apr 2027 (Christmas break excluded)
  seasonEnd: new Date("2027-04-11"),
  // Direct link to the Box League event in Playtomic (it lives under Events).
  registerUrl:
    "https://app.playtomic.com/tournaments/e59d3263-c5cb-4f96-8745-46f32711d1be",
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
  /** Live entry count, shown on the card so the hub tells you how full it is
   *  without a click. Players and teams both, because the cap is in TEAMS and a
   *  bare player count next to it reads as far fuller than it is. */
  entrants?: { players: number; teams: number; maxTeams: number };
  /** When set, the card carries an inline register-interest form (stored in
   *  the `interest` table) instead of a link CTA. */
  interestFormat?: string;
  /** Competition's own mark, shown beside the title on the hub card. Only for
   *  formats that have earned one — a row of near-identical badges would stop
   *  the eye distinguishing anything. */
  logo?: string;
}

// ---------------------------------------------------------------------------
// Coaching — the lesson types shown in the hub's coaching section. Copy is
// deliberately config: tweak titles/blurbs/details here as the offer evolves.
// ---------------------------------------------------------------------------
export interface CoachingOption {
  id: string;
  title: string;
  blurb: string;
  detail: string; // e.g. who it's for / group size
}

export const COACHING: CoachingOption[] = [
  {
    id: "one-to-one",
    title: "1-to-1 Lessons",
    blurb: "Private coaching built around your game.",
    detail: "Technique, tactics and match play — all levels, beginner to advanced.",
  },
  {
    id: "small-group",
    title: "Small-Group Lessons",
    blurb: "Split the court (and the cost) with 2–4 players.",
    detail: "Bring your own group or we'll match you with players at your level.",
  },
  {
    id: "beginners",
    title: "Beginner Intro Sessions",
    blurb: "Never played? Start here.",
    detail: "The rules, the glass, the basics — rackets and balls provided.",
  },
  {
    id: "juniors",
    title: "Junior Coaching",
    blurb: "Kids' sessions and camps.",
    detail: "Fun first, fundamentals close behind — ask us what's running this term.",
  },
];

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
    title: "Autumn/Winter Padel Box League",
    status: "open",
    logo: "/box-league-logo.png",
    tagline: `Starts Mon 14 Sep · up to ${BOX_LEAGUE.maxTeams} teams · €${BOX_LEAGUE.entryPerTeam} per team`,
    detail:
      "Sold out in five days and 40 more teams released. Boxes of five by combined Playtomic rating — four games over four weeks, then the top two go up a box and the bottom two go down. Six months of it. Entries close Mon 7 Sep.",
    href: "/box",
    cta: { label: "Details & how to enter", href: "/box" },
    entrants: {
      players: BOX_LEAGUE.registeredPlayers,
      teams: Math.floor(BOX_LEAGUE.registeredPlayers / 2),
      maxTeams: BOX_LEAGUE.maxTeams,
    },
  },
  {
    id: "mixed",
    title: "Mixed League",
    status: "soon",
    tagline: "One of each · all levels",
    detail:
      "Mixed pairs league night. Tell us you're in and we'll build it around the demand.",
    interestFormat: "Mixed League",
  },
  {
    id: "parent-child",
    title: "Parent & Child League",
    status: "soon",
    tagline: "Family doubles",
    detail:
      "Play alongside your kid (or your parent). Weekend slots, friendly format, all ages.",
    interestFormat: "Parent & Child League",
  },
  {
    id: "over-50s",
    title: "Over 50s League",
    status: "soon",
    tagline: "Daytime padel, proper competition",
    detail:
      "A daytime league for the over-50s crowd. Social first, competitive close behind.",
    interestFormat: "Over 50s League",
  },
  {
    id: "weekend-comps",
    title: "Weekend Day Competitions",
    status: "soon",
    tagline: "One-day tournaments · big prizes",
    detail:
      "Show up, play all day, win big. One-day weekend competitions with serious prizes on the line — formats for every level.",
    interestFormat: "Weekend Day Competitions",
  },
  {
    id: "juniors",
    title: "Junior Competitions",
    status: "soon",
    tagline: "For the next generation",
    detail:
      "Competitions for junior players — fun formats, real prizes, and a pathway from the coaching programme into competitive padel.",
    interestFormat: "Junior Competitions",
  },
  {
    id: "suggest",
    title: "Your idea here",
    status: "soon",
    tagline: "Ladies' night? Corporate? Americano?",
    detail:
      "If there's a format you'd sign up for that isn't listed, tell us — the formats that run are the ones people ask for.",
    interestFormat: "New format suggestion",
  },
];
