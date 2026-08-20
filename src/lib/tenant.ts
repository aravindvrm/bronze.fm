/**
 * Resolves which Creator the current request is for.
 *
 * Routing is path-based today (bronze.fm/dean). Host is checked *first* so a
 * premium Creator can be promoted to dean.bronze.fm — or a custom domain —
 * by pointing DNS and setting `creators.subdomain`, with no code change here
 * and no change to any screen.
 */

/** Hosts that are the app itself, never a Creator subdomain. */
const RESERVED = new Set(['www', 'app', 'api', 'admin', 'staging', 'localhost'])

/** Path segments that are routes, never a Creator slug. */
const RESERVED_PATHS = new Set(['home', 'music', 'videos', 'merch', 'events', 'assets'])

export function creatorFromHost(hostname = window.location.hostname): string | null {
  // Bare host, IP, or localhost — no subdomain to read.
  const parts = hostname.split('.')
  if (parts.length < 3) return null
  if (/^\d+$/.test(parts[parts.length - 1])) return null

  const sub = parts[0]
  if (!sub || RESERVED.has(sub)) return null
  return sub
}

export function creatorFromPath(pathname = window.location.pathname): string | null {
  const seg = pathname.split('/').filter(Boolean)[0]
  if (!seg || RESERVED_PATHS.has(seg)) return null
  return seg
}

/**
 * Host wins over path, so promoting a Creator to a subdomain takes effect
 * immediately without breaking their existing path URLs.
 */
export function resolveCreatorSlug(): string {
  return (
    creatorFromHost() ??
    creatorFromPath() ??
    (import.meta.env.VITE_DEFAULT_CREATOR as string | undefined) ??
    'dean'
  )
}

/** True when the Creator is being served from their own subdomain/domain. */
export function isDedicatedHost(): boolean {
  return creatorFromHost() !== null
}

/**
 * Builds an in-app URL. On a dedicated host the Creator is implied by the
 * hostname and must be omitted from the path; on the shared host it leads.
 */
export function creatorPath(creatorSlug: string, ...segments: string[]): string {
  const tail = segments.filter(Boolean).join('/')
  if (isDedicatedHost()) return `/${tail}`
  return `/${creatorSlug}${tail ? `/${tail}` : ''}`
}
