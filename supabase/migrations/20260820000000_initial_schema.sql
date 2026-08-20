-- bronze.fm — initial schema
--
-- Tenancy: tenant = artist. Every content table carries artist_id so RLS is a
-- single uniform predicate. Namespacing organises data; RLS enforces access —
-- the anon key ships inside the PWA and is public by design.

create extension if not exists "pgcrypto";

-- ── Tenant root ──────────────────────────────────────────────────────────
create table if not exists artists (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  created_at  timestamptz not null default now()
);

-- ── Content-addressed binaries ───────────────────────────────────────────
-- storage_path embeds content_hash, so an asset URL is immutable: a new
-- master produces a new hash, a new path, and therefore a natural cache miss.
create table if not exists assets (
  id            uuid primary key default gen_random_uuid(),
  artist_id     uuid not null references artists(id) on delete cascade,
  kind          text not null check (kind in ('audio','image','video')),
  storage_path  text not null,
  content_hash  text not null,
  bytes         bigint not null,
  mime          text not null,
  duration_ms   integer,
  width         integer,
  height        integer,
  created_at    timestamptz not null default now(),
  unique (artist_id, content_hash, kind)
);

create table if not exists releases (
  id              uuid primary key default gen_random_uuid(),
  artist_id       uuid not null references artists(id) on delete cascade,
  slug            text not null,
  title           text not null,
  release_date    date,
  cover_asset_id  uuid references assets(id) on delete set null,
  theme           jsonb not null default '{}'::jsonb,
  -- Enforces private-until-launch in the database rather than by obscurity.
  published       boolean not null default false,
  created_at      timestamptz not null default now(),
  unique (artist_id, slug)
);

create table if not exists tracks (
  id              uuid primary key default gen_random_uuid(),
  release_id      uuid not null references releases(id) on delete cascade,
  artist_id       uuid not null references artists(id) on delete cascade,
  track_no        integer not null,
  title           text not null,
  is_interlude    boolean not null default false,
  audio_asset_id  uuid not null references assets(id) on delete restrict,
  art_asset_id    uuid references assets(id) on delete set null,
  credits         jsonb not null default '{}'::jsonb,
  unique (release_id, track_no)
);

create table if not exists videos (
  id               uuid primary key default gen_random_uuid(),
  artist_id        uuid not null references artists(id) on delete cascade,
  release_id       uuid references releases(id) on delete set null,
  title            text not null,
  video_asset_id   uuid references assets(id) on delete set null,
  poster_asset_id  uuid references assets(id) on delete set null,
  sort_order       integer not null default 0,
  published        boolean not null default false
);

create table if not exists merch_items (
  id              uuid primary key default gen_random_uuid(),
  artist_id       uuid not null references artists(id) on delete cascade,
  title           text not null,
  price_cents     integer,
  currency        text not null default 'USD',
  external_url    text,
  image_asset_id  uuid references assets(id) on delete set null,
  available       boolean not null default false,
  sort_order      integer not null default 0
);

create table if not exists events (
  id          uuid primary key default gen_random_uuid(),
  artist_id   uuid not null references artists(id) on delete cascade,
  starts_at   timestamptz not null,
  venue       text,
  city        text,
  country     text,
  ticket_url  text,
  on_sale     boolean not null default false
);

create index if not exists tracks_release_idx on tracks(release_id, track_no);
create index if not exists assets_artist_idx  on assets(artist_id, kind);
create index if not exists events_artist_idx  on events(artist_id, starts_at);

-- ── RLS ──────────────────────────────────────────────────────────────────
-- v1 has no auth. Reads are public but gated on publication; there is no anon
-- write policy anywhere, so writes are denied by default. Seeding and ingest
-- run through the service-role key from CLI scripts only.

alter table artists     enable row level security;
alter table assets      enable row level security;
alter table releases    enable row level security;
alter table tracks      enable row level security;
alter table videos      enable row level security;
alter table merch_items enable row level security;
alter table events      enable row level security;

create policy "anon reads artists"
  on artists for select to anon using (true);

create policy "anon reads published releases"
  on releases for select to anon using (published);

create policy "anon reads tracks of published releases"
  on tracks for select to anon using (
    exists (select 1 from releases r where r.id = tracks.release_id and r.published)
  );

-- An asset is readable only if something published points at it.
create policy "anon reads assets of published content"
  on assets for select to anon using (
    exists (select 1 from releases r where r.cover_asset_id = assets.id and r.published)
    or exists (
      select 1 from tracks t join releases r on r.id = t.release_id
      where r.published and (t.audio_asset_id = assets.id or t.art_asset_id = assets.id)
    )
    or exists (
      select 1 from videos v where v.published
        and (v.video_asset_id = assets.id or v.poster_asset_id = assets.id)
    )
    or exists (
      select 1 from merch_items m where m.available and m.image_asset_id = assets.id
    )
  );

create policy "anon reads published videos"
  on videos for select to anon using (published);

create policy "anon reads available merch"
  on merch_items for select to anon using (available);

create policy "anon reads on-sale events"
  on events for select to anon using (on_sale);

-- ── Storage ──────────────────────────────────────────────────────────────
-- Single private bucket, prefix-namespaced by artist slug. While the album is
-- unreleased the bucket stays private and the manifest carries short-TTL
-- signed URLs. Going public at launch = flip `public` and add a select policy;
-- the client is unchanged either way because it only reads URLs from the
-- manifest.
insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;
