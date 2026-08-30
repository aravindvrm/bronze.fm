// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'

/**
 * RLS assertions against a real Postgres.
 *
 * The anon key ships inside the PWA and is public by design, so these policies
 * are the actual security boundary — path prefixes and tenant columns only
 * organise data. In CI this runs against a throwaway `supabase start` instance
 * with every migration applied from scratch, which also catches a migration
 * that no longer applies cleanly.
 *
 * Skipped when the env is absent so a plain `npm test` stays offline.
 */

const URL_ = process.env.SUPABASE_URL
const ANON = process.env.SUPABASE_ANON_KEY
const enabled = Boolean(URL_ && ANON)

const rest = (path: string) => `${URL_}/rest/v1/${path}`

/**
 * Legacy anon keys are JWTs and are accepted in both `apikey` and
 * `Authorization: Bearer`. The newer publishable keys (`sb_publishable_…`) are
 * not JWTs — sending one as a Bearer token makes the server try to parse it as
 * one and reject the request with 401.
 */
const isJwt = (key: string) => key.startsWith('eyJ')

const headers = (): Record<string, string> => ({
  apikey: ANON!,
  ...(isJwt(ANON!) ? { Authorization: `Bearer ${ANON!}` } : {}),
  'Content-Type': 'application/json',
})

describe.skipIf(!enabled)('RLS', () => {
  beforeAll(() => {
    if (!enabled) return
    console.log(`RLS tests against ${URL_}`)
  })

  const readable = [
    'creators',
    'projects',
    'content',
    'content_items',
    'content_creators',
    'creator_pins',
    'merch_items',
    'events',
    'assets',
  ]

  it.each(readable)('anon may SELECT from %s', async (table) => {
    const res = await fetch(rest(`${table}?select=*&limit=1`), { headers: headers() })
    expect(res.status).toBe(200)
  })

  it.each([
    ['creators', { slug: 'rls-probe', name: 'Probe' }],
    [
      'projects',
      {
        owner_creator_id: '00000000-0000-0000-0000-000000000001',
        slug: 'rls-probe',
        title: 'Probe',
        published: true,
      },
    ],
    [
      'content',
      {
        owner_creator_id: '00000000-0000-0000-0000-000000000001',
        // content is addressed by (project, type) since PLAN.md §8.3 — it
        // has no slug of its own, and project_id is NOT NULL.
        project_id: '00000000-0000-0000-0000-000000000001',
        type: 'music',
        title: 'Probe',
        published: true,
      },
    ],
    [
      'content_creators',
      {
        content_id: '00000000-0000-0000-0000-000000000001',
        creator_id: '00000000-0000-0000-0000-000000000001',
        role: 'artist',
      },
    ],
    [
      'content_item_creators',
      {
        content_item_id: '00000000-0000-0000-0000-000000000001',
        creator_id: '00000000-0000-0000-0000-000000000001',
        role: 'featured',
      },
    ],
    [
      'creator_pins',
      {
        creator_id: '00000000-0000-0000-0000-000000000001',
        content_id: '00000000-0000-0000-0000-000000000001',
      },
    ],
    [
      'events',
      { creator_id: '00000000-0000-0000-0000-000000000001', starts_at: '2030-01-01T00:00:00Z' },
    ],
  ])('anon may NOT INSERT into %s', async (table, payload) => {
    const res = await fetch(rest(table), {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(payload),
    })
    expect(res.status).toBeGreaterThanOrEqual(400)
    const body = (await res.json()) as { code?: string }
    // 42501 is the RLS rejection specifically — not a schema or FK complaint,
    // which would mean the write was refused for the wrong reason.
    expect(body.code).toBe('42501')
  })

  it('unpublished content is invisible to anon', async () => {
    const res = await fetch(rest('content?select=id,published'), { headers: headers() })
    const rows = (await res.json()) as { published: boolean }[]
    expect(Array.isArray(rows)).toBe(true)
    expect(rows.every((r) => r.published)).toBe(true)
  })

  it('the old artist/release/track tables are gone', async () => {
    for (const table of ['artists', 'releases', 'tracks']) {
      const res = await fetch(rest(`${table}?select=*&limit=1`), { headers: headers() })
      expect(res.status).toBe(404)
    }
  })
})
