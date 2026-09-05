import Link from "next/link";
import { C, F } from "@/theme/tokens";
import { KeanoCredit } from "@/components/KeanoCredit";
import { BOX_CYCLES, CHRISTMAS_BREAK, fmtRange } from "@/lib/boxCalendar";
import { BOX_LEAGUE } from "@/lib/competitions";

export const metadata = { title: "Rules & Format · W7 Autumn/Winter Padel Box League" };

// The league rules as issued by W7 on 5 Sep 2026. Text is kept close to the
// original; figures that live in code (dates, cap) are read from it so the two
// cannot drift.
const SECTIONS: { h: string; body: (string | string[])[] }[] = [
  {
    h: "The league",
    body: [
      `An Autumn/Winter Padel Box League with space for up to ${BOX_LEAGUE.maxTeams} teams.`,
      "Depending on the number of entries and the spread of playing levels, entries may be split into two separate box leagues, so that divisions are balanced and every team plays competitive matches against opponents of a similar level.",
    ],
  },
  {
    h: "Entry fee",
    body: [`€${BOX_LEAGUE.entryPerPerson} per person / €${BOX_LEAGUE.entryPerTeam} per team for the full league.`],
  },
  {
    h: "League placement",
    body: [
      "To make the league competitive from the outset, the combined Playtomic ratings of both players in a team decide its initial box. Teams are placed directly into the box that most closely reflects their combined playing level.",
      "If entries are split across two leagues, the same approach places each team into the most appropriate league and box.",
    ],
  },
  {
    h: "Dates & cycles",
    body: [
      `The league begins on ${fmtRange(BOX_CYCLES[0].start, BOX_CYCLES[0].start).split(" – ")[0]} 2026. There are 7 cycles, each giving teams 4 weeks to complete their matches. There is no break between cycles apart from Christmas: once a cycle finishes, promotion and relegation are applied and the next cycle begins.`,
      BOX_CYCLES.map((c) => `Cycle ${c.n}: ${fmtRange(c.start, c.end)}${c.note ? ` (${c.note})` : ""}`),
    ],
  },
  {
    h: "Christmas break",
    body: [
      `A two-week break from ${fmtRange(CHRISTMAS_BREAK.start, CHRISTMAS_BREAK.end)}. The courts stay open, so teams are welcome to play, but these two weeks do not count towards Cycle 4's four-week playing window — Cycle 4 pauses for league purposes over Christmas while still allowing matches to be completed then if it suits both teams.`,
    ],
  },
  {
    h: "Box format",
    body: [
      "Each box holds 5 teams and every team plays the other four during each cycle: 4 matches per cycle, 7 cycles, up to 28 competitive matches across the season. Expect roughly one league match a week during active cycles.",
      "Where the entry count does not divide by five, a box of four plays three matches and takes a bye.",
    ],
  },
  {
    h: "Substitutes",
    body: [
      "A substitute may be used if a registered player is unavailable, provided the substitute's Playtomic rating is within 0.75 of the player they replace. This gives teams flexibility while keeping matches fair and each box at its intended standard.",
    ],
  },
  {
    h: "Promotion & relegation",
    body: [
      "At the end of each cycle:",
      ["1st — promoted", "2nd — promoted", "3rd — stays in the same box", "4th — relegated", "5th — relegated"],
      "The top two move up, the bottom two move down, and the team finishing 3rd holds its place.",
    ],
  },
  {
    h: "Cycle winner prize",
    body: [
      "The team finishing top of its box at the end of a cycle receives €15 Playtomic credit per player — €30 per winning team. Seven cycles, seven chances to top the box, win credit and earn promotion.",
    ],
  },
  {
    h: "Match format & scoring",
    body: [
      "Matches are 2 full sets, then a championship tie-break if the match is tied at one set each. The championship tie-break is the deciding set for the official league result. If both teams prefer a full third set and there is court time, they may play one by mutual agreement.",
      "League points:",
      [
        "4 points — win in 2 straight sets",
        "3 points — win after the teams split the opening 2 sets",
        "1 bonus point — the losing team, if they take a set",
        "0 points — lose in 2 straight sets",
      ],
      "So a 2–0 win is 4 points to the winners and 0 to the losers; a 1–1 match decided by the championship tie-break (or an agreed third set) is 3 points to the winners and 1 to the losers.",
    ],
  },
  {
    h: "Unplayed matches — strict rule",
    body: [
      "All matches must be completed within the cycle's four-week playing period. A match not completed by the cycle deadline is declared null and void and BOTH teams receive a −1 point penalty.",
      "There are no individual extensions or exceptions for holidays, work, availability or difficulty arranging a fixture. Four weeks means teams need to be organised from the start of each cycle: arrange all four fixtures as soon as the cycle opens rather than leaving games to the final week. Please only enter if you and your partner are committed to completing all four matches in every cycle.",
    ],
  },
  {
    h: "Weather exception",
    body: [
      "The only exception to cycle deadlines is where weather has had a significant impact on the ability to play. If adverse weather causes widespread cancellations or significantly reduces court availability, the organisers may extend the relevant cycle. Any weather extension is determined by the organisers and communicated to all affected teams. It applies to genuine weather disruption only, not to individual scheduling or availability issues.",
    ],
  },
  {
    h: "Logging results",
    body: [
      "Either team enters the score on the league site with the email they registered with. The result shows as provisional until the opposing team confirms it from their registered email (entering the same score also confirms it). If the two teams enter different scores the match is flagged and the W7 team will resolve it.",
    ],
  },
];

export default function BoxRulesPage() {
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
          Rules &amp; <span style={{ color: C.accent }}>format</span>
        </h1>
        <p style={{ color: C.mute, fontSize: 13, marginTop: 6 }}>
          Issued 5 September 2026. Where these rules and the Playtomic event listing differ, these rules apply.
        </p>

        {SECTIONS.map((s) => (
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
          Questions: welcome@w7padel.com · WhatsApp 085 135 4570
        </div>
        <KeanoCredit />
      </div>
    </div>
  );
}
