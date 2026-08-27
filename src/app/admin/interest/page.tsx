"use client";

// Admin view of register-interest submissions (RLS: admin read only).
// Sign in happens on /admin (magic link); this page just needs the session.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { C, F } from "@/theme/tokens";
import { ADMIN_EMAILS } from "@/lib/league";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/ui";

interface InterestRow {
  id: string;
  format: string;
  name: string;
  email: string;
  phone: string;
  note: string;
  created_at: string;
}

export default function InterestAdmin() {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [rows, setRows] = useState<InterestRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  const email = session?.user?.email ?? null;
  const isAdmin = !!email && (ADMIN_EMAILS as readonly string[]).includes(email);

  useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from("interest")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setRows((data ?? []) as InterestRow[]);
      });
  }, [isAdmin, supabase]);

  const byFormat = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of rows) m[r.format] = (m[r.format] || 0) + 1;
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: F.body }}>
      <div
        style={{
          borderBottom: `1px solid ${C.border}`,
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <Logo style={{ width: 40, height: 40 }} />
        <div style={{ fontFamily: F.display, fontSize: 20, letterSpacing: "0.03em" }}>
          INTEREST REGISTER
        </div>
        <div style={{ flex: 1 }} />
        <Link href="/admin" style={{ fontSize: 12, color: C.mute, textDecoration: "none" }}>
          ← Admin console
        </Link>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px" }}>
        {session === undefined && <div style={{ color: C.mute }}>Loading…</div>}
        {session === null && (
          <div style={{ color: C.mute, fontSize: 14 }}>
            Sign in on the{" "}
            <Link href="/admin" style={{ color: C.info }}>
              admin console
            </Link>{" "}
            first, then come back here.
          </div>
        )}
        {session && !isAdmin && (
          <div style={{ color: C.amber, fontSize: 14 }}>Signed in as {email} — not an admin account.</div>
        )}
        {isAdmin && (
          <>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
              {byFormat.map(([f, n]) => (
                <div
                  key={f}
                  style={{
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: C.accent, fontFamily: F.mono, fontWeight: 700 }}>{n}</span>{" "}
                  <span style={{ color: C.mute }}>{f}</span>
                </div>
              ))}
              {rows.length === 0 && !error && (
                <div style={{ color: C.mute, fontSize: 13 }}>No submissions yet.</div>
              )}
            </div>
            {error && <div style={{ color: C.red, fontSize: 13, marginBottom: 14 }}>{error}</div>}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ color: C.mute, fontSize: 10.5, letterSpacing: "0.08em", textAlign: "left" }}>
                    <th style={{ padding: "6px 10px 6px 0" }}>WHEN</th>
                    <th style={{ padding: "6px 10px 6px 0" }}>FORMAT</th>
                    <th style={{ padding: "6px 10px 6px 0" }}>NAME</th>
                    <th style={{ padding: "6px 10px 6px 0" }}>EMAIL</th>
                    <th style={{ padding: "6px 0" }}>NOTE</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} style={{ borderTop: `1px solid ${C.border}`, verticalAlign: "top" }}>
                      <td style={{ padding: "8px 10px 8px 0", color: C.mute, fontFamily: F.mono, whiteSpace: "nowrap" }}>
                        {new Date(r.created_at).toLocaleDateString("en-IE", { day: "numeric", month: "short" })}
                      </td>
                      <td style={{ padding: "8px 10px 8px 0", color: C.accent, fontWeight: 600 }}>{r.format}</td>
                      <td style={{ padding: "8px 10px 8px 0", fontWeight: 600 }}>{r.name}</td>
                      <td style={{ padding: "8px 10px 8px 0" }}>
                        <a href={`mailto:${r.email}`} style={{ color: C.info }}>
                          {r.email}
                        </a>
                      </td>
                      <td style={{ padding: "8px 0", color: C.mute, maxWidth: 320 }}>{r.note}</td>
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
