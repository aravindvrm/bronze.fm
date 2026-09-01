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

/**
 * A short narrative beat rather than a song, from its parenthetical alone —
 * "(Skit)" on the album's first pass, "(Scene 2)" on the reworked one. Both
 * name the same kind of track, so both are matched here rather than one
 * regex per era: a future rename only needs a new word added to this list,
 * not a hunt through gen-fixtures.mjs for where interludes get decided.
 *
 * `\b` on each side is load-bearing: without it, "(Behind the Scenes)" would
 * match on the "scene" substring inside "Scenes".
 */
export function isInterludeTitle(filename) {
  return /\((?:[^()]*\b(?:skit|scene)\b[^()]*)\)/i.test(filename)
}
