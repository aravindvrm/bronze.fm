# bronze.fm

A mobile-first PWA where creators publish their work — music, writing, video,
merch, live dates — under their own handle, with a feed across all of it.

Multi-tenant from the schema up: a **Creator** owns **Projects**, and each
Project carries one or more typed **interfaces** onto it (an album's tracklist,
a paper's reader). The Creator is the tenant. First creator is **Dean**, with
the album *Bronze* and the whitepaper *Atonomos*.

> **Status:** prototype, no auth yet. Anyone can read everything — the
> passcode gate that used to front the deployment was removed deliberately
> (see [Deployment](#deployment)). The album masters are still kept out of
> this repo, but only because binaries do not belong in git.

---

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

That runs against local fixtures — no Supabase account, no network, no audio
required. The app comes up at `http://localhost:5173/`.

Playback needs audio files that aren't in the repo. Either drop the masters into
`Bronze/` (gitignored) and run `npm run fixtures`, or synthesise silent
stand-ins at the paths the fixtures expect:

```bash
node scripts/gen-test-audio.mjs   # requires ffmpeg
```

Node 22 is what CI runs on.

---

## Environment

Copy `.env.example` to `.env`. The variables that matter locally:

| Variable | Purpose |
|---|---|
| `VITE_CONTENT_SOURCE` | `fixtures` (default, offline) or `supabase` (live data) |
| `VITE_DEFAULT_CREATOR` | Creator to resolve to when the URL carries no tenant hint |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Only needed when the source is `supabase` |
| `VITE_APP_DOMAIN` | Domain that Creator subdomains hang off |

One secret deliberately lives **outside** this file:

- `SUPABASE_SERVICE_ROLE_KEY` — `.env` only, for `scripts/ingest.mjs`. Never
  `VITE_`-prefixed; that prefix means "inline into the public bundle".
---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server, loopback only |
| `npm run build` | Typecheck → build → **verify `dist/`** (see below) |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | Browser tests (Playwright) |
| `npm run test:all` | Both |
| `npm run fixtures` | Regenerate `bronze.generated.ts` from the local masters |
| `npm run icons` | Rebuild the PWA icon set from the logo in `brand/` |
| `npm run whitepaper` | Regenerate the Atonomos document from `sources/` |
| `npm run cover` | Re-encode cover art |
| `npm run check:dist` | Run the build-output guard on its own |

`npm run build` ends in `scripts/check-dist.mjs`, which fails the build if audio,
secret-shaped files, oversized assets, or a duplicated service-worker precache
entry reached `dist/`. Both of those failure modes have actually happened here;
the guard is what stops them recurring.

### Dev server host flags

`npm run dev` binds to loopback on purpose — the dev middleware serves the
unreleased masters at `/media/audio`, so `--host` without thought exposes the
album to the whole network. `dev:lan` and `dev:usb` exist for device testing.
Never expose this through a public tunnel.

---

## Architecture

### One audio element, above the router

Playback has to survive navigation — a track keeps playing while you browse into
Videos or Merch. So there is exactly one `HTMLAudioElement`, owned by
`AudioProvider` mounted *above* the router, with state in a Zustand store
(`src/audio/playerStore.ts`). The mini-player dock and the full-screen player are
two presentations of one state, not two players.

Player state is derived from element events (`play`, `timeupdate`, `ended`, …),
never set optimistically by the click handler. That's what keeps the UI correct
when playback is driven from outside the page — lock screen, headphone buttons,
car head unit.

### Service worker and Range requests

`src/sw.ts` runs two caches: a precached app shell, and a long-lived media cache
(the point being that a repeat listener costs no egress).

The awkward part is Range. `<audio>` fetches media with Range requests, and
`caches.match()` ignores the Range header and hands back a full `200` — which
breaks seeking, and makes Safari refuse cached audio outright. Every cached media
response is therefore reconstructed into a proper `206`
(`src/lib/rangeResponse.ts`).

Cache misses go to the network **untouched** rather than fetching the whole file:
`<audio>` opens with a small Range probe, so eagerly caching on miss would turn
skipping past a track into a full download of it. Caching happens deliberately
instead — after a track is actually listened through, or when the listener saves
the release offline.

### Routing and tenancy

```
/                       the feed — everything published, with search
/@dean                  creator profile — bio, links, pinned, projects
/@dean/merch            creator-level section
/@dean/events           creator-level section
/@dean/bronze           project hub — the ways into one body of work
/@dean/bronze/music     the album's tracklist
/@dean/atonomos/read    the whitepaper's reader
```

**Handles carry an `@`.** Once `/` is a feed, a bare `/dean` would put every
creator handle in the same namespace as every future top-level route, making
each new route a potential breaking rename for whoever holds that word. No
route begins with `@`, so that collision class is closed and no top-level
reserved list is needed. The router enforces the prefix rather than assuming
it — `/:handle/*` matches any first segment.

**Project slugs are scoped to the creator**, so two creators can each have a
`bronze`. Creator-level sections are matched **before** project slugs, so a
project can never be called `merch`; that list is enforced twice, in
`RESERVED_PROJECT_SLUGS` and a `CHECK` constraint, with a unit test comparing
them.

**A Content is addressed by type, not by slug** — `/@dean/bronze/music` — so a
project holds at most one interface of each type, enforced by a unique
constraint.

Host is resolved before path, so a Creator can be promoted to
`dean.bronze.fm` or a custom domain by setting a column, with no code change.

### Data

`src/content/adapter.ts` picks the backend from `VITE_CONTENT_SOURCE`, so no
screen knows or cares whether it's reading fixtures or Supabase.

Schema lives in `supabase/migrations/`. RLS is the actual security boundary, not
the path prefixes — the anon key ships in the client bundle by design, so
`tests/rls.test.ts` asserts the policies hold, and CI runs it against a
throwaway instance built from the migrations.

`scripts/ingest.mjs` uploads masters and writes the rows describing them. It
re-hashes every file and refuses to proceed on a mismatch with
`bronze.generated.ts`, so a stale fixture file can't silently ship wrong data.
Asset URLs are content-addressed — new master, new hash, new URL, so a replaced
file can never be shadowed by a stale cache entry.

---

## Deployment

Vercel, static build. No server, no middleware.

A shared-passcode Edge Middleware used to gate the whole origin, because the
media bucket's public flag bypasses RLS for *listing* — anyone with the anon
key from devtools can enumerate the bucket. That gate was removed
deliberately: the catalogue is published openly, so enumeration is no longer
a leak. Anything that should not be world-readable must therefore not go in
this bucket, since there is nothing else in front of it.

---

## Testing

- **Unit** (Vitest) — pure logic: Range reconstruction and tenant resolution.
- **Browser** (Playwright, `mobile-chrome`) — navigation, playback across
  navigation, seeking, gestures, and the service worker's 206 handling against
  real media.
- **Database** — migrations applied from scratch, then RLS asserted.

CI runs four jobs: typecheck/unit/build, browser tests, migrations+RLS, and a
secret scan that also fails if any audio file is tracked in git.

---

## Gotchas

- **The splash is not a route.** It is a `sessionStorage`-gated overlay shown
  once per cold open, at the root only. As a URL it would be deep-linkable,
  sit in history, and be a dead end on refresh.
- **Never commit audio.** `Bronze/` and every audio extension are gitignored, the
  build guard checks `dist/`, and CI checks the tree. This repo once shipped
  66 MB of unreleased masters into build output because `public/` is copied
  wholesale — hence three independent checks.
- **Icons regenerate from `brand/`, not from the cover art.** `npm run icons`
  builds the set from `brand/bronzefm-logo-cutout.png`. Use the *cutout*, never
  `bronzefm-logo.jpeg` beside it — the JPEG's "transparency" is a painted
  checkerboard that would composite into the icon as grey squares.
- **The service worker is off in dev** by default, since a live worker shadows
  HMR and serves stale modules. `PWA_DEV=true` turns it on — that's how the e2e
  suite exercises the caching path.
- **Desktop layout is a reflow, not a separate app.** Everything is mobile-first;
  desktop rules are all behind `sm:` and share one `--app-w` content ceiling.
