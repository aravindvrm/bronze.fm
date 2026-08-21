-- Optional release association for merch and events.
--
-- Both remain Creator-owned: a store and a tour belong to an artist, not to a
-- record. But in music they usually carry a release dimension too — the Bronze
-- vinyl, the Bronze tour — and without modelling it, a release's Merch and
-- Events sections could only show Creator-level data, making the same set
-- reachable under every release path.
--
-- Nullable, so an item with no association is simply Creator-wide.

alter table merch_items add column content_id uuid references content(id) on delete set null;
alter table events      add column content_id uuid references content(id) on delete set null;

create index merch_content_idx  on merch_items(content_id);
create index events_content_idx on events(content_id);

-- An item tied to an unpublished release must not leak that release's
-- existence — Bronze vinyl should not be listable before Bronze is announced.
drop policy if exists "anon reads available merch" on merch_items;
create policy "anon reads available merch"
  on merch_items for select to anon
  using (
    available
    and (
      content_id is null
      or exists (select 1 from content c where c.id = merch_items.content_id and c.published)
    )
  );

drop policy if exists "anon reads on-sale events" on events;
create policy "anon reads on-sale events"
  on events for select to anon
  using (
    on_sale
    and (
      content_id is null
      or exists (select 1 from content c where c.id = events.content_id and c.published)
    )
  );

-- The Creator page now has its own routes for releases, merch and events, so
-- those words share the second path segment with Content slugs and must be
-- reserved. `videos` is NOT reserved: it exists only inside a release
-- (/dean/bronze/videos), one segment deeper, where it cannot collide.
-- Kept in sync with RESERVED_CONTENT_SLUGS in src/lib/tenant.ts.
alter table content drop constraint if exists content_slug_not_reserved;
alter table content
  add constraint content_slug_not_reserved
  check (
    slug not in (
      'about', 'admin', 'api', 'assets', 'events',
      'login', 'merch', 'releases', 'search', 'settings'
    )
  );
