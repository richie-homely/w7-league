"use client";

import { useState } from "react";
import { C, F } from "@/theme/tokens";
import { CONTACT, VERSION, BUILD_DATE } from "@/lib/league";
import { useLeagueData } from "@/lib/useLeagueData";
import { TopBar, type PublicMode } from "./TopBar";
import { TeamView } from "./TeamView";
import { StatusView, ContactBar } from "./StatusView";
import { KnockoutView } from "./Bracket";

function Footer() {
  return (
    <footer
      style={{
        borderTop: `1px solid ${C.border}`,
        padding: "24px 20px",
        marginTop: 24,
      }}
    >
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <ContactBar />
        <div style={{ fontSize: 11, color: C.mute, marginTop: 16, fontFamily: F.body }}>
          W7 Padel · Wicklow Town · League Tracker {VERSION} ({BUILD_DATE}) ·{" "}
          <a href={`mailto:${CONTACT.email}`} style={{ color: C.mute }}>
            {CONTACT.email}
          </a>
        </div>
      </div>
    </footer>
  );
}

export function LeagueApp() {
  const [mode, setMode] = useState<PublicMode>("team");
  const { teamsByDiv, fixtures, settings, error } = useLeagueData();

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: F.body }}>
      <TopBar mode={mode} setMode={setMode} />
      {error && (
        <div
          style={{
            background: "rgba(255,82,82,0.08)",
            borderBottom: `1px solid rgba(255,82,82,0.4)`,
            color: C.red,
            fontSize: 12,
            padding: "8px 20px",
          }}
        >
          Live data unavailable — showing default state. ({error})
        </div>
      )}
      {mode === "team" && <TeamView teams={teamsByDiv} fixtures={fixtures} />}
      {mode === "status" && <StatusView settings={settings} />}
      {mode === "knockout" && <KnockoutView teams={teamsByDiv} fixtures={fixtures} />}
      <Footer />
    </div>
  );
}
