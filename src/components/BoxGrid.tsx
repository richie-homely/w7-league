"use client";

import { useEffect, useMemo, useState } from "react";
import { C, F } from "@/theme/tokens";
import { createClient } from "@/lib/supabase/client";

/* Provisional boxes for the Autumn/Winter Padel Box League.
 *
 * Entry is still open, so every box here will move as teams join — the page
 * says so loudly rather than quietly, because players will screenshot this and
 * hold us to it. Boxes are cut from combined Playtomic rating so each box is a
 * band of similar standard; click one to see the teams, players and ratings. */

interface BoxTeam {
  id: string;
  box: number;
  seed: number;
  name: string;
  p1: string;
  p2: string;
  r1: number | null;
  r2: number | null;
}

function combined(t: BoxTeam) {
  return (t.r1 ?? 0) + (t.r2 ?? 0);
}

export function BoxGrid() {
  const [teams, setTeams] = useState<BoxTeam[] | null>(null);
  const [open, setOpen] = useState<number | null>(1);

  useEffect(() => {
    const sb = createClient();
    sb.from("box_teams")
      .select("id,box,seed,name,p1,p2,r1,r2")
      .eq("active", true)
      .order("box", { ascending: true })
      .order("seed", { ascending: true })
      .then(({ data }) => setTeams((data as BoxTeam[]) ?? []));
  }, []);

  const boxes = useMemo(() => {
    const by = new Map<number, BoxTeam[]>();
    (teams ?? []).forEach((t) => {
      const arr = by.get(t.box) ?? [];
      arr.push(t);
      by.set(t.box, arr);
    });
    return [...by.entries()].sort((a, b) => a[0] - b[0]);
  }, [teams]);

  if (teams === null) return null;
  if (!teams.length) {
    return (
      <div
        style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
          padding: 18, color: C.mute, fontSize: 13.5,
        }}
      >
        Boxes are drawn from combined Playtomic ratings once enough teams have entered.
        They&apos;ll appear here as soon as the first draft is up.
      </div>
    );
  }

  const totalTeams = teams.length;

  return (
    <div>
      <div
        style={{
          display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 12,
          background: "rgba(255,184,77,0.12)", border: `1px solid ${C.amber}66`,
          borderRadius: 8, padding: "7px 12px",
        }}
      >
        <span style={{ fontSize: 13 }}>⚠</span>
        <span style={{ fontSize: 12.5, color: C.text, fontWeight: 600 }}>
          PROVISIONAL — boxes will change as more teams enter
        </span>
      </div>
      <div style={{ fontSize: 13, color: C.mute, marginBottom: 14, maxWidth: 620, lineHeight: 1.6 }}>
        {totalTeams} teams entered so far, sorted by combined Playtomic rating and cut into{" "}
        {boxes.length} boxes so every match is against a similar standard. Click a box to see
        who is in it. Nothing is final until entry closes.
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {boxes.map(([num, list]) => {
          const isOpen = open === num;
          const lo = Math.min(...list.map(combined));
          const hi = Math.max(...list.map(combined));
          return (
            <div
              key={num}
              style={{
                background: C.card, border: `1px solid ${isOpen ? C.accent + "66" : C.border}`,
                borderRadius: 10, overflow: "hidden",
              }}
            >
              <button
                onClick={() => setOpen(isOpen ? null : num)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 12,
                  justifyContent: "space-between", background: "transparent",
                  border: 0, cursor: "pointer", padding: "13px 16px",
                  color: C.text, fontFamily: F.body, textAlign: "left",
                }}
              >
                <span style={{ display: "flex", alignItems: "baseline", gap: 12, minWidth: 0 }}>
                  <span style={{ fontFamily: F.display, fontSize: 20, color: C.accent }}>
                    BOX {num}
                  </span>
                  <span style={{ fontSize: 12.5, color: C.mute }}>
                    {list.length} teams · rating {lo.toFixed(2)}–{hi.toFixed(2)}
                  </span>
                </span>
                <span style={{ color: C.mute, fontSize: 12, flexShrink: 0 }}>
                  {isOpen ? "hide ▲" : "view ▼"}
                </span>
              </button>
              {isOpen && (
                <div style={{ borderTop: `1px solid ${C.border}` }}>
                  {list.map((t) => (
                    <div
                      key={t.id}
                      style={{
                        display: "grid", gridTemplateColumns: "22px 1fr auto",
                        gap: 10, alignItems: "center", padding: "9px 16px",
                        borderBottom: `1px solid ${C.bg2}`,
                      }}
                    >
                      <span style={{ fontFamily: F.mono, fontSize: 11, color: C.mute }}>
                        {t.seed}
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 13, fontWeight: 600 }}>
                          {t.p1}
                          <span style={{ color: C.mute, fontWeight: 400 }}>
                            {" "}
                            {t.r1 != null ? t.r1.toFixed(2) : "—"}
                          </span>
                        </span>
                        <span style={{ display: "block", fontSize: 13, color: C.text }}>
                          {t.p2}
                          <span style={{ color: C.mute }}>
                            {" "}
                            {t.r2 != null ? t.r2.toFixed(2) : "—"}
                          </span>
                        </span>
                      </span>
                      <span
                        style={{
                          fontFamily: F.mono, fontSize: 13, color: C.accent, fontWeight: 700,
                        }}
                        title="combined Playtomic rating"
                      >
                        {combined(t).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
