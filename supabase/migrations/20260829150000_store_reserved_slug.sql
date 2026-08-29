-- "Merch" renamed to "Store" on the Creator profile, so `/@dean/merch`
-- becomes `/@dean/store`.
--
-- `store` therefore has to join the reserved list: it is now a Creator-level
-- section sharing a path segment with project slugs, and a project called
-- `store` would be permanently unreachable behind it.
--
-- `merch` STAYS reserved rather than being swapped out. It addressed a real
-- section until this migration, so letting a project claim it would hand out
-- a slug that older links still point at — and the cost of keeping a word
-- reserved is nothing.
--
-- Kept in sync with RESERVED_PROJECT_SLUGS in src/lib/tenant.ts; a unit test
-- compares the two lists so they cannot drift.

alter table projects drop constraint if exists projects_slug_not_reserved;
alter table projects
  add constraint projects_slug_not_reserved
  check (
    slug not in (
      'about', 'admin', 'api', 'assets', 'events',
      'login', 'merch', 'search', 'settings', 'store'
    )
  );
