"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { C, F } from "@/theme/tokens";
import type { Fixture, SetScore, Settings, Team } from "@/lib/types";
import {
  ADMIN_EMAILS,
  DIVISIONS,
  ROUNDS,
  VERSION,
  BUILD_DATE,
  buildFixturesForDivision,
  fmtDate,
  weekRangeForRound,
} from "@/lib/league";
import { createClient } from "@/lib/supabase/client";
import { useLeagueData } from "@/lib/useLeagueData";
import { Logo, ScoreCell, TeamName } from "./ui";

// ---------------------------------------------------------------------------
// Shell: handles auth state, renders login / not-authorised / console.
// ---------------------------------------------------------------------------
export function AdminConsole() {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  const email = session?.user?.email ?? null;
  const isAdmin = !!email && (ADMIN_EMAILS as readonly string[]).includes(email);

  const shell = (children: React.ReactNode) => (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: F.body }}>
      <AdminBar email={email} isAdmin={isAdmin} onSignOut={() => supabase.auth.signOut()} />
      {children}
    </div>
  );

  if (session === undefined) {
    return shell(
      <div style={{ padding: "60px 20px", textAlign: "center", color: C.mute }}>Loading…</div>
    );
  }
  if (!session) return shell(<AdminLogin supabase={supabase} />);
  if (!isAdmin) return shell(<NotAuthorised email={email!} />);
  return shell(<AdminView userId={session.user.id} supabase={supabase} />);
}

function AdminBar({
  email,
  isAdmin,
  onSignOut,
}: {
  email: string | null;
  isAdmin: boolean;
  onSignOut: () => void;
}) {
  return (
    <div
      style={{
        background: C.bg,
        borderBottom: `1px solid ${C.border}`,
        padding: "14px 20px",
        display: "flex",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <Logo style={{ width: 44, height: 44 }} />
      <div>
        <div style={{ fontFamily: F.display, fontSize: 20, color: C.text, letterSpacing: "0.03em", lineHeight: 1 }}>
          ADMIN CONSOLE
        </div>
        <div style={{ fontFamily: F.body, fontSize: 11, color: C.mute, marginTop: 3 }}>
          League Tracker {VERSION} · {BUILD_DATE}
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <Link
        href="/"
        style={{ fontSize: 12, color: C.mute, textDecoration: "none", padding: "6px 12px", border: `1px solid ${C.border}`, borderRadius: 6 }}
      >
        ← Public site
      </Link>
      {email && (
        <>
          <span style={{ fontSize: 12, color: isAdmin ? C.green : C.amber }}>
            {isAdmin ? "●" : "○"} {email}
          </span>
          <button
            onClick={onSignOut}
            style={{
              padding: "6px 12px",
              background: "transparent",
              color: C.mute,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              fontFamily: F.body,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Magic-link login
// ---------------------------------------------------------------------------
function AdminLogin({ supabase }: { supabase: ReturnType<typeof createClient> }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  const send = async () => {
    if (!email.trim()) return;
    setStatus("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/admin` },
    });
    if (error) {
      setErrMsg(error.message);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  };

  return (
    <div style={{ padding: "60px 20px", maxWidth: 420, margin: "0 auto", textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
        <Logo style={{ width: 96, height: 96, fontSize: 36 }} />
      </div>
      <div style={{ fontFamily: F.display, fontSize: 32, color: C.accent, letterSpacing: "0.05em", marginBottom: 6 }}>
        ADMIN SIGN IN
      </div>
      <div style={{ color: C.mute, fontSize: 13, marginBottom: 28 }}>
        Enter your admin email. We&apos;ll send a one-time magic link — no password needed.
      </div>

      {status === "sent" ? (
        <div
          style={{
            background: "rgba(74,222,128,0.08)",
            border: `1px solid rgba(74,222,128,0.4)`,
            borderRadius: 8,
            padding: "16px 18px",
            color: C.text,
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <div style={{ color: C.green, fontWeight: 700, marginBottom: 4 }}>Check your inbox</div>
          A magic link is on its way to <strong>{email}</strong>. Open it on this device to sign in.
        </div>
      ) : (
        <>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status === "error") setStatus("idle");
            }}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="you@w7padel.com"
            style={{
              width: "100%",
              padding: "14px 16px",
              background: C.card,
              border: `1px solid ${status === "error" ? C.red : C.border}`,
              color: C.text,
              borderRadius: 8,
              fontFamily: F.body,
              fontSize: 16,
              textAlign: "center",
              outline: "none",
            }}
          />
          {status === "error" && (
            <div style={{ color: C.red, fontSize: 12, marginTop: 10 }}>{errMsg}</div>
          )}
          <div style={{ marginTop: 20 }}>
            <button
              onClick={send}
              disabled={status === "sending"}
              style={{
                padding: "12px 32px",
                background: C.accent,
                color: C.bg,
                border: "none",
                borderRadius: 6,
                fontFamily: F.body,
                fontWeight: 700,
                fontSize: 13,
                cursor: status === "sending" ? "wait" : "pointer",
                letterSpacing: "0.05em",
              }}
            >
              {status === "sending" ? "SENDING…" : "SEND MAGIC LINK"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function NotAuthorised({ email }: { email: string }) {
  return (
    <div style={{ padding: "60px 20px", maxWidth: 460, margin: "0 auto", textAlign: "center" }}>
      <div style={{ fontFamily: F.display, fontSize: 28, color: C.red, letterSpacing: "0.04em", marginBottom: 10 }}>
        NOT AUTHORISED
      </div>
      <div style={{ color: C.mute, fontSize: 13, lineHeight: 1.6 }}>
        <strong style={{ color: C.text }}>{email}</strong> is signed in but is not on the admin list.
        Sign out and use one of the registered admin addresses, or ask Richie to add you.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Score entry console
// ---------------------------------------------------------------------------
function AdminView({
  userId,
  supabase,
}: {
  userId: string;
  supabase: ReturnType<typeof createClient>;
}) {
  const { teamsByDiv, fixtures, settings } = useLeagueData();
  const [selectedDivId, setSelectedDivId] = useState(DIVISIONS[0].id);
  const [selectedRound, setSelectedRound] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const fail = (label: string, error: unknown) => {
    const msg = error instanceof Error ? error.message : String(error);
    alert(`${label} failed: ${msg}`);
  };

  const handleScore = async (fixtureId: string, sets: SetScore[]) => {
    setBusy(fixtureId);
    const { error } = await supabase
      .from("fixtures")
      .update({ sets, status: "completed", entered_by: userId, entered_at: new Date().toISOString() })
      .eq("id", fixtureId);
    setBusy(null);
    if (error) fail("Save", error);
  };

  const handleClearScore = async (fixtureId: string) => {
    setBusy(fixtureId);
    const { error } = await supabase
      .from("fixtures")
      .update({ sets: null, status: "pending", entered_by: null, entered_at: null })
      .eq("id", fixtureId);
    setBusy(null);
    if (error) fail("Clear", error);
  };

  const handleResetAllScores = async () => {
    const { error } = await supabase
      .from("fixtures")
      .update({ sets: null, status: "pending", entered_by: null, entered_at: null })
      .eq("status", "completed");
    if (error) fail("Reset", error);
  };

  const handleUpdateSettings = async (next: Settings) => {
    const { error } = await supabase
      .from("settings")
      .update({ lower_status: next.lowerStatus, upper_status: next.upperStatus })
      .eq("id", 1);
    if (error) fail("Settings update", error);
  };

  const handleGenerateFixtures = async () => {
    const rows: Array<{
      code: string;
      division_id: string;
      round: number;
      team1_id: string;
      team2_id: string;
      status: string;
      sets: null;
      tbc: "both" | "one" | null;
      notes: string;
    }> = [];
    let n = 0;
    for (const d of DIVISIONS) {
      const divTeams = teamsByDiv[d.id] ?? [];
      if (divTeams.length < 2) continue;
      for (const g of buildFixturesForDivision(divTeams)) {
        n += 1;
        rows.push({
          code: `F${String(n).padStart(4, "0")}`,
          division_id: g.divisionId,
          round: g.round,
          team1_id: g.team1Id,
          team2_id: g.team2Id,
          status: "pending",
          sets: null,
          tbc: g.tbc,
          notes: "",
        });
      }
    }
    if (!rows.length) {
      alert("No teams loaded — seed teams before generating fixtures.");
      return;
    }
    const del = await supabase
      .from("fixtures")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (del.error) return fail("Clearing old fixtures", del.error);
    const ins = await supabase.from("fixtures").insert(rows);
    if (ins.error) return fail("Generating fixtures", ins.error);
    alert(`Generated ${rows.length} fixtures across ${DIVISIONS.length} divisions.`);
  };

  const roundFixtures = fixtures
    .filter((f) => f.divisionId === selectedDivId && f.round === selectedRound)
    .sort((a, b) => (a.code ?? "").localeCompare(b.code ?? ""));

  return (
    <div style={{ padding: "20px", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ fontFamily: F.display, fontSize: 22, color: C.accent, letterSpacing: "0.05em" }}>
          SCORE ENTRY
        </div>
        <div style={{ color: C.mute, fontSize: 12 }}>
          Round {selectedRound} · {fmtDate(weekRangeForRound(selectedRound).start, { day: true })} →{" "}
          {fmtDate(weekRangeForRound(selectedRound).end, { day: true })}
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setShowSettings(!showSettings)}
          style={{
            padding: "8px 14px",
            background: C.card,
            color: C.text,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            fontFamily: F.body,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Settings
        </button>
      </div>

      {showSettings && (
        <SettingsPanel
          settings={settings}
          fixtures={fixtures}
          onUpdate={handleUpdateSettings}
          onClose={() => setShowSettings(false)}
          onResetAllScores={handleResetAllScores}
          onGenerateFixtures={handleGenerateFixtures}
        />
      )}

      <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {DIVISIONS.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedDivId(d.id)}
              style={{
                padding: "8px 14px",
                background: selectedDivId === d.id ? C.accent : C.card,
                color: selectedDivId === d.id ? C.bg : C.text,
                border: `1px solid ${selectedDivId === d.id ? C.accent : C.border}`,
                borderRadius: 6,
                fontFamily: F.body,
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {d.name} <span style={{ opacity: 0.7, fontWeight: 400 }}>{d.tierLabel}</span>
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {Array.from({ length: ROUNDS }, (_, i) => i + 1).map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRound(r)}
              style={{
                width: 36,
                height: 36,
                background: selectedRound === r ? C.accent : C.card,
                color: selectedRound === r ? C.bg : C.text,
                border: `1px solid ${selectedRound === r ? C.accent : C.border}`,
                borderRadius: 6,
                fontFamily: F.mono,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {roundFixtures.length === 0 && (
          <div style={{ color: C.mute, fontSize: 13, padding: "24px 4px" }}>
            No fixtures for this round yet. Use <strong>Settings → Generate fixtures</strong> once teams are seeded.
          </div>
        )}
        {roundFixtures.map((f) => (
          <FixtureRow
            key={f.id}
            fixture={f}
            teams={teamsByDiv[f.divisionId] ?? []}
            busy={busy === f.id}
            onScore={handleScore}
            onClearScore={handleClearScore}
          />
        ))}
      </div>
    </div>
  );
}

function SettingsPanel({
  settings,
  fixtures,
  onUpdate,
  onClose,
  onResetAllScores,
  onGenerateFixtures,
}: {
  settings: Settings;
  fixtures: Fixture[];
  onUpdate: (s: Settings) => void;
  onClose: () => void;
  onResetAllScores: () => void;
  onGenerateFixtures: () => void;
}) {
  const completedCount = fixtures.filter((f) => f.status === "completed").length;
  const tiers: { key: "lowerStatus" | "upperStatus"; label: string }[] = [
    { key: "lowerStatus", label: "Lower Tier (0.5–2.4)" },
    { key: "upperStatus", label: "Upper Tier (2.5–5.5)" },
  ];
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontFamily: F.display, fontSize: 14, color: C.accent, letterSpacing: "0.1em" }}>SETTINGS</div>
        <div style={{ flex: 1 }} />
        <button
          onClick={onClose}
          style={{ background: "transparent", border: "none", color: C.mute, cursor: "pointer", fontSize: 18 }}
        >
          ×
        </button>
      </div>

      <div style={{ paddingBottom: 14, marginBottom: 16, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 11, color: C.mute, letterSpacing: "0.1em", marginBottom: 10 }}>
          ENTRY STATUS (shown on the Status page)
        </div>
        {tiers.map((tier) => {
          const cur = settings[tier.key] || "available";
          return (
            <div key={tier.key} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <div style={{ flex: 1, fontSize: 13, color: C.text }}>{tier.label}</div>
              {(["available", "full"] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => onUpdate({ ...settings, [tier.key]: opt })}
                  style={{
                    padding: "6px 14px",
                    background: cur === opt ? (opt === "full" ? C.red : C.green) : "transparent",
                    color: cur === opt ? C.bg : C.mute,
                    border: `1px solid ${cur === opt ? (opt === "full" ? C.red : C.green) : C.border}`,
                    borderRadius: 6,
                    fontFamily: F.body,
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {opt === "full" ? "Full" : "Slots available"}
                </button>
              ))}
            </div>
          );
        })}
      </div>

      <div style={{ paddingBottom: 14, marginBottom: 16, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 11, color: C.mute, letterSpacing: "0.1em", marginBottom: 8 }}>FIXTURES</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13 }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: C.text, fontWeight: 600 }}>Generate all fixtures</div>
            <div style={{ color: C.mute, fontSize: 11, marginTop: 2 }}>
              Builds the round-robin schedule for every division from the current teams. Replaces
              all existing fixtures and clears any entered scores. Run this once teams are finalised.
            </div>
          </div>
          <button
            onClick={() => {
              if (
                confirm(
                  "Regenerate all fixtures from current teams? This replaces every fixture and clears all entered scores."
                )
              ) {
                onGenerateFixtures();
                onClose();
              }
            }}
            style={{
              padding: "8px 16px",
              background: C.accent,
              color: C.bg,
              border: "none",
              borderRadius: 6,
              fontFamily: F.body,
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              letterSpacing: "0.04em",
              whiteSpace: "nowrap",
            }}
          >
            Generate fixtures
          </button>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11, color: C.mute, letterSpacing: "0.1em", marginBottom: 8 }}>DANGER ZONE</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13 }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: C.text, fontWeight: 600 }}>Reset all scores</div>
            <div style={{ color: C.mute, fontSize: 11, marginTop: 2 }}>
              Clears every entered result across all divisions and rounds. Teams and fixtures are kept.
              {completedCount > 0 && (
                <span style={{ color: C.amber, marginLeft: 6 }}>
                  Currently {completedCount} result{completedCount === 1 ? "" : "s"} entered.
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => {
              if (
                confirm(
                  `This will clear all ${completedCount} entered result${completedCount === 1 ? "" : "s"} across every division. Fixtures and teams stay in place. Continue?`
                )
              ) {
                onResetAllScores();
                onClose();
              }
            }}
            disabled={completedCount === 0}
            style={{
              padding: "8px 16px",
              background: completedCount === 0 ? C.bg2 : "transparent",
              color: completedCount === 0 ? C.mute : C.red,
              border: `1px solid ${completedCount === 0 ? C.border : C.red}`,
              borderRadius: 6,
              fontFamily: F.body,
              fontWeight: 700,
              fontSize: 12,
              cursor: completedCount === 0 ? "not-allowed" : "pointer",
              letterSpacing: "0.05em",
              whiteSpace: "nowrap",
            }}
          >
            Wipe scores
          </button>
        </div>
      </div>
    </div>
  );
}

function FixtureRow({
  fixture,
  teams,
  busy,
  onScore,
  onClearScore,
}: {
  fixture: Fixture;
  teams: Team[];
  busy: boolean;
  onScore: (id: string, sets: SetScore[]) => void;
  onClearScore: (id: string) => void;
}) {
  const t1 = teams.find((t) => t.id === fixture.team1Id);
  const t2 = teams.find((t) => t.id === fixture.team2Id);
  const emptySets: [string, string][] = [["", ""], ["", ""], ["", ""]];
  const fromFixture = (): [string, string][] =>
    fixture.sets ? fixture.sets.map(([a, b]) => [String(a), String(b)] as [string, string]) : emptySets;
  const [editing, setEditing] = useState(false);
  const [sets, setSets] = useState<[string, string][]>(fromFixture);

  const isComplete = fixture.status === "completed" && !!fixture.sets;

  const handleSave = () => {
    const clean = sets
      .map(([a, b]) => [parseInt(a, 10), parseInt(b, 10)] as SetScore)
      .filter(([a, b]) => !isNaN(a) && !isNaN(b));
    if (clean.length < 2) {
      alert("At least 2 sets required.");
      return;
    }
    onScore(fixture.id, clean);
    setEditing(false);
  };

  return (
    <div
      style={{
        background: isComplete ? C.bg2 : C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: "12px 16px",
        display: "grid",
        gridTemplateColumns: "60px 1fr 1fr auto",
        alignItems: "center",
        gap: 16,
        opacity: busy ? 0.6 : 1,
      }}
    >
      <div style={{ fontFamily: F.mono, fontSize: 11, color: C.mute }}>{fixture.code ?? "—"}</div>
      <TeamName team={t1} size="sm" mute={t1?.placeholder} />
      <TeamName team={t2} size="sm" mute={t2?.placeholder} />
      <div>
        {editing ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {sets.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                <input
                  type="number"
                  min="0"
                  value={s[0]}
                  onChange={(e) => {
                    const next = [...sets] as [string, string][];
                    next[i] = [e.target.value, next[i][1]];
                    setSets(next);
                  }}
                  style={inputStyle}
                />
                <span style={{ color: C.mute }}>-</span>
                <input
                  type="number"
                  min="0"
                  value={s[1]}
                  onChange={(e) => {
                    const next = [...sets] as [string, string][];
                    next[i] = [next[i][0], e.target.value];
                    setSets(next);
                  }}
                  style={inputStyle}
                />
              </div>
            ))}
            <button onClick={handleSave} style={primaryBtn}>
              Save
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setSets(fromFixture());
              }}
              style={ghostBtn}
            >
              Cancel
            </button>
          </div>
        ) : isComplete ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ScoreCell sets={fixture.sets} />
            <button onClick={() => setEditing(true)} style={smallGhostBtn}>
              Edit
            </button>
            <button
              onClick={() => confirm("Clear this result?") && onClearScore(fixture.id)}
              style={{ ...smallGhostBtn, color: C.red }}
            >
              Clear
            </button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} style={{ ...primaryBtn, padding: "8px 16px" }}>
            Enter score
          </button>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: 36,
  padding: "6px 4px",
  background: C.bg,
  border: `1px solid ${C.border}`,
  color: C.text,
  borderRadius: 4,
  textAlign: "center",
  fontFamily: F.mono,
};
const primaryBtn: React.CSSProperties = {
  padding: "6px 14px",
  background: C.accent,
  color: C.bg,
  border: "none",
  borderRadius: 4,
  fontFamily: F.body,
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
};
const ghostBtn: React.CSSProperties = {
  padding: "6px 10px",
  background: "transparent",
  color: C.mute,
  border: `1px solid ${C.border}`,
  borderRadius: 4,
  fontSize: 12,
  cursor: "pointer",
};
const smallGhostBtn: React.CSSProperties = {
  padding: "4px 10px",
  background: "transparent",
  color: C.mute,
  border: `1px solid ${C.border}`,
  borderRadius: 4,
  fontSize: 11,
  cursor: "pointer",
};
