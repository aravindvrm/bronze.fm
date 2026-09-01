-- Bronze, reworked: the v2 tracklist.
--
-- AUTO-GENERATED from src/content/fixtures/bronze.manifest.json, which
-- `npm run fixtures` writes from the local masters. Hand-editing this is
-- how the database and the fixtures start telling different stories.
--
-- Eleven of the fourteen files are byte-identical to what production
-- already holds — the rework renamed and reordered more than it re-cut —
-- so only three objects were uploaded. The assets insert below is written
-- for all fourteen anyway, with ON CONFLICT DO NOTHING: stating the whole
-- tracklist is what makes this migration describe a state rather than a
-- diff, and re-running it cannot double up.
--
-- The storage prefix stays 'dean/' though the handle is now 'deanMaye'.
-- A storage path is an opaque key, and renaming the folder would mean
-- re-uploading 55 MB to change a string nothing reads.

-- ── Assets ───────────────────────────────────────────────────────────────
insert into assets (creator_id, kind, storage_path, content_hash, bytes, mime, duration_ms)
select c.id, 'audio', v.storage_path, v.content_hash, v.bytes, 'audio/mpeg', v.duration_ms
from creators c
cross join (values
  ('dean/bronze/audio/54350c3939798715.mp3', '54350c3939798715', 224828, 13009),
  ('dean/bronze/audio/e4384bea4ab9f70f.mp3', 'e4384bea4ab9f70f', 5385119, 243912),
  ('dean/bronze/audio/0bdcdeac4b7f7b10.mp3', '0bdcdeac4b7f7b10', 5190188, 222120),
  ('dean/bronze/audio/752c34140ef86234.mp3', '752c34140ef86234', 5140502, 230880),
  ('dean/bronze/audio/71600fe0b2bfe283.mp3', '71600fe0b2bfe283', 160462, 8986),
  ('dean/bronze/audio/fccbb84e9142880d.mp3', 'fccbb84e9142880d', 3432784, 152904),
  ('dean/bronze/audio/8b0ee262ec087ab4.mp3', '8b0ee262ec087ab4', 5316284, 234432),
  ('dean/bronze/audio/b88413d26035c7dd.mp3', 'b88413d26035c7dd', 173419, 9796),
  ('dean/bronze/audio/e588baa91d34e304.mp3', 'e588baa91d34e304', 3995374, 167280),
  ('dean/bronze/audio/7db83a425a3e5072.mp3', '7db83a425a3e5072', 4282808, 190440),
  ('dean/bronze/audio/0b823a8c68f51182.mp3', '0b823a8c68f51182', 5095933, 258024),
  ('dean/bronze/audio/5d8583bd295443d7.mp3', '5d8583bd295443d7', 188884, 10762),
  ('dean/bronze/audio/c9ba8aede47a2f58.mp3', 'c9ba8aede47a2f58', 9431168, 235776),
  ('dean/bronze/audio/3cb8ae61b6861275.mp3', '3cb8ae61b6861275', 9896768, 247416)
) as v(storage_path, content_hash, bytes, duration_ms)
where c.slug = 'deanMaye'
on conflict (creator_id, content_hash, kind) do nothing;

-- ── Tracklist ────────────────────────────────────────────────────────────
-- Replaced wholesale rather than updated in place. The rework dropped a
-- track, added another and shifted three positions; matching old rows to
-- new ones by position would have quietly retitled audio rather than
-- replaced it.
delete from content_items ci
using content ct, projects p, creators c
where ci.content_id = ct.id
  and ct.project_id = p.id
  and p.owner_creator_id = c.id
  and c.slug = 'deanMaye'
  and p.slug = 'bronze'
  and ct.type = 'music';

insert into content_items (content_id, creator_id, position, title, is_interlude, media_asset_id)
select ct.id, c.id, v.position, v.title, v.is_interlude, a.id
from creators c
join projects p on p.owner_creator_id = c.id and p.slug = 'bronze'
join content ct on ct.project_id = p.id and ct.type = 'music'
cross join (values
  (1, 'Bronze Age (Opening Scene)', true, '54350c3939798715'),
  (2, 'Bronze', false, 'e4384bea4ab9f70f'),
  (3, 'Let''s Play A Game', false, '0bdcdeac4b7f7b10'),
  (4, 'Kissy Face Emoji', false, '752c34140ef86234'),
  (5, 'Polished Bronze (Scene 2)', true, '71600fe0b2bfe283'),
  (6, 'Summer Flame', false, 'fccbb84e9142880d'),
  (7, 'Naked', false, '8b0ee262ec087ab4'),
  (8, 'Bronze Alloy (Scene 3)', true, 'b88413d26035c7dd'),
  (9, 'No Vacancy', false, 'e588baa91d34e304'),
  (10, 'WeWork', false, '7db83a425a3e5072'),
  (11, 'Say It', false, '0b823a8c68f51182'),
  (12, 'Bronze Medal (Scene 4)', true, '5d8583bd295443d7'),
  (13, 'Closure', false, 'c9ba8aede47a2f58'),
  (14, 'Forevermore, I Pray', false, '3cb8ae61b6861275')
) as v(position, title, is_interlude, content_hash)
join assets a on a.creator_id = c.id and a.content_hash = v.content_hash and a.kind = 'audio'
where c.slug = 'deanMaye';
