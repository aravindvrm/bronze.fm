import type { Content } from '@/content/types'

/**
 * Client-side media cache: hash diffing, prefetch, eviction.
 *
 * The cache name matches the service worker's MEDIA_CACHE, so anything stored
 * here is served by the worker — including the 206 reconstruction that makes
 * seeking work against a cached file.
 */

const MEDIA_CACHE = 'bronze-media-v1'
const MANIFEST_KEY = 'bronze:media-manifest'

export interface ManifestEntry {
  id: string
  url: string
  hash: string
  bytes: number
}

export interface SyncPlan {
  stale: ManifestEntry[]
  missing: ManifestEntry[]
  evict: string[]
  cachedBytes: number
}

export function manifestFor(content: Content): ManifestEntry[] {
  return content.items.map((i) => ({ id: i.id, url: i.url, hash: i.hash, bytes: i.bytes }))
}

type StoredMap = Record<string, { hash: string; url: string }>

function readStored(): StoredMap {
  try {
    return JSON.parse(localStorage.getItem(MANIFEST_KEY) ?? '{}') as StoredMap
  } catch {
    return {}
  }
}

function writeStored(entries: ManifestEntry[]) {
  const map: StoredMap = {}
  for (const e of entries) map[e.id] = { hash: e.hash, url: e.url }
  try {
    localStorage.setItem(MANIFEST_KEY, JSON.stringify(map))
  } catch {
    /* private mode / quota — diffing degrades to URL presence only */
  }
}

export function cacheAvailable(): boolean {
  return typeof caches !== 'undefined'
}

/**
 * Works out what needs fetching and what should go, without downloading.
 *
 * Hashes are compared rather than URLs so this is correct in both worlds: in
 * production the hash is *in* the path, so a changed master yields a new URL;
 * in development the URL is stable while the file behind it changes. Comparing
 * hashes catches the second case, which a URL check would miss entirely.
 */
export async function planSync(entries: ManifestEntry[]): Promise<SyncPlan> {
  const plan: SyncPlan = { stale: [], missing: [], evict: [], cachedBytes: 0 }
  if (!cacheAvailable()) return plan

  const cache = await caches.open(MEDIA_CACHE)
  const stored = readStored()
  const liveUrls = new Set(entries.map((e) => e.url))

  for (const entry of entries) {
    const prev = stored[entry.id]
    const hit = await cache.match(entry.url)

    if (prev && prev.hash !== entry.hash) {
      // Content changed behind a stable URL — the dev case.
      plan.stale.push(entry)
      if (prev.url !== entry.url) plan.evict.push(prev.url)
    } else if (!hit) {
      plan.missing.push(entry)
    } else {
      plan.cachedBytes += entry.bytes
    }
  }

  // Anything cached that the manifest no longer references.
  for (const req of await cache.keys()) {
    const url = new URL(req.url)
    const rel = url.pathname + url.search
    if (!liveUrls.has(rel) && !liveUrls.has(req.url)) plan.evict.push(req.url)
  }

  return plan
}

export async function evict(urls: string[]): Promise<void> {
  if (!cacheAvailable() || !urls.length) return
  const cache = await caches.open(MEDIA_CACHE)
  await Promise.all(urls.map((u) => cache.delete(u)))
}

/** Caches one item. Safe to call repeatedly; a present entry is left alone. */
export async function cacheOne(entry: ManifestEntry, { force = false } = {}): Promise<boolean> {
  if (!cacheAvailable()) return false
  const cache = await caches.open(MEDIA_CACHE)
  if (!force && (await cache.match(entry.url))) return true
  try {
    // `no-store` is required, not tidiness. A plain fetch can be satisfied
    // from the browser's HTTP cache with a 206 left over from playback, and
    // since only a complete 200 is cacheable, saving would silently fail on
    // exactly the tracks the listener had already played.
    const res = await fetch(entry.url, { cache: 'no-store' })
    // Storing a 206 would poison every later seek: the worker treats cache
    // entries as whole files.
    if (!res.ok || res.status !== 200) return false
    await cache.put(entry.url, res)
    return true
  } catch {
    return false
  }
}

/**
 * Downloads everything the plan says is needed, sequentially so a slow
 * connection is not saturated by 14 parallel track fetches.
 */
export async function runSync(
  entries: ManifestEntry[],
  onProgress?: (done: number, total: number, entry: ManifestEntry) => void,
): Promise<{ cached: number; failed: number }> {
  const plan = await planSync(entries)
  await evict(plan.evict)

  const queue = [...plan.stale, ...plan.missing]
  let cached = 0
  let failed = 0

  for (let i = 0; i < queue.length; i++) {
    const ok = await cacheOne(queue[i], { force: plan.stale.includes(queue[i]) })
    ok ? cached++ : failed++
    onProgress?.(i + 1, queue.length, queue[i])
  }

  writeStored(entries)
  return { cached, failed }
}

/** Evicts everything and forgets the stored manifest. */
export async function clearMedia(): Promise<void> {
  if (cacheAvailable()) await caches.delete(MEDIA_CACHE)
  try {
    localStorage.removeItem(MANIFEST_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * Asks the browser to exempt this origin from routine eviction.
 *
 * iOS in particular evicts aggressively under storage pressure, so offline
 * audio is best-effort even when granted — playback always falls back to
 * streaming rather than failing.
 */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

export async function usage(): Promise<{ usage: number; quota: number } | null> {
  try {
    if (!navigator.storage?.estimate) return null
    const e = await navigator.storage.estimate()
    return { usage: e.usage ?? 0, quota: e.quota ?? 0 }
  } catch {
    return null
  }
}
