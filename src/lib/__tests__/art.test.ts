import { describe, expect, it } from 'vitest'
import { artSvg, artTint, artUrl } from '@/lib/art'

/**
 * Placeholder art is content-addressed by seed. If it stopped being
 * deterministic, artwork would change on every render and every cached image
 * would be a miss.
 */
describe('procedural art', () => {
  it('is deterministic for a seed', () => {
    expect(artSvg('abc', 'item', 200)).toBe(artSvg('abc', 'item', 200))
  })

  it('differs across seeds', () => {
    expect(artSvg('abc', 'item', 200)).not.toBe(artSvg('xyz', 'item', 200))
  })

  it('differs across variants for the same seed', () => {
    expect(artSvg('abc', 'cover', 200)).not.toBe(artSvg('abc', 'item', 200))
  })

  it('honours the requested size', () => {
    expect(artSvg('abc', 'item', 512)).toContain('width="512"')
  })

  it('produces a usable data URI', () => {
    const url = artUrl('abc', 'item', 64)
    expect(url.startsWith('data:image/svg+xml,')).toBe(true)
    expect(decodeURIComponent(url.slice('data:image/svg+xml,'.length))).toContain('<svg')
  })

  it('gives every SVG unique gradient ids', () => {
    // Duplicate ids across two inlined SVGs would cross-wire their gradients.
    const ids = (svg: string) => [...svg.matchAll(/id="([^"]+)"/g)].map((m) => m[1])
    const a = ids(artSvg('one', 'item', 64))
    const b = ids(artSvg('two', 'item', 64))
    expect(new Set(a).size).toBe(a.length)
    expect(a.some((id) => b.includes(id))).toBe(false)
  })

  it('returns a stable tint colour', () => {
    expect(artTint('abc')).toBe(artTint('abc'))
    expect(artTint('abc')).toMatch(/^#[0-9a-f]{6}$/i)
  })
})
