-- "Releases" renamed to "Content" on the Creator profile page, to match this
-- table's own name directly rather than a different word for the same thing.
--
-- Kept in sync with RESERVED_CONTENT_SLUGS in src/lib/tenant.ts.

alter table content drop constraint if exists content_slug_not_reserved;
alter table content
  add constraint content_slug_not_reserved
  check (
    slug not in (
      'about', 'admin', 'api', 'assets', 'content',
      'events', 'login', 'merch', 'search', 'settings'
    )
  );
