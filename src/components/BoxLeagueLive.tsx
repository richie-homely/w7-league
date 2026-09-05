"use client";

// Live box league: standings per box, match list, and player self-service
// score entry cross-validated against registered team emails (see the
// interest_and_box_league migration for the server-side rules).

import { useEffect, useMemo, useRef, useState } from "react";
import { C, F } from "@/theme/tokens";
import { formatScore, parseSets, setsWon } from "@/lib/scoring";
import {
  computeBoxStandings,
  confirmBoxScore,
  submitBoxScore,
  type BoxMatch,
  type BoxTeam,
} from "@/lib/box";

const STATUS_CHIP: Record<string, { label: string; color: string }> = {
  pending: { label: "TO PLAY", color: C.mute },
  submitted: { label: "AWAITING CONFIRMATION", color: C.amber },
  confirmed: { label: "CONFIRMED", color: C.green },
  disputed: { label: "DISPUTED", color: C.red },
};

const inputStyle: React.CSSProperties = {
  background: C.bg2,
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  padding: "8px 10px",
  color: C.text,
  fontFamily: F.body,
  fontSize: 13,
  boxSizing: "border-box",
};

const setInputStyle: React.CSSProperties = {
  ...inputStyle,
  width: 46,
  textAlign: "center",
  fontFamily: F.mono,
};

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        padding: "2px 8px",
        border: `1px solid ${color}`,
        borderRadius: 999,
        color,
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: "0.1em",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

// ── Score entry / confirmation forms ─────────────────────────────────────────

function SubmitForm({
  match,
  team1,
  team2,
  onDone,
}: {
  match: BoxMatch;
  team1: BoxTeam;
  team2: BoxTeam;
  onDone: (msg: { ok: boolean; text: string }) => void;
}) {
  const [raw, setRaw] = useState<[string, string][]>([
    ["", ""],
    ["", ""],
    ["", ""],
  ]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Same entry feel as the summer-league admin console (Richie, 5 Sep 2026):
  // a digit in a regular set jumps straight to the other team's cell for that
  // set, then on to the next set; the third-set tiebreak can be two digits so
  // it stays put. Refs are indexed setIndex*2 + side.
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => {
    const id = setTimeout(() => inputsRef.current[0]?.focus(), 0);
    return () => clearTimeout(id);
  }, []);
  const setCell = (i: number, j: 0 | 1, v: string) => {
    setRaw((cur) => cur.map((s, k) => (k === i ? ((j === 0 ? [v, s[1]] : [s[0], v]) as [string, string]) : s)));
    if (i < 2 && /^\d$/.test(v)) {
      const nextEl = inputsRef.current[i * 2 + j + 1];
      nextEl?.focus();
      nextEl?.select();
    }
  };
  // Live winner: flagged as soon as a side has clinched two sets of what is typed.
  const { s1, s2 } = setsWon(parseSets(raw));
  const winner = s1 >= 2 && s1 > s2 ? 0 : s2 >= 2 && s2 > s1 ? 1 : -1;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const sets = parseSets(raw);
    if (sets.length < 2) {
      setError("Enter at least the first two sets.");
      return;
    }
    if (sets.some(([a, b]) => a === b)) {
      setError("A set can't be drawn — check the scores.");
      return;
    }
    if (!email.includes("@")) {
      setError("Enter the email address you registered with.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await submitBoxScore(match.id, sets, email.trim());
    setBusy(false);
    if (!res.ok) setError(res.text);
    else onDone(res);
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: C.bg2,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: "14px 16px",
        marginTop: 8,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 8, alignItems: "center" }}>
        <div style={{ fontSize: 11, color: C.mute, fontWeight: 700, letterSpacing: "0.08em" }}>SETS</div>
        <div style={{ fontSize: 10, color: C.mute, textAlign: "center" }}>1</div>
        <div style={{ fontSize: 10, color: C.mute, textAlign: "center" }}>2</div>
        <div style={{ fontSize: 10, color: C.mute, textAlign: "center" }}>3 (TB)</div>
        {[team1, team2].map((t, side) => {
          const won = winner === side;
          const lost = winner !== -1 && !won;
          return (
            <div key={t.id} style={{ display: "contents" }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: won ? 800 : 600,
                  color: won ? C.green : lost ? C.mute : side === 0 ? C.accent : C.info,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "color 120ms",
                }}
              >
                {won && <span aria-label="winner">🏆</span>}
                {t.name}
              </div>
              {[0, 1, 2].map((i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputsRef.current[i * 2 + side] = el;
                  }}
                  style={{
                    ...setInputStyle,
                    borderColor: won ? C.green : side === 0 ? C.accent : C.info,
                    fontWeight: won ? 700 : 500,
                  }}
                  inputMode="numeric"
                  maxLength={2}
                  value={raw[i][side as 0 | 1]}
                  onChange={(e) => setCell(i, side as 0 | 1, e.target.value.replace(/\D/g, ""))}
                  onFocus={(e) => e.target.select()}
                  aria-label={`Set ${i + 1} games for ${t.name}`}
                />
              ))}
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: C.mute }}>
        Best of 3 — the deciding 3rd set is a championship tiebreak. Leave set 3 blank for a 2–0 win.
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          style={{ ...inputStyle, flex: "1 1 220px" }}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your registered email (either player, either team)"
        />
        <button
          type="submit"
          disabled={busy}
          style={{
            background: C.accent,
            color: C.bg,
            border: "none",
            borderRadius: 6,
            padding: "9px 16px",
            fontFamily: F.body,
            fontSize: 13,
            fontWeight: 700,
            cursor: busy ? "wait" : "pointer",
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? "Submitting…" : "Submit result"}
        </button>
      </div>
      {error && <div style={{ color: C.red, fontSize: 12.5 }}>{error}</div>}
    </form>
  );
}

function ConfirmForm({
  match,
  onDone,
}: {
  match: BoxMatch;
  onDone: (msg: { ok: boolean; text: string }) => void;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<false | "confirm" | "dispute">(false);
  const [error, setError] = useState<string | null>(null);

  async function act(agree: boolean) {
    if (!email.includes("@")) {
      setError("Enter the email address you registered with.");
      return;
    }
    setBusy(agree ? "confirm" : "dispute");
    setError(null);
    const res = await confirmBoxScore(match.id, email.trim(), agree);
    setBusy(false);
    if (!res.ok) setError(res.text);
    else onDone(res);
  }

  return (
    <div
      style={{
        background: C.bg2,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: "14px 16px",
        marginTop: 8,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ fontSize: 12.5, color: C.text, lineHeight: 1.5 }}>
        Confirm this result as the <strong>opposing team</strong> — enter the email you registered
        with. If the score is wrong, dispute it (or submit your own version above and the W7 team
        will resolve it).
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          style={{ ...inputStyle, flex: "1 1 220px" }}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your registered email"
        />
        <button
          onClick={() => act(true)}
          disabled={!!busy}
          style={{
            background: C.green,
            color: C.bg,
            border: "none",
            borderRadius: 6,
            padding: "9px 16px",
            fontSize: 13,
            fontWeight: 700,
            cursor: busy ? "wait" : "pointer",
          }}
        >
          {busy === "confirm" ? "Confirming…" : "Confirm ✓"}
        </button>
        <button
          onClick={() => act(false)}
          disabled={!!busy}
          style={{
            background: "transparent",
            color: C.red,
            border: `1px solid ${C.red}`,
            borderRadius: 6,
            padding: "9px 16px",
            fontSize: 13,
            fontWeight: 700,
            cursor: busy ? "wait" : "pointer",
          }}
        >
          {busy === "dispute" ? "…" : "Dispute"}
        </button>
      </div>
      {error && <div style={{ color: C.red, fontSize: 12.5 }}>{error}</div>}
    </div>
  );
}

// ── Match row ────────────────────────────────────────────────────────────────

function MatchRow({
  match,
  teamsById,
  onMessage,
}: {
  match: BoxMatch;
  teamsById: Record<string, BoxTeam>;
  onMessage: (msg: { ok: boolean; text: string }) => void;
}) {
  const [open, setOpen] = useState<false | "submit" | "confirm">(false);
  const t1 = teamsById[match.team1Id];
  const t2 = teamsById[match.team2Id];
  if (!t1 || !t2) return null;
  const chip = STATUS_CHIP[match.status];
  const done = (msg: { ok: boolean; text: string }) => {
    setOpen(false);
    onMessage(msg);
  };

  return (
    <div style={{ borderTop: `1px solid ${C.border}`, padding: "10px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 240px", fontSize: 13.5 }}>
          <span style={{ fontWeight: 600 }}>{t1.name}</span>
          <span style={{ color: C.mute }}> vs </span>
          <span style={{ fontWeight: 600 }}>{t2.name}</span>
        </div>
        <div style={{ fontFamily: F.mono, fontSize: 13, color: match.status === "confirmed" ? C.text : C.mute }}>
          {formatScore(match.sets)}
        </div>
        <Chip label={chip.label} color={chip.color} />
        {(match.status === "pending" || match.status === "disputed") && (
          <button onClick={() => setOpen(open === "submit" ? false : "submit")} style={actionBtn}>
            {open === "submit" ? "Close" : "Enter result"}
          </button>
        )}
        {match.status === "submitted" && (
          <>
            <button onClick={() => setOpen(open === "confirm" ? false : "confirm")} style={actionBtn}>
              {open === "confirm" ? "Close" : "Confirm result"}
            </button>
            <button onClick={() => setOpen(open === "submit" ? false : "submit")} style={ghostBtn}>
              Correct score
            </button>
          </>
        )}
      </div>
      {open === "submit" && <SubmitForm match={match} team1={t1} team2={t2} onDone={done} />}
      {open === "confirm" && <ConfirmForm match={match} onDone={done} />}
    </div>
  );
}

const actionBtn: React.CSSProperties = {
  background: "transparent",
  color: C.accent,
  border: `1px solid ${C.accent}`,
  borderRadius: 6,
  padding: "6px 12px",
  fontFamily: F.body,
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  ...actionBtn,
  color: C.mute,
  border: `1px solid ${C.border}`,
};

// ── Box section: standings + matches ─────────────────────────────────────────

function BoxSection({
  box,
  teams,
  matches,
  onMessage,
}: {
  box: number;
  teams: BoxTeam[];
  matches: BoxMatch[];
  onMessage: (msg: { ok: boolean; text: string }) => void;
}) {
  const standings = useMemo(() => computeBoxStandings(teams, matches), [teams, matches]);
  const teamsById = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t])), [teams]);
  const played = matches.filter((m) => m.status === "confirmed").length;

  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: "18px 20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontFamily: F.display, fontSize: 24, letterSpacing: "0.03em" }}>
          BOX <span style={{ color: C.accent }}>{box}</span>
        </div>
        <div style={{ fontSize: 11.5, color: C.mute }}>
          {teams.length} teams · {played}/{matches.length} played
        </div>
      </div>

      {/* Standings */}
      <div style={{ overflowX: "auto", marginTop: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ color: C.mute, fontSize: 10.5, letterSpacing: "0.08em", textAlign: "left" }}>
              <th style={{ padding: "4px 8px 4px 0" }}>#</th>
              <th style={{ padding: "4px 8px 4px 0" }}>TEAM</th>
              <th style={{ padding: "4px 8px", textAlign: "center" }}>P</th>
              <th style={{ padding: "4px 8px", textAlign: "center" }}>W</th>
              <th style={{ padding: "4px 8px", textAlign: "center" }}>L</th>
              <th style={{ padding: "4px 8px", textAlign: "center" }}>SETS</th>
              <th style={{ padding: "4px 8px", textAlign: "center" }}>PTS</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((r) => (
              <tr key={r.teamId} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ padding: "7px 8px 7px 0", fontFamily: F.mono, color: C.mute }}>{r.rank}</td>
                <td style={{ padding: "7px 8px 7px 0", fontWeight: 600 }}>{r.team.name}</td>
                <td style={{ padding: "7px 8px", textAlign: "center", fontFamily: F.mono }}>{r.P}</td>
                <td style={{ padding: "7px 8px", textAlign: "center", fontFamily: F.mono, color: C.green }}>{r.W}</td>
                <td style={{ padding: "7px 8px", textAlign: "center", fontFamily: F.mono, color: C.red }}>{r.L}</td>
                <td style={{ padding: "7px 8px", textAlign: "center", fontFamily: F.mono, color: C.mute }}>
                  {r.SF}–{r.SA}
                </td>
                <td style={{ padding: "7px 8px", textAlign: "center", fontFamily: F.mono, color: C.accent, fontWeight: 700 }}>
                  {r.Pts}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Matches */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 10.5, color: C.mute, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 4 }}>
          MATCHES
        </div>
        {matches.map((m) => (
          <MatchRow key={m.id} match={m} teamsById={teamsById} onMessage={onMessage} />
        ))}
      </div>
    </div>
  );
}

// ── Whole live section ───────────────────────────────────────────────────────

export function BoxLeagueLive({ teams, matches }: { teams: BoxTeam[]; matches: BoxMatch[] }) {
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);
  const boxes = useMemo(
    () => [...new Set(teams.filter((t) => t.active).map((t) => t.box))].sort((a, b) => a - b),
    [teams]
  );

  return (
    <div style={{ marginTop: 36 }}>
      <div style={{ fontFamily: F.display, fontSize: 28, letterSpacing: "0.02em", textTransform: "uppercase" }}>
        The <span style={{ color: C.accent }}>Boxes</span>
      </div>
      <p style={{ fontSize: 13, color: C.mute, lineHeight: 1.6, maxWidth: 640, marginTop: 6 }}>
        Play everyone in your box, then post your result here — either team can enter it using a
        registered email address, and it counts once the opposing team confirms (entering the same
        score also confirms it). Win = 3 pts, straight-sets win = +1 bonus.
      </p>
      {banner && (
        <div
          style={{
            background: banner.ok ? "rgba(74,222,128,0.08)" : "rgba(255,82,82,0.08)",
            border: `1px solid ${banner.ok ? C.green : C.red}`,
            borderRadius: 8,
            padding: "10px 14px",
            margin: "12px 0",
            fontSize: 13,
            color: banner.ok ? C.green : C.red,
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <span>{banner.text}</span>
          <button
            onClick={() => setBanner(null)}
            style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontWeight: 700 }}
          >
            ×
          </button>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 14 }}>
        {boxes.map((b) => (
          <BoxSection
            key={b}
            box={b}
            teams={teams.filter((t) => t.box === b && t.active)}
            matches={matches.filter((m) => m.box === b)}
            onMessage={setBanner}
          />
        ))}
      </div>
    </div>
  );
}
