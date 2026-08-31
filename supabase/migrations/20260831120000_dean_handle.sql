-- Dean's handle and display name.
--
--   slug  dean  →  deanMaye
--   name  Dean  →  Dean Maye
--
-- The slug is what `/@…` addresses, so this changes every URL under that
-- creator. Everything else keys off `creators.id`, so projects, content and
-- pins follow without being touched.

-- ── Handles may carry capitals ──────────────────────────────────────────
--
-- `creators_slug_format` allowed lowercase only, on the stated grounds of
-- keeping paths readable and avoiding encoding surprises. Mixed case is
-- neither unreadable nor an encoding problem — every major handle-based
-- platform preserves it — but it does introduce one real hazard the
-- lowercase rule was incidentally preventing, which is dealt with below.
--
-- Content slugs are NOT relaxed. They are authored per project rather than
-- chosen as an identity, so there is nothing there worth the ambiguity.
alter table creators drop constraint if exists creators_slug_format;
alter table creators
  add constraint creators_slug_format
  check (slug ~ '^[A-Za-z0-9]+(-[A-Za-z0-9]+)*$');

-- ── ...but only one of each, whatever the case ──────────────────────────
--
-- This is the hazard. `slug` is unique, so `deanMaye` and `deanmaye` were
-- always distinct rows — harmless while slugs were lowercase, and a way to
-- impersonate somebody the moment they are not. Lookups match
-- case-insensitively (`ilike`), so two such rows would also make
-- `getCreator` ambiguous: `maybeSingle()` errors on two matches, which would
-- take out the profile rather than choose wrongly.
create unique index if not exists creators_slug_lower_key on creators (lower(slug));

update creators
set slug = 'deanMaye',
    name = 'Dean Maye'
where slug = 'dean';
