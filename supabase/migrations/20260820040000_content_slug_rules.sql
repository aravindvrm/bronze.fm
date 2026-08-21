-- Content slug rules.
--
-- Content sits flat under its Creator (`/dean/bronze`) alongside the Creator's
-- sections (`/dean/music`, `/dean/merch`). A Content slug matching a section
-- name would be permanently unreachable — the router would resolve it to the
-- section instead. Enforce here so a colliding slug cannot be stored at all,
-- rather than relying on whoever inserts the row to remember.
--
-- Kept in sync with RESERVED_CONTENT_SLUGS in src/lib/tenant.ts.

alter table content
  add constraint content_slug_not_reserved
  check (
    slug not in (
      'music', 'videos', 'merch', 'events', 'about',
      'home', 'assets', 'api', 'settings', 'search'
    )
  );

-- URL-safe slugs only: lowercase alphanumerics and single hyphens, no leading
-- or trailing hyphen. Keeps paths readable and avoids encoding surprises.
alter table content
  add constraint content_slug_format
  check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

-- Same rules for Creator slugs, which occupy the first path segment.
alter table creators
  add constraint creators_slug_format
  check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
