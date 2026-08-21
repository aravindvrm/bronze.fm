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

/**
 * Second-segment words that are Creator sections, never Content slugs.
 *
 * Content sits flat under the Creator (`/dean/bronze`) alongside these
 * sections (`/dean/music`), so a Content slug that collides with one would be
 * unreachable — an album called "merch" would resolve to the merch page. The
 * database enforces the same list with a CHECK constraint, so a colliding slug
 * cannot be stored in the first place.
 */
export const RESERVED_CONTENT_SLUGS = [
  'music',
  'videos',
  'merch',
  'events',
  'about',
  'home',
  'assets',
  'api',
  'settings',
  'search',
] as const

/** Path segments that are routes, never a Creator slug. */
const RESERVED_PATHS = new Set<string>([...RESERVED_CONTENT_SLUGS])

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

export function isReservedContentSlug(slug: string): boolean {
  return (RESERVED_CONTENT_SLUGS as readonly string[]).includes(slug)
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
