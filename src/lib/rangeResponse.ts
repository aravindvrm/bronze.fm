/**
 * Reconstructs a 206 Partial Content response from a complete cached body.
 *
 * This exists because `caches.match()` ignores the Range header and returns
 * the full 200. Handing that to `<audio>` breaks seeking, and Safari may
 * refuse cached audio outright. Extracted from the service worker so the
 * fiddliest logic in the caching path can actually be tested.
 *
 * Grammar handled (RFC 7233 single-range forms):
 *   bytes=0-        from an offset to the end
 *   bytes=100-200   an explicit window
 *   bytes=-500      the suffix form: the LAST 500 bytes
 *
 * Multi-range ("bytes=0-99,200-299") is not supported; media elements do not
 * use it, and a 416 is a truthful answer.
 */

export interface ParsedRange {
  start: number
  end: number
}

export function parseRange(header: string, size: number): ParsedRange | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!match) return null

  let start: number
  let end: number

  if (match[1] === '') {
    const suffix = Number(match[2])
    if (!Number.isFinite(suffix) || suffix <= 0) return null
    start = Math.max(0, size - suffix)
    end = size - 1
  } else {
    start = Number(match[1])
    if (!Number.isFinite(start)) return null
    end = match[2] === '' ? size - 1 : Math.min(Number(match[2]), size - 1)
  }

  if (start > end || start >= size || start < 0) return null
  return { start, end }
}

export function rangeNotSatisfiable(size: number): Response {
  return new Response(null, {
    status: 416,
    statusText: 'Range Not Satisfiable',
    headers: { 'Content-Range': `bytes */${size}`, 'Accept-Ranges': 'bytes' },
  })
}

export async function buildPartial(full: Response, rangeHeader: string): Promise<Response> {
  // Blob.slice is lazy, so seeking into a 10 MB track does not pull the whole
  // track into memory the way arrayBuffer() would.
  const blob = await full.blob()
  const size = blob.size

  const parsed = parseRange(rangeHeader, size)
  if (!parsed) return rangeNotSatisfiable(size)

  const chunk = blob.slice(parsed.start, parsed.end + 1)
  return new Response(chunk, {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': full.headers.get('Content-Type') ?? 'application/octet-stream',
      'Content-Length': String(chunk.size),
      'Content-Range': `bytes ${parsed.start}-${parsed.end}/${size}`,
      'Accept-Ranges': 'bytes',
    },
  })
}
