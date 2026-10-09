import Link from "next/link";
import { C, F } from "@/theme/tokens";
import { LADDER, fetchBoard, fetchMonths, hoursOf, monthKey, monthLabel, progress, type PointsRow } from "@/lib/rewards";
import { CourtPointsJoin } from "@/components/CourtPointsJoin";

// W7 Court Points (Richie, 9 Oct 2026): a point for every minute on court, for every player
// named on the booking. Rewards unlock on a ladder (src/lib/rewards.ts). The board is pushed
// daily from the Playtomic extract by scripts/court_points.py and read here with the public
// key; display names only, never an email.

export const metadata = {
  title: "Court Points · W7 Padel",
  description: "A point for every minute on court at W7 Padel. Free balls and free court hours as the points add up.",
};

export const revalidate = 1800;

export default async function RewardsPage() {
  const months = await fetchMonths();
  const thisMonth = monthKey();
  const monthShown = months.includes(thisMonth) ? thisMonth : months[0];
  const [month, all] = await Promise.all([monthShown ? fetchBoard(monthShown, 25) : Promise.resolve([] as PointsRow[]), fetchBoard("all", 25)]);
  const updated = all[0]?.updated_at ? new Date(all[0].updated_at) : null;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: F.body }}>
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "14px 20px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ fontFamily: F.display, fontSize: 20, letterSpacing: "0.03em" }}>W7 COURT POINTS</div>
        <div style={{ flex: 1 }} />
        <Link href="/" style={{ fontSize: 12, color: C.mute, textDecoration: "none", padding: "6px 12px", border: `1px solid ${C.border}`, borderRadius: 6 }}>
          ← Leagues
        </Link>
      </div>

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "28px 20px 48px" }}>
        <h1 style={{ fontFamily: F.display, fontSize: 40, lineHeight: 1, margin: "0 0 10px", letterSpacing: "0.02em" }}>
          A POINT FOR EVERY <span style={{ color: C.accent }}>MINUTE ON COURT</span>
        </h1>
        <p style={{ color: C.mute, margin: "0 0 22px", maxWidth: 640, lineHeight: 1.5 }}>
          Every player named on a W7 booking earns one point per minute the court is booked for. A 90-minute game is 90 points
          for each of the four names on it. Points never run out, and every time your total passes a rung on the ladder you unlock
          that reward at the desk. <b style={{ color: C.text }}>Only names on the booking score</b>, so add your partners when you book.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginBottom: 28 }}>
          {LADDER.map((r) => (
            <div key={r.key} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 18px" }}>
              <div style={{ fontFamily: F.mono, fontSize: 12, color: C.mute, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                every {r.every.toLocaleString("en-IE")} points
              </div>
              <div style={{ fontFamily: F.display, fontSize: 28, color: C.accent, margin: "4px 0 2px", letterSpacing: "0.02em" }}>{r.prize.toUpperCase()}</div>
              <div style={{ fontSize: 13, color: C.mute }}>{r.detail}</div>
            </div>
          ))}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 18px" }}>
            <div style={{ fontFamily: F.mono, fontSize: 12, color: C.mute, letterSpacing: "0.08em", textTransform: "uppercase" }}>how to claim</div>
            <div style={{ fontSize: 14, lineHeight: 1.5, marginTop: 6 }}>
              Find your name on the board and show it at the desk. Balls are handed over on the spot; a free hour goes on as
              Playtomic credit. Points update every morning from the booking system.
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          <Board title={monthShown ? monthLabel(monthShown) : "This month"} rows={month} />
          <Board title="All time" rows={all} showLadder />
        </div>

        <div style={{ marginTop: 16 }}>
          <CourtPointsJoin />
        </div>

        <p style={{ color: C.mute, fontSize: 12, marginTop: 26, lineHeight: 1.5 }}>
          Names are shown as first name and initial, and only for players who have joined. Staff and coaches are not on the board.
          Questions to <a href="mailto:welcome@w7padel.com" style={{ color: C.mute }}>welcome@w7padel.com</a>.
          {updated && <> Last updated {updated.toLocaleString("en-IE", { timeZone: "Europe/Dublin", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}.</>}
        </p>
      </div>
    </div>
  );
}

function Board({ title, rows, showLadder = false }: { title: string; rows: PointsRow[]; showLadder?: boolean }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "baseline", gap: 10 }}>
        <div style={{ fontFamily: F.display, fontSize: 18, letterSpacing: "0.04em" }}>{title.toUpperCase()}</div>
        <div style={{ fontSize: 12, color: C.mute }}>top {rows.length || 25}</div>
      </div>
      {rows.length === 0 ? (
        <div style={{ padding: 20, color: C.mute, fontSize: 14 }}>Nobody on the board yet. Join below and your points appear with the next morning's update.</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <tbody>
            {rows.map((r, i) => {
              const next = progress(r.points)[0];
              return (
                <tr key={r.player} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "8px 6px 8px 14px", color: i < 3 ? C.accent : C.mute, fontFamily: F.mono, width: 34 }}>{i + 1}</td>
                  <td style={{ padding: "8px 6px" }}>
                    <div>{r.display}</div>
                    {showLadder && (
                      <div style={{ height: 3, background: C.border, borderRadius: 2, marginTop: 5, maxWidth: 160 }} title={`${next.toNext.toLocaleString("en-IE")} to the next tube of balls`}>
                        <div style={{ height: 3, width: `${next.pct}%`, background: C.accentDim, borderRadius: 2 }} />
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "8px 6px", textAlign: "right", fontFamily: F.mono, fontWeight: 600 }}>{r.points.toLocaleString("en-IE")}</td>
                  <td style={{ padding: "8px 14px 8px 6px", textAlign: "right", color: C.mute, fontSize: 12, whiteSpace: "nowrap" }}>
                    {hoursOf(r.points).toFixed(1)} h · {r.sessions}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
