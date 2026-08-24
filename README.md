# bronze.fm

A mobile-first PWA for musicians to publish a release and everything around it —
music, videos, merch, live dates — under their own name and URL.

Multi-tenant from the schema up: a **Creator** owns **Content**, and the Creator
is the tenant. First tenant is **robotrebel**, with the debut release *Bronze*.

> **Status:** pre-launch. There is no auth yet, and the deployment is gated
> behind a shared passcode (see [Deployment](#deployment)). The unreleased
> masters are deliberately **not** in this repo.

---

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

That runs against local fixtures — no Supabase account, no network, no audio
required. The app comes up at `http://localhost:5173/robotrebel`.

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

Two secrets deliberately live **outside** this file:

- `SUPABASE_SERVICE_ROLE_KEY` — `.env` only, for `scripts/ingest.mjs`. Never
  `VITE_`-prefixed; that prefix means "inline into the public bundle".
- `SITE_PASSCODE` — set in the Vercel dashboard only. `npm run dev` never
  executes the middleware, so it has no effect locally.

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
/robotrebel                    Creator profile — Content, Merch, Events
/robotrebel/content            their releases
/robotrebel/merch              everything they sell
/robotrebel/events             every date
/robotrebel/bronze             one release: splash (entry screen)
/robotrebel/bronze/home        the four tiles
/robotrebel/bronze/music       track list
/robotrebel/bronze/videos|merch|events
```

Creator-level sections are matched **before** Content slugs, so a release can
never be called `merch`. That list is enforced twice: `RESERVED_CONTENT_SLUGS` in
`src/lib/tenant.ts`, and a `CHECK` constraint in the database.

Merch and Events exist at both levels. A release-scoped section shows only items
tagged to that release, and deliberately **does not** fall back to the
Creator-wide list — silently serving everything under a release path would make
the same set reachable under every release.

Host is resolved before path, so a Creator can be promoted to
`robotrebel.bronze.fm` or a custom domain by setting a column, with no code
change.

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

Vercel, static build plus one Edge Middleware.

`middleware.ts` gates the **entire origin** behind a shared passcode. That's not
belt-and-braces: the media bucket's public flag turned out to bypass RLS for
*listing*, meaning anyone holding the anon key from devtools could enumerate and
download the whole catalog directly from Supabase, forever, independent of this
site. RLS can't retroactively protect a leaked key, so the gate has to sit in
front of the JS bundle that contains it.

It fails closed: with `SITE_PASSCODE` unset, everyone is locked out — including
whoever forgot to set it.

---

## Testing

- **Unit** (Vitest) — pure logic: Range reconstruction, tenant resolution, the
  middleware's cookie/HMAC helpers.
- **Browser** (Playwright, `mobile-chrome`) — navigation, playback across
  navigation, seeking, gestures, and the service worker's 206 handling against
  real media.
- **Database** — migrations applied from scratch, then RLS asserted.

CI runs four jobs: typecheck/unit/build, browser tests, migrations+RLS, and a
secret scan that also fails if any audio file is tracked in git.

---

## Gotchas

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
