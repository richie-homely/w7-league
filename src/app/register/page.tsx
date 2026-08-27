import Link from "next/link";
import { C, F } from "@/theme/tokens";
import { RegisterForm } from "@/components/RegisterForm";
import { KeanoCredit } from "@/components/KeanoCredit";

export const metadata = { title: "Register · W7 Padel Leagues" };

export default function RegisterPage() {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: F.body }}>
      {/* Header */}
      <div
        style={{
          background: C.bg,
          borderBottom: `1px solid ${C.border}`,
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div style={{ fontFamily: F.display, fontSize: 20, color: C.text, letterSpacing: "0.03em" }}>
          SUMMER LEAGUES 2026
        </div>
        <div style={{ flex: 1 }} />
        <Link
          href="/summer-2026"
          style={{
            fontSize: 12,
            color: C.mute,
            textDecoration: "none",
            padding: "6px 12px",
            border: `1px solid ${C.border}`,
            borderRadius: 6,
          }}
        >
          ← Back
        </Link>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "40px 20px 80px" }}>
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              fontFamily: F.display,
              fontSize: 36,
              color: C.accent,
              letterSpacing: "0.04em",
              lineHeight: 1,
            }}
          >
            REGISTER YOUR INTEREST
          </div>
          <p style={{ color: C.mute, fontSize: 14, marginTop: 10, lineHeight: 1.6 }}>
            Want in on an upcoming W7 Padel league? Tell us the format and level you&apos;re after and
            we&apos;ll be in touch when the next round of spots opens.
          </p>
        </div>

        <RegisterForm />

        <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
          <KeanoCredit />
        </div>
      </div>
    </div>
  );
}
