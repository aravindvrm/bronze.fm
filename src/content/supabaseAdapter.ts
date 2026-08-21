import { getSupabase } from '@/lib/supabaseClient'
import type { Content, ContentAdapter, ContentType, Creator, Credit, StubKind, StubItem } from '@/content/types'

/**
 * Reads Content through Supabase instead of local fixtures.
 *
 * The media bucket is public for this test-deploy phase (see
 * supabase/migrations/20260821000000_public_media_bucket.sql), so a stored
 * `storage_path` becomes a plain public URL — no signing, no expiry, which is
 * what lets the existing content-hash cache design work unchanged. Revisit
 * before any real public launch.
 */

function publicUrl(storagePath: string): string {
  return getSupabase().storage.from('media').getPublicUrl(storagePath).data.publicUrl
}

interface CreatorRow {
  id: string
  slug: string
  name: string
  bio: string | null
  subdomain: string | null
  custom_domain: string | null
  tier: 'standard' | 'premium'
}

function toCreator(row: CreatorRow): Creator {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    bio: row.bio ?? undefined,
    subdomain: row.subdomain,
    customDomain: row.custom_domain,
    tier: row.tier,
  }
}

interface ContentRow {
  id: string
  slug: string
  title: string
  description: string | null
  type: ContentType
  published: boolean
  creators: { slug: string } | null // owner, via the FK join below
  content_creators: { role: Credit['role']; creators: { slug: string; name: string } }[]
  content_items: {
    id: string
    position: number
    title: string
    is_interlude: boolean
    assets: { storage_path: string; content_hash: string; bytes: number; duration_ms: number | null } | null
  }[]
}

// !inner turns the join into a filter on the PARENT row: without it,
// .eq('creators.slug', …) only shapes which nested rows are embedded and does
// not restrict which `content` rows come back at all — a documented
// PostgREST/supabase-js gotcha. The JS-side filter below is kept as a
// defensive backstop, not as the primary mechanism.
const CONTENT_SELECT = `
  id, slug, title, description, type, published,
  creators:owner_creator_id!inner ( slug ),
  content_creators ( role, creators ( slug, name ) ),
  content_items (
    id, position, title, is_interlude,
    assets:media_asset_id ( storage_path, content_hash, bytes, duration_ms )
  )
`

function toContent(row: ContentRow, ownerSlug: string): Content {
  const items = [...row.content_items]
    .sort((a, b) => a.position - b.position)
    .map((i) => {
      const asset = i.assets
      return {
        id: i.id,
        position: i.position,
        title: i.title,
        isInterlude: i.is_interlude,
        hash: asset?.content_hash ?? '',
        bytes: asset?.bytes ?? 0,
        durationMs: asset?.duration_ms ?? 0,
        // Not yet modelled per row in the schema; safe defaults for playback.
        channels: 2,
        sampleRate: 44100,
        bitrate: 0,
        url: asset ? publicUrl(asset.storage_path) : '',
        credits: [] as Credit[],
      }
    })

  const totalDurationMs = items.reduce((sum, i) => sum + i.durationMs, 0)

  const credits: Credit[] = row.content_creators.map((c) => ({
    creatorSlug: c.creators.slug,
    name: c.creators.name,
    role: c.role,
  }))

  return {
    id: row.id,
    type: row.type,
    ownerSlug,
    slug: row.slug,
    title: row.title,
    description: row.description ?? undefined,
    published: row.published,
    totalDurationMs,
    items,
    credits,
  }
}

export const supabaseAdapter: ContentAdapter = {
  async getCreator(slug) {
    const { data, error } = await getSupabase().from('creators').select('*').eq('slug', slug).maybeSingle()
    if (error) throw error
    return data ? toCreator(data as CreatorRow) : null
  },

  async listContent(creatorSlug, type) {
    const { data, error } = await getSupabase()
      .from('content')
      .select(CONTENT_SELECT)
      .eq('type', type)
      .eq('creators.slug', creatorSlug)
      .order('sort_order', { ascending: true })
    if (error) throw error
    return ((data ?? []) as unknown as ContentRow[])
      .filter((row) => row.creators?.slug === creatorSlug)
      .map((row) => toContent(row, creatorSlug))
  },

  async getContent(creatorSlug, contentSlug) {
    const { data, error } = await getSupabase()
      .from('content')
      .select(CONTENT_SELECT)
      .eq('slug', contentSlug)
      .eq('creators.slug', creatorSlug)
      .maybeSingle()
    if (error) throw error
    const row = data as unknown as ContentRow | null
    if (!row || row.creators?.slug !== creatorSlug) return null
    return toContent(row, creatorSlug)
  },

  async getStubs(_kind: StubKind, _opts): Promise<StubItem[]> {
    // merch_items / events are stub-only in v1 regardless of adapter; no
    // Supabase-backed rows exist for them yet.
    return []
  },
}
