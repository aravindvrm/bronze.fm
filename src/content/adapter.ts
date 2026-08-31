import type {
  Content,
  ContentAdapter,
  ContentType,
  Pin,
  Project,
  SearchHit,
  SearchResults,
  StubKind,
} from '@/content/types'
import { DEFAULT_PER_GROUP, emptyResults, isQueryable, rank, scoreAny } from '@/content/search'
import { CONTENT_TYPE_LABEL, CONTENT_TYPE_SEGMENT } from '@/content/types'
import { creatorPath, projectPath } from '@/lib/tenant'
import { coverForSlug } from '@/lib/cover'
import { bronze, dean } from '@/content/fixtures/bronze.generated'
import { atonomos } from '@/content/fixtures/atonomos'
import { stubs } from '@/content/fixtures/stubs'
import { supabaseAdapter } from '@/content/supabaseAdapter'

const allProjects: Project[] = [bronze, atonomos]
/*
 * Every creator the fixtures know about — one, today.
 *
 * Named as a list rather than reaching for `dean` directly because search is
 * the first thing here that asks "who is there" instead of "who is this",
 * and that question has no answer in a codebase where the only creator is a
 * constant somebody imported.
 */
const allCreators = [dean]

const fixtureAdapter: ContentAdapter = {
  /*
   * Matched without regard to case.
   *
   * A handle can carry capitals — `@deanMaye` — but nobody types them, and
   * a URL segment is compared byte for byte. Without this, `/@deanmaye` is
   * a 404 for the person who typed their own name in lower case. The
   * CANONICAL spelling still comes back on the record, and every call after
   * this one uses `creator.slug` rather than the URL's segment, so the rest
   * of the app never sees the variant.
   */
  async getCreator(slug) {
    return slug.toLowerCase() === dean.slug.toLowerCase() ? dean : null
  },
  async listCreators() {
    return allCreators
  },
  async listProjects(creatorSlug) {
    return allProjects.filter((p) => p.ownerSlug === creatorSlug)
  },
  async getProject(creatorSlug, projectSlug) {
    return allProjects.find((p) => p.ownerSlug === creatorSlug && p.slug === projectSlug) ?? null
  },
  async getContent(creatorSlug, projectSlug, type): Promise<Content | null> {
    const project = allProjects.find((p) => p.ownerSlug === creatorSlug && p.slug === projectSlug)
    const content = project?.contents.find((c) => c.type === type) ?? null
    if (!content) return null

    /*
     * The document is fetched here rather than bundled, so the whitepaper's
     * prose only reaches a visitor who opens the reader. This is the one
     * call site that needs the body — the hub and the feed describe the
     * paper from its metadata alone.
     *
     * Cached back onto the fixture so a second visit to the reader is
     * synchronous, and so the object identity screens compare against stays
     * stable.
     */
    if (content.type === 'ereader' && !content.document) {
      const { atonomosDocument } = await import('@/content/fixtures/atonomos.document')
      content.document = atonomosDocument
    }
    return content
  },
  async getStubs(kind: StubKind, opts?: { creatorSlug?: string }) {
    void opts
    return stubs.filter((s) => s.kind === kind)
  },
  async listPins(creatorSlug): Promise<Pin[]> {
    // Mirrors the seed in 20260821040000_creator_pins.sql: tracks 2 and 6 of
    // Bronze, then the Atonomos paper. Positions rather than titles, so a
    // retitled track does not silently drop out of the pins.
    if (creatorSlug !== dean.slug) return []
    const music = bronze.contents.find((c) => c.type === 'music')
    const paper = atonomos.contents.find((c) => c.type === 'ereader')

    const pins: Pin[] = []
    for (const position of [2, 6]) {
      const index = music?.items.findIndex((i) => i.position === position) ?? -1
      const item = index >= 0 ? music!.items[index] : undefined
      if (!item) continue
      pins.push({
        id: `pin_${item.id}`,
        title: item.title,
        subtitle: music!.title,
        projectSlug: bronze.slug,
        contentType: 'music',
        itemId: item.id,
        itemIndex: index,
        hash: item.hash,
      })
    }
    if (paper) {
      pins.push({
        id: `pin_${paper.id}`,
        title: paper.title,
        subtitle: atonomos.title,
        projectSlug: atonomos.slug,
        contentType: 'ereader',
      })
    }
    return pins
  },

  /*
   * Searched in memory, over everything the fixtures hold.
   *
   * That is not a shortcut standing in for the real thing — it IS the real
   * thing for this adapter, whose whole corpus is two projects. The Supabase
   * adapter narrows in Postgres first and then hands the survivors to the
   * same ranker, so the two disagree about what is reachable and never about
   * what wins.
   */
  async search(query, opts): Promise<SearchResults> {
    if (!isQueryable(query)) return emptyResults()
    const limit = opts?.perGroup ?? DEFAULT_PER_GROUP

    const creators = allCreators.map((creator) => ({
      // Name over handle over bio: someone typing "dean" means the person,
      // and a bio that happens to contain the word is a weaker answer.
      score: scoreAny([creator.name, creator.slug, creator.bio], query, [1, 0.9, 0.4]),
      hit: {
        kind: 'creator' as const,
        id: creator.id,
        title: creator.name,
        subtitle: `@${creator.slug}`,
        href: creatorPath(creator.slug),
        imageUrl: creator.avatarUrl,
      },
    }))

    const projects: { score: number; hit: SearchHit }[] = []
    const contents: { score: number; hit: SearchHit }[] = []

    for (const project of allProjects) {
      const owner = allCreators.find((c) => c.slug === project.ownerSlug)
      const cover = coverForSlug(project.slug, 160)

      projects.push({
        score: scoreAny([project.title, project.description], query, [1, 0.5]),
        hit: {
          kind: 'project',
          id: project.id,
          title: project.title,
          subtitle: owner?.name,
          href: projectPath(project.ownerSlug, project.slug),
          imageUrl: cover,
        },
      })

      for (const content of project.contents) {
        contents.push({
          score: scoreAny([content.title, content.description], query, [1, 0.5]),
          hit: {
            kind: 'content',
            id: content.id,
            title: content.title,
            subtitle: owner?.name ?? project.ownerSlug,
            badge: CONTENT_TYPE_LABEL[content.type],
            href: projectPath(project.ownerSlug, project.slug, CONTENT_TYPE_SEGMENT[content.type]),
            imageUrl: cover,
          },
        })
      }
    }

    return {
      creators: rank(creators, limit),
      projects: rank(projects, limit),
      contents: rank(contents, limit),
    }
  },
}

/**
 * `VITE_CONTENT_SOURCE=supabase` switches to real data; anything else,
 * including unset, stays on the local fixtures. Screens are unaware of which
 * is active.
 *
 * Both adapters are plain statically-imported objects — importing
 * supabaseAdapter does not touch Supabase itself, since its client is
 * constructed lazily on first real call (src/lib/supabaseClient.ts). A
 * fixtures-only build never needs Supabase env vars to exist.
 */
const source = import.meta.env.VITE_CONTENT_SOURCE as string | undefined
export const content: ContentAdapter = source === 'supabase' ? supabaseAdapter : fixtureAdapter
export type { ContentType }
