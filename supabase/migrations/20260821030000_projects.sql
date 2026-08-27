-- Projects: a layer above Content, and the Dean rename. See PLAN.md §8.
--
-- Content used to BE the publishable work, with `content.type` meaning "this
-- work is an album" or "this work is a video". The platform structure needs a
-- work that carries SEVERAL typed interfaces — Atonomos is a document today
-- and may gain audio later — so the work moves up into `projects` and each
-- `content` row becomes one interface onto it.
--
-- The URL is `/@dean/bronze/music`: the project is named, the interface is
-- selected by type. A project therefore holds at most one content of each
-- type, enforced below — two would be unaddressable.

-- ── Identity ─────────────────────────────────────────────────────────────
-- robotrebel → Dean. Slug, name and storage prefixes are independent: the
-- storage paths already written keep their old prefix, which is fine because
-- assets are addressed by stored path, not by re-deriving one from the slug.
update creators set slug = 'dean', name = 'Dean' where slug = 'robotrebel';

-- ── Projects ─────────────────────────────────────────────────────────────
create table if not exists projects (
  id                uuid primary key default gen_random_uuid(),
  owner_creator_id  uuid not null references creators(id) on delete cascade,
  slug              text not null,
  title             text not null,
  description       text,
  cover_asset_id    uuid references assets(id) on delete set null,
  published         boolean not null default false,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  unique (owner_creator_id, slug)
);

-- Kept in sync with RESERVED_PROJECT_SLUGS in src/lib/tenant.ts; a unit test
-- compares the two lists so they cannot drift.
--
-- `merch` and `events` are back after 20260820050000 removed them. That
-- migration's reasoning — that those sections sat one segment deeper than
-- content slugs and so could not collide — held for the old routing and does
-- not hold now: they are creator-level routes sharing a segment with project
-- slugs. `music` and `read` stay unreserved for the same reason as before,
-- one level further down.
alter table projects
  add constraint projects_slug_not_reserved
  check (
    slug not in ('about', 'admin', 'api', 'assets', 'events', 'login', 'merch', 'search', 'settings')
  );

alter table projects enable row level security;

-- Same posture as content: published rows are world-readable, everything else
-- is invisible to the anon key. Writes are service-role only.
drop policy if exists "projects are publicly readable when published" on projects;
create policy "projects are publicly readable when published"
  on projects for select
  using (published);

grant select on projects to anon, authenticated;

-- ── Content becomes an interface onto a Project ──────────────────────────
alter table content add column if not exists project_id uuid references projects(id) on delete cascade;

-- Backfill: every existing content row was itself the work, so each becomes a
-- project of the same name holding one interface.
insert into projects (owner_creator_id, slug, title, description, cover_asset_id, published, sort_order)
select c.owner_creator_id, c.slug, c.title, c.description, c.cover_asset_id, c.published, c.sort_order
from content c
where not exists (
  select 1 from projects p
  where p.owner_creator_id = c.owner_creator_id and p.slug = c.slug
);

update content c
set project_id = p.id
from projects p
where p.owner_creator_id = c.owner_creator_id
  and p.slug = c.slug
  and c.project_id is null;

alter table content alter column project_id set not null;

-- The project now owns identity, so a content row no longer needs its own
-- slug — its address is (project, type).
alter table content drop constraint if exists content_slug_not_reserved;
alter table content drop column if exists slug;

-- One interface per type per project: `/@dean/bronze/music` must resolve to
-- exactly one row.
alter table content drop constraint if exists content_one_per_type_per_project;
alter table content
  add constraint content_one_per_type_per_project unique (project_id, type);

-- ereader joins the type list; the reader interface is addressed as /read.
alter table content drop constraint if exists content_type_check;
alter table content
  add constraint content_type_check check (type in ('music', 'video', 'ereader'));

-- ── Atonomos ─────────────────────────────────────────────────────────────
-- The project shell only. Its whitepaper body is NOT seeded here: this
-- repository is public and the paper is unpublished, so committing its prose
-- would publish it — the same reason `Bronze/` is gitignored. The text is
-- uploaded out of band once its handling is settled.
insert into projects (owner_creator_id, slug, title, description, published, sort_order)
select id,
       'atonomos',
       'Atonomos',
       'A whitepaper on the agentic enterprise — how organisations restructure when agents become first-class operators rather than bolted-on automation.',
       false,
       1
from creators where slug = 'dean'
on conflict (owner_creator_id, slug) do nothing;
