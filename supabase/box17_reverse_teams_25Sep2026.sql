-- ── Box 17: the score was right, the teams were the wrong way round (25 Sep 2026, Richie) ────
-- Elaine Kirwan & Christina Reilly submitted their 7-5, 6-0 win over Anna Higgins & Sharon
-- McDevitt, but entered it against the wrong side, so it recorded Anna & Sharon as the winners.
-- Anna confirmed it: "I just looked at the score and it was correct so I confirmed not realising
-- the names were reversed... Anna and Sharon lost the match, Elaine and Christina were the
-- winners" (Anna Higgins by email, 25 Sep 2026, 23:12).
--
-- sets are stored as [team1 games, team2 games], and team1 is Anna & Sharon, so the fix is to
-- mirror each set rather than swap the team ids — the fixture keeps its identity and only the
-- result flips. 7-5, 6-0 to Elaine & Christina becomes [[5,7],[0,6]].
--
-- It stays confirmed: both sides agree on the score and on who won, so there is nothing to
-- re-confirm. Guarded on the current wrong value so re-running it cannot flip a corrected row
-- back again.
update public.box_matches
   set sets = '[[5,7],[0,6]]'::jsonb,
       updated_at = now()
 where id = 'fed0a473-57d1-40d6-8d55-d297e41a7a8f'
   and sets = '[[7,5],[6,0]]'::jsonb
returning id, box, status, sets, team1_id, team2_id;
