import type { Content, Project } from '@/content/types'

/**
 * Atonomos — the whitepaper project.
 *
 * The document body is deliberately **not** here. This repository is public,
 * and the whitepaper is unpublished; committing 10,000 words of it would
 * publish it, in the same way that committing the masters would have
 * published the album. Body text is ingested straight into Supabase from the
 * local source document instead, so it is reachable only behind the passcode
 * gate — the same posture `Bronze/` already has for audio.
 *
 * Consequence: on the fixtures source this project shows its shape and no
 * prose. That is the honest rendering, not a bug.
 */
export const atonomosWhitepaper: Content = {
  id: 'cnt_atonomos_read',
  type: 'ereader',
  ownerSlug: 'dean',
  projectSlug: 'atonomos',
  title: 'Autonomous: The Agentic Enterprise',
  // No items: an ereader Content's body is its document, which the fixtures
  // source does not carry. See the note above.
  published: false,
  totalDurationMs: 0,
  items: [],
  credits: [{ creatorSlug: 'dean', name: 'Dean', role: 'writer' }],
}

export const atonomos: Project = {
  id: 'prj_atonomos',
  ownerSlug: 'dean',
  slug: 'atonomos',
  title: 'Atonomos',
  description: 'A whitepaper on the agentic enterprise — how organisations restructure when agents become first-class operators rather than bolted-on automation.',
  published: false,
  contents: [atonomosWhitepaper],
}
