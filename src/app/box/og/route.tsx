// The box league share card, drawn on request so the sub-heading is this week's status
// (Richie, 5 Oct 2026). Same layout as the old static og-box-v2.png from scripts/make_box_brand.py:
// lime spine, the box mark on the left, the wordmark on the right, a rule, then the facts.
// The page links to /box/og?v=<cycle-week>, so chat apps that cache a preview per URL pick up a
// fresh card once a week; the image itself is regenerated every half hour.

import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fetchBoxStatus } from "@/lib/boxStatus";

export const revalidate = 1800;

const LIME = "#D4FF3A";
const WHITE = "#fafafa";
const MUTE = "#8a8a8a";
const BG = "#0a0a0a";

// Google serves plain TTF to a browser old enough not to know woff - which is what satori wants.
const OLD_UA = "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1";
async function googleFont(family: string, weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}`, {
      headers: { "User-Agent": OLD_UA }, next: { revalidate: 86400 },
    }).then((r) => r.text());
    const m = css.match(/src:\s*url\(([^)]+)\)\s*format\('(?:truetype|opentype)'\)/);
    if (!m) return null;
    return await fetch(m[1], { next: { revalidate: 86400 } }).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}

export async function GET() {
  const [s, logo, oswald, arimo] = await Promise.all([
    fetchBoxStatus(),
    readFile(join(process.cwd(), "public", "box-league-logo.png"), "base64").catch(() => null),
    googleFont("Oswald", 700),
    googleFont("Arimo", 700),
  ]);
  const fonts: { name: string; data: ArrayBuffer; weight: 700; style: "normal" }[] = [];
  if (oswald) fonts.push({ name: "Oswald", data: oswald, weight: 700, style: "normal" });
  if (arimo) fonts.push({ name: "Arimo", data: arimo, weight: 700, style: "normal" });
  const display = oswald ? "Oswald" : "sans-serif";
  const body = arimo ? "Arimo" : "sans-serif";

  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, background: BG, display: "flex", position: "relative", fontFamily: body }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 12, height: 630, background: LIME }} />
        <div style={{ position: "absolute", left: 56, top: 40, width: 1104, height: 550, border: "2px solid #1a1a1a" }} />
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`data:image/png;base64,${logo}`} width={300} height={300} alt="" style={{ position: "absolute", left: 108, top: 165 }} />
        )}
        <div style={{ position: "absolute", left: 470, top: 150, display: "flex", flexDirection: "column" }}>
          <div style={{ color: LIME, fontSize: 26, letterSpacing: 3 }}>AUTUMN / WINTER</div>
          <div style={{ color: WHITE, fontSize: 104, fontFamily: display, lineHeight: 1, marginTop: 10, letterSpacing: -1 }}>PADEL BOX</div>
          <div style={{ color: LIME, fontSize: 104, fontFamily: display, lineHeight: 1, letterSpacing: -1 }}>LEAGUE</div>
          <div style={{ width: 600, height: 3, background: "#2c2c2c", marginTop: 26 }} />
          <div style={{ color: WHITE, fontSize: 27, marginTop: 18 }}>BOXES OF 5 · 4 GAMES IN 4 WEEKS</div>
          <div style={{ color: LIME, fontSize: 24, marginTop: 12, fontFamily: display, letterSpacing: 2 }}>{s.headline}</div>
          <div style={{ color: MUTE, fontSize: 20, marginTop: 8 }}>{s.statusLine}</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts,
      headers: { "Cache-Control": "public, max-age=1800, s-maxage=1800" },
    }
  );
}
