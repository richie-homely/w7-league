"use client";

import { useEffect, useState } from "react";
import { C, F } from "@/theme/tokens";

/* Collapsible section (Richie, 13 Sep 2026: "can those sections be collapsable, as it's
 * long to navigate that page"). The admin usage page stacks eight full-width blocks, so it
 * is a long scroll to reach any one of them.
 *
 * The open/closed choice is remembered per section in localStorage, because this is a page
 * the same two people open every day and re-collapsing the same four blocks each time would
 * be worse than the scroll. Read after mount, never during render, so the server and client
 * HTML agree. */

export function Collapsible({
  id,
  title,
  note,
  storageKey,
  defaultOpen = false,
  open: controlledOpen,
  onToggle,
  children,
}: {
  /** anchor id, so an in-page nav link can still jump to the section */
  id?: string;
  title: string;
  /** short grey line beside the title, readable while closed */
  note?: string;
  /** remembers this section's state; omit to always start at defaultOpen */
  storageKey?: string;
  defaultOpen?: boolean;
  /** controlled mode: the parent owns open/closed (and its own persistence) */
  open?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
}) {
  const [selfOpen, setOpen] = useState(defaultOpen);
  const controlled = controlledOpen !== undefined;
  const open = controlled ? controlledOpen : selfOpen;
  useEffect(() => {
    if (!storageKey || controlled) return;
    try {
      const v = window.localStorage.getItem(`w7-collapse-${storageKey}`);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (v === "1" || v === "0") setOpen(v === "1");
    } catch { /* no storage */ }
  }, [storageKey, controlled]);

  // Jump links open a folded section (Richie, 13 Sep 2026): a link to a closed header would
  // otherwise land on a bare title. Opens for a matching #hash on load and on hashchange, and on
  // the "w7-open-section" event the in-page nav fires — clicking the hash you are already on fires
  // no hashchange, so the event is what makes a second click work.
  useEffect(() => {
    if (!id) return;
    const openIfMine = (target: string) => {
      if (target !== id) return;
      if (controlled) { if (!controlledOpen) onToggle?.(); return; }
      setOpen(true);
    };
    const onHash = () => openIfMine(window.location.hash.slice(1));
    const onEvent = (e: Event) => openIfMine((e as CustomEvent<string>).detail);
    onHash();
    window.addEventListener("hashchange", onHash);
    window.addEventListener("w7-open-section", onEvent);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("w7-open-section", onEvent);
    };
  }, [id, controlled, controlledOpen, onToggle]);

  const toggle = () => {
    if (controlled) { onToggle?.(); return; }
    setOpen((o) => {
      if (storageKey) {
        try { window.localStorage.setItem(`w7-collapse-${storageKey}`, o ? "0" : "1"); } catch { /* ignore */ }
      }
      return !o;
    });
  };

  return (
    <section id={id} style={{ marginTop: 22, scrollMarginTop: 60 }}>
      <button
        onClick={toggle}
        aria-expanded={open}
        style={{
          display: "flex", alignItems: "baseline", gap: 10, width: "100%", textAlign: "left",
          background: "transparent", border: "none", borderBottom: `1px solid ${C.border}`,
          padding: "0 0 7px", cursor: "pointer", color: C.text, flexWrap: "wrap",
        }}
      >
        <span style={{ color: C.mute, fontSize: 13, lineHeight: 1 }}>{open ? "▾" : "▸"}</span>
        <span style={{ fontFamily: F.display, fontSize: 20, color: C.accent, letterSpacing: "0.03em" }}>
          {title}
        </span>
        {note && <span style={{ fontSize: 12.5, color: C.mute }}>{note}</span>}
      </button>
      {open && <div style={{ marginTop: 12 }}>{children}</div>}
    </section>
  );
}
