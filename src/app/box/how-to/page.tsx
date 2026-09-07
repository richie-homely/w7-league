import Link from "next/link";
import { C, F } from "@/theme/tokens";
import { KeanoCredit } from "@/components/KeanoCredit";
import { BOX_CYCLES, fmtRange } from "@/lib/boxCalendar";

export const metadata = { title: "How to enter scores · W7 Autumn/Winter Padel Box League" };

// Player-facing instructions (Richie, 7 Sep 2026). Kept to what a player has to do;
// the rules and points live on /box/rules so the two pages do not drift.
const STEPS: { h: string; body: (string | string[])[] }[] = [
  {
    h: "1. Find your box",
    body: [
      "Open the league site and tap FIND MY BOX at the top of the page. Enter the email address you registered with on Playtomic. The page then shows only your box, your fixtures and your results, and remembers your email on that phone so you only do this once.",
      "Your launch email also has a button that opens your box directly.",
      "If your email is not recognised, it is usually an Apple \"Hide My Email\" address from the Playtomic sign-up. Use the \"Add a teammate's email\" box under your team to add the address you actually use, or email welcome@w7padel.com and we will add it for you.",
    ],
  },
  {
    h: "2. Arrange your four matches",
    body: [
      `Each cycle is four weeks and you play the other four teams in your box once each. The current cycle runs ${fmtRange(BOX_CYCLES[0].start, BOX_CYCLES[0].end)}. Arrange every fixture through Playtomic chat: message the other team from the league event in the Playtomic app, agree a time, and book a court in the usual way. Do it as soon as the cycle opens; the league does not book courts for you.`,
      "Play 2 full sets, then a championship tie-break if it is one set each. Substitutes are allowed if their Playtomic rating is within 0.75 of the player they replace.",
    ],
  },
  {
    h: "3. Enter the score (either team can do it)",
    body: [
      "Straight after the match, open the site, go to Scores & results, and tap Enter result on your fixture (the buttons only appear on your own matches once your email is in Find my box). Type the games for each set in the SETS boxes: enter your side's score and the cursor moves to the other side automatically. When a winner is clear it is highlighted so you can check it before you send.",
      "Enter your registered email and tap Submit result. The result shows as provisional in your box until the other team confirms it.",
      ["Two sets: enter 6-3, 6-4 as 6 and 3, then 6 and 4.", "One set each: enter both sets and the championship tie-break as the third set, e.g. 10-7.", "Agreed full third set: enter it as the third set instead."],
    ],
  },
  {
    h: "4. Confirm the other team's entry",
    body: [
      "When the other team enters a result against you, you get an email with a button that opens that match. Check the score and tap Confirm ✓ with your registered email. If it is wrong, tap Dispute and enter the score you have; both teams then get an email and W7 will settle it from the two entries.",
      "Entering the same score yourself from your own email also counts as confirming. Once confirmed, both teams get a final email and the box table updates.",
    ],
  },
  {
    h: "5. Watch the table",
    body: [
      "Points are 4 for a win in straight sets, 3 for a win after splitting the first two sets, 1 to the loser who takes a set, 0 for a straight-sets loss. At the end of the cycle the top two go up a box, the bottom two go down, and the winners get €20 Playtomic credit each (€40 per team).",
      "Unplayed matches are void at the cycle deadline and both teams get −1, so do not leave your fourth match to the last weekend.",
    ],
  },
  {
    h: "Problems",
    body: [
      "Anything at all — a wrong score, a missing email, a fixture you cannot get played, a substitute question — email welcome@w7padel.com with your box number and the two team names. Confirmation emails come from the league site; check spam the first time.",
    ],
  },
];

export default function BoxHowToPage() {
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

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "28px 20px 40px" }}>
        <h1 style={{ fontFamily: F.display, fontSize: 36, margin: 0, letterSpacing: "0.02em" }}>
          How to enter <span style={{ color: C.accent }}>scores</span>
        </h1>
        <p style={{ color: C.mute, fontSize: 13, marginTop: 6 }}>
          Five steps, once a week. The full <Link href="/box/rules" style={{ color: C.info }}>rules and points</Link> are on their own page.
        </p>

        {STEPS.map((s) => (
          <section key={s.h} style={{ marginTop: 26 }}>
            <h2 style={{ fontFamily: F.display, fontSize: 22, margin: "0 0 8px", color: C.accent, letterSpacing: "0.03em", textTransform: "uppercase" }}>
              {s.h}
            </h2>
            {s.body.map((b, i) =>
              Array.isArray(b) ? (
                <ul key={i} style={{ margin: "6px 0 10px", paddingLeft: 20, fontSize: 14, lineHeight: 1.7 }}>
                  {b.map((li) => (
                    <li key={li}>{li}</li>
                  ))}
                </ul>
              ) : (
                <p key={i} style={{ fontSize: 14, lineHeight: 1.7, margin: "0 0 10px" }}>
                  {b}
                </p>
              ),
            )}
          </section>
        ))}

        <div style={{ marginTop: 30, padding: "12px 14px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, color: C.mute }}>
          Problems or questions: welcome@w7padel.com · WhatsApp 085 135 4570
        </div>
        <KeanoCredit />
      </div>
    </div>
  );
}
