"use client";

import { C, F } from "@/theme/tokens";
import { useBoxSubs, type BoxTeam, type BoxMatch } from "@/lib/box";

// Admin usage page (Richie, 10 Sep 2026): every substitute logged, with the rating gap
// against the player replaced and a flag where it is outside the 0.75 rule.
export function SubsTable({ teams, matches }: { teams: BoxTeam[]; matches: BoxMatch[] }) {
  const { byMatch } = useBoxSubs();
  const teamById = Object.fromEntries(teams.map((t) => [t.id, t]));
  const matchById = Object.fromEntries(matches.map((m) => [m.id, m]));
  const rows = [...byMatch.values()].flat().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const outside = rows.filter((s) => {
    const t = teamById[s.teamId]; if (!t || s.subRating === null) return false;
    const base = s.replaced === t.p1 ? t.r1 : t.r2;
    return base !== null && Math.abs(s.subRating - base) > 0.75;
  }).length;
  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ fontFamily: F.display, fontSize: 20, margin: 0, color: C.accent, letterSpacing: "0.03em" }}>
        SUBSTITUTES <span style={{ color: C.mute, fontSize: 14 }}>· {rows.length} logged · {outside} outside the 0.75 rule</span>
      </h2>
      {rows.length === 0 ? (
        <div style={{ fontSize: 13, color: C.mute, marginTop: 6 }}>No subs logged yet.</div>
      ) : (
        <div style={{ overflowX: "auto", marginTop: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ color: C.mute, fontSize: 10.5, letterSpacing: "0.08em", textAlign: "left" }}>
                <th style={{ padding: "4px 8px" }}>LOGGED</th><th style={{ padding: "4px 8px" }}>BOX</th><th style={{ padding: "4px 8px" }}>TEAM</th>
                <th style={{ padding: "4px 8px" }}>FIXTURE</th><th style={{ padding: "4px 8px" }}>SAT OUT</th><th style={{ padding: "4px 8px" }}>SUB</th>
                <th style={{ padding: "4px 8px", textAlign: "right" }}>SUB RATING</th><th style={{ padding: "4px 8px", textAlign: "right" }}>GAP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const t = teamById[s.teamId]; const m = matchById[s.matchId];
                const opp = m ? teamById[m.team1Id === s.teamId ? m.team2Id : m.team1Id] : undefined;
                const base = t ? (s.replaced === t.p1 ? t.r1 : t.r2) : null;
                const gap = base !== null && s.subRating !== null ? Math.abs(s.subRating - base) : null;
                const bad = gap !== null && gap > 0.75;
                return (
                  <tr key={s.id} style={{ borderTop: `1px solid ${C.border}`, color: bad ? C.amber : C.text }}>
                    <td style={{ padding: "5px 8px", fontFamily: F.mono, fontSize: 12 }}>{new Date(s.createdAt).toLocaleDateString("en-IE", { day: "2-digit", month: "short" })}</td>
                    <td style={{ padding: "5px 8px", fontFamily: F.mono }}>{t?.box ?? "?"}</td>
                    <td style={{ padding: "5px 8px", fontWeight: 600 }}>{t?.name ?? "?"}</td>
                    <td style={{ padding: "5px 8px" }}>v {opp?.name ?? "?"}</td>
                    <td style={{ padding: "5px 8px" }}>{s.replaced}{base !== null ? ` (${base.toFixed(2)})` : ""}</td>
                    <td style={{ padding: "5px 8px", fontWeight: 600 }}>{s.subName}</td>
                    <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: F.mono }}>{s.subRating !== null ? s.subRating.toFixed(2) : "—"}</td>
                    <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: F.mono }}>{gap !== null ? gap.toFixed(2) : "—"}{bad ? " · review" : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
