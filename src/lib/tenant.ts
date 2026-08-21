/**
 * Resolves which Creator the current request is for.
 *
 * Routing is path-based today (bronze.fm/robotrebel). Host is checked *first* so a
 * premium Creator can be promoted to robotrebel.bronze.fm — or a custom domain —
 * by pointing DNS and setting `creators.subdomain`, with no code change here
 * and no change to any screen.
 */

/** Hosts that are the app itself, never a Creator subdomain. */
const RESERVED = new Set(['www', 'app', 'api', 'admin', 'staging', 'localhost'])

/**
 * Second-segment words reserved against Content slugs.
 *
 * Content occupies the second segment (`/robotrebel/bronze`), so it collides with
 * *Creator*-level routes, which share it. The Creator page has three sections
 * of its own — releases, merch, events — plus words held back for routes that
 * plausibly arrive later, because adding one against an existing Content would
 * mean renaming it and breaking its URLs.
 *
 * `videos` and `music` are deliberately NOT reserved: they exist only inside a
 * release (`/robotrebel/bronze/videos`), one segment deeper, where nothing can
 * collide. An album may be called Music.
 *
 * The database enforces the same list with a CHECK constraint.
 */
export const RESERVED_CONTENT_SLUGS = [
  'about',
  'admin',
  'api',
  'assets',
  'events',
  'login',
  'merch',
  'releases',
  'search',
  'settings',
] as const

/** First-segment words that are app routes, never a Creator slug. */
const RESERVED_PATHS = new Set<string>([...RESERVED_CONTENT_SLUGS])

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
 * host wins over path, `/robotrebel` was then ignored. Vercel preview URLs and
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
  // One label only: `robotrebel.bronze.fm` yes, `robotrebel.eu.bronze.fm` no.
  if (!label || label.includes('.')) return null
  if (RESERVED.has(label)) return null
  return label
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
    'robotrebel'
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
 * Builds a URL inside a Content: `/robotrebel/bronze`, `/robotrebel/bronze/music`.
 *
 * The Content's sections hang off the Content, not the Creator — the four
 * tiles belong to a release.
 */
export function contentPath(
  creatorSlug: string,
  contentSlug: string,
  ...segments: string[]
): string {
  return creatorPath(creatorSlug, contentSlug, ...segments)
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
