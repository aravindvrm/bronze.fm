-- Creator profile: social links, and the first real bio.
--
-- `socials` is jsonb keyed by platform slug, following the precedent already
-- set by `creators.theme` rather than adding a table for what is a handful of
-- URLs per creator. A key present means a live link; a key absent means the
-- profile renders a dimmed "not connected yet" stub for that platform. So
-- connecting a platform later is a data change, not a schema or code change.
--
-- Deliberately not a `creator_links` table: ordering, labels and icons all
-- live in the client (the icon set is bundled), so a table would carry only
-- the URL — the same thing this column holds, with a join.

alter table creators
  add column if not exists socials jsonb not null default '{}'::jsonb;

comment on column creators.socials is
  'Platform slug -> profile URL. Absent key = not connected; the UI stubs it.';

-- Seeded in the migration rather than applied by hand so it reaches every
-- environment through `db push`, with no out-of-band step that a fresh
-- database would silently miss.
--
-- This is data in a migration, which does not generalise — it is defensible
-- only because the prototype has exactly one creator and no way for a creator
-- to edit their own profile yet. Both of those change in the platform build;
-- when they do, this belongs in a seed script or an admin surface instead.
--
-- Slug is still `robotrebel` at this point: the rename to Dean lands with the
-- routing restructure (PLAN.md §8.6, Phase 5), after this migration.
update creators
set
  bio = 'Technology executive, venture investor, and strategic advisor with 15+ years leading enterprise transformation, AI innovation, and technology-enabled value creation across Fortune 500 enterprises, venture-backed and growth-staged businesses. Combines executive leadership, investment perspective, and deep technical expertise to accelerate business transformation and performance.',
  socials = jsonb_build_object(
    'linkedin', 'https://www.linkedin.com/in/odeanmaye/'
  )
where slug = 'robotrebel';
