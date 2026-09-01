-- Clears asset rows whose audio is no longer part of any tracklist.
--
-- The reworked Bronze dropped one track and re-cut two others. Their three
-- objects were deleted from storage; these are the rows that described
-- them. A row outliving its bytes is worse than either loss alone — it
-- advertises a file to anything that reads the table, and the failure only
-- surfaces at the point someone presses play.
--
-- Written as "whatever is unreferenced" rather than as three hashes. The
-- hashes are knowable from outside, but the DATABASE is what actually knows
-- which rows survived, and a migration that states the rule instead of the
-- answer stays correct if this is re-run or if a later rework strands more.
-- No-op when nothing is stranded.
--
-- Scoped to audio: cover art and avatars are referenced by columns other
-- than content_items.media_asset_id, and a rule this shape would read them
-- as unreferenced and delete them.
delete from assets a
where a.kind = 'audio'
  and not exists (
    select 1 from content_items ci where ci.media_asset_id = a.id
  );
