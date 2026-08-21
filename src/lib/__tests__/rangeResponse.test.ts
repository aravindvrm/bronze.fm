import { describe, expect, it } from 'vitest'
import { buildPartial, parseRange, rangeNotSatisfiable } from '@/lib/rangeResponse'

/**
 * These assertions are why the Range logic was extracted from the worker.
 * `caches.match()` ignores Range and returns the full 200; handing that to
 * <audio> breaks seeking and Safari may refuse cached audio outright.
 */

const SIZE = 1000
/** Deterministic body, so a byte's value proves which offset it came from. */
const body = () => new Uint8Array(SIZE).map((_, i) => (i * 7) % 256)
const at = (offset: number) => (offset * 7) % 256
const full = () =>
  new Response(body().slice(), { status: 200, headers: { 'Content-Type': 'audio/mpeg' } })

describe('parseRange', () => {
  it('reads an open-ended range', () => {
    expect(parseRange('bytes=0-', SIZE)).toEqual({ start: 0, end: 999 })
  })

  it('reads an explicit window', () => {
    expect(parseRange('bytes=100-199', SIZE)).toEqual({ start: 100, end: 199 })
  })

  it('reads the suffix form as the LAST n bytes', () => {
    // The easiest case to get backwards: bytes=-500 is not "from 500".
    expect(parseRange('bytes=-500', SIZE)).toEqual({ start: 500, end: 999 })
  })

  it('clamps an end past EOF', () => {
    expect(parseRange('bytes=900-5000', SIZE)).toEqual({ start: 900, end: 999 })
  })

  it('accepts the final byte', () => {
    expect(parseRange('bytes=999-', SIZE)).toEqual({ start: 999, end: 999 })
  })

  it.each([
    ['start at EOF', 'bytes=1000-'],
    ['zero suffix', 'bytes=-0'],
    ['garbage', 'bytes=abc'],
    ['multi-range', 'bytes=0-99,200-299'],
    ['inverted', 'bytes=500-100'],
    ['wrong unit', 'items=0-99'],
    ['no prefix', '0-99'],
  ])('rejects %s', (_label, header) => {
    expect(parseRange(header, SIZE)).toBeNull()
  })

  it('tolerates surrounding whitespace', () => {
    expect(parseRange('  bytes=0-9  ', SIZE)).toEqual({ start: 0, end: 9 })
  })
})

describe('buildPartial', () => {
  it('returns 206 with correct headers and byte content', async () => {
    const res = await buildPartial(full(), 'bytes=100-199')
    expect(res.status).toBe(206)
    expect(res.headers.get('Content-Range')).toBe('bytes 100-199/1000')
    expect(res.headers.get('Content-Length')).toBe('100')
    expect(res.headers.get('Accept-Ranges')).toBe('bytes')

    const bytes = new Uint8Array(await res.arrayBuffer())
    expect(bytes.length).toBe(100)
    // Proves the slice came from the right offset, not just the right length.
    expect(bytes[0]).toBe(at(100))
    expect(bytes[99]).toBe(at(199))
  })

  it('serves the tail for a suffix range', async () => {
    const res = await buildPartial(full(), 'bytes=-50')
    expect(res.status).toBe(206)
    expect(res.headers.get('Content-Range')).toBe('bytes 950-999/1000')
    const bytes = new Uint8Array(await res.arrayBuffer())
    expect(bytes[0]).toBe(at(950))
    expect(bytes.at(-1)).toBe(at(999))
  })

  it('preserves the upstream content type', async () => {
    const res = await buildPartial(full(), 'bytes=0-9')
    expect(res.headers.get('Content-Type')).toBe('audio/mpeg')
  })

  it('falls back to octet-stream when type is absent', async () => {
    const res = await buildPartial(new Response(body().slice()), 'bytes=0-9')
    expect(res.headers.get('Content-Type')).toBe('application/octet-stream')
  })

  it('returns 416 for an unsatisfiable range', async () => {
    const res = await buildPartial(full(), 'bytes=5000-')
    expect(res.status).toBe(416)
    expect(res.headers.get('Content-Range')).toBe('bytes */1000')
  })

  it('can return the whole body as a 206', async () => {
    const res = await buildPartial(full(), 'bytes=0-')
    expect(res.status).toBe(206)
    expect((await res.arrayBuffer()).byteLength).toBe(SIZE)
  })
})

describe('rangeNotSatisfiable', () => {
  it('reports the real size so the client can retry correctly', () => {
    expect(rangeNotSatisfiable(42).headers.get('Content-Range')).toBe('bytes */42')
  })
})
