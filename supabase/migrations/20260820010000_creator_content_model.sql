-- bronze.fm — Creator / Content model
--
-- Supersedes the artist/release/track model. No data existed yet, so this
-- drops and recreates rather than carrying rename baggage.
--
-- Tenancy: tenant = Creator. Content has exactly ONE owner Creator, which
-- drives the URL, the storage prefix and the RLS predicate. Additional
-- Creators are attributed through content_creators — the GitHub split, where
-- a repo has one owner in the URL and many contributors alongside it.

drop table if exists tracks       cascade;
drop table if exists releases     cascade;
drop table if exists videos       cascade;
drop table if exists merch_items  cascade;
drop table if exists events       cascade;
drop table if exists assets       cascade;
drop table if exists artists      cascade;

-- ── Tenant root ──────────────────────────────────────────────────────────
create table creators (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  bio         text,
  -- Routing is path-based (bronze.fm/dean) for now. These columns exist so a
  -- premium Creator can be promoted to dean.bronze.fm, or a custom domain,
  -- without a schema change — the client resolver already checks host first.
  subdomain      text unique,
  custom_domain  text unique,
  tier           text not null default 'standard'
                 check (tier in ('standard','premium')),
  created_at  timestamptz not null default now()
);

-- ── Content-addressed binaries ───────────────────────────────────────────
create table assets (
  id            uuid primary key default gen_random_uuid(),
  creator_id    uuid not null references creators(id) on delete cascade,
  kind          text not null check (kind in ('audio','image','video')),
  storage_path  text not null,   -- {creator_slug}/{content_slug}/{kind}/{hash}.{ext}
  content_hash  text not null,
  bytes         bigint not null,
  mime          text not null,
  duration_ms   integer,
  width         integer,
  height        integer,
  created_at    timestamptz not null default now(),
  unique (creator_id, content_hash, kind)
);

-- ── Content: one publishable work ────────────────────────────────────────
-- A music Content is an album holding ordered items. A video Content holds a
-- single item. New types slot in without reshaping anything.
create table content (
  id                uuid primary key default gen_random_uuid(),
  owner_creator_id  uuid not null references creators(id) on delete cascade,
  type              text not null check (type in ('music','video')),
  slug              text not null,
  title             text not null,
  description       text,
  release_date      date,
  cover_asset_id    uuid references assets(id) on delete set null,
  theme             jsonb not null default '{}'::jsonb,
  published         boolean not null default false,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  unique (owner_creator_id, slug)
);

-- ── Items within a Content ───────────────────────────────────────────────
create table content_items (
  id              uuid primary key default gen_random_uuid(),
  content_id      uuid not null references content(id) on delete cascade,
  -- Denormalised owner, so every RLS predicate stays a single-column check.
  creator_id      uuid not null references creators(id) on delete cascade,
  position        integer not null,
  title           text not null,
  is_interlude    boolean not null default false,
  media_asset_id  uuid not null references assets(id) on delete restrict,
  art_asset_id    uuid references assets(id) on delete set null,
  credits         jsonb not null default '{}'::jsonb,
  unique (content_id, position)
);

-- ── Attribution: many Creators per Content ───────────────────────────────
create table content_creators (
  content_id  uuid not null references content(id) on delete cascade,
  creator_id  uuid not null references creators(id) on delete cascade,
  role        text not null default 'artist'
              check (role in ('artist','featured','producer','engineer','writer','director')),
  sort_order  integer not null default 0,
  primary key (content_id, creator_id, role)
);

-- ── Commerce / scheduling ────────────────────────────────────────────────
-- Deliberately NOT Content types: these are not publishable media works and
-- forcing them into that shape would abstract away the fields that matter.
create table merch_items (
  id              uuid primary key default gen_random_uuid(),
  creator_id      uuid not null references creators(id) on delete cascade,
  title           text not null,
  price_cents     integer,
  currency        text not null default 'USD',
  external_url    text,
  image_asset_id  uuid references assets(id) on delete set null,
  available       boolean not null default false,
  sort_order      integer not null default 0
);

create table events (
  id          uuid primary key default gen_random_uuid(),
  creator_id  uuid not null references creators(id) on delete cascade,
  starts_at   timestamptz not null,
  venue       text,
  city        text,
  country     text,
  ticket_url  text,
  on_sale     boolean not null default false
);

create index content_owner_idx   on content(owner_creator_id, type, sort_order);
create index items_content_idx   on content_items(content_id, position);
create index assets_creator_idx  on assets(creator_id, kind);
create index events_creator_idx  on events(creator_id, starts_at);
create index cc_creator_idx      on content_creators(creator_id);

-- ── RLS ──────────────────────────────────────────────────────────────────
-- No auth in v1. Reads are public but gated on publication; no anon write
-- policy exists anywhere, so writes are denied by default. Ingest and seeding
-- run through the service-role key from CLI scripts only.

alter table creators         enable row level security;
alter table assets           enable row level security;
alter table content          enable row level security;
alter table content_items    enable row level security;
alter table content_creators enable row level security;
alter table merch_items      enable row level security;
alter table events           enable row level security;

create policy "anon reads creators"
  on creators for select to anon using (true);

create policy "anon reads published content"
  on content for select to anon using (published);

create policy "anon reads items of published content"
  on content_items for select to anon using (
    exists (select 1 from content c where c.id = content_items.content_id and c.published)
  );

create policy "anon reads credits of published content"
  on content_creators for select to anon using (
    exists (select 1 from content c where c.id = content_creators.content_id and c.published)
  );

-- An asset is readable only if something published points at it.
create policy "anon reads assets of published content"
  on assets for select to anon using (
    exists (select 1 from content c where c.cover_asset_id = assets.id and c.published)
    or exists (
      select 1 from content_items i join content c on c.id = i.content_id
      where c.published and (i.media_asset_id = assets.id or i.art_asset_id = assets.id)
    )
    or exists (
      select 1 from merch_items m where m.available and m.image_asset_id = assets.id
    )
  );

create policy "anon reads available merch"
  on merch_items for select to anon using (available);

create policy "anon reads on-sale events"
  on events for select to anon using (on_sale);

insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;
