"use client";

import { C } from "@/theme/tokens";
import { CONTACT } from "@/lib/league";
import { KeanoCredit } from "./KeanoCredit";

export function SiteFooter({ maxWidth = 1100 }: { maxWidth?: number }) {
  return (
    <footer style={{ borderTop: `1px solid ${C.border}`, padding: "24px 20px", marginTop: 40 }}>
      <div style={{ maxWidth, margin: "0 auto" }}>
        <div style={{ fontSize: 13, color: C.text }}>
          Questions? Email{" "}
          <a href={`mailto:${CONTACT.email}`} style={{ color: C.info, fontWeight: 600 }}>
            {CONTACT.email}
          </a>{" "}
          or WhatsApp{" "}
          <a href={CONTACT.whatsapp} style={{ color: C.info, fontWeight: 600 }}>
            {CONTACT.phoneDisplay}
          </a>
          .
        </div>
        <div style={{ fontSize: 11, color: C.mute, marginTop: 10 }}>
          W7 Padel · Wicklow Town ·{" "}
          <a href={CONTACT.playtomic} style={{ color: C.mute }}>
            Book on Playtomic
          </a>
        </div>
        <KeanoCredit />
      </div>
    </footer>
  );
}
