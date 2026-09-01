import type { Project } from '@/content/types'
import { artUrl } from '@/lib/art'
// bronze.jpg is the web encode; bronze-original.jpg beside it is the untouched
// master it came from, kept for re-encoding and never imported, so the build
// never sees it.
import bronzeCover from '@/assets/covers/bronze.jpg'
// The back cover, repurposed as the music page's own header art. A separate
// file rather than a crop of bronzeCover at render time: the front cover is
// square by convention (album art everywhere else expects that), and this is
// a wide banner — two different shapes for two different jobs, not one image
// doing double duty.
import bronzeBackCover from '@/assets/covers/bronze-back.jpg'

/** A real cover ships as one file, so its intrinsic size and MIME are fixed. */
interface Cover {
  src: string
  /** Edge length in px — cover art is square. */
  size: number
  type: string
}

/**
 * Real cover art, keyed by Project slug.
 *
 * Anything absent falls back to the procedural art in lib/art.ts, so a Project
 * gains its real cover by adding one line here and looks deliberate until it
 * does. This is the seam the `cover` column replaces once artwork is uploaded
 * per Project rather than bundled with the app.
 */
const COVERS: Record<string, Cover> = {
  bronze: { src: bronzeCover, size: 1024, type: 'image/jpeg' },
}

/**
 * Cover for a Project. `size` only affects the generated fallback — real
 * artwork ships at its own resolution.
 */
export function coverUrl(project: Project | null | undefined, size = 1400): string {
  return coverForSlug(project?.slug, size)
}

/**
 * The same cover, from a slug alone.
 *
 * Search hits carry a project's slug and nothing else — there is no Project
 * object to hand over — and the lookup never needed one: `coverUrl` reads
 * exactly one field. Both go through here so a project cannot end up with
 * two different covers depending on which call site asked.
 */
export function coverForSlug(slug: string | null | undefined, size = 1400): string {
  const real = slug ? COVERS[slug] : undefined
  if (real) return real.src
  return artUrl(`${slug ?? 'bronze'}-cover`, 'cover', size)
}

/**
 * Real art keyed by Project slug, for a music page's own header — separate
 * from `COVERS` because most Projects will never have one. A header
 * background is decoration a creator chose to supply, not a fallback every
 * page needs; absent, the header stays plain rather than reaching for
 * procedural art the way a missing cover does.
 */
const HEADER_BACKGROUNDS: Record<string, string> = {
  bronze: bronzeBackCover,
}

/** A project's own art behind its music header, when it has one. */
export function headerBackgroundUrl(projectSlug: string | null | undefined): string | undefined {
  return projectSlug ? HEADER_BACKGROUNDS[projectSlug] : undefined
}

/**
 * Artwork for the OS media session — lock screen, car display, headphones.
 *
 * The platform selects an entry by its declared `sizes` and `type`, so the
 * generated art offers a rendering per size while a real cover advertises the
 * one file it actually is. Declaring a JPEG as SVG here costs the artwork on
 * the platforms that filter by MIME.
 */
export function coverArtwork(projectSlug: string): MediaImage[] {
  const real = COVERS[projectSlug]
  if (real) return [{ src: real.src, sizes: `${real.size}x${real.size}`, type: real.type }]

  return [512, 256, 192].map((size) => ({
    src: artUrl(`${projectSlug}-cover`, 'cover', size),
    sizes: `${size}x${size}`,
    type: 'image/svg+xml',
  }))
}
