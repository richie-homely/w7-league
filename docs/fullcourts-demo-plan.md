# Full Courts — demo build and video, plan

Richie, 19 Sep 2026: "let's map out how we do the demo on video with dummy numbers. Stick that on
the pipeline." The pitch page is written; this is the thing that makes it demonstrable to a club
that has never seen W7.

## Why a separate demo build

The live site carries real members: names, boxes, results, court bookings. None of that can appear
on a stranger's screen, and a pitch that needs redaction on the fly is a pitch that goes wrong. So
the demo is its own deployment with invented clubs, players and bookings, and no way to reach the
real data.

## What it is

A second deployment of the league site pointed at a separate Supabase project, seeded with a
fictional club. Same code, same screens, different data and a demo flag.

- **Club:** "Rathmore Padel", 4 courts, invented town. Nothing that could be mistaken for W7,
  Padel 100 or any real club.
- **People:** generated names, no real member ever, checked against the live roster before seeding.
- **Shape of the data:** one box league of 20 boxes, mid-cycle so tables are half full; a season
  league running into knockouts with a bracket part played; three weeks of bookings either side of
  today so occupancy, held courts and late drops all have something to show.
- **Fixed "today":** the seed is generated relative to the demo date so the screens never go stale
  or empty, and the same slots always look busy on camera.

## What has to be built

1. `scripts/seed_demo.py` — generates the fictional club and writes it to the demo Supabase
   project. Idempotent, and refuses to run against the live project by checking the URL.
2. A `DEMO_MODE` flag in the site that: shows a small "demo data" ribbon, disables every outbound
   email, and turns the admin passcode into a published one so a prospect can click the usage page.
3. Demo bookings generated rather than fetched — no Playtomic credentials in the demo deployment.
4. A Vercel project of its own, e.g. `demo.w7padel.com` or `fullcourts-demo.vercel.app`.

Roughly a day's work. The bulk is the seed script; the flag and the deployment are small.

## The recording

Three minutes, one take, phone or Loom, no editing. The beat-by-beat script lives on the pitch
page so the words and the screens stay in step. Record it on the demo build only.

Order: member's view on a phone → enter a result → opponent confirms from the email → usage view
with games needed against games booked → free hours → held courts and late drops → the morning
email. Finish on the email, because that is the thing an owner pictures themselves reading.

## Order of work

1. Seed script and demo Supabase project.
2. Demo flag and deployment.
3. Dry run of the script against the demo build, fixing anything that looks thin on camera.
4. Record.

## Open questions for Richie

- Does the demo carry W7 branding or neutral "Full Courts" branding? Neutral travels better to a
  club that would be a competitor of W7 in a different town, but branded proves it is real.
- Price list on the pitch page: still blank, and a prospect will ask.
- Whether the market sweep is ever shown. Recommendation: no, not in a demo to a club.
