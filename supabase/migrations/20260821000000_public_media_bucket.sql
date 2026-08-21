-- Public media bucket for this test-deploy phase.
--
-- A private bucket needs signed URLs, and a signed URL's token changes every
-- time it is minted — which breaks the caching design outright: the service
-- worker and mediaCache.ts key on a stable, content-hash-embedded URL, so a
-- rotating query string turns every session into an unrelated set of "new"
-- files. Reworking the cache to key on asset hash instead of full URL is the
-- correct fix for a real public launch; for now, testing, matching what is
-- already built costs nothing.
--
-- Protection at this stage is the same as everywhere else in the app right
-- now: an unindexed, unlisted URL (see public/robots.txt and the noindex meta
-- tag). Anyone who obtains a track's URL directly can fetch it — revisit
-- before any real public release.

update storage.buckets set public = true where id = 'media';

-- Still gated on publication, so an unpublished Content's files are not
-- listed or guessable through the API even though the bucket itself is public.
drop policy if exists "anon reads published media" on storage.objects;
create policy "anon reads published media"
  on storage.objects for select to anon
  using (
    bucket_id = 'media'
    and exists (
      select 1 from assets a
      join content_items ci on ci.media_asset_id = a.id or ci.art_asset_id = a.id
      join content c on c.id = ci.content_id
      where a.storage_path = storage.objects.name and c.published
    )
    or exists (
      select 1 from assets a
      join content c on c.cover_asset_id = a.id
      where a.storage_path = storage.objects.name and c.published
    )
  );
