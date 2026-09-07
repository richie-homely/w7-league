# W7 Autumn/Winter Padel Box League — how the system works

Management summary, 7 September 2026 (v1.1). For David, Paul, Mick and the desk team.
Site: https://league.w7padel.com/box · Rules: /box/rules · Player instructions: /box/how-to

## In one paragraph

100 teams (200 players) paid €20 a head on Playtomic. Their combined Playtomic ratings put
them into 20 boxes of 5. Every four weeks each team plays the other four in its box, enters
the score on the league site, and the opposing team confirms it by email link. At the end of
the cycle the top two go up, the bottom two go down, box winners get €20 credit each, and the
next cycle starts. Seven cycles, 14 September 2026 to 11 April 2027, with a two-week
Christmas pause. Nobody at the desk has to enter a score: the players do it, the system
checks that both sides agree, and only disagreements come to welcome@w7padel.com.

## What the players see

- **Boxes.** All 20 boxes with seeds and ratings, a calendar of the seven cycles, and a live
  table per box (played, won, sets, points).
- **Find my box.** They enter their Playtomic email once; the page then shows only their box
  and remembers the email on that phone. The launch email also carries a button straight to
  their box.
- **Enter a score.** Tap the fixture, type the sets (the cursor auto-advances, the winner is
  highlighted), enter their email, submit. The result shows as provisional.
- **Confirm.** The other team gets an email within 15 minutes with a button to that match:
  Confirm or Dispute. Entering the same score themselves also confirms. Both teams get a
  final email when it is confirmed; both teams and welcome@ get one if the scores differ.
- **Fixtures are arranged in Playtomic chat.** Teams message each other from the league
  event in the Playtomic app and book the court themselves; the site holds no contact details
  beyond the registered email used to confirm scores.
- **Rules and how-to pages** for everything else. Problems go to welcome@w7padel.com.

## What happens behind it

- **Database (Supabase, the same project as the summer league).** Four tables: box_teams
  (the 100 teams, box and seed), box_matches (184 → 200 fixtures per cycle, status pending /
  submitted / confirmed / disputed), box_team_contacts (registered emails, private), and
  box_score_log (every entry, who and when). The site reads the public tables directly;
  every write goes through a stored procedure that checks the email belongs to one of the
  two teams in that match. No passwords: the registered email is the credential, which is
  why the Apple "hide my email" relay addresses need replacing with real ones.
- **Ratings and boxes.** The Manager entrant list gives the teams; the rating for each player
  is read live from the venue's Playtomic player list (the entrant list shows the rating at
  enrolment and never moves). Unrated players count as 0.5, Playtomic's floor. A re-cut is a
  one-line rerun that keeps every team's identity and results; only the box number changes.
- **Emails.** A watcher on Richie's laptop (moving to the always-on PC) checks the fixtures
  every 15 minutes and sends the confirm / confirmed / disputed emails from the W7 Gmail.
  It never sends the same email twice. The 100-team launch mail-out is a separate script and
  goes only when Richie says so.
- **Cycle end (to build before 11 October).** The fixture generator exists; the cycle-end
  step does not yet. Before the cycle-1 deadline Richie will add the script that voids
  unplayed fixtures with −1 to both teams, applies promotion and relegation (top two up,
  bottom two down, third stays), generates the next cycle's fixtures and lists the box
  winners for the desk to load the €20 credits in Playtomic.

## What the desk has to do

1. **Disputes.** When a "scores differ" email arrives, ask both teams for a photo of the score
   or their word, then send the agreed score to Richie, who sets it in the database (a
   manager form on the site is on the list, not built yet). Expect a handful a cycle at most;
   the summer league had none.
2. **Email fixes.** Players whose Playtomic email is an Apple relay cannot receive the confirm
   emails. They can add a real address themselves under their team, or send it to welcome@
   and we add it.
3. **Substitutes.** Rule is within 0.75 rating of the player replaced. If a team asks, check
   the two ratings in Playtomic and reply yes or no; the site does not police it.
4. **Cycle turnover.** Richie runs the cycle-end step the Monday after each deadline, then
   the desk loads the winners' €20 credits.
5. **Weather extensions.** Organisers' call; if a cycle is extended, the calendar on the site
   is updated and all teams are emailed.

## Numbers to have in your head

| Item | Value |
|---|---|
| Teams / players | 100 / 200 (cap reached 7 Sep 2026) |
| Entry fees collected via Playtomic | €4,000 gross (€20 × 200), less two free entries |
| Boxes | 20 boxes of 5 |
| Fixtures per cycle | 200 (10 per box) |
| Cycle length | 4 weeks; cycle 1 = 14 Sep – 11 Oct 2026 |
| Season | 7 cycles to 11 Apr 2027; Christmas pause 23 Dec – 5 Jan |
| Winner credit | €20 per player, €40 per team, 20 winning teams a cycle = €800 credit a cycle (≈€5,600 over the season; confirmed 7 Sep) |
| Court demand | ~200 matches per 4 weeks ≈ 50 bookings a week, mostly evenings and weekends |

## Risks worth naming

- **Court capacity.** 50 league bookings a week on three courts is about a third of peak
  capacity. Watch the first fortnight; if boxes cannot get courts, the cycle-1 deadline is the
  first pressure point.
- **Email reach.** Roughly one player in eight registered with an Apple relay address. The
  launch email asks them to add a real one; until they do, their partner's email carries the
  team.
- **Ratings drift.** Playtomic ratings move as people play. Boxes are only re-cut between
  cycles, and only if a team is obviously misplaced; promotion and relegation do the rest.
- **The −1 rule.** It is in the rules and every player agreed to it. Apply it evenly from
  cycle 1 or it will not hold by cycle 3.
