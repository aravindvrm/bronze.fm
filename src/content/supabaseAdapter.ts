import { getSupabase } from '@/lib/supabaseClient'
import type { Content, ContentAdapter, ContentType, Creator, Credit, DocBlock, Pin, Project, StubKind, StubItem } from '@/content/types'
import { normaliseBlocks } from '@/content/blocks'

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
  avatar_url: string | null
  socials: Record<string, string> | null
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
    avatarUrl: row.avatar_url ?? undefined,
    // Passed through unfiltered: the column is writable only by the service
    // role, and the profile renders a known list of platforms, so an
    // unrecognised key here is ignored rather than shown.
    socials: row.socials ?? undefined,
    subdomain: row.subdomain,
    customDomain: row.custom_domain,
    tier: row.tier,
  }
}

interface ContentRow {
  id: string
  title: string
  description: string | null
  type: ContentType
  published: boolean
  document: DocBlock[] | null
  created_at: string
  content_creators: { role: Credit['role']; creators: { slug: string; name: string } }[]
  content_items: {
    id: string
    position: number
    title: string
    is_interlude: boolean
    assets: { storage_path: string; content_hash: string; bytes: number; duration_ms: number | null } | null
  }[]
}

interface ProjectRow {
  id: string
  slug: string
  title: string
  description: string | null
  published: boolean
  creators: { slug: string } | null
  content: ContentRow[]
}

// !inner turns the join into a filter on the PARENT row: without it,
// .eq('creators.slug', …) only shapes which nested rows are embedded and does
// not restrict which `projects` rows come back at all — a documented
// PostgREST/supabase-js gotcha. The JS-side filter in each caller is kept as a
// defensive backstop, not as the primary mechanism.
const PROJECT_SELECT = `
  id, slug, title, description, published,
  creators:owner_creator_id!inner ( slug ),
  content (
    id, title, description, type, published, document, created_at,
    content_creators ( role, creators ( slug, name ) ),
    content_items (
      id, position, title, is_interlude,
      assets:media_asset_id ( storage_path, content_hash, bytes, duration_ms )
    )
  )
`

/** A pinned work, or a pinned track that carries its work with it. */
interface PinnedContent {
  title: string
  type: ContentType
  projects: { slug: string; title: string } | null
}

interface PinRow {
  id: string
  sort_order: number
  content: PinnedContent | null
  content_items: {
    id: string
    title: string
    position: number
    assets: { content_hash: string } | null
    content: PinnedContent | null
  } | null
}

const PIN_SELECT = `
  id, sort_order,
  creators!inner ( slug ),
  content ( title, type, projects ( slug, title ) ),
  content_items (
    id, title, position,
    assets:media_asset_id ( content_hash ),
    content ( title, type, projects ( slug, title ) )
  )
`

function toProject(row: ProjectRow, ownerSlug: string): Project {
  return {
    id: row.id,
    ownerSlug,
    slug: row.slug,
    title: row.title,
    description: row.description ?? undefined,
    published: row.published,
    contents: (row.content ?? []).map((c) => toContent(c, ownerSlug, row.slug)),
  }
}

function toContent(row: ContentRow, ownerSlug: string, projectSlug: string): Content {
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
    projectSlug,
    title: row.title,
    description: row.description ?? undefined,
    published: row.published,
    totalDurationMs,
    items,
    credits,
    // jsonb, so its shape is whatever was written last — normalised here
    // rather than asserted, because a build that ships ahead of its
    // migration reads rows this renderer has never seen.
    document: row.document ? normaliseBlocks(row.document) : undefined,
    createdAt: row.created_at,
  }
}

export const supabaseAdapter: ContentAdapter = {
  async getCreator(slug) {
    const { data, error } = await getSupabase().from('creators').select('*').eq('slug', slug).maybeSingle()
    if (error) throw error
    return data ? toCreator(data as CreatorRow) : null
  },

  async listProjects(creatorSlug) {
    const { data, error } = await getSupabase()
      .from('projects')
      .select(PROJECT_SELECT)
      .eq('creators.slug', creatorSlug)
      .order('sort_order', { ascending: true })
    if (error) throw error
    return ((data ?? []) as unknown as ProjectRow[])
      .filter((row) => row.creators?.slug === creatorSlug)
      .map((row) => toProject(row, creatorSlug))
  },

  async getProject(creatorSlug, projectSlug) {
    const { data, error } = await getSupabase()
      .from('projects')
      .select(PROJECT_SELECT)
      .eq('slug', projectSlug)
      .eq('creators.slug', creatorSlug)
      .maybeSingle()
    if (error) throw error
    const row = data as unknown as ProjectRow | null
    if (!row || row.creators?.slug !== creatorSlug) return null
    return toProject(row, creatorSlug)
  },

  async getContent(creatorSlug, projectSlug, type) {
    // Read through the project rather than querying `content` directly: the
    // project is what the URL names, and its row carries the ownership join
    // that scopes the lookup.
    const project = await this.getProject(creatorSlug, projectSlug)
    return project?.contents.find((c) => c.type === type) ?? null
  },

  async getStubs(_kind: StubKind, _opts): Promise<StubItem[]> {
    // merch_items / events are stub-only in v1 regardless of adapter; no
    // Supabase-backed rows exist for them yet.
    return []
  },

  async listPins(creatorSlug) {
    const { data, error } = await getSupabase()
      .from('creator_pins')
      .select(PIN_SELECT)
      .eq('creators.slug', creatorSlug)
      .order('sort_order', { ascending: true })
    if (error) throw error

    return ((data ?? []) as unknown as PinRow[]).flatMap((row) => {
      // A pinned track carries its own content through the item; a pinned
      // work carries it directly. The CHECK constraint guarantees exactly one
      // of the two, so anything else here is a row that should not exist.
      const content = row.content_items?.content ?? row.content
      const project = content?.projects
      if (!content || !project) return []

      const item = row.content_items
      return [
        {
          id: row.id,
          title: item?.title ?? content.title,
          subtitle: item ? content.title : project.title,
          projectSlug: project.slug,
          contentType: content.type,
          ...(item
            ? {
                itemId: item.id,
                // Positions are 1-based in the schema; the player takes a
                // zero-based queue index.
                itemIndex: item.position - 1,
                hash: item.assets?.content_hash ?? undefined,
              }
            : {}),
        } satisfies Pin,
      ]
    })
  },
}
