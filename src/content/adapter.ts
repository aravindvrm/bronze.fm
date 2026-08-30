import type { Content, ContentAdapter, ContentType, Pin, Project, StubKind } from '@/content/types'
import { bronze, dean } from '@/content/fixtures/bronze.generated'
import { atonomos } from '@/content/fixtures/atonomos'
import { stubs } from '@/content/fixtures/stubs'
import { supabaseAdapter } from '@/content/supabaseAdapter'

const allProjects: Project[] = [bronze, atonomos]

const fixtureAdapter: ContentAdapter = {
  async getCreator(slug) {
    return slug === dean.slug ? dean : null
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
