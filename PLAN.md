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
| Tenancy | tenant = **artist**; releases are children and carry their own theme |

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

## 3. Data model

Every content table carries `artist_id` so RLS is one uniform predicate.

```
artists        id, slug ('dean'), name, created_at            ← tenant root
releases       id, artist_id→, slug ('bronze'), title, release_date,
               cover_asset_id→, theme jsonb, published bool default false
assets         id, artist_id→, kind ('audio'|'image'|'video'),
               storage_path, content_hash, bytes, mime,
               duration_ms?, width?, height?
               unique (artist_id, content_hash, kind)
tracks         id, release_id→, artist_id→, track_no, title,
               audio_asset_id→, art_asset_id? (falls back to release cover),
               credits jsonb          unique (release_id, track_no)
videos         id, artist_id→, release_id?, title,
               video_asset_id→, poster_asset_id→, sort_order
merch_items    id, artist_id→, title, price_cents, currency,
               external_url, image_asset_id→, available bool     ← stub in v1
events         id, artist_id→, starts_at, venue, city, country,
               ticket_url, on_sale bool                          ← stub in v1
```

`releases.published` enforces the private-until-launch posture **in the
database**, rather than relying on an unguessable URL.

### RLS posture (v1, no auth)

Reads are public but gated on publication; writes have **no anon policy at all**
and are therefore denied by default:

```sql
alter table tracks enable row level security;

create policy "anon reads published tracks"
  on tracks for select to anon
  using (exists (
    select 1 from releases r
    where r.id = tracks.release_id and r.published
  ));
```

All writes (seeding, ingest) go through the **service-role key from CLI scripts
only**. The service-role key never enters the browser bundle.

Storage gets the matching policy on `storage.objects`, keyed on the path prefix:

```sql
create policy "anon reads published media"
  on storage.objects for select to anon
  using (bucket_id = 'media' and (storage.foldername(name))[1] = 'dean');
```

While unreleased, the bucket stays **private** and the manifest carries
short-TTL signed URLs. Flipping to public at launch is a policy change plus
dropping the signing step — the client code is identical either way, because it
only ever reads URLs from the manifest.

---

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

## 6. Open items

1. **The _Bronze_ assets.** Currently in a private drive folder. Needed: audio
   files, cover art, track titles and running order, any video. Phases 0–2 can
   proceed on placeholders; Phase 3 cannot start without them.
2. **Launch posture confirmation.** Plan assumes private-until-release
   (`published=false`, private bucket, signed URLs). Confirm before launch.
3. **Supabase project** — does one exist, or should it be created?
4. **Merch / Events** — confirm stub-only for v1. Merch eventually points at
   Stripe or Shopify; no cart is being built now.
