-- Creator avatar: a real photo, distinct from a Project's cover art.
--
-- The profile previously borrowed the first Project's cover as Dean's
-- avatar, which meant his photo was literally the Bronze album art. This
-- column is his own.
--
-- The value is a site-relative path (`/avatars/dean.jpg`) into the app's own
-- `public/` build output, not a Supabase Storage object. Brand assets that
-- ship with the app — icons, this avatar — belong in the bundle and are
-- precached with the shell; Storage is for content-addressed media the
-- ingest pipeline uploads (tracks, real cover art), which this is not.
-- Revisit if creators ever manage their own avatar uploads.

alter table creators add column if not exists avatar_url text;

comment on column creators.avatar_url is
  'Site-relative path into public/ (e.g. /avatars/dean.jpg), not Storage — see migration comment.';

update creators set avatar_url = '/avatars/dean.jpg' where slug = 'dean';
