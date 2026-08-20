-- Per-item attribution.
--
-- Content-level credits answer "who made this album". Music also needs
-- "who is on this track" — features and per-track producers are the norm,
-- and rolling them up from Content level cannot express them.
--
-- Content-level credits remain in content_creators; this is additive.

create table content_item_creators (
  content_item_id uuid not null references content_items(id) on delete cascade,
  creator_id      uuid not null references creators(id) on delete cascade,
  role            text not null default 'featured'
                  check (role in ('artist','featured','producer','engineer','writer','director')),
  sort_order      integer not null default 0,
  primary key (content_item_id, creator_id, role)
);

create index ic_creator_idx on content_item_creators(creator_id);
create index ic_item_idx    on content_item_creators(content_item_id, sort_order);

alter table content_item_creators enable row level security;

create policy "anon reads item credits of published content"
  on content_item_creators for select to anon using (
    exists (
      select 1 from content_items i
      join content c on c.id = i.content_id
      where i.id = content_item_creators.content_item_id and c.published
    )
  );
