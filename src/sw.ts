/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: { url: string; revision?: string | null }[]
}

/**
 * bronze.fm service worker.
 *
 * Two caches with different rules:
 *   SHELL — the app build. Precached, swapped wholesale on each deploy.
 *   MEDIA — audio and artwork. Cache-first and long-lived, because the whole
 *           point is that a repeat listener costs no egress.
 *
 * The hard part is Range. `<audio>` fetches media with Range requests, and
 * `caches.match()` ignores the Range header and hands back the full 200. Left
 * alone, seeking breaks and Safari may refuse cached audio outright. Every
 * media response here is therefore reconstructed as a proper 206.
 */

/*
 * The build's precache manifest, read exactly once.
 *
 * The manifest token below is a BUILD-TIME placeholder, not a runtime
 * global: Workbox substitutes the array literal at that spot and asserts if
 * it appears more than once. When that assertion fires, injection is skipped
 * altogether AND the build still exits 0 — leaving a worker that ships with
 * an empty precache. Reference it exactly once, here, and read this const
 * everywhere else. Do not write the token in a comment either; the match is
 * on raw text.
 */
const MANIFEST = self.__WB_MANIFEST

const VERSION = 'v1'
const SHELL_CACHE = `bronze-shell-${VERSION}`
const MEDIA_CACHE = `bronze-media-${VERSION}`

import { buildPartial } from '@/lib/rangeResponse'

const MEDIA_RE = /\.(mp3|m4a|aac|ogg|opus|wav|flac|mp4|webm|jpe?g|png|webp|avif)$/i

function isMediaRequest(url: URL): boolean {
  return url.pathname.startsWith('/media/') || MEDIA_RE.test(url.pathname)
}

// ── Install: precache the shell ──────────────────────────────────────────
self.addEventListener('install', (event) => {
  // Injected by vite-plugin-pwa at build time; always present.
  //
  // Deduplicated defensively: vite-plugin-pwa's manifest-icon injection adds
  // each icon declared in manifest.icons to this list *in addition to* the
  // build's own glob match picking up the same files, so entries like
  // icon-192.png land twice. `Cache.addAll()` throws InvalidStateError on any
  // duplicate URL — one bad entry failed the whole precache, which failed
  // `install`, which made the registration disappear silently (no console
  // error survives a discarded registration). Deduping here holds regardless
  // of what future config changes feed this list.
  const urls = [...new Set(MANIFEST.map((e) => e.url))]
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE)
      await cache.addAll(urls)
    })(),
  )
})

/**
 * The shell URLs this build expects, as absolute paths.
 *
 * Used by `activate` to evict entries from previous builds. The cache name is
 * deliberately NOT versioned per build: a running page holds an index.html
 * that points at its own generation's hashed chunks, so swapping the whole
 * cache underneath it would break the page it is still serving. Pruning by
 * manifest at activate time — which only runs once the user has accepted the
 * update and we are about to reload — retires the old generation at the one
 * moment nothing is depending on it.
 */
function shellPaths(): Set<string> {
  return new Set(MANIFEST.map((e) => new URL(e.url, self.location.origin).pathname))
}

// ── Activate: drop caches from older versions ────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, MEDIA_CACHE])
      const names = await caches.keys()
      await Promise.all(
        names.filter((n) => n.startsWith('bronze-') && !keep.has(n)).map((n) => caches.delete(n)),
      )

      /*
       * Drop shell entries this build no longer references. Without this the
       * cache only ever grew: the name is a constant, so the name-based sweep
       * above never matched it, and `install` only ever ADDS the new build's
       * hashed files. Every deploy left its predecessor's JS, CSS and fonts
       * behind forever — dead weight competing with cached audio for the
       * storage budget the media cache actually needs.
       */
      const wanted = shellPaths()
      const shell = await caches.open(SHELL_CACHE)
      const stale = (await shell.keys()).filter((req) => !wanted.has(new URL(req.url).pathname))
      await Promise.all(stale.map((req) => shell.delete(req)))

      await self.clients.claim()
    })(),
  )
})

async function handleMedia(request: Request): Promise<Response> {
  const cache = await caches.open(MEDIA_CACHE)
  const key = new Request(request.url, { method: 'GET' })
  const full = await cache.match(key)
  const range = request.headers.get('range')

  if (full) {
    return range ? buildPartial(full.clone(), range) : full.clone()
  }

  // Not cached: go to the network untouched.
  //
  // Deliberately NOT fetching the full body here. `<audio>` opens with a small
  // Range probe, so fetching the whole resource on a miss would turn skipping
  // past a track into a full download of it — 66 MB to skim this album on
  // cellular. Caching happens on purpose instead: once a track has actually
  // been listened through (see useOpportunisticCache), or when the listener
  // explicitly saves the album offline.
  return fetch(request)
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  if (isMediaRequest(url)) {
    event.respondWith(handleMedia(request))
    return
  }

  /*
   * Navigations are served from the precached shell FIRST, network second.
   *
   * This was network-first, falling back to the cache only when `fetch`
   * rejected — which meant a slow origin was never fallen back from at all,
   * because a slow response is not a failed one. Measured against a 5s
   * origin, a repeat visit took 5063ms with a complete shell sitting in
   * cache; cache-first serves the same bytes in about 30ms.
   *
   * Freshness does not come from re-fetching this document. It comes from
   * the service worker's own update cycle: a new build ships a new sw.js,
   * whose `install` precaches that build's index.html, and the page swaps to
   * it when the visitor accepts the update prompt. Re-fetching index.html
   * here would actively break that, since a newer document names hashed
   * chunks this generation's cache does not hold.
   *
   * Deep links resolve client-side once React Router boots, so every
   * navigation can be answered by the one cached document.
   */
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE)
        const shell = await cache.match('/index.html')
        if (shell) return shell
        // First visit, or the precache was evicted: nothing to serve but the
        // network, and the cache fallback if that fails outright.
        try {
          return await fetch(request)
        } catch {
          return (await cache.match('/index.html')) ?? Response.error()
        }
      })(),
    )
    return
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request)
        if (cached) return cached
        return fetch(request)
      })(),
    )
  }
})

// ── Messages from the page ───────────────────────────────────────────────
self.addEventListener('message', (event) => {
  const data = event.data as { type?: string; urls?: string[] } | undefined
  if (!data) return

  /*
   * The page asking to be updated. `install` no longer calls skipWaiting on
   * its own: a new worker taking over unannounced would swap the shell under
   * a running page — and in a music app, tear down playback with it. The
   * worker waits until the listener accepts the prompt, and only then does
   * the activate-and-prune above run.
   */
  if (data.type === 'SKIP_WAITING') {
    void self.skipWaiting()
    return
  }

  if (data.type === 'PREFETCH_MEDIA' && Array.isArray(data.urls)) {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(MEDIA_CACHE)
        for (const url of data.urls!) {
          if (await cache.match(url)) continue
          try {
            const res = await fetch(url)
            if (res.ok && res.status === 200) await cache.put(url, res)
          } catch {
            // Best-effort: never let a prefetch failure break playback.
          }
        }
      })(),
    )
  }

  if (data.type === 'EVICT_MEDIA' && Array.isArray(data.urls)) {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(MEDIA_CACHE)
        await Promise.all(data.urls!.map((u) => cache.delete(u)))
      })(),
    )
  }
})

export {}
