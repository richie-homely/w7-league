"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { C, F } from "@/theme/tokens";
import type { Fixture, Settings, StandingRow, Team, Tier } from "@/lib/types";
import {
  CONTACT,
  DIVISIONS,
  currentRound,
  daysUntilDeadline,
  timeUntilStart,
  weekRangeForRound,
} from "@/lib/league";
import { computeStandings } from "@/lib/standings";
import { useLeagueData } from "@/lib/useLeagueData";
import { Countdown } from "./Countdown";
import { Logo } from "./ui";

const LIVE_PANELS_PRESEASON = [
  { id: "countdown", label: "FIRST WHISTLE" },
  { id: "status", label: "ENTRY STATUS" },
  { id: "fixtures", label: "OPENING WEEK FIXTURES" },
  { id: "playoff", label: "PRIZES & PLAYOFF FORMAT" },
] as const;
const LIVE_PANELS_LIVE = [
  { id: "fixtures", label: "THIS WEEK" },
  { id: "lower", label: "LOWER TIER STANDINGS" },
  { id: "upper", label: "UPPER TIER STANDINGS" },
  { id: "results", label: "LATEST RESULTS" },
  { id: "playoff", label: "PLAYOFF RACE" },
] as const;
const PANEL_DURATION = 14000;

export function LiveScreen() {
  const router = useRouter();
  const { teamsByDiv, fixtures, settings } = useLeagueData();
  const preseason = timeUntilStart() !== null;
  const LIVE_PANELS = preseason ? LIVE_PANELS_PRESEASON : LIVE_PANELS_LIVE;
  const [panelIdx, setPanelIdx] = useState(0);
  const [tick, setTick] = useState(0);
  // Null until mounted so the first client render matches the server HTML
  // (otherwise the wall clock differs between the two → hydration mismatch).
  const [now, setNow] = useState<Date | null>(null);

  const exit = () => router.push("/");

  useEffect(() => {
    const id = setInterval(() => {
      setPanelIdx((i) => (i + 1) % LIVE_PANELS.length);
      setTick((t) => t + 1);
    }, PANEL_DURATION);
    return () => clearInterval(id);
  }, [LIVE_PANELS.length]);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") exit();
      if (e.key === "ArrowRight") setPanelIdx((i) => (i + 1) % LIVE_PANELS.length);
      if (e.key === "ArrowLeft") setPanelIdx((i) => (i - 1 + LIVE_PANELS.length) % LIVE_PANELS.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [LIVE_PANELS.length]);

  const round = currentRound();
  const wk = round > 0 ? weekRangeForRound(round) : null;
  const daysLeft = daysUntilDeadline();
  const panel = LIVE_PANELS[panelIdx];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: C.bg,
        color: C.text,
        fontFamily: F.body,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 20% 30%, rgba(212, 255, 58, 0.04), transparent 50%),
                        radial-gradient(circle at 80% 70%, rgba(125, 216, 255, 0.03), transparent 50%)`,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          padding: "24px 40px",
          display: "flex",
          alignItems: "center",
          gap: 32,
          borderBottom: `2px solid ${C.accent}`,
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Logo style={{ width: 72, height: 72, fontSize: 28 }} />
          <div>
            <div style={{ fontFamily: F.display, fontSize: 38, lineHeight: 0.95, letterSpacing: "0.02em" }}>
              SUMMER LEAGUES 2026
            </div>
            <div style={{ fontSize: 13, color: C.mute, marginTop: 6, letterSpacing: "0.1em" }}>
              W7 PADEL · WICKLOW TOWN
            </div>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: F.mono, fontSize: 42, color: C.accent, lineHeight: 1, fontWeight: 700 }}>
            {now ? now.toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
          </div>
          <div style={{ fontSize: 12, color: C.mute, marginTop: 4, letterSpacing: "0.1em" }}>
            {now
              ? now
                  .toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "long" })
                  .toUpperCase()
              : ""}
          </div>
        </div>
        <div style={{ paddingLeft: 32, borderLeft: `1px solid ${C.border}`, textAlign: "right" }}>
          <div style={{ fontFamily: F.display, fontSize: 32, color: C.text, lineHeight: 1 }}>
            {round === 0 ? "PRE-SEASON" : `ROUND ${round}`}
          </div>
          <div style={{ fontSize: 12, color: C.mute, marginTop: 4 }}>
            {round === 0
              ? "Starts Sat 6 June"
              : daysLeft > 0
                ? `${daysLeft} days to deadline`
                : "Deadline passed"}
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 40px", display: "flex", alignItems: "center", gap: 16, background: C.bg2 }}>
        <div style={{ fontFamily: F.display, fontSize: 28, color: C.accent, letterSpacing: "0.1em" }}>
          {panel.label}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 6 }}>
          {LIVE_PANELS.map((p, i) => (
            <div
              key={p.id}
              style={{
                width: i === panelIdx ? 32 : 8,
                height: 8,
                background: i === panelIdx ? C.accent : C.border,
                borderRadius: 4,
                transition: "all 0.4s",
              }}
            />
          ))}
        </div>
      </div>

      <div
        key={panel.id + tick}
        style={{
          flex: 1,
          overflow: "hidden",
          padding: "32px 40px",
          position: "relative",
          zIndex: 1,
          animation: "w7fade 0.6s ease-out",
        }}
      >
        <style>{`@keyframes w7fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        {panel.id === "countdown" && <LivePanelCountdown />}
        {panel.id === "status" && <LivePanelStatus settings={settings} />}
        {panel.id === "fixtures" && (
          <LivePanelFixtures teams={teamsByDiv} fixtures={fixtures} round={round} />
        )}
        {panel.id === "lower" && (
          <LivePanelStandings teams={teamsByDiv} fixtures={fixtures} tier="lower" />
        )}
        {panel.id === "upper" && (
          <LivePanelStandings teams={teamsByDiv} fixtures={fixtures} tier="upper" />
        )}
        {panel.id === "results" && <LivePanelResults teams={teamsByDiv} fixtures={fixtures} />}
        {panel.id === "playoff" && <LivePanelPlayoff teams={teamsByDiv} fixtures={fixtures} />}
      </div>

      <button
        onClick={exit}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          padding: "6px 12px",
          background: "transparent",
          color: C.mute,
          border: `1px solid ${C.border}`,
          borderRadius: 4,
          fontSize: 11,
          cursor: "pointer",
          zIndex: 10,
          opacity: 0.4,
        }}
      >
        ESC to exit
      </button>
    </div>
  );
}

function LivePanelStatus({ settings }: { settings: Settings }) {
  const tiers: { tier: Tier; status: "full" | "available" }[] = [
    { tier: "lower", status: settings.lowerStatus || "available" },
    { tier: "upper", status: settings.upperStatus || "available" },
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, flex: 1 }}>
        {tiers.map(({ tier, status }) => {
          const tierLabel = tier === "lower" ? "LOWER TIER" : "UPPER TIER";
          const tierRange = tier === "lower" ? "0.5 – 2.4" : "2.5 – 5.5";
          const tierColor = tier === "lower" ? C.accent : C.info;
          const isFull = status === "full";
          return (
            <div
              key={tier}
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderTop: `5px solid ${tierColor}`,
                borderRadius: 16,
                padding: 32,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                textAlign: "center",
                gap: 16,
              }}
            >
              <div>
                <div style={{ fontFamily: F.display, fontSize: 44, color: tierColor, letterSpacing: "0.03em", lineHeight: 1 }}>
                  {tierLabel}
                </div>
                <div style={{ fontSize: 16, color: C.mute, marginTop: 8 }}>Rating {tierRange}</div>
              </div>
              <div
                style={{
                  padding: "20px 32px",
                  background: isFull ? "rgba(255,82,82,0.1)" : "rgba(74,222,128,0.1)",
                  border: `2px solid ${isFull ? C.red : C.green}`,
                  borderRadius: 12,
                }}
              >
                <div style={{ fontFamily: F.display, fontSize: 34, color: isFull ? C.red : C.green, letterSpacing: "0.02em", lineHeight: 1 }}>
                  {isFull ? "COMPETITION FULL" : "SLOTS AVAILABLE"}
                </div>
              </div>
              {!isFull && <div style={{ fontSize: 18, color: C.text }}>Book in now before launch</div>}
            </div>
          );
        })}
      </div>
      <div
        style={{
          background: C.bg2,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: "18px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontFamily: F.display, fontSize: 20, color: C.accent, letterSpacing: "0.04em" }}>
          BOOK IN
        </div>
        <div style={{ fontSize: 18, color: C.text }}>
          <span style={{ color: C.mute, fontSize: 13, letterSpacing: "0.1em" }}>PLAYTOMIC&nbsp;</span>
          playtomic.com/clubs/w7-padel-hub-wicklow
        </div>
        <div style={{ fontSize: 18, color: C.text }}>
          <span style={{ color: C.mute, fontSize: 13, letterSpacing: "0.1em" }}>CALL/WHATSAPP&nbsp;</span>
          {CONTACT.phoneDisplay}
        </div>
        <div style={{ fontSize: 18, color: C.text }}>
          <span style={{ color: C.mute, fontSize: 13, letterSpacing: "0.1em" }}>EMAIL&nbsp;</span>
          {CONTACT.email}
        </div>
      </div>
    </div>
  );
}

function LivePanelCountdown() {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 32,
        textAlign: "center",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 32, justifyContent: "center" }}>
        <Logo style={{ width: 180, height: 180, fontSize: 72 }} />
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 14, color: C.mute, letterSpacing: "0.25em", fontWeight: 600 }}>
            W7 PADEL SUMMER LEAGUES 2026
          </div>
          <div style={{ fontFamily: F.display, fontSize: 80, color: C.accent, letterSpacing: "0.02em", lineHeight: 0.9, marginTop: 8 }}>
            FIRST WHISTLE
          </div>
          <div style={{ fontFamily: F.display, fontSize: 56, color: C.text, letterSpacing: "0.03em", lineHeight: 1, marginTop: 8 }}>
            SAT · 6 JUNE 2026
          </div>
        </div>
      </div>
      <div
        style={{
          padding: "28px 56px",
          background: C.bg2,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          borderTop: `4px solid ${C.accent}`,
        }}
      >
        <Countdown size="lg" showSeconds={true} />
      </div>
      <div style={{ fontSize: 18, color: C.mute, maxWidth: 720, letterSpacing: "0.05em" }}>
        Two tiers · Two prize pots · 10 weeks of league padel · Knockouts to crown the champions
      </div>
    </div>
  );
}

function LivePanelFixtures({
  teams,
  fixtures,
  round,
}: {
  teams: Record<string, Team[]>;
  fixtures: Fixture[];
  round: number;
}) {
  const displayRound = round === 0 ? 1 : round;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, height: "100%" }}>
      {DIVISIONS.map((d) => {
        const divTeams = teams[d.id] ?? [];
        const divFix = fixtures
          .filter((f) => f.divisionId === d.id && f.round === displayRound)
          .sort((a, b) => (a.code ?? "").localeCompare(b.code ?? ""));
        const tierColor = d.tier === "lower" ? C.accent : C.info;
        return (
          <div
            key={d.id}
            style={{
              background: C.card,
              borderRadius: 10,
              padding: 16,
              border: `1px solid ${C.border}`,
              borderTop: `3px solid ${tierColor}`,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              overflow: "hidden",
            }}
          >
            <div>
              <div style={{ fontFamily: F.display, fontSize: 22, color: tierColor, lineHeight: 1 }}>{d.name}</div>
              <div style={{ fontSize: 11, color: C.mute, marginTop: 4 }}>{d.tierLabel}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
              {divFix.slice(0, 6).map((f) => {
                const t1 = divTeams.find((t) => t.id === f.team1Id);
                const t2 = divTeams.find((t) => t.id === f.team2Id);
                if (!t1 || !t2) return null;
                return (
                  <div key={f.id} style={{ background: C.bg2, borderRadius: 4, padding: "6px 8px", fontSize: 11, lineHeight: 1.35 }}>
                    <div style={{ fontWeight: 700, color: C.text }}>
                      {t1.p1.split(" ")[0]} / {t1.p2.split(" ")[0]}
                    </div>
                    <div style={{ color: C.mute, fontSize: 9, margin: "1px 0" }}>vs</div>
                    <div style={{ fontWeight: 700, color: C.text }}>
                      {t2.p1.split(" ")[0]} / {t2.p2.split(" ")[0]}
                    </div>
                  </div>
                );
              })}
              {divFix.length === 0 && (
                <div style={{ color: C.mute, fontSize: 11, fontStyle: "italic" }}>Fixtures TBC</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LivePanelStandings({
  teams,
  fixtures,
  tier,
}: {
  teams: Record<string, Team[]>;
  fixtures: Fixture[];
  tier: Tier;
}) {
  const tierDivs = DIVISIONS.filter((d) => d.tier === tier);
  const tierColor = tier === "lower" ? C.accent : C.info;
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${tierDivs.length}, 1fr)`, gap: 24, height: "100%" }}>
      {tierDivs.map((d) => {
        const rows = computeStandings(d.id, teams, fixtures);
        return (
          <div key={d.id} style={{ background: C.card, borderRadius: 10, padding: 20, border: `1px solid ${C.border}`, borderTop: `3px solid ${tierColor}` }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 16 }}>
              <div style={{ fontFamily: F.display, fontSize: 30, color: tierColor, lineHeight: 1 }}>{d.name}</div>
              <div style={{ fontSize: 12, color: C.mute }}>{d.tierLabel}</div>
            </div>
            <LiveStandingsTable rows={rows} tierColor={tierColor} />
          </div>
        );
      })}
    </div>
  );
}

function LiveStandingsTable({ rows, tierColor }: { rows: StandingRow[]; tierColor: string }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ color: C.mute, fontSize: 10, letterSpacing: "0.1em" }}>
          <th style={{ padding: "4px 0", textAlign: "left" }}></th>
          <th style={{ padding: "4px 0", textAlign: "left" }}>TEAM</th>
          <th style={{ padding: "4px 6px", textAlign: "center" }}>P</th>
          <th style={{ padding: "4px 6px", textAlign: "center" }}>W</th>
          <th style={{ padding: "4px 6px", textAlign: "center", color: tierColor }}>PTS</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const inPlayoff = r.rank <= 4;
          return (
            <Fragment key={r.teamId}>
              <tr style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ padding: "8px 0", width: 28 }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      background: inPlayoff ? tierColor : C.card2,
                      color: inPlayoff ? C.bg : C.mute,
                      borderRadius: 4,
                      textAlign: "center",
                      lineHeight: "22px",
                      fontFamily: F.mono,
                      fontWeight: 700,
                      fontSize: 11,
                    }}
                  >
                    {r.rank}
                  </div>
                </td>
                <td style={{ padding: "8px 4px", fontSize: 12, lineHeight: 1.2, opacity: r.team.placeholder ? 0.4 : 1 }}>
                  <div style={{ fontWeight: 700 }}>{r.team.p1}</div>
                  <div style={{ color: C.mute, fontSize: 11 }}>{r.team.p2}</div>
                </td>
                <td style={{ textAlign: "center", fontFamily: F.mono, fontSize: 13 }}>{r.P}</td>
                <td style={{ textAlign: "center", fontFamily: F.mono, fontSize: 13 }}>{r.W}</td>
                <td style={{ textAlign: "center", fontFamily: F.mono, fontSize: 18, fontWeight: 700, color: tierColor }}>
                  {r.Pts}
                </td>
              </tr>
              {r.rank === 4 && (
                <tr>
                  <td colSpan={5} style={{ padding: 0 }}>
                    <div style={{ height: 2, background: `linear-gradient(90deg, ${tierColor}, transparent)`, position: "relative" }}>
                      <span style={{ position: "absolute", right: 0, top: -8, fontSize: 9, color: tierColor, background: C.card, padding: "1px 6px", letterSpacing: "0.1em" }}>
                        ▲ PLAYOFF
                      </span>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}

function LivePanelResults({
  teams,
  fixtures,
}: {
  teams: Record<string, Team[]>;
  fixtures: Fixture[];
}) {
  const completed = fixtures
    .filter((f) => f.status === "completed" && f.sets)
    .sort((a, b) => (b.enteredAt || 0) - (a.enteredAt || 0))
    .slice(0, 8);

  if (completed.length === 0) {
    return (
      <div style={{ textAlign: "center", paddingTop: 100 }}>
        <div style={{ fontFamily: F.display, fontSize: 60, color: C.mute, letterSpacing: "0.05em" }}>
          NO RESULTS YET
        </div>
        <div style={{ fontSize: 16, color: C.mute, marginTop: 12 }}>First whistle blows Saturday, June 6.</div>
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
      {completed.map((f) => {
        const div = DIVISIONS.find((d) => d.id === f.divisionId)!;
        const divTeams = teams[f.divisionId] ?? [];
        const t1 = divTeams.find((t) => t.id === f.team1Id);
        const t2 = divTeams.find((t) => t.id === f.team2Id);
        if (!t1 || !t2 || !f.sets) return null;
        let s1 = 0;
        let s2 = 0;
        f.sets.forEach(([a, b]) => {
          if (a > b) s1++;
          else s2++;
        });
        const t1Won = s1 > s2;
        const tierColor = div.tier === "lower" ? C.accent : C.info;
        return (
          <div
            key={f.id}
            style={{
              background: C.card,
              borderRadius: 10,
              padding: 16,
              border: `1px solid ${C.border}`,
              borderLeft: `4px solid ${tierColor}`,
            }}
          >
            <div style={{ fontSize: 11, color: C.mute, marginBottom: 8, letterSpacing: "0.1em" }}>
              {div.name} · ROUND {f.round}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: t1Won ? 800 : 500, color: t1Won ? C.accent : C.text }}>
                  {t1.p1} / {t1.p2}
                </div>
                <div style={{ fontSize: 13, fontWeight: !t1Won ? 800 : 500, color: !t1Won ? C.accent : C.text, marginTop: 6 }}>
                  {t2.p1} / {t2.p2}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                {f.sets.map(([a, b], i) => (
                  <div key={i} style={{ fontFamily: F.mono, fontSize: 18, fontWeight: 700 }}>
                    <span style={{ color: a > b ? C.accent : C.mute }}>{a}</span>
                    <span style={{ color: C.mute, margin: "0 4px" }}>-</span>
                    <span style={{ color: b > a ? C.accent : C.mute }}>{b}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LivePanelPlayoff({
  teams,
  fixtures,
}: {
  teams: Record<string, Team[]>;
  fixtures: Fixture[];
}) {
  const tiers: Tier[] = ["lower", "upper"];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, height: "100%" }}>
      {tiers.map((tier) => {
        const tierLabel = tier === "lower" ? "LOWER TIER" : "UPPER TIER";
        const tierRange = tier === "lower" ? "0.5 – 2.4" : "2.5 – 5.5";
        const tierColor = tier === "lower" ? C.accent : C.info;
        const tierDivs = DIVISIONS.filter((d) => d.tier === tier);
        return (
          <div key={tier} style={{ background: C.card, borderRadius: 12, padding: 24, border: `1px solid ${C.border}`, borderTop: `4px solid ${tierColor}` }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
              <div style={{ fontFamily: F.display, fontSize: 32, color: tierColor, lineHeight: 1 }}>{tierLabel}</div>
              <div style={{ fontSize: 13, color: C.mute }}>{tierRange}</div>
            </div>
            <div
              style={{
                background: C.bg2,
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 8,
              }}
            >
              {[
                { rank: "1st", prize: "€500" },
                { rank: "2nd", prize: "€250" },
                { rank: "3rd", prize: "€100" },
                { rank: "4th", prize: "€50" },
              ].map((p) => (
                <div key={p.rank} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: C.mute, letterSpacing: "0.1em" }}>{p.rank}</div>
                  <div style={{ fontFamily: F.display, fontSize: 22, color: tierColor }}>{p.prize}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: C.mute, marginBottom: 8, letterSpacing: "0.1em" }}>
              IN THE HUNT — TOP 4 OF EACH DIVISION QUALIFY
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {tierDivs.map((d) => {
                const rows = computeStandings(d.id, teams, fixtures);
                return (
                  <div key={d.id}>
                    <div style={{ fontSize: 11, color: C.mute, margin: "4px 0", fontWeight: 700 }}>{d.name}</div>
                    {rows.slice(0, 4).map((r) => (
                      <div
                        key={r.teamId}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "4px 8px",
                          background: C.bg2,
                          borderRadius: 4,
                          marginBottom: 2,
                          fontSize: 11,
                          opacity: r.team.placeholder ? 0.4 : 1,
                        }}
                      >
                        <span style={{ width: 18, fontFamily: F.mono, color: tierColor, fontWeight: 700 }}>{r.rank}</span>
                        <span style={{ flex: 1, fontWeight: 600 }}>
                          {r.team.p1.split(" ")[0]} / {r.team.p2.split(" ")[0]}
                        </span>
                        <span style={{ fontFamily: F.mono, fontWeight: 700, color: tierColor }}>{r.Pts}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
