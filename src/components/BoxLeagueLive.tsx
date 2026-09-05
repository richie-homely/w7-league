"use client";

// Live box league: standings per box, match list, and player self-service
// score entry cross-validated against registered team emails (see the
// interest_and_box_league migration for the server-side rules).

import { useEffect, useMemo, useRef, useState } from "react";
import { C, F } from "@/theme/tokens";
import { formatScore, parseSets, setsWon } from "@/lib/scoring";
import { addTeamContact, findBoxForEmail, rememberEmail, rememberedEmail } from "@/lib/box";
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
  const [email, setEmail] = useState(() => rememberedEmail());
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
    else {
      rememberEmail(email);
      onDone(res);
    }
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
      <label style={{ fontSize: 11, color: C.mute, fontWeight: 700, letterSpacing: "0.08em", marginBottom: -6 }}>
        YOUR REGISTERED EMAIL <span style={{ fontWeight: 400, letterSpacing: 0 }}>— either player, either team; remembered on this phone</span>
      </label>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          style={{ ...inputStyle, flex: "1 1 220px" }}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          autoComplete="email"
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
  const [email, setEmail] = useState(() => rememberedEmail());
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
    else {
      rememberEmail(email);
      onDone(res);
    }
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
          autoComplete="email"
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
  autoOpen = false,
}: {
  match: BoxMatch;
  teamsById: Record<string, BoxTeam>;
  onMessage: (msg: { ok: boolean; text: string }) => void;
  /** deep-linked from an email: open the right form straight away */
  autoOpen?: boolean;
}) {
  const [open, setOpen] = useState<false | "submit" | "confirm">(
    autoOpen ? (match.status === "submitted" ? "confirm" : match.status === "confirmed" ? false : "submit") : false
  );
  const t1 = teamsById[match.team1Id];
  const t2 = teamsById[match.team2Id];
  if (!t1 || !t2) return null;
  const chip = STATUS_CHIP[match.status];
  const done = (msg: { ok: boolean; text: string }) => {
    setOpen(false);
    onMessage(msg);
  };

  return (
    <div
      id={`match-${match.id}`}
      style={{
        borderTop: `1px solid ${C.border}`,
        padding: "10px 0",
        ...(autoOpen ? { boxShadow: `inset 3px 0 0 ${C.accent}`, paddingLeft: 10 } : {}),
      }}
    >
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
  focusMatch,
  defaultOpen = false,
}: {
  box: number;
  teams: BoxTeam[];
  matches: BoxMatch[];
  onMessage: (msg: { ok: boolean; text: string }) => void;
  focusMatch?: string | null;
  /** open on first render (the focused box, or when only one box is shown) */
  defaultOpen?: boolean;
}) {
  // Each box collapses on its own (Richie, 5 Sep 2026) — 18 boxes of table + matches
  // is a long scroll, so a box shows its header line until asked for.
  const [openState, setOpen] = useState<boolean | null>(null);
  const open = openState ?? defaultOpen;
  const standings = useMemo(() => computeBoxStandings(teams, matches), [teams, matches]);
  const teamsById = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t])), [teams]);
  const played = matches.filter((m) => m.status === "confirmed").length;

  return (
    <div
      id={`box-live-${box}`}
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: "18px 20px",
        scrollMarginTop: 16,
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{
          width: "100%", display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap",
          background: "transparent", border: 0, padding: 0, cursor: "pointer", color: C.text,
          fontFamily: F.body, textAlign: "left",
        }}
      >
        <div style={{ fontFamily: F.display, fontSize: 24, letterSpacing: "0.03em" }}>
          BOX <span style={{ color: C.accent }}>{box}</span>
        </div>
        <div style={{ fontSize: 11.5, color: C.mute }}>
          {teams.length} teams · {played}/{matches.length} played
          {!open && standings[0] && played > 0 && ` · leader ${standings[0].team.name}`}
        </div>
        <div style={{ marginLeft: "auto", fontSize: 12, color: C.mute }}>{open ? "hide ▲" : "view ▼"}</div>
      </button>

      {open && (<>
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
          <MatchRow key={m.id} match={m} teamsById={teamsById} onMessage={onMessage} autoOpen={m.id === focusMatch} />
        ))}
      </div>
      </>)}
    </div>
  );
}

// ── Whole live section ───────────────────────────────────────────────────────

export function BoxLeagueLive({
  teams,
  matches,
  focusBox = null,
  focusMatch = null,
  onFocusBox,
}: {
  teams: BoxTeam[];
  matches: BoxMatch[];
  /** show only this box (from a deep link, the grid, or find-my-box); null = all */
  focusBox?: number | null;
  /** open this match's form straight away */
  focusMatch?: string | null;
  onFocusBox?: (box: number | null) => void;
}) {
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);
  const allBoxes = useMemo(
    () => [...new Set(teams.filter((t) => t.active).map((t) => t.box))].sort((a, b) => a - b),
    [teams]
  );
  const boxes = focusBox !== null && allBoxes.includes(focusBox) ? [focusBox] : allBoxes;

  // Find my box: the registered email tells us the team, the team tells us the box.
  const [findEmail, setFindEmail] = useState(() => rememberedEmail());
  const [finding, setFinding] = useState(false);
  const [findMsg, setFindMsg] = useState<string | null>(null);
  // Add a teammate's email: the registered address proves the team, the new one joins it.
  // This is the route for Apple "Hide My Email" relay addresses, which players don't know.
  const [addOpen, setAddOpen] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addMsg, setAddMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function addTeammate() {
    if (!findEmail.includes("@")) {
      setAddMsg({ ok: false, text: "Enter your own registered email first." });
      return;
    }
    if (!addEmail.includes("@")) {
      setAddMsg({ ok: false, text: "Enter your teammate's email." });
      return;
    }
    setAddBusy(true);
    setAddMsg(null);
    const res = await addTeamContact(findEmail, addEmail);
    setAddBusy(false);
    setAddMsg(res);
    if (res.ok) {
      rememberEmail(findEmail);
      setAddEmail("");
    }
  }
  async function findMine() {
    if (!findEmail.includes("@")) {
      setFindMsg("Enter the email you registered with.");
      return;
    }
    setFinding(true);
    setFindMsg(null);
    const res = await findBoxForEmail(findEmail);
    setFinding(false);
    if (res === "unavailable") {
      setFindMsg("Box lookup isn't switched on yet — scroll to your box below.");
    } else if (!res) {
      setFindMsg("That email isn't registered to a team. Use the address you entered the league with, or contact the desk.");
    } else {
      rememberEmail(findEmail);
      onFocusBox?.(res.box);
      setTimeout(() => document.getElementById(`box-live-${res.box}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  }

  return (
    <div id="scores" style={{ marginTop: 36, scrollMarginTop: 60 }}>
      <div style={{ fontFamily: F.display, fontSize: 28, letterSpacing: "0.02em", textTransform: "uppercase" }}>
        The <span style={{ color: C.accent }}>Boxes</span>
      </div>
      <p style={{ fontSize: 13, color: C.mute, lineHeight: 1.6, maxWidth: 640, marginTop: 6 }}>
        Play everyone in your box, then post your result here — either team can enter it using a
        registered email address, and it counts once the opposing team confirms (entering the same
        score also confirms it). Points: 4 for a 2–0 win, 3 for a win in the tiebreak, 1 to the losers if
        they took a set, 0 for losing in two. Unplayed at the cycle deadline: void, −1 each.
      </p>
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "12px 14px",
          marginTop: 12,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: C.mute, flex: "1 1 100%" }}>
          FIND MY BOX
        </div>
        <input
          style={{ ...inputStyle, flex: "1 1 220px" }}
          type="email"
          value={findEmail}
          onChange={(e) => setFindEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && findMine()}
          placeholder="Your registered email"
          autoComplete="email"
          aria-label="Your registered email"
        />
        <button onClick={findMine} disabled={finding} style={actionBtn}>
          {finding ? "Looking…" : "Show my box"}
        </button>
        {focusBox !== null && (
          <button onClick={() => onFocusBox?.(null)} style={ghostBtn}>
            Show all {allBoxes.length} boxes
          </button>
        )}
        <button onClick={() => setAddOpen(!addOpen)} style={ghostBtn}>
          {addOpen ? "Close" : "Add a teammate's email"}
        </button>
        {findMsg && <div style={{ color: C.red, fontSize: 12.5, flex: "1 1 100%" }}>{findMsg}</div>}
        {addOpen && (
          <div style={{ flex: "1 1 100%", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
            <div style={{ fontSize: 12, color: C.mute, flex: "1 1 100%", lineHeight: 1.5 }}>
              Registered with an Apple &quot;Hide My Email&quot; address, or a teammate not recognised? Enter <strong>your</strong> registered email above, then the email your teammate actually uses here — it joins your team and works for scores straight away.
            </div>
            <input
              style={{ ...inputStyle, flex: "1 1 220px" }}
              type="email"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTeammate()}
              placeholder="Teammate's email"
              aria-label="Teammate's email"
            />
            <button onClick={addTeammate} disabled={addBusy} style={actionBtn}>
              {addBusy ? "Adding…" : "Add to my team"}
            </button>
            {addMsg && <div style={{ color: addMsg.ok ? C.green : C.red, fontSize: 12.5, flex: "1 1 100%" }}>{addMsg.text}</div>}
          </div>
        )}
      </div>
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
            focusMatch={focusMatch}
            defaultOpen={boxes.length === 1 || b === focusBox}
          />
        ))}
      </div>
    </div>
  );
}
