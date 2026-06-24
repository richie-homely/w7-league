import { C, F } from "@/theme/tokens";
import type { Fixture } from "@/lib/types";
import { DIVISIONS, divisionProgress } from "@/lib/league";

// Per-division completion bars (G1–G5). Lower tier in neon, upper in info blue.
export function LeagueProgress({ fixtures }: { fixtures: Fixture[] }) {
  const overall = DIVISIONS.reduce(
    (acc, d) => {
      const p = divisionProgress(d.id, fixtures);
      acc.completed += p.completed;
      acc.total += p.total;
      return acc;
    },
    { completed: 0, total: 0 }
  );
  const overallPct = overall.total ? Math.round((overall.completed / overall.total) * 100) : 0;

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div style={{ fontFamily: F.display, fontSize: 13, color: C.accent, letterSpacing: "0.1em" }}>
          GAMES PLAYED
        </div>
        <div style={{ fontSize: 11, color: C.mute }}>
          {overallPct}% overall · {overall.completed}/{overall.total}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {DIVISIONS.map((d) => {
          const { completed, total, pct } = divisionProgress(d.id, fixtures);
          const tColor = d.tier === "lower" ? C.accent : C.info;
          return (
            <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 26, fontWeight: 700, fontSize: 13, color: C.text }}>{d.name}</div>
              <div
                style={{
                  flex: 1,
                  height: 8,
                  background: C.bg2,
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    background: tColor,
                    borderRadius: 4,
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
              <div style={{ width: 38, textAlign: "right", fontFamily: F.mono, fontSize: 12, color: C.text }}>
                {pct}%
              </div>
              <div style={{ width: 56, textAlign: "right", fontSize: 11, color: C.mute }}>
                {completed}/{total}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
