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
  ])('returns null for %s', (_l, host) => {
    expect(creatorFromHost(host)).toBeNull()
  })

  it.each(['www', 'app', 'api', 'admin', 'staging'])(
    'treats "%s" as reserved, not a Creator',
    (sub) => {
      expect(creatorFromHost(`${sub}.bronze.fm`)).toBeNull()
    },
  )

  it('handles deeper subdomains by taking the leftmost label', () => {
    expect(creatorFromHost('dean.eu.bronze.fm')).toBe('dean')
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

  it('does NOT reserve a Content\'s own section names', () => {
    // These live one level below the Content (/dean/bronze/music), so they
    // cannot collide with a Content slug — an album may be called Merch.
    for (const seg of ['music', 'videos', 'merch', 'events', 'home']) {
      expect(isReservedContentSlug(seg)).toBe(false)
    }
  })

  it('matches the database CHECK constraint', () => {
    // supabase/migrations/20260820050000_narrow_reserved_slugs.sql hard-codes
    // the same list; drift would let a bad slug into the database.
    const inMigration = ['about', 'admin', 'api', 'assets', 'login', 'search', 'settings']
    expect([...RESERVED_CONTENT_SLUGS].sort()).toEqual(inMigration.sort())
  })
})
