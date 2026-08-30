import { describe, expect, it } from 'vitest'
import {
  RESERVED_PROJECT_SLUGS,
  creatorFromHost,
  creatorFromPath,
  creatorPath,
  isReservedProjectSlug,
  projectPath,
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

  it('ignores the apex domain', () => {
    expect(creatorFromHost('bronze.fm')).toBeNull()
  })

  it('ignores hosts that are not ours', () => {
    // A Tailscale MagicDNS name once resolved to a Creator called "m1air",
    // and since host wins over path, the real path was then ignored.
    expect(creatorFromHost('m1air.tail6d451d.ts.net')).toBeNull()
    expect(creatorFromHost('bronze-fm-git-main-avrm.vercel.app')).toBeNull()
  })

  it('ignores deeper subdomains', () => {
    expect(creatorFromHost('dean.eu.bronze.fm')).toBeNull()
  })
})

describe('creatorFromPath', () => {
  it('reads an @-prefixed handle', () => {
    expect(creatorFromPath('/@dean')).toBe('dean')
    expect(creatorFromPath('/@dean/bronze')).toBe('dean')
    expect(creatorFromPath('/@dean/bronze/music')).toBe('dean')
  })

  it('returns null at the root, which is the feed', () => {
    expect(creatorFromPath('/')).toBeNull()
    expect(creatorFromPath('')).toBeNull()
  })

  /*
   * The whole point of the prefix: a bare first segment is never a handle, so
   * no top-level route can ever collide with a creator's name. Adding
   * /settings later must not break a creator called "settings".
   */
  it.each(['settings', 'search', 'about', 'api', 'login', 'dean'])(
    'does not treat the bare segment "%s" as a handle',
    (seg) => {
      expect(creatorFromPath(`/${seg}`)).toBeNull()
    },
  )

  it('returns null for a bare @ with no handle after it', () => {
    expect(creatorFromPath('/@')).toBeNull()
  })
})

describe('creatorPath', () => {
  // jsdom serves localhost, so creatorFromHost is null and the shared-host
  // branch is what these exercise.
  it('prefixes the handle on the shared host', () => {
    expect(creatorPath('dean', 'store')).toBe('/@dean/store')
  })

  it('returns the Creator root when given no segments', () => {
    expect(creatorPath('dean')).toBe('/@dean')
  })

  it('ignores empty segments', () => {
    expect(creatorPath('dean', '')).toBe('/@dean')
  })
})

describe('projectPath', () => {
  it('builds the project root', () => {
    expect(projectPath('dean', 'bronze')).toBe('/@dean/bronze')
  })

  it('builds a typed interface inside a project', () => {
    expect(projectPath('dean', 'bronze', 'music')).toBe('/@dean/bronze/music')
    expect(projectPath('dean', 'atonomos', 'read')).toBe('/@dean/atonomos/read')
  })
})

describe('reserved Project slugs', () => {
  // Projects sit directly under the Creator (/@dean/bronze) alongside the
  // Creator's own sections (/@dean/store), so a colliding slug would be
  // permanently unreachable.
  it.each([...RESERVED_PROJECT_SLUGS])('reserves "%s"', (slug) => {
    expect(isReservedProjectSlug(slug)).toBe(true)
  })

  it.each(['bronze', 'atonomos', 'the-wait-is-over'])('allows "%s"', (slug) => {
    expect(isReservedProjectSlug(slug)).toBe(false)
  })

  it('reserves the Creator-level section names', () => {
    // Re-reserved after 20260820050000 had narrowed them away: those sections
    // used to sit a segment deeper than project slugs and could not collide.
    // Under the current structure they share a segment. See PLAN.md §8.4.
    for (const seg of ['store', 'events']) {
      expect(isReservedProjectSlug(seg)).toBe(true)
    }
  })

  it('does NOT reserve names that exist only inside a project', () => {
    // /@dean/bronze/music and /@dean/atonomos/read are a segment deeper, so
    // nothing can collide — a project may be called Music.
    for (const seg of ['music', 'read', 'video']) {
      expect(isReservedProjectSlug(seg)).toBe(false)
    }
  })

  it('matches the database CHECK constraint', () => {
    // supabase/migrations/20260829150000_store_reserved_slug.sql hard-codes the same
    // list; drift would let a bad slug into the database.
    const inMigration = [
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
    ]
    expect([...RESERVED_PROJECT_SLUGS].sort()).toEqual(inMigration.sort())
  })
})
