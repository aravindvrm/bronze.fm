import { getSupabase } from '@/lib/supabaseClient'
import { DEFAULT_PER_GROUP, emptyResults, isQueryable, rank, scoreAny } from '@/content/search'
import { creatorPath, projectPath } from '@/lib/tenant'
import { coverForSlug } from '@/lib/cover'
import { CONTENT_TYPE_LABEL, CONTENT_TYPE_SEGMENT } from '@/content/types'
import type {
  Content,
  ContentAdapter,
  ContentType,
  Creator,
  Credit,
  DocBlock,
  Pin,
  Project,
  SearchResults,
  StubKind,
  StubItem,
} from '@/content/types'
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
    assets: {
      storage_path: string
      content_hash: string
      bytes: number
      duration_ms: number | null
    } | null
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

/*
 * Row shapes for the four search queries.
 *
 * Written out rather than inferred because PostgREST returns an embedded
 * relation as an object or an array depending on the shape of the join, and
 * the difference does not surface until a `.slug` read comes back undefined
 * at run time on a screen nobody was testing.
 */
interface SearchCreatorRow {
  id: string
  slug: string
  name: string
  bio: string | null
  avatar_url: string | null
}

interface SearchProjectRow {
  id: string
  slug: string
  title: string
  description: string | null
  creators: { slug: string; name: string } | null
}

interface SearchContentRow {
  id: string
  title: string
  description: string | null
  type: ContentType
  projects: { slug: string; title: string; creators: { slug: string; name: string } | null } | null
}

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
  /*
   * `ilike`, not `eq`: a handle may carry capitals and a URL will not, so
   * `/@deanmaye` has to reach `@deanMaye`. No wildcards in the pattern, so
   * this is still an exact match — only a case-blind one.
   */
  async getCreator(slug) {
    const { data, error } = await getSupabase()
      .from('creators')
      .select('*')
      .ilike('slug', slug)
      .maybeSingle()
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

  /*
   * Narrowed in Postgres, ranked in the app.
   *
   * Three queries rather than one view, because the three kinds have three
   * different join paths back to a URL and a single query would either
   * repeat itself in SQL or return a union nobody can type. They run in
   * parallel, so the cost is one round trip.
   *
   * `content_items` was a fourth and is deliberately gone: a track, its
   * release and its project usually share a name, so searching one word
   * returned the same answer four or five times over.
   *
   * `ilike` rather than full-text: this matches partial words, which is what
   * someone typing "kiss" into a search box expects, and `to_tsquery` does
   * not without a prefix operator and a stemming configuration to reason
   * about. Full text becomes worth it when documents are in the index; they
   * are deliberately not.
   *
   * RLS does the gating. Nothing here filters on `published`, because the
   * policies already do — and duplicating that rule in the client is how the
   * two drift and something unpublished shows up in a result list.
   */
  async search(query, opts): Promise<SearchResults> {
    if (!isQueryable(query)) return emptyResults()
    const limit = opts?.perGroup ?? DEFAULT_PER_GROUP
    const db = getSupabase()
    // Postgres treats these as wildcards inside LIKE, so a query containing
    // one would silently match far more than it says.
    const like = `%${query.replace(/[%_\\]/g, '\\$&')}%`
    // Over-fetch, because ranking happens here: the best match for a query
    // is not necessarily among the first `limit` rows Postgres returns.
    const pool = Math.max(limit * 4, 40)

    const [creatorRows, projectRows, contentRows] = await Promise.all([
      db
        .from('creators')
        .select('id, slug, name, bio, avatar_url')
        .or(`name.ilike.${like},slug.ilike.${like},bio.ilike.${like}`)
        .limit(pool),
      db
        .from('projects')
        .select('id, slug, title, description, creators:owner_creator_id!inner ( slug, name )')
        .or(`title.ilike.${like},description.ilike.${like}`)
        .limit(pool),
      db
        .from('content')
        .select(
          'id, title, description, type, projects!inner ( slug, title, creators:owner_creator_id!inner ( slug, name ) )',
        )
        .or(`title.ilike.${like},description.ilike.${like}`)
        .limit(pool),
    ])

    for (const result of [creatorRows, projectRows, contentRows]) {
      if (result.error) throw result.error
    }

    const creators = ((creatorRows.data ?? []) as unknown as SearchCreatorRow[]).map((row) => ({
      score: scoreAny([row.name, row.slug, row.bio ?? undefined], query, [1, 0.9, 0.4]),
      hit: {
        kind: 'creator' as const,
        id: row.id,
        title: row.name,
        subtitle: `@${row.slug}`,
        href: creatorPath(row.slug),
        imageUrl: row.avatar_url ?? undefined,
      },
    }))

    const projects = ((projectRows.data ?? []) as unknown as SearchProjectRow[])
      .filter((row) => row.creators?.slug)
      .map((row) => ({
        score: scoreAny([row.title, row.description ?? undefined], query, [1, 0.5]),
        hit: {
          kind: 'project' as const,
          id: row.id,
          title: row.title,
          subtitle: row.creators!.name,
          href: projectPath(row.creators!.slug, row.slug),
          imageUrl: coverForSlug(row.slug, 160),
        },
      }))

    const contents = ((contentRows.data ?? []) as unknown as SearchContentRow[])
      .filter((row) => row.projects?.creators?.slug)
      .map((row) => ({
        score: scoreAny([row.title, row.description ?? undefined], query, [1, 0.5]),
        hit: {
          kind: 'content' as const,
          id: row.id,
          title: row.title,
          subtitle: row.projects!.creators!.name,
          badge: CONTENT_TYPE_LABEL[row.type],
          href: projectPath(
            row.projects!.creators!.slug,
            row.projects!.slug,
            CONTENT_TYPE_SEGMENT[row.type],
          ),
          imageUrl: coverForSlug(row.projects!.slug, 160),
        },
      }))

    return {
      creators: rank(creators, limit),
      projects: rank(projects, limit),
      contents: rank(contents, limit),
    }
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
