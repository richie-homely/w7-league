/* Sponsorship slots.
 *
 * These render on the public site, so a placeholder must never be mistakable for
 * a real deal — a prospective sponsor should see exactly how their name would
 * appear, while a player sees plainly that the slot is unsold. Every slot
 * therefore carries `placeholder`, and the UI stamps an AVAILABLE tag on it.
 *
 * To sell a slot: set placeholder to false, put the real name in, and add a logo
 * to /public. Nothing else changes.
 */

export interface SponsorSlot {
  /** Display name. While placeholder is true this is an illustration only. */
  name: string;
  /** Optional logo in /public, e.g. "/sponsors/acme.svg". */
  logo?: string;
  /** True until a deal is signed — drives the AVAILABLE tag and the CTA. */
  placeholder: boolean;
  /** Shown under the name, e.g. a court or competition being sponsored. */
  context?: string;
}

export const SPONSOR_CONTACT = {
  email: "welcome@w7padel.com",
  label: "Get in touch about sponsorship",
};

/** Title sponsor of the Autumn/Winter Padel Box League. */
export const BOX_LEAGUE_SPONSOR: SponsorSlot = {
  name: "Wicklow",
  placeholder: true,
  context: "Box League title sponsor",
};

/** Naming rights on the court the finals are played on. */
export const FINALS_COURT_SPONSOR: SponsorSlot = {
  name: "Wicklow Motors Court 1",
  placeholder: true,
  context: "Court 1 naming rights",
};

/** Finals day. Both tiers play their finals on the Sunday alongside the birthday party, rather
 *  than spread across the weekend as first planned (Richie, 23 Sep 2026). */
export const FINALS = {
  dates: "Sunday 27 September 2026",
  court: "Court 1",
  provisional: false,
  /** The birthday party that shared finals day has been and gone. An empty event hides the
   *  site-wide banner, the spotlight line and the finals-day note (Richie, 28 Sep 2026: "remove
   *  the birthday party messaging from the website"). Fill it in again for the next one. */
  event: "",
  eventDate: "",
  eventNote: "",
  /** the banner and notes hide themselves after this date */
  eventUntil: "2026-09-27",
};
