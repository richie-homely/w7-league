import Link from "next/link";
import { C, F } from "@/theme/tokens";
import { KeanoCredit } from "@/components/KeanoCredit";
import { ReplayFinder } from "@/components/ReplayFinder";

const SHARE = {
  title: "Find the clips from your game · W7 Padel",
  description: "Pressed the button on court? Your email finds your bookings, and every clip cut during them.",
};

export const metadata = {
  title: "Replay · W7 Padel",
  description: SHARE.description,
  openGraph: { title: SHARE.title, description: SHARE.description, url: "/replay" },
};

// Richie, 26 Sep 2026: "a web page ready to add to the w7 site with find clips from my game ... we
// can build that site as dummy for now". This is the page; ReplayFinder holds the demo data and the
// one function that becomes the real lookup. The camera side is w7-padel/replay.

const HOW = [
  ["Press the button on court", "Something worth keeping just happened. Press the W7 button on the court post and the camera keeps the last 30 seconds."],
  ["Finish your game", "Nothing to do on court. Clips are cut and stamped with the court and time as you play."],
  ["Enter the email on your booking", "Your email is on every Playtomic booking you were part of, so it finds your games - and only your games."],
  ["Watch, share, save", "Every clip pressed during your booking, on the court you were on. Straight to WhatsApp or your camera roll. Kept for 5 days."],
];

export default function ReplayPage() {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: F.body }}>
      <div style={{ background: C.bg, borderBottom: `1px solid ${C.border}`, padding: "14px 20px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ fontFamily: F.display, fontSize: 20, letterSpacing: "0.03em" }}>
          <span style={{ color: C.accent }}>W7</span> REPLAY
        </div>
        <div style={{ flex: 1 }} />
        <Link href="/" style={{ fontSize: 12, color: C.mute, textDecoration: "none", padding: "6px 12px", border: `1px solid ${C.border}`, borderRadius: 6 }}>
          ← W7 leagues
        </Link>
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "28px 20px 40px", display: "flex", flexDirection: "column", gap: 28 }}>
        <div style={{ background: "#3a2f0a", border: "1px solid #7a6420", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#ffd166", lineHeight: 1.5 }}>
          <strong>Preview with demo clips.</strong> Any email shows the same three sample games. The
          camera side is built and tested; this page goes live once the club box is on the court network.
        </div>

        <div>
          <h1 style={{ fontFamily: F.display, fontSize: 36, margin: 0, letterSpacing: "0.02em" }}>
            Find the clips from <span style={{ color: C.accent }}>your game</span>
          </h1>
          <p style={{ color: C.text, fontSize: 15.5, lineHeight: 1.65, marginTop: 10, maxWidth: "62ch" }}>
            Pressed the button on court? Every press keeps the last 30 seconds from that court&apos;s
            camera. Put in the email on your booking and here they all are - just yours, just your court,
            just the time you were on it.
          </p>
        </div>

        <ReplayFinder />

        <div>
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.15em", color: C.mute, marginBottom: 12 }}>
            HOW IT WORKS
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {HOW.map(([title, detail], i) => (
              <div key={title} style={{ display: "grid", gridTemplateColumns: "34px 1fr", gap: 14, padding: "14px 0", borderTop: `1px solid ${C.border}` }}>
                <span style={{ fontFamily: F.mono, fontSize: 13, color: C.accent }}>{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
                  <div style={{ fontSize: 14, color: C.mute, lineHeight: 1.55, marginTop: 3 }}>{detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Who can see what</div>
          <p style={{ fontSize: 14.5, color: C.mute, lineHeight: 1.6, margin: 0 }}>
            The cameras keep a rolling 90 seconds and nothing more. A clip only exists because someone
            on the court pressed the button, and it is only shown to the people on that booking. Your
            email is never shown to anyone and is only used to find your bookings.
          </p>
        </div>

        <div style={{ fontSize: 13.5, color: C.mute }}>
          Questions: <a href="mailto:welcome@w7padel.com" style={{ color: C.info }}>welcome@w7padel.com</a>
        </div>
        <KeanoCredit />
      </div>
    </div>
  );
}
