# bronze.fm — Build Plan

An immersive PWA for artists to share music, video, merch, and live events.
First tenant: **Dean / _Bronze_**.

---

## 1. Decisions (locked)

| Area | Decision |
|---|---|
| Client | Vite + React + TypeScript, Tailwind, Framer Motion, React Router |
| Backend | Supabase only — Postgres, Storage, (auth deferred) |
| Delivery | Supabase Storage CDN. No S3/CloudFront. Static build on a CDN-backed static host |
| Caching | Content-addressed assets + manifest hash diffing, immutable cache headers |
| Auth | None in v1. Tenant shape exists in schema from day one |
| Tenancy | tenant = **Creator**; Content has one owner Creator, many attributed |
| Routing | Path today (`bronze.fm/dean`); host checked first so premium Creators can be promoted to `dean.bronze.fm` |

### Departures from the original diagram

**`S3 → CloudFront` is collapsed into Supabase Storage.** Supabase Storage is
S3-compatible and CDN-backed; the static PWA build belongs on a static host with
its own CDN. Keeping both meant two clouds, two IAM models, two bills, for no
capability we need at this stage.

**Namespacing is a layout, not a boundary.** The Supabase anon key ships inside
the PWA and is public by design. Path prefixes and `artist_id` columns organize
data; **RLS policies are the actual security boundary**. Both are written
together, from the first table — retrofitting RLS is painful and error-prone.

---

## 2. Architecture

### 2.1 The constraint that shapes everything: persistent audio

Playback must survive navigation — a track keeps playing while the user browses
into Videos or Merch. That means:

- **One** `HTMLAudioElement`, owned by a provider mounted *above* the router.
- Player state lives in a store (Zustand), not in a screen component.
- The mini-player dock and the full-screen player are two **presentations of one
  state**, not two players.

This dictates the layout shell, so it lands in Phase 1 — before any screen is
built. Retrofitting it means rewriting every screen's mount/unmount behavior.

### 2.2 State flows *from* the audio element

Player UI state is derived from element events (`play`, `pause`, `timeupdate`,
`loadedmetadata`, `ended`, `waiting`), never set optimistically by the click
handler. This is what keeps the UI correct when playback is driven from outside
the page — lock screen, headphone buttons, car head unit.

### 2.3 Content-addressed assets + manifest diffing

The caching requirement — *"cache client side and check via hash on load for the
latest"* — is met by making **the URL contain the hash**:

```
media/{artist_slug}/{release_slug}/{kind}/{sha256}.{ext}
```

Consequences:

1. **Assets are immutable.** Served `Cache-Control: public, max-age=31536000, immutable`.
2. **Content change → new hash → new URL → automatic cache miss.** There is no
   invalidation logic to write, and no stale-asset failure mode.
3. **One small request checks everything.** The client fetches a per-release
   `manifest.json` (network-first, small) listing every asset with hash, URL, and
   byte size. Diffing that against `caches.keys()` yields exactly what to
   prefetch and what to evict — no HEAD-per-asset round trips.

```jsonc
// manifest.json
{
  "release": "bronze",
  "version": "2026-08-19T00:00:00Z",
  "assets": [
    { "id": "…", "kind": "audio", "hash": "9f2a…", "url": "…/9f2a….mp3",
      "bytes": 4118203, "durationMs": 214000 }
  ]
}
```

### 2.4 The Range-request gotcha (must not be missed)

`<audio>` fetches media with HTTP `Range` requests. **`caches.match()` ignores
`Range` and returns the full `200` response.** Left unhandled, seeking breaks and
Safari may refuse to play cached audio at all.

The service worker must detect `request.headers.get('range')`, slice the cached
body, and synthesize a `206 Partial Content` with correct `Content-Range` and
`Content-Length`. Well-trodden, but it has to be written deliberately — this is
the most likely source of "works on desktop Chrome, broken on iPhone."

### 2.5 Storage quota reality

A 10-track album at ~4 MB/track is ~40 MB. Comfortable on desktop and Android.
iOS Safari caps origin storage and evicts aggressively. Therefore:

- Call `navigator.storage.persist()`.
- Treat full-album offline as **best-effort**, with clean fallback to streaming.
- Never block playback on a cache write.

---

## 3. Data model — Creator / Content

Tenant = **Creator**. Content has exactly **one owner Creator**, which drives
the URL, the storage prefix and the RLS predicate. Additional Creators are
attributed through a join table.

This split is the GitHub shape: a repo lives at `github.com/{owner}/{repo}` —
one owner determines the namespace — while contributors are attribution shown
alongside. Without an owner column, many-to-many attribution would leave no
answer to *whose namespace does this file live under*, and would turn every
read policy into a join subquery.

```
creators        id, slug ('dean'), name, bio,
                subdomain?, custom_domain?, tier          ← tenant root
assets          id, creator_id→, kind ('audio'|'image'|'video'),
                storage_path, content_hash, bytes, mime,
                duration_ms?, width?, height?
                unique (creator_id, content_hash, kind)
content         id, owner_creator_id→, type ('music'|'video'),
                slug, title, description, release_date,
                cover_asset_id→, theme jsonb, published bool
                unique (owner_creator_id, slug)
content_items   id, content_id→, creator_id→ (owner, denormalised for RLS),
                position, title, is_interlude,
                media_asset_id→, art_asset_id?, credits jsonb
                unique (content_id, position)
content_creators  content_id→, creator_id→, role, sort_order
                  pk (content_id, creator_id, role)       ← attribution
merch_items     id, creator_id→, title, price_cents, ...  ← stub in v1
events          id, creator_id→, starts_at, venue, ...    ← stub in v1
```

A **music** Content is an album holding ordered `content_items`; a **video**
Content holds a single item. New types slot in without reshaping anything.

`merch_items` and `events` are deliberately *not* Content types — they are
commerce and scheduling records, not publishable media works, and forcing them
into the Content shape would abstract away the fields that matter (price,
inventory, venue, ticket links).

Attribution is Content-level for now, matching the contributors model. Per-item
credits (per-track features and producers, which music genuinely needs) can be
added as `content_item_creators` later without reshaping what exists.

`content.published` enforces private-until-launch **in the database**, rather
than relying on an unguessable URL.

### Routing and tenant resolution

Path-based today: `bronze.fm/dean`, `bronze.fm/dean/music`. The resolver in
`src/lib/tenant.ts` checks **host first**, then path, so promoting a premium
Creator to `dean.bronze.fm` is a DNS record plus setting `creators.subdomain` —
no code change, and their existing path URLs keep working.

Verified behaviour: `dean.bronze.fm → dean`, while `www` / `app` / `staging`
are rejected as reserved, and bare hosts fall through to path.

**Known gap:** a custom domain (`deansite.com`) cannot be parsed into a slug the
way a subdomain can. The `custom_domain` column stores the mapping, but
resolving it needs a lookup — edge config or a boot-time query — that does not
exist yet.

### RLS posture (v1, no auth)

Reads are public but gated on publication; writes have **no anon policy at all**
and are therefore denied by default:

```sql
create policy "anon reads items of published content"
  on content_items for select to anon
  using (exists (
    select 1 from content c
    where c.id = content_items.content_id and c.published
  ));
```

Verified against the live project: anon `SELECT` returns `200`; anon `INSERT`
into `creators`, `content` and `content_creators` all return
`42501 new row violates row-level security policy`.

All writes (seeding, ingest) go through the **service-role key from CLI scripts
only**. It never enters the browser bundle.

Storage is one private bucket, prefix-namespaced by owner:
`{creator_slug}/{content_slug}/{kind}/{hash}.{ext}`. Going public at launch is a
policy change plus dropping the signing step — the client is unchanged either
way, because it only ever reads URLs from the manifest.

## 4. Salvage assessment — send-to player

Source: `send-to-main/public/{controllers/JukeboxController.js,
services/AudioControlService.js, services/TouchScreenService.js,
styles/jukebox.css}` — ~370 lines total.

### Take (design, not code)

- Full-bleed artwork behind controls, bottom gradient scrim.
- Swipe left/right to change track.
- **`MediaSession` metadata wiring** — the highest-value idea in there. Lock-screen
  and headphone controls are most of what separates "app" from "web page."

### Do not copy — defects to fix in the port

| Defect | Consequence |
|---|---|
| `removeEventListener` called with a freshly-created closure each time; in `addAudioIconClickedListener` it targets `audioTrack` though the listener was added to `audioIcon` | Dedup is a silent no-op; re-entering the player stacks duplicate handlers |
| `addProgressBarDragListener` binds only `touchmove`, with no `touchstart` gate and no pointer/mouse path | Desktop cannot seek at all; no tap-to-seek; stray touches over the bar seek unintentionally |
| Play/pause state tracked via CSS classes rather than audio events | Lock-screen or headphone control desyncs the button immediately |
| No `loadedmetadata` handling | Duration unavailable; progress is `NaN` until first `timeupdate` |
| `play()` promise rejection unhandled | Autoplay-policy blocks fail silently |

The port uses **Pointer Events** (one code path for mouse, touch, and pen) and
derives all state from the audio element.

### Nothing to salvage

`public/service-worker.js` is a two-line stub with `console.log` placeholders.
There is **no offline capability in send-to** — the PWA layer is built from zero.

---

## 5. Phases

### Phase 0 — Scaffold
- `git init` (working dir is not yet a repo).
- Vite + React + TS; Tailwind; Framer Motion; React Router; Zustand.
- Extract a palette from the _Bronze_ cover art into design tokens.
- ESLint, Prettier, path aliases, `.env` handling.

### Phase 1 — App shell + persistent audio  ← *the load-bearing phase*
- `<AudioProvider>` above the router, owning one `HTMLAudioElement`.
- Player store: queue, index, playing, position, duration, buffering.
- Element-event bindings; `MediaSession` metadata + action handlers.
- Mini-player dock ↔ full-screen player as one state, two presentations.

### Phase 2 — Screens, against mock data
Built behind a typed content adapter with local JSON fixtures, so **no screen
work is blocked on Supabase or on the real asset files**.
- **Splash** — album art, animated entry, morphing into the home background.
- **Home** — 4 tiles with staggered entrance. Merch/Events get real routes and
  honest "coming soon" states rather than dead tiles.
- **Player** — full-bleed art, scrim, pointer-based scrub bar, prev/next +
  swipe, track list.

### Phase 3 — Supabase
- Schema migrations, RLS policies, seed script (service role, CLI-side).
- **Ingest script**: hash each file → upload to content-addressed path → write
  `assets` rows → emit `manifest.json`.
- Swap the content adapter from fixtures to the Supabase client. No screen
  changes.

### Phase 4 — PWA
- Manifest, icon set, theme color, iOS splash configuration.
- Service worker: precache shell; manifest-diff prefetch/evict; cache-first for
  hashed assets; **`206` Range synthesis for audio**.
- `navigator.storage.persist()`; install prompt; documented iOS caveats.

---

## 6. Status — Phases 0–4 built

- **Scaffold** — Vite + React 18 + TS + Tailwind v4 + Framer Motion + Zustand.
- **Persistent audio** — one `HTMLAudioElement` at module scope. Playback
  verified surviving route changes across Creator sections.
- **Screens** — splash, home, music, in-player queue, stub grids, all under
  `/:creator`.
- **Creator / Content model** — applied; RLS verified against the live project.
- **Caching (Phase 4)** — service worker, manifest hash diffing, offline save.

### Phase 4 — what was verified

**Range reconstruction**, the piece that decides whether cached audio works on
iPhone, is in `src/lib/rangeResponse.ts` — extracted from the worker precisely
so it could be tested. All eleven cases pass, checking byte *content* and not
just headers: explicit windows, `bytes=0-`, the suffix form (`bytes=-500` →
the last 500 bytes), clamping past EOF, and 416 for malformed, inverted,
zero-suffix, out-of-range and multi-range requests.

**End to end through the worker**: a synthetic body was cached under a media
URL with no file behind it, so every byte returned necessarily came from
cache. Windows, suffix ranges and 416 all correct. Real playback then seeked
from 0 to 121 s without error while the worker was intercepting.

**Hash diffing**: changing an item's hash while leaving its URL untouched is
correctly reported stale — the development case a URL-only check would miss.

### Two caching decisions worth knowing

**Cache misses pass through to the network untouched.** `<audio>` opens with a
small Range probe, so caching on miss would turn skipping past a track into a
full download of it — 66 MB to skim this album on cellular. Caching is
deliberate instead: a track is kept once it has actually been played past the
halfway mark, or when the listener explicitly saves the album.

**`cacheOne` fetches with `cache: 'no-store'`.** A plain fetch can be satisfied
from the browser's HTTP cache with a 206 left over from playback, and only a
complete 200 is safe to store — so saving would have silently failed on
exactly the tracks already listened to.

### Fixed: masters were being published by the build

`public/media/audio` was a symlink to the master folder, and `vite build`
copies `public/` into `dist/` — so every build embedded 66 MB of unreleased
audio, and deploying `dist/` would have served the album as plain downloadable
files. Media is now served in development by a Vite middleware with
`apply: 'serve'`, which cannot run during a build. `dist/` went from 70 MB to
3.6 MB with zero audio files, verified.

### Test harness

Three layers, all running in CI:

- **Vitest (77 tests)** over the pure logic: Range parsing and 206
  construction, tenant resolution including subdomain forward-compatibility,
  cache planning against a fake Cache API, time formatting, procedural-art
  determinism, and filename-to-title cleaning.
- **Playwright (22 tests)** in a real browser. This is what closed the
  animation blind spot: the development preview runs with
  `visibilityState: "hidden"`, so rAF never fires and Framer Motion pins every
  animation at `initial` — two non-existent bugs were chased before that was
  understood. The suite asserts the player slides fully in rather than
  partway, unmounts on collapse, and that staggered entrances finish. It also
  covers playback surviving navigation, seeking, auto-advance, swipe gestures
  with axis locking, and the worker serving a cached 206.
- **RLS (14 tests)** against a throwaway `supabase start` instance with every
  migration applied from scratch, so a migration that stops applying cleanly
  fails in CI rather than on someone's manual `db push`.

CI has no audio — the masters are gitignored — so `scripts/gen-test-audio.mjs`
synthesises silent MP3s at each item's real duration, giving the browser tests
decodable media at the exact fixture paths without shipping the album.

Still unverified by machine: how the motion actually *feels*, and gesture
behaviour under real touch on iOS. Those need a human on a device.

## 7. Open items

1. **Real artwork and final track titles** from Dean. Placeholder art is
   procedural and swaps out via one field per item.
2. **Launch posture.** Still assumes private-until-release. The bucket is
   created private; going public is a policy flip plus dropping the signing
   step, with no client change.
3. **Apply the migration** — `supabase link` then `supabase db push`. Needs the
   database password.
4. **Egress.** 66 MB per full album stream against a 5 GB free-tier monthly
   allowance is ~75 complete listens. The Phase 4 client cache is what keeps
   repeat listeners free.
