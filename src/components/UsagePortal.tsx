"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { C, F } from "@/theme/tokens";
import { siteUsageReport, type UsageReport } from "@/lib/track";

// Admin-only usage portal (Richie, 7 Sep 2026). The passcode is checked by the database
// function, not here — this page only remembers it on Richie's own device so he is not
// retyping it. Nothing links to this page from the public site.

const KEY = "w7-admin-key";

function fmt(ts: string | null) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString("en-IE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function UsagePortal() {
  const [key, setKey] = useState("");
  const [days, setDays] = useState(30);
  const [report, setReport] = useState<UsageReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [teamFilter, setTeamFilter] = useState<"all" | "seen" | "never">("all");

  useEffect(() => {
    // Read the remembered passcode after mount: reading localStorage during render would
    // make the server and client HTML differ (hydration mismatch), so this one setState
    // in an effect is deliberate.
    try {
      const k = window.localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (k) setKey(k);
    } catch { /* no storage */ }
  }, []);

  async function load(k = key, d = days) {
    if (!k) { setErr("Enter the admin passcode."); return; }
    setBusy(true); setErr(null);
    const res = await siteUsageReport(k, d);
    setBusy(false);
    if (res === "bad_key") { setErr("That passcode isn't recognised."); setReport(null); return; }
    if (res === "unavailable") { setErr("The usage log isn't switched on yet — run site_usage_07Sep2026.sql in Supabase."); return; }
    try { window.localStorage.setItem(KEY, k); } catch { /* ignore */ }
    setReport(res);
  }

  const teams = report?.teams ?? [];
  const seen = teams.filter((t) => t.first_seen);
  const never = teams.filter((t) => !t.first_seen);
  const shown = teamFilter === "seen" ? seen : teamFilter === "never" ? never : teams;
  const maxViews = Math.max(1, ...(report?.by_day.map((d) => d.views) ?? [1]));

  const th: React.CSSProperties = { textAlign: "left", padding: "6px 8px", fontSize: 10.5, letterSpacing: "0.08em", color: C.mute };
  const td: React.CSSProperties = { padding: "7px 8px", fontSize: 13, borderTop: `1px solid ${C.border}` };
  const num: React.CSSProperties = { ...td, fontFamily: F.mono, textAlign: "right" };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: F.body }}>
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "14px 20px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ fontFamily: F.display, fontSize: 20, letterSpacing: "0.03em" }}>W7 LEAGUE SITE · USAGE</div>
        <div style={{ flex: 1 }} />
        <Link href="/box" style={{ fontSize: 12, color: C.mute, textDecoration: "none", padding: "6px 12px", border: `1px solid ${C.border}`, borderRadius: 6 }}>
          ← Box league
        </Link>
      </div>

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 20px 48px" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="Admin passcode"
            aria-label="Admin passcode"
            style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.text, fontSize: 14, minWidth: 200 }}
          />
          <select
            value={days}
            onChange={(e) => { const d = Number(e.target.value); setDays(d); if (report) load(key, d); }}
            style={{ padding: "9px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.text, fontSize: 13 }}
          >
            {[7, 30, 60, 180].map((d) => <option key={d} value={d}>last {d} days</option>)}
          </select>
          <button onClick={() => load()} disabled={busy} style={{ padding: "9px 16px", borderRadius: 8, border: 0, background: C.accent, color: C.bg, fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
            {busy ? "Loading…" : report ? "Refresh" : "Show usage"}
          </button>
          {err && <span style={{ fontSize: 13, color: C.red }}>{err}</span>}
        </div>

        {report && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginTop: 22 }}>
              {[
                ["Page views", report.totals.views],
                ["Unique visitors", report.totals.unique_visitors],
                ["Teams on the site", `${report.totals.teams_active} / ${teams.length}`],
                ["Results submitted", report.totals.results_submitted],
                ["Results confirmed", report.totals.results_confirmed],
              ].map(([l, v]) => (
                <div key={String(l)} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 10.5, letterSpacing: "0.1em", color: C.mute, fontWeight: 700 }}>{String(l).toUpperCase()}</div>
                  <div style={{ fontFamily: F.display, fontSize: 30, color: C.accent, marginTop: 4 }}>{v}</div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: C.mute, marginTop: 8 }}>
              Since {fmt(report.since)} · a visitor is one browser (random id, no personal data) · a team counts as “on the site” once a registered email has been used on it.
            </p>

            <h2 style={{ fontFamily: F.display, fontSize: 20, marginTop: 28, color: C.accent, letterSpacing: "0.03em" }}>BY DAY</h2>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
              {report.by_day.map((d) => (
                <div key={d.day} style={{ display: "grid", gridTemplateColumns: "92px 1fr 120px", alignItems: "center", gap: 10, padding: "3px 0" }}>
                  <div style={{ fontFamily: F.mono, fontSize: 12, color: C.mute }}>{d.day.slice(5)}</div>
                  <div style={{ height: 12, background: C.border, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${(100 * d.views) / maxViews}%`, height: "100%", background: C.accent }} />
                  </div>
                  <div style={{ fontFamily: F.mono, fontSize: 12, textAlign: "right" }}>{d.views} views · {d.uniques} people</div>
                </div>
              ))}
              {report.by_day.length === 0 && <div style={{ fontSize: 13, color: C.mute }}>No page views yet in this window.</div>}
            </div>

            <h2 style={{ fontFamily: F.display, fontSize: 20, marginTop: 28, color: C.accent, letterSpacing: "0.03em" }}>BY PAGE</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={th}>PAGE</th><th style={{ ...th, textAlign: "right" }}>VIEWS</th><th style={{ ...th, textAlign: "right" }}>UNIQUE VISITORS</th></tr></thead>
                <tbody>
                  {report.by_path.map((p) => (
                    <tr key={p.path}><td style={{ ...td, fontFamily: F.mono }}>{p.path}</td><td style={num}>{p.views}</td><td style={num}>{p.uniques}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2 style={{ fontFamily: F.display, fontSize: 20, marginTop: 28, color: C.accent, letterSpacing: "0.03em" }}>
              BOX-LEAGUE TEAMS <span style={{ color: C.mute, fontSize: 14 }}>· {seen.length} on the site · {never.length} never</span>
            </h2>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              {(["all", "seen", "never"] as const).map((f) => (
                <button key={f} onClick={() => setTeamFilter(f)} style={{ padding: "5px 12px", borderRadius: 999, border: `1px solid ${teamFilter === f ? C.accent : C.border}`, background: teamFilter === f ? C.accent : C.card, color: teamFilter === f ? C.bg : C.text, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  {f === "all" ? "All" : f === "seen" ? "On the site" : "Never seen — needs a link"}
                </button>
              ))}
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={th}>BOX</th><th style={th}>TEAM</th><th style={th}>FIRST SEEN</th><th style={th}>LAST SEEN</th>
                    <th style={{ ...th, textAlign: "right" }}>VISITS</th><th style={{ ...th, textAlign: "right" }}>SUBMITS</th><th style={{ ...th, textAlign: "right" }}>CONFIRMS</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((t) => (
                    <tr key={t.team_id} style={{ opacity: t.first_seen ? 1 : 0.75 }}>
                      <td style={{ ...td, fontFamily: F.mono }}>{t.box}</td>
                      <td style={{ ...td, fontWeight: 600 }}>{t.name}{!t.first_seen && <span style={{ color: C.red, fontWeight: 500, fontSize: 11.5 }}> · never on the site</span>}</td>
                      <td style={{ ...td, fontFamily: F.mono, fontSize: 12 }}>{fmt(t.first_seen)}</td>
                      <td style={{ ...td, fontFamily: F.mono, fontSize: 12 }}>{fmt(t.last_seen)}</td>
                      <td style={num}>{t.events}</td><td style={num}>{t.submits}</td><td style={num}>{t.confirms}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
