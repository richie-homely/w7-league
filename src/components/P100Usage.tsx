"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { C, F } from "@/theme/tokens";
import { createClient } from "@/lib/supabase/client";

// Padel 100 note readership over time (Richie, 10 Oct 2026: "can you track that in a little
// dashboard that we can view usage over time"). The market site's note, timeline and promise
// ledger post an anonymous view to site_track with a "p100:" path; this page reads the raw events
// through site_usage_events (supabase/site_usage_events_09Oct2026.sql), gated on the same admin
// passcode as /admin/usage, and buckets them in Dublin time. Refreshes itself every five minutes.

const KEY = "w7-admin-key";
const PAGES: Record<string, string> = {
  "p100:/padel100-risk-note": "Risk note",
  "p100:/p100-timeline": "Timeline",
  "p100:/p100-promises": "Promise ledger",
};
const TZ = "Europe/Dublin";

type Ev = { at: string; path: string; event: string; visitor: string };

const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });                 // 2026-10-10
const hourKey = (d: Date) => `${dayKey(d)} ${d.toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false })}`;
const fiveKey = (d: Date) => {
  const hm = d.toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
  const [h, m] = hm.split(":").map(Number);
  return `${String(h).padStart(2, "0")}:${String(m - (m % 5)).padStart(2, "0")}`;
};
const pageOf = (path: string) => PAGES[path.split("#")[0]] ?? null;

function Bars({ data, height = 120, label }: { data: { k: string; label: string; views: number; people?: number }[]; height?: number; label: (i: number) => string | null }) {
  const max = Math.max(1, ...data.map((d) => d.views));
  const n = Math.max(1, data.length);
  const w = 1000, gap = n > 100 ? 1 : 2, bw = w / n;
  return (
    <svg viewBox={`0 0 ${w} ${height + 22}`} width="100%" preserveAspectRatio="none" style={{ height: height + 22, display: "block" }}>
      <line x1={0} x2={w} y1={height + 0.5} y2={height + 0.5} stroke={C.border} />
      {data.map((d, i) => {
        const h = (d.views / max) * (height - 6);
        const ph = d.people !== undefined ? (d.people / max) * (height - 6) : null;
        const lab = label(i);
        return (
          <g key={d.k}>
            <rect x={i * bw + gap / 2} y={0} width={Math.max(bw - gap, 0.5)} height={height} fill="transparent">
              <title>{`${d.label}: ${d.views} view${d.views === 1 ? "" : "s"}${d.people !== undefined ? `, ${d.people} ${d.people === 1 ? "person" : "people"}` : ""}`}</title>
            </rect>
            {d.views > 0 && <rect x={i * bw + gap / 2} y={height - h} width={Math.max(bw - gap, 0.5)} height={h} rx={Math.min(3, bw / 3)} fill={C.accent} pointerEvents="none" />}
            {ph !== null && d.people! > 0 && (
              <rect x={i * bw + bw * 0.3} y={height - ph - 1} width={Math.max(bw * 0.4, 1)} height={2} fill={C.info} pointerEvents="none" />
            )}
            {lab && <text x={i * bw + bw / 2} y={height + 16} textAnchor="middle" fontSize={11} fill={C.mute} fontFamily="ui-monospace,monospace">{lab}</text>}
          </g>
        );
      })}
    </svg>
  );
}

export function P100Usage() {
  const [key, setKey] = useState("");
  const [days, setDays] = useState(30);
  const [events, setEvents] = useState<Ev[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  const load = useCallback(async (k: string, d: number) => {
    if (!k) { setErr("Enter the admin passcode."); return; }
    setBusy(true); setErr(null);
    const { data, error } = await createClient().rpc("site_usage_events", { p_key: k, p_prefix: "p100:", p_days: d });
    setBusy(false);
    if (error) {
      setErr(error.code === "PGRST202" ? "Not switched on yet: paste supabase/site_usage_events_09Oct2026.sql into the Supabase SQL editor once." : error.message);
      return;
    }
    if (data && !Array.isArray(data) && (data as { status?: string }).status === "bad_key") { setErr("That passcode isn't recognised."); setEvents(null); return; }
    try { window.localStorage.setItem(KEY, k); } catch { /* ignore */ }
    setEvents(((data as Ev[]) ?? []).filter((e) => pageOf(e.path)));     // only the three pages; drops local test renders
    setLoadedAt(new Date());
  }, []);

  useEffect(() => {
    let k = "";
    try { k = window.localStorage.getItem(KEY) ?? ""; } catch { /* no storage */ }
    if (k) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setKey(k);
      void load(k, 30);
    }
  }, [load]);

  useEffect(() => {
    if (!events || !key) return;
    const t = setInterval(() => void load(key, days), 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [events, key, days, load]);

  const v = useMemo(() => {
    if (!events) return null;
    const now = new Date();
    const views = events.filter((e) => e.event === "view");
    const today = dayKey(now);
    const tv = views.filter((e) => dayKey(new Date(e.at)) === today);
    const firstSeen = new Map<string, string>();
    for (const e of [...views].sort((a, b) => a.at.localeCompare(b.at))) if (!firstSeen.has(e.visitor)) firstSeen.set(e.visitor, dayKey(new Date(e.at)));
    const newToday = [...firstSeen.values()].filter((d) => d === today).length;

    // per day, the whole range, including empty days
    const daysArr: { k: string; label: string; views: number; people: number; newPeople: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const k = dayKey(d);
      const dv = views.filter((e) => dayKey(new Date(e.at)) === k);
      daysArr.push({
        k, label: d.toLocaleDateString("en-IE", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" }),
        views: dv.length, people: new Set(dv.map((e) => e.visitor)).size,
        newPeople: [...firstSeen.values()].filter((x) => x === k).length,
      });
    }
    const firstDay = daysArr.findIndex((d) => d.views > 0);
    const dayData = firstDay > 0 && days > 7 ? daysArr.slice(Math.max(0, firstDay - 1)) : daysArr;

    // last 48 hours by hour
    const hours: { k: string; label: string; views: number; people: number; hh: string }[] = [];
    for (let i = 47; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 3600000);
      const k = hourKey(d);
      const hv = views.filter((e) => hourKey(new Date(e.at)) === k);
      const hh = d.toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false });
      hours.push({ k, hh, label: `${d.toLocaleDateString("en-IE", { timeZone: TZ, weekday: "short" })} ${hh}:00`, views: hv.length, people: new Set(hv.map((e) => e.visitor)).size });
    }

    // today in five-minute windows, midnight to now
    const fives: { k: string; label: string; views: number }[] = [];
    const nowHm = fiveKey(now);
    for (let m = 0; m < 24 * 60; m += 5) {
      const k = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
      if (k > nowHm) break;
      fives.push({ k, label: `${k}`, views: tv.filter((e) => fiveKey(new Date(e.at)) === k).length });
    }

    const byPage = Object.values(PAGES).map((p) => {
      const pv = views.filter((e) => pageOf(e.path) === p);
      return { p, views: pv.length, people: new Set(pv.map((e) => e.visitor)).size };
    });
    const returns = events.filter((e) => e.event === "return").length;
    const repeatPeople = [...new Set(views.map((e) => e.visitor))].filter((id) => new Set(views.filter((e) => e.visitor === id).map((e) => dayKey(new Date(e.at)))).size > 1).length;
    const recent = [...events].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 40);
    return {
      total: views.length, people: firstSeen.size, todayViews: tv.length, todayPeople: new Set(tv.map((e) => e.visitor)).size, newToday,
      returns, repeatPeople, dayData, hours, fives, byPage, recent,
      peak: dayData.reduce((a, b) => (b.views > a.views ? b : a), dayData[0]),
    };
  }, [events, days]);

  const card: React.CSSProperties = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 14 };
  const h2: React.CSSProperties = { fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: C.mute, margin: "0 0 10px", fontWeight: 600 };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: F.body }}>
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontFamily: F.display, fontSize: 20, letterSpacing: "0.03em" }}>PADEL 100 NOTE · READERS</div>
        <div style={{ flex: 1 }} />
        <Link href="/admin/usage" style={{ fontSize: 12, color: C.mute, textDecoration: "none", padding: "6px 12px", border: `1px solid ${C.border}`, borderRadius: 6 }}>Site usage</Link>
      </div>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "20px 16px 40px" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
          <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Admin passcode"
            onKeyDown={(e) => { if (e.key === "Enter") void load(key, days); }}
            style={{ background: C.bg2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", fontFamily: F.body, minWidth: 180 }} />
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => { setDays(d); void load(key, d); }}
              style={{ padding: "8px 12px", borderRadius: 6, border: `1px solid ${days === d ? C.accent : C.border}`, background: "transparent", color: days === d ? C.accent : C.mute, fontFamily: F.body, cursor: "pointer" }}>
              {d} days
            </button>
          ))}
          <button onClick={() => void load(key, days)} disabled={busy}
            style={{ padding: "8px 14px", borderRadius: 6, border: "none", background: C.accent, color: "#0a0a0a", fontFamily: F.display, letterSpacing: "0.04em", cursor: "pointer" }}>
            {busy ? "…" : "REFRESH"}
          </button>
          {loadedAt && <span style={{ fontSize: 12, color: C.mute }}>updated {loadedAt.toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" })} · refreshes every 5 min</span>}
        </div>
        {err && <div style={{ ...card, color: C.amber }}>{err}</div>}

        {v && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 14 }}>
              {[
                { n: v.people, l: `people, last ${days} days` },
                { n: v.total, l: "views" },
                { n: v.todayViews, l: `views today · ${v.todayPeople} ${v.todayPeople === 1 ? "person" : "people"}` },
                { n: v.newToday, l: "new readers today" },
                { n: v.repeatPeople, l: "came back on another day" },
              ].map((t) => (
                <div key={t.l} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontFamily: F.mono, fontSize: 26, color: C.accent }}>{t.n}</div>
                  <div style={{ fontSize: 12, color: C.mute }}>{t.l}</div>
                </div>
              ))}
            </div>

            <div style={card}>
              <div style={h2}>Views by day · busiest {v.peak?.label} ({v.peak?.views})</div>
              <Bars data={v.dayData} height={140} label={(i) => {
                const n = v.dayData.length, step = n > 31 ? 14 : n > 10 ? 3 : 1;
                return (n - 1 - i) % step === 0 ? v.dayData[i].label.split(" ").slice(1).join(" ") : null;
              }} />
              <div style={{ display: "flex", gap: 16, fontSize: 12, color: C.mute, marginTop: 6 }}>
                <span><span style={{ display: "inline-block", width: 10, height: 10, background: C.accent, borderRadius: 2, marginRight: 6, verticalAlign: "middle" }} />views</span>
                <span><span style={{ display: "inline-block", width: 10, height: 2, background: C.info, marginRight: 6, verticalAlign: "middle" }} />people (distinct browsers)</span>
              </div>
            </div>

            <div style={card}>
              <div style={h2}>Last 48 hours, by hour</div>
              <Bars data={v.hours} height={110} label={(i) => (v.hours[i].hh === "00" || v.hours[i].hh === "12" ? `${v.hours[i].label.split(" ")[0]} ${v.hours[i].hh}:00` : null)} />
            </div>

            <div style={card}>
              <div style={h2}>Today, five-minute windows</div>
              {v.todayViews === 0 ? <div style={{ color: C.mute, fontSize: 13 }}>No views yet today.</div> : (
                <Bars data={v.fives} height={90} label={(i) => (v.fives[i].k.endsWith(":00") && Number(v.fives[i].k.slice(0, 2)) % 3 === 0 ? v.fives[i].k : null)} />
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
              <div style={card}>
                <div style={h2}>By page</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <tbody>
                    {v.byPage.map((p) => (
                      <tr key={p.p} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "7px 4px" }}>{p.p}</td>
                        <td style={{ padding: "7px 4px", textAlign: "right", fontFamily: F.mono }}>{p.views} views</td>
                        <td style={{ padding: "7px 4px", textAlign: "right", color: C.mute }}>{p.people} people</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ fontSize: 11.5, color: C.mute, marginTop: 8 }}>{v.returns} return visits logged. A person is one browser: the same reader on phone and laptop counts twice.</div>
              </div>
              <div style={card}>
                <div style={h2}>Latest visits</div>
                <div style={{ maxHeight: 260, overflowY: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                    <tbody>
                      {v.recent.map((e, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: "5px 4px", fontFamily: F.mono, color: C.mute, whiteSpace: "nowrap" }}>
                            {new Date(e.at).toLocaleString("en-IE", { timeZone: TZ, weekday: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td style={{ padding: "5px 4px" }}>{pageOf(e.path)}</td>
                          <td style={{ padding: "5px 4px", color: C.mute }}>{e.event}</td>
                          <td style={{ padding: "5px 4px", fontFamily: F.mono, color: C.mute }}>{e.visitor}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
