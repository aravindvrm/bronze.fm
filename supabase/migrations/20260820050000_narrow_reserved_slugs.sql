-- Narrow the reserved Content slugs.
--
-- The previous list reserved 'music', 'videos', 'merch' and 'events' because
-- they were Creator-level sections sharing the second path segment with
-- Content. They are not: the sections belong to the Content and sit one level
-- deeper (`/dean/bronze/music`), so they cannot collide and an album may
-- legitimately be called Merch.
--
-- What remains are words that plausibly become Creator-level routes, which do
-- share the second segment with Content. Reserving them now is cheap; adding
-- the route later against an existing Content would mean renaming it and
-- breaking its URLs.
--
-- Kept in sync with RESERVED_CONTENT_SLUGS in src/lib/tenant.ts.

alter table content drop constraint if exists content_slug_not_reserved;

alter table content
  add constraint content_slug_not_reserved
  check (
    slug not in ('about', 'admin', 'api', 'assets', 'login', 'search', 'settings')
  );
