-- Pinned content: a Creator's own curation on their profile.
--
-- Pins are heterogeneous by design — Dean's are two tracks and a whitepaper —
-- so a pin points at EITHER one content_item (a single track) or a whole
-- content (a document, an album). Exactly one, enforced by the check below
-- rather than by convention, because a pin with both or neither has no
-- meaningful rendering.
--
-- Not a `position` column on content_items: a pin is the Creator's editorial
-- choice about their profile, which is a different thing from an item's place
-- inside its own work, and the same track may be pinned while staying track 2
-- of the album.

create table if not exists creator_pins (
  id               uuid primary key default gen_random_uuid(),
  creator_id       uuid not null references creators(id) on delete cascade,
  content_id       uuid references content(id) on delete cascade,
  content_item_id  uuid references content_items(id) on delete cascade,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  constraint creator_pins_one_target check (num_nonnulls(content_id, content_item_id) = 1)
);

create index if not exists creator_pins_creator_idx on creator_pins (creator_id, sort_order);

alter table creator_pins enable row level security;

-- Readable by anyone; the pinned row's own RLS still governs whether the
-- thing it points at is visible, so a pin cannot leak an unpublished work.
drop policy if exists "creator pins are publicly readable" on creator_pins;
create policy "creator pins are publicly readable"
  on creator_pins for select
  using (true);

grant select on creator_pins to anon, authenticated;

-- ── Dean's pins ──────────────────────────────────────────────────────────
-- Tracks 2 and 6 of Bronze, plus the Atonomos paper. Positions are the
-- album's own ordering, which is stable and already the fixtures' source of
-- truth, so this does not hard-code titles that may still change.
insert into creator_pins (creator_id, content_item_id, sort_order)
select c.id, ci.id, case ci.position when 2 then 0 else 1 end
from creators c
join content ct on ct.owner_creator_id = c.id and ct.type = 'music'
join content_items ci on ci.content_id = ct.id and ci.position in (2, 6)
where c.slug = 'dean'
on conflict do nothing;

-- The whitepaper itself, once its content row exists. Left as a no-op until
-- then rather than inventing a placeholder row: the paper's body is ingested
-- out of band (it is unpublished and this repository is public).
insert into creator_pins (creator_id, content_id, sort_order)
select c.id, ct.id, 2
from creators c
join projects p on p.owner_creator_id = c.id and p.slug = 'atonomos'
join content ct on ct.project_id = p.id and ct.type = 'ereader'
where c.slug = 'dean'
on conflict do nothing;

-- Atonomos shows on the profile as a project even while its paper is still
-- being prepared; anon read is gated on `published`, so without this the
-- project is invisible on the deployment.
update projects set published = true where slug = 'atonomos';
