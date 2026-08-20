import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cacheOne, clearMedia, evict, manifestFor, planSync, runSync } from '@/lib/mediaCache'
import type { Content } from '@/content/types'

/** Minimal in-memory stand-in for the Cache Storage API. */
class FakeCache {
  store = new Map<string, Response>()
  async match(req: RequestInfo) {
    const key = typeof req === 'string' ? req : (req as Request).url
    return this.store.get(key) ?? this.store.get(new URL(key, 'http://localhost').pathname)
  }
  async put(req: RequestInfo, res: Response) {
    const key = typeof req === 'string' ? req : (req as Request).url
    this.store.set(key, res)
  }
  async delete(req: RequestInfo) {
    const key = typeof req === 'string' ? req : (req as Request).url
    return this.store.delete(key)
  }
  async keys() {
    return [...this.store.keys()].map((u) => new Request(new URL(u, 'http://localhost').href))
  }
}

let cache: FakeCache

beforeEach(() => {
  cache = new FakeCache()
  vi.stubGlobal('caches', {
    open: async () => cache,
    delete: async () => {
      cache.store.clear()
      return true
    },
  })
  localStorage.clear()
})

const item = (n: number, hash: string) => ({
  id: `itm_0${n}`,
  position: n,
  title: `Track ${n}`,
  isInterlude: false,
  credits: [],
  hash,
  bytes: 1000 * n,
  durationMs: 1000,
  channels: 2,
  sampleRate: 44100,
  bitrate: 128000,
  url: `/media/audio/track${n}.mp3`,
})

const content = (items: ReturnType<typeof item>[]) =>
  ({
    id: 'c1',
    type: 'music',
    ownerSlug: 'dean',
    slug: 'bronze',
    title: 'Bronze',
    published: false,
    totalDurationMs: 0,
    items,
    credits: [],
  }) as unknown as Content

describe('manifestFor', () => {
  it('projects the fields the cache needs', () => {
    const m = manifestFor(content([item(1, 'aaa')]))
    expect(m).toEqual([{ id: 'itm_01', url: '/media/audio/track1.mp3', hash: 'aaa', bytes: 1000 }])
  })
})

describe('planSync', () => {
  it('reports everything missing on a cold cache', async () => {
    const entries = manifestFor(content([item(1, 'aaa'), item(2, 'bbb')]))
    const plan = await planSync(entries)
    expect(plan.missing).toHaveLength(2)
    expect(plan.stale).toHaveLength(0)
    expect(plan.cachedBytes).toBe(0)
  })

  it('counts cached bytes once entries are present', async () => {
    const entries = manifestFor(content([item(1, 'aaa')]))
    await cache.put('/media/audio/track1.mp3', new Response('x'))
    await runSync(entries) // records the manifest
    const plan = await planSync(entries)
    expect(plan.missing).toHaveLength(0)
    expect(plan.cachedBytes).toBe(1000)
  })

  it('flags a changed hash behind an unchanged URL as stale', async () => {
    // The development case: the file behind a stable URL is replaced. A
    // URL-only comparison would miss this entirely.
    const entries = manifestFor(content([item(1, 'aaa')]))
    await cache.put('/media/audio/track1.mp3', new Response('x'))
    await runSync(entries)

    const remastered = manifestFor(content([item(1, 'CHANGED')]))
    const plan = await planSync(remastered)
    expect(plan.stale).toHaveLength(1)
    expect(plan.stale[0].id).toBe('itm_01')
    expect(plan.missing).toHaveLength(0)
  })

  it('marks cached entries the manifest no longer references for eviction', async () => {
    await cache.put('/media/audio/orphan.mp3', new Response('x'))
    const plan = await planSync(manifestFor(content([item(1, 'aaa')])))
    expect(plan.evict.some((u) => u.includes('orphan.mp3'))).toBe(true)
  })
})

describe('cacheOne', () => {
  it('stores a complete 200', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('audio', { status: 200 })))
    const ok = await cacheOne({ id: 'a', url: '/a.mp3', hash: 'h', bytes: 5 })
    expect(ok).toBe(true)
    expect(await cache.match('/a.mp3')).toBeTruthy()
  })

  it('refuses to store a 206', async () => {
    // Caching a partial would poison every later seek: the worker treats cache
    // entries as whole files.
    vi.stubGlobal('fetch', vi.fn(async () => new Response('par', { status: 206 })))
    expect(await cacheOne({ id: 'a', url: '/a.mp3', hash: 'h', bytes: 5 })).toBe(false)
    expect(await cache.match('/a.mp3')).toBeFalsy()
  })

  it('bypasses the HTTP cache so a stale 206 cannot be returned', async () => {
    const spy = vi.fn(async () => new Response('audio', { status: 200 }))
    vi.stubGlobal('fetch', spy)
    await cacheOne({ id: 'a', url: '/a.mp3', hash: 'h', bytes: 5 })
    expect(spy).toHaveBeenCalledWith('/a.mp3', { cache: 'no-store' })
  })

  it('survives a network failure without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('offline')
    }))
    expect(await cacheOne({ id: 'a', url: '/a.mp3', hash: 'h', bytes: 5 })).toBe(false)
  })

  it('skips a fetch when the entry is already cached', async () => {
    await cache.put('/a.mp3', new Response('x'))
    const spy = vi.fn()
    vi.stubGlobal('fetch', spy)
    expect(await cacheOne({ id: 'a', url: '/a.mp3', hash: 'h', bytes: 5 })).toBe(true)
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('runSync', () => {
  it('reports progress and caches what is missing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('audio', { status: 200 })))
    const entries = manifestFor(content([item(1, 'a'), item(2, 'b'), item(3, 'c')]))
    const seen: number[] = []
    const res = await runSync(entries, (done) => seen.push(done))
    expect(res).toEqual({ cached: 3, failed: 0 })
    expect(seen).toEqual([1, 2, 3])
  })

  it('counts failures without aborting the run', async () => {
    let n = 0
    vi.stubGlobal('fetch', vi.fn(async () => {
      n++
      return new Response('a', { status: n === 2 ? 500 : 200 })
    }))
    const entries = manifestFor(content([item(1, 'a'), item(2, 'b'), item(3, 'c')]))
    expect(await runSync(entries)).toEqual({ cached: 2, failed: 1 })
  })
})

describe('evict / clearMedia', () => {
  it('removes named entries', async () => {
    await cache.put('/a.mp3', new Response('x'))
    await evict(['/a.mp3'])
    expect(await cache.match('/a.mp3')).toBeFalsy()
  })

  it('clears the cache and the stored manifest', async () => {
    await cache.put('/a.mp3', new Response('x'))
    localStorage.setItem('bronze:media-manifest', '{"a":1}')
    await clearMedia()
    expect(localStorage.getItem('bronze:media-manifest')).toBeNull()
  })
})
