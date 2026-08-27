import type { Content, ContentAdapter, ContentType, Project, StubKind } from '@/content/types'
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
    return (
      allProjects.find((p) => p.ownerSlug === creatorSlug && p.slug === projectSlug) ?? null
    )
  },
  async getContent(creatorSlug, projectSlug, type): Promise<Content | null> {
    const project = allProjects.find(
      (p) => p.ownerSlug === creatorSlug && p.slug === projectSlug,
    )
    return project?.contents.find((c) => c.type === type) ?? null
  },
  async getStubs(kind: StubKind, opts?: { creatorSlug?: string }) {
    void opts
    return stubs.filter((s) => s.kind === kind)
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
