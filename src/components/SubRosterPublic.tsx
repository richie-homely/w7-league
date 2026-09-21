"use client";

import { useEffect, useState } from "react";
import { C, F } from "@/theme/tokens";
import { eligibleSubs } from "@/lib/box";

// Who is already on the stand-in list, shown on the sign-up page itself (Richie, 21 Sep 2026:
// "can we surface a list of available subs on the need a sub tab"). Name, level and when they
// play — the same three things a team sees when it picks one. Contact details are never sent to
// a browser; the league does the introduction by email.

export function SubRosterPublic() {
  const [rows, setRows] = useState<{ name: string; rating: number | null; plays: string }[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    eligibleSubs(null).then((r) => { if (!cancelled) setRows(r); });
    return () => { cancelled = true; };
  }, []);

  if (rows === null) {
    return <div style={{ fontSize: 13.5, color: C.mute }}>Loading the list…</div>;
  }

  if (rows.length === 0) {
    return (
      <div style={{ background: C.card, border: `1px dashed ${C.border}`, borderRadius: 12, padding: "18px 20px", fontSize: 14.5, color: C.mute }}>
        Nobody on the list yet. Be the first and you will be the one teams call.
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.15em", color: C.mute }}>
          ON THE LIST
        </div>
        <div style={{ fontSize: 12.5, color: C.mute }}>
          {rows.length} {rows.length === 1 ? "player" : "players"} · teams see the same three things
        </div>
      </div>
      <div style={{ overflowX: "auto", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12 }}>
        <table style={{ borderCollapse: "collapse", fontSize: 14, width: "100%", minWidth: 460 }}>
          <thead>
            <tr style={{ color: C.mute, fontSize: 10.5, letterSpacing: "0.08em", textAlign: "left" }}>
              <th style={{ padding: "12px 14px 8px" }}>PLAYER</th>
              <th style={{ padding: "12px 14px 8px", textAlign: "right" }}>LEVEL</th>
              <th style={{ padding: "12px 14px 8px" }}>USUALLY PLAYS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ padding: "10px 14px", fontWeight: 600 }}>{r.name}</td>
                <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: F.mono, color: r.rating === null ? C.mute : C.accent }}>
                  {r.rating === null ? "—" : r.rating.toFixed(2)}
                </td>
                <td style={{ padding: "10px 14px", color: C.mute }}>{r.plays || "ask us"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 12.5, color: C.mute, marginTop: 8, lineHeight: 1.55 }}>
        A team can only pick someone within 0.75 of the player sitting out, so a level here does not
        mean every box. Contact details are never shown: a team asks through the site and we put you
        all on one email thread.
      </div>
    </div>
  );
}
