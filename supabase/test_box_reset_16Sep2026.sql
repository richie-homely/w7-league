-- ── Put a test-box fixture back to "awaiting confirmation" (16 Sep 2026, Richie) ────────────
-- So the confirm button in the email can be tried end to end. Box 99 is the test box: it never
-- appears on the public page and nothing here touches a real result.
--
-- After running this, the fixture TEST Team B v Richie Test & Partner Test shows as submitted by
-- TEST Team B, so the other side (Richie Test & Partner Test) gets the Confirm result button.
update public.box_matches
   set sets = '[[3,6],[6,4],[10,7]]'::jsonb,
       status = 'submitted',
       submitted_team = '4ced66f8-3351-491e-95a6-3aeb6af1dc54',   -- TEST Team B
       submitted_at = now(),
       confirmed_at = null,
       updated_at = now()
 where id = 'b90e9651-6fa3-4f50-86a1-053f64d0c0b5'                -- box 99 fixture
returning id, box, status, sets, submitted_team;

-- To put it back afterwards:
--   update public.box_matches set status = 'confirmed', confirmed_at = now()
--    where id = 'b90e9651-6fa3-4f50-86a1-053f64d0c0b5';
