/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: { url: string; revision?: string | null }[] }

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
  const urls = [...new Set(self.__WB_MANIFEST.map((e) => e.url))]
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE)
      await cache.addAll(urls)
      await self.skipWaiting()
    })(),
  )
})

// ── Activate: drop caches from older versions ────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, MEDIA_CACHE])
      const names = await caches.keys()
      await Promise.all(
        names.filter((n) => n.startsWith('bronze-') && !keep.has(n)).map((n) => caches.delete(n)),
      )
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

  // Same-origin navigations fall back to the cached shell so the app opens
  // offline. Deep links resolve client-side once React Router boots.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request)
        } catch {
          const cache = await caches.open(SHELL_CACHE)
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
