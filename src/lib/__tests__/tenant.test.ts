import { describe, expect, it } from 'vitest'
import {
  RESERVED_CONTENT_SLUGS,
  creatorFromHost,
  creatorFromPath,
  creatorPath,
  isReservedContentSlug,
} from '@/lib/tenant'

/**
 * Routing is path-based today, but host is checked first so a premium Creator
 * can be promoted to their own subdomain without a code change. That
 * forward-compatibility is easy to regress silently, hence these.
 */

describe('creatorFromHost', () => {
  it('reads a Creator subdomain', () => {
    expect(creatorFromHost('dean.bronze.fm')).toBe('dean')
  })

  it.each([
    ['apex domain', 'bronze.fm'],
    ['localhost', 'localhost'],
    ['IPv4', '127.0.0.1'],
    ['tailnet IP', '100.76.156.10'],
    // The bug this guards: host won over path, so /dean was ignored and the
    // app reported "No creator called m1air".
    ['Tailscale MagicDNS', 'm1air.tail6d451d.ts.net'],
    ['Vercel preview', 'bronze-fm-git-main-avrm.vercel.app'],
    ['tunnel host', 'random-words.ngrok-free.app'],
    ['unrelated domain', 'dean.example.com'],
  ])('returns null for %s', (_l, host) => {
    expect(creatorFromHost(host)).toBeNull()
  })

  it.each(['www', 'app', 'api', 'admin', 'staging'])(
    'treats "%s" as reserved, not a Creator',
    (sub) => {
      expect(creatorFromHost(`${sub}.bronze.fm`)).toBeNull()
    },
  )

  it('requires exactly one label above the app domain', () => {
    // A deeper subdomain is not a Creator host; fall through to the path
    // rather than inventing a tenant from an arbitrary label.
    expect(creatorFromHost('dean.eu.bronze.fm')).toBeNull()
  })

  it('tolerates a trailing dot and mixed case', () => {
    expect(creatorFromHost('Dean.Bronze.FM.')).toBe('dean')
  })
})

describe('creatorFromPath', () => {
  it('reads the leading segment', () => {
    expect(creatorFromPath('/dean')).toBe('dean')
    expect(creatorFromPath('/dean/music')).toBe('dean')
  })

  it('returns null at the root', () => {
    expect(creatorFromPath('/')).toBeNull()
    expect(creatorFromPath('')).toBeNull()
  })

  it.each([...RESERVED_CONTENT_SLUGS])(
    'does not mistake the reserved word "%s" for a Creator',
    (seg) => {
      expect(creatorFromPath(`/${seg}`)).toBeNull()
    },
  )

  it('treats a Content section name in first position as a Creator', () => {
    // On the shared host the first segment is always a Creator, so /music can
    // only mean a Creator called "music" — which resolves to a not-found
    // state. Section names live at the third segment and never appear here.
    expect(creatorFromPath('/music')).toBe('music')
  })

  it('reads a different Creator', () => {
    expect(creatorFromPath('/kaytranada/events')).toBe('kaytranada')
  })
})

describe('creatorPath', () => {
  // jsdom serves localhost, so creatorFromHost is null and the shared-host
  // branch is what these exercise.
  it('prefixes the Creator on the shared host', () => {
    expect(creatorPath('dean', 'home')).toBe('/dean/home')
  })

  it('returns the Creator root when given no segments', () => {
    expect(creatorPath('dean')).toBe('/dean')
  })

  it('ignores empty segments', () => {
    expect(creatorPath('dean', '')).toBe('/dean')
  })
})

describe('reserved Content slugs', () => {
  // Content sits flat under the Creator (/dean/bronze) alongside sections
  // (/dean/music), so a colliding slug would be permanently unreachable.
  it.each([...RESERVED_CONTENT_SLUGS])('reserves "%s"', (slug) => {
    expect(isReservedContentSlug(slug)).toBe(true)
  })

  it.each(['bronze', 'bronze-age', 'the-wait-is-over'])('allows "%s"', (slug) => {
    expect(isReservedContentSlug(slug)).toBe(false)
  })

  it('reserves the Creator-level section names', () => {
    // These share the second path segment with Content slugs.
    for (const seg of ['content', 'merch', 'events']) {
      expect(isReservedContentSlug(seg)).toBe(true)
    }
  })

  it('does NOT reserve names that exist only inside a release', () => {
    // /dean/bronze/music and /dean/bronze/videos are a segment deeper, so
    // nothing can collide — an album may be called Music.
    for (const seg of ['music', 'videos', 'home']) {
      expect(isReservedContentSlug(seg)).toBe(false)
    }
  })

  it('matches the database CHECK constraint', () => {
    // supabase/migrations/20260821010000_rename_releases_to_content.sql
    // hard-codes the same list; drift would let a bad slug into the database.
    const inMigration = [
      'about', 'admin', 'api', 'assets', 'content',
      'events', 'login', 'merch', 'search', 'settings',
    ]
    expect([...RESERVED_CONTENT_SLUGS].sort()).toEqual(inMigration.sort())
  })
})
