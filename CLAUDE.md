@AGENTS.md

# W7 League Tracker

A padel league dashboard for **W7 Padel**, Wicklow Town, Ireland. Public standings + fixtures
for players, an admin console for score entry, and a live-screen projection mode for the club.

Being ported from the working Claude artifact at
`reference/W7_League_Tracker_v0.8_26May2026.jsx` (treat it as the spec for data model,
league rules, and visual design) to a production app.

## People

- **Richie Carroll** — co-shareholder (project owner). Admin: `richiecarroll65@gmail.com`.
- **David Hennebry** — senior partner. Admin: `welcome@w7padel.com` (also the public contact address).
- **Mike Shanahan** — Operations Manager. Admin: `mike@w7padel.com`.

## Stack & deployment

- **Next.js 16** (App Router, TypeScript, `src/` dir, no Tailwind — styling via theme tokens + inline styles, ported from the artifact).
- **Supabase** — Postgres + Realtime + Auth.
- **Vercel** hosting at **league.w7padel.com** (subdomain on the Wix-hosted main domain; DNS managed in Wix).

## Auth model

- **Public** — read-only access to standings/fixtures (no login).
- **Admins** — passwordless **magic-link** email auth (the three people above). No passwords anywhere.
- **Live screen** — no auth (`/live`).

Admin writes are enforced in Postgres via an `is_admin()` function that checks the JWT email
against the three admin addresses. Core data is exactly **3 tables**: `teams`, `fixtures`,
`settings`. The 5 divisions are a code constant, not a table.

## League rules

- 5 divisions, 12 teams each, 11-round round-robin → tier knockout.
  - Lower tier: G1, G2, G3 (Playtomic rating 0.5–2.4).
  - Upper tier: G4, G5 (rating 2.5–5.5).
- **Scoring:** Win = 3 pts; **+1 bonus** for a straight-sets (2–0) win.
- **Match format:** best of 3; the deciding 3rd set is a **championship tiebreak**. Minimum 2 sets recorded per result.
- **Tiebreak order:** Points → head-to-head → set difference → game difference.
- **Knockout:** top 4 from each division qualify into a **tier-wide** bracket
  (lower tier = 12 qualifiers; upper tier = 8 qualifiers), seeded by combined tier standings.
- **Dates:** league starts **Sat 6 June 2026**; entry deadline **15 Aug 2026**. A live countdown runs to the start.
- Fixtures are generated **in-app on demand** (round-robin circle method in `lib/league.ts`),
  not pre-seeded. `seed.sql` seeds teams only.

## Brand

- Palette: black `#0a0a0a` / `#131313` / card `#1a1a1a` / border `#2a2a2a`; **neon yellow accent `#D4FF3A`** (dim `#9bbe25`); text `#fafafa`, muted `#8a8a8a`. Status: red `#ff5252`, amber `#ffb84d`, green `#4ade80`, info blue `#7DD8FF`.
- Fonts: condensed display (Impact / Oswald) for headings; system sans for body; mono for scores and IDs.

## Conventions

- **File naming for versioned deliverables/snapshots:** `Name_vX.Y_DDMmmYYYY`
  (e.g. `W7_League_Tracker_v0.8_26May2026.jsx`).
- Theme tokens live in `src/theme/tokens.ts`; pure logic (standings, bracket, scoring,
  round-robin, dates, division config) in `src/lib/`; React components in `src/components/`.

## Windows / PowerShell notes

Primary dev environment is Windows 11 in **PowerShell**. Flag when commands differ from Git Bash:

- Env vars: PowerShell `$env:NAME = "value"` / read `$env:NAME`; Git Bash `export NAME=value` / `$NAME`.
- Dev server: `npm run dev` (identical in both shells).
- Local `.env.local` holds `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (gitignored).
