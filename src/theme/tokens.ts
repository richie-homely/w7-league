// W7 brand theme tokens — ported from the v0.8 artifact.
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
} as const;

export const F = {
  display:
    '"Impact", "Haettenschweiler", "Arial Narrow Bold", "Oswald", sans-serif',
  body:
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", "Helvetica Neue", sans-serif',
  mono:
    'ui-monospace, "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace',
} as const;
