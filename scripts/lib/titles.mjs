/**
 * Filename → display title.
 *
 * Shared with scripts/gen-fixtures.mjs so this can be tested without running
 * the generator, which reads and writes the filesystem on import.
 */
export function cleanTitle(filename) {
  return filename
    .replace(/\.mp3$/i, '')
    .replace(/^\d+\s*-\s*/, '')
    .replace(/_s\b/g, "'s")
    .replace(/\s+/g, ' ')
    .trim()
}
