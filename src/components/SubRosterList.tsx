"use client";

import { useEffect, useState } from "react";
import { C, F } from "@/theme/tokens";
import { eligibleSubs } from "@/lib/box";

// The stand-in list on the admin page (Richie, 21 Sep 2026: "add a tab to the usage page which
// provides this info"). Names, ratings and availability only: the sign-up page promises a sub
// that their email and phone stay with W7, so contact details are never sent to a browser. W7
// holds them, and the league does the introduction by email when a team asks.

export function SubRosterList({ bare = false }: { bare?: boolean } = {}) {
  const [rows, setRows] = useState<{ name: string; rating: number | null; plays: string }[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    eligibleSubs(null).then((r) => { if (!cancelled) setRows(r); });
    return () => { cancelled = true; };
  }, []);

  const withRating = (rows ?? []).filter((r) => r.rating !== null);
  const missing = (rows ?? []).filter((r) => r.rating === null);

  return (
    <section style={{ marginTop: bare ? 0 : 28 }}>
      {!bare && (
        <h2 style={{ fontFamily: F.display, fontSize: 20, margin: 0, color: C.accent, letterSpacing: "0.03em" }}>
          STAND-IN LIST
        </h2>
      )}
      <p style={{ fontSize: 12, color: C.mute, margin: "4px 0 10px" }}>
        Players who have put their name down at{" "}
        <a href="/box/subs" style={{ color: C.info }}>league.w7padel.com/box/subs</a>. A team short a
        player picks from those within 0.75 of the player sitting out. Emails and phone numbers are
        held by W7 and never shown here.
      </p>

      {rows === null && <div style={{ fontSize: 13, color: C.mute }}>Loading…</div>}

      {rows && rows.length === 0 && (
        <div style={{ fontSize: 13.5, color: C.mute, background: C.card, border: `1px dashed ${C.border}`, borderRadius: 10, padding: "16px 18px" }}>
          Nobody on the list yet. Post the sign-up link to the members group.
        </div>
      )}

      {rows && rows.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 10 }}>
            <Stat n={rows.length} label="on the list" />
            <Stat n={withRating.length} label="with a rating, ready to match" />
            <Stat n={missing.length} label="rating still to check" colour={missing.length ? C.amber : C.mute} />
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", fontSize: 13, minWidth: 520, width: "100%" }}>
              <thead>
                <tr style={{ color: C.mute, fontSize: 10.5, letterSpacing: "0.08em", textAlign: "left" }}>
                  <th style={{ padding: "4px 10px 8px 0" }}>NAME</th>
                  <th style={{ padding: "4px 10px 8px 0", textAlign: "right" }}>RATING</th>
                  <th style={{ padding: "4px 0 8px" }}>USUALLY PLAYS</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.name} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: "7px 10px 7px 0", fontWeight: 600 }}>{r.name}</td>
                    <td style={{ padding: "7px 10px 7px 0", textAlign: "right", fontFamily: F.mono, color: r.rating === null ? C.amber : C.text }}>
                      {r.rating === null ? "to check" : r.rating.toFixed(2)}
                    </td>
                    <td style={{ padding: "7px 0", color: C.mute }}>{r.plays || "not said"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function Stat({ n, label, colour = C.accent }: { n: number; label: string; colour?: string }) {
  return (
    <div>
      <div style={{ fontFamily: F.mono, fontSize: 22, fontWeight: 700, color: colour, lineHeight: 1.1 }}>{n}</div>
      <div style={{ fontSize: 11, color: C.mute }}>{label}</div>
    </div>
  );
}
