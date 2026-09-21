import Link from "next/link";
import { C, F } from "@/theme/tokens";
import { KeanoCredit } from "@/components/KeanoCredit";
import { SubRosterForm } from "@/components/SubRosterForm";
import { SubRosterPublic } from "@/components/SubRosterPublic";

const SHARE = {
  title: "Play as a stand-in · W7 Box League",
  description: "Teams lose a player every week. Put your name down and we'll call you when a team at your level is short.",
  // WhatsApp caches a preview by URL, so a changed card gets a new filename (make_sub_card.py).
  image: "/og-subs-v1.png",
};

export const metadata = {
  title: "Stand-in list · W7 Autumn/Winter Padel Box League",
  description: SHARE.description,
  openGraph: {
    title: SHARE.title,
    description: SHARE.description,
    url: "/box/subs",
    images: [{ url: SHARE.image, width: 1200, height: 630, alt: "Play as a stand-in — W7 Box League" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SHARE.title,
    description: SHARE.description,
    images: [SHARE.image],
  },
};

// Richie, 20 Sep 2026: "players who aren't in the box league but they want to put their name down
// to be an active sub ... and a link to register your name as a sub that we can post to the
// community." This is that link. The matching rule is the league's own: a stand-in within 0.75 of
// the player sitting out.

const HOW = [
  ["You put your name down", "Name, email and, if you know it, your Playtomic rating. We check the rating against the club's own Playtomic list before anyone calls on you."],
  ["A team goes a player short", "Someone is away, injured or working late. They ask for a stand-in from the fixture on the league site."],
  ["We email the three of you", "You, the player sitting out and their partner, on one thread: can you play, and when. Nothing is booked until you say yes."],
  ["The game counts as normal", "The result is entered on the site like any other fixture, with your name recorded as the stand-in."],
];

export default function BoxSubsPage() {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: F.body }}>
      <div
        style={{
          background: C.bg,
          borderBottom: `1px solid ${C.border}`,
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div style={{ fontFamily: F.display, fontSize: 20, letterSpacing: "0.03em" }}>
          AUTUMN/WINTER PADEL BOX LEAGUE
        </div>
        <div style={{ flex: 1 }} />
        <Link
          href="/box"
          style={{ fontSize: 12, color: C.mute, textDecoration: "none", padding: "6px 12px", border: `1px solid ${C.border}`, borderRadius: 6 }}
        >
          ← Back to the boxes
        </Link>
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "28px 20px 40px", display: "flex", flexDirection: "column", gap: 28 }}>
        <div>
          <h1 style={{ fontFamily: F.display, fontSize: 36, margin: 0, letterSpacing: "0.02em" }}>
            Play as a <span style={{ color: C.accent }}>stand-in</span>
          </h1>
          <p style={{ color: C.text, fontSize: 15.5, lineHeight: 1.65, marginTop: 10, maxWidth: "62ch" }}>
            You do not need to be in the box league. Box teams lose a player to work, holidays and
            injuries every week, and a fixture that cannot be filled is a court sitting empty and two
            teams with a void result. Put your name on the stand-in list and we will come to you when a
            team at your level is short.
          </p>
        </div>

        <SubRosterForm />

        <SubRosterPublic />

        <div>
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.15em", color: C.mute, marginBottom: 12 }}>
            HOW IT WORKS
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {HOW.map(([title, detail], i) => (
              <div
                key={title}
                style={{
                  display: "grid",
                  gridTemplateColumns: "34px 1fr",
                  gap: 14,
                  padding: "14px 0",
                  borderTop: i === 0 ? `1px solid ${C.border}` : `1px solid ${C.border}`,
                }}
              >
                <span style={{ fontFamily: F.mono, fontSize: 13, color: C.accent }}>{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
                  <div style={{ fontSize: 14, color: C.mute, lineHeight: 1.55, marginTop: 3 }}>{detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>The level rule</div>
          <p style={{ fontSize: 14.5, color: C.mute, lineHeight: 1.6, margin: 0 }}>
            A stand-in has to be within 0.75 of the Playtomic rating of the player sitting out, so the
            box stays competitive and nobody can bring in a ringer. If you do not know your rating,
            leave it blank and we will look it up.
          </p>
          <p style={{ fontSize: 13.5, color: C.mute, lineHeight: 1.6, margin: 0 }}>
            Your name, your level and when you can play are shown on the list above, so teams can see
            who is around. Your email and phone number stay with W7 and are never shown to anyone:
            a team asks through the site and we put you all on one email thread.
          </p>
        </div>

        <div style={{ fontSize: 13.5, color: C.mute }}>
          Questions: <a href="mailto:welcome@w7padel.com" style={{ color: C.info }}>welcome@w7padel.com</a> ·{" "}
          <Link href="/box/rules" style={{ color: C.info }}>league rules</Link>
        </div>
        <KeanoCredit />
      </div>
    </div>
  );
}
