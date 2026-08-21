// W7 brand theme tokens, ported from the v0.8 artifact.
// Black + neon-yellow. Keep these as the single source of truth for colour/font.

export const C = {
  bg: "#0a0a0a",
  bg2: "#131313",
  card: "#1a1a1a",
  card2: "#212121",
  border: "#2a2a2a",
  accent: "#D4FF3A",
  accentDim: "#9bbe25",
  text: "#fafafa",
  mute: "#8a8a8a",
  red: "#ff5252",
  amber: "#ffb84d",
  green: "#4ade80",
  info: "#7DD8FF",
  violet: "#b98cff",
} as const;

/** One colour per division, so a knockout card shows at a glance who a team
 *  came through with — the draw deliberately pairs teams from DIFFERENT
 *  divisions, which you can only see if the divisions are visually distinct.
 *
 *  Keyed by division NAME (G1..G5), never by id: the ids are g1-low, g2-low,
 *  g3-low, g3-high, g4-high and they do NOT line up with the names — the
 *  division shown as "G4" has id "g3-high". Keying off id silently mis-colours. */
export const DIV_COLORS: Record<string, string> = {
  G1: "#D4FF3A",
  G2: "#7DD8FF",
  G3: "#ffb84d",
  G4: "#4ade80",
  G5: "#b98cff",
};

export function divColor(div: string | undefined): string {
  return (div && DIV_COLORS[div.toUpperCase()]) || "#8a8a8a";
}

export const F = {
  display:
    '"Impact", "Haettenschweiler", "Arial Narrow Bold", "Oswald", sans-serif',
  body:
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", "Helvetica Neue", sans-serif',
  mono:
    'ui-monospace, "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace',
} as const;
