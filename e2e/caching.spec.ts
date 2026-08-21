import { expect, test } from '@playwright/test'
import { gotoCreator } from './helpers'

const MEDIA_CACHE = 'bronze-media-v1'

test.describe('service worker media caching', () => {
  test.beforeEach(async ({ page }) => {
    await gotoCreator(page)
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, undefined, {
      timeout: 20_000,
    })
  })

  test('registers and controls the page', async ({ page }) => {
    const info = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration()
      return { active: !!reg?.active, controlled: !!navigator.serviceWorker.controller }
    })
    expect(info.active).toBe(true)
    expect(info.controlled).toBe(true)
  })

  test('serves a cached body as a correct 206', async ({ page }) => {
    // The URL has no file behind it, so anything returned came from cache.
    const result = await page.evaluate(async (cacheName) => {
      const url = location.origin + '/media/audio/__e2e__.mp3'
      const body = new Uint8Array(1000).map((_, i) => (i * 7) % 256)
      const cache = await caches.open(cacheName)
      await cache.put(url, new Response(body.slice(), { status: 200, headers: { 'Content-Type': 'audio/mpeg' } }))

      const window_ = await fetch(url, { headers: { Range: 'bytes=100-199' } })
      const wBytes = new Uint8Array(await window_.arrayBuffer())

      const suffix = await fetch(url, { headers: { Range: 'bytes=-50' } })
      const sBytes = new Uint8Array(await suffix.arrayBuffer())

      const bad = await fetch(url, { headers: { Range: 'bytes=5000-' } })

      await cache.delete(url)
      return {
        window: {
          status: window_.status,
          contentRange: window_.headers.get('Content-Range'),
          length: wBytes.length,
          firstByte: wBytes[0],
        },
        suffix: {
          status: suffix.status,
          contentRange: suffix.headers.get('Content-Range'),
          firstByte: sBytes[0],
        },
        unsatisfiable: { status: bad.status, contentRange: bad.headers.get('Content-Range') },
      }
    }, MEDIA_CACHE)

    expect(result.window.status).toBe(206)
    expect(result.window.contentRange).toBe('bytes 100-199/1000')
    expect(result.window.length).toBe(100)
    expect(result.window.firstByte).toBe((100 * 7) % 256)

    expect(result.suffix.status).toBe(206)
    expect(result.suffix.contentRange).toBe('bytes 950-999/1000')
    expect(result.suffix.firstByte).toBe((950 * 7) % 256)

    expect(result.unsatisfiable.status).toBe(416)
    expect(result.unsatisfiable.contentRange).toBe('bytes */1000')
  })

  test('does not cache on a miss', async ({ page }) => {
    // Caching on miss would turn skipping past a track into a full download of
    // it — 66 MB to skim this album on cellular.
    const cachedAfterProbe = await page.evaluate(async (cacheName) => {
      const cache = await caches.open(cacheName)
      const url = '/media/audio/' + encodeURIComponent('01 - Bronze Age (Skit).mp3')
      await cache.delete(url)
      await fetch(url, { headers: { Range: 'bytes=0-1023' } })
      await new Promise((r) => setTimeout(r, 500))
      return !!(await cache.match(url))
    }, MEDIA_CACHE)

    expect(cachedAfterProbe).toBe(false)
  })

  test('explicit save stores a complete body that then serves ranges', async ({ page }) => {
    const result = await page.evaluate(async (cacheName) => {
      const mc = await import('/src/lib/mediaCache.ts')
      const url = '/media/audio/' + encodeURIComponent('05 - Polished Bronze (Skit).mp3')
      const cache = await caches.open(cacheName)
      await cache.delete(url)

      const ok = await mc.cacheOne({ id: 'x', url, hash: 'h', bytes: 0 })
      const stored = await cache.match(url)
      const status = stored?.status ?? null
      const size = stored ? (await stored.clone().arrayBuffer()).byteLength : 0

      const ranged = await fetch(url, { headers: { Range: 'bytes=0-99' } })
      await cache.delete(url)
      return { ok, status, size, rangeStatus: ranged.status, cr: ranged.headers.get('Content-Range') }
    }, MEDIA_CACHE)

    expect(result.ok).toBe(true)
    expect(result.status).toBe(200) // a stored 206 would poison later seeks
    expect(result.size).toBeGreaterThan(0)
    expect(result.rangeStatus).toBe(206)
    // Total in Content-Range must match the stored body, not a hard-coded size:
    // CI runs against synthesised stand-ins, not the real masters.
    expect(result.cr).toBe(`bytes 0-99/${result.size}`)
  })
})
