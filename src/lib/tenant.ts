/**
 * Resolves which Creator a URL refers to, and builds in-app URLs.
 *
 * Structure (PLAN.md §8.2):
 *
 *   /                        the feed
 *   /@deanMaye                   creator
 *   /@deanMaye/store             creator-level section
 *   /@deanMaye/bronze            project
 *   /@deanMaye/bronze/music      typed interface onto that project
 *
 * Host is still checked before path, so promoting a Creator to
 * `deanmaye.bronze.fm` remains a DNS record plus a column, with no code change.
 */

/** Marks a path segment as a creator handle. */
export const HANDLE_PREFIX = '@'

/** Hosts that are the app itself, never a Creator subdomain. */
const RESERVED = new Set(['www', 'app', 'api', 'admin', 'staging', 'localhost'])

/**
 * Second-segment words reserved against Project slugs.
 *
 * Projects sit directly under the creator (`/@deanMaye/bronze`), sharing that
 * segment with the Creator's own sections — so a project may not be called
 * `store` or `events`.
 *
 * This list grew back after migration 20260820050000 narrowed it: that
 * migration removed `merch`/`events` precisely because sections then lived
 * one level deeper than project slugs and could not collide. Under the
 * structure above they collide again. Anything that becomes a creator-level
 * route belongs here.
 *
 * Type segments (`music`, `read`) are deliberately absent: they sit one level
 * deeper still, inside a project, so a project may legitimately be called
 * Music. The database enforces the same list with a CHECK constraint, and a
 * unit test compares the two so they cannot drift.
 */
export const RESERVED_PROJECT_SLUGS = [
  'about',
  'admin',
  'api',
  'assets',
  'events',
  'login',
  'merch',
  'search',
  'settings',
  'store',
] as const

/**
 * The domain Creator subdomains hang off. Anything not under it is not a
 * tenant host.
 */
const APP_DOMAIN = ((import.meta.env.VITE_APP_DOMAIN as string | undefined) ?? 'bronze.fm')
  .trim()
  .toLowerCase()

/**
 * Reads a Creator from the hostname — but only when the host is genuinely
 * under the app's own domain.
 *
 * The earlier rule was "any hostname with three or more labels", which is
 * wrong for every host that is not ours: a Tailscale MagicDNS name
 * (`m1air.tail6d451d.ts.net`) resolved to a Creator called `m1air`, and since
 * host wins over path, the path was then ignored. Vercel preview URLs and
 * tunnel hosts would have failed the same way.
 *
 * Exactly one label above APP_DOMAIN counts. `bronze.fm` itself, deeper
 * subdomains, and reserved names all fall through to the path.
 */
export function creatorFromHost(hostname = window.location.hostname): string | null {
  if (!APP_DOMAIN) return null

  // Trailing dot is legal in a FQDN and would break the suffix match.
  const host = hostname.toLowerCase().replace(/\.$/, '')
  const suffix = `.${APP_DOMAIN}`
  if (!host.endsWith(suffix)) return null

  const label = host.slice(0, -suffix.length)
  // One label only: `deanmaye.bronze.fm` yes, `dean.eu.bronze.fm` no.
  if (!label || label.includes('.')) return null
  if (RESERVED.has(label)) return null
  return label
}

/**
 * Reads a Creator from the first path segment, which must carry the `@`.
 *
 * The prefix is what makes this unambiguous: no app route begins with `@`, so
 * handles can never collide with `/search`, `/settings` or anything added
 * later, and no reserved-word list is needed at the top level.
 */
export function creatorFromPath(pathname = window.location.pathname): string | null {
  const seg = pathname.split('/').filter(Boolean)[0]
  if (!seg || !seg.startsWith(HANDLE_PREFIX)) return null
  const slug = seg.slice(HANDLE_PREFIX.length)
  return slug || null
}

/**
 * Host wins over path, so promoting a Creator to a subdomain takes effect
 * immediately without breaking their existing path URLs.
 *
 * Returns null on the feed, which belongs to no Creator — the caller decides
 * what that means rather than being handed a default that silently pretends
 * some Creator was requested.
 */
export function resolveCreatorSlug(): string | null {
  return creatorFromHost() ?? creatorFromPath()
}

/** True when the Creator is being served from their own subdomain/domain. */
export function isDedicatedHost(): boolean {
  return creatorFromHost() !== null
}

export function isReservedProjectSlug(slug: string): boolean {
  return (RESERVED_PROJECT_SLUGS as readonly string[]).includes(slug)
}

/**
 * Builds an in-app URL under a Creator: `/@deanMaye`, `/@deanMaye/bronze/music`.
 *
 * On a dedicated host the Creator is implied by the hostname and must be
 * omitted from the path; on the shared host the handle leads.
 */
export function creatorPath(creatorSlug: string, ...segments: string[]): string {
  const tail = segments.filter(Boolean).join('/')
  if (isDedicatedHost()) return `/${tail}`
  return `/${HANDLE_PREFIX}${creatorSlug}${tail ? `/${tail}` : ''}`
}

/** Builds a URL inside a Project: `/@deanMaye/bronze`, `/@deanMaye/bronze/music`. */
export function projectPath(
  creatorSlug: string,
  projectSlug: string,
  ...segments: string[]
): string {
  return creatorPath(creatorSlug, projectSlug, ...segments)
}
