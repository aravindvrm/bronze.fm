/**
 * The bronze.fm wordmark.
 *
 * One component because it is a logo, not a heading that happens to say the
 * product name: it drifted once already, set in caps on the splash and
 * lowercase on the feed. Anywhere the mark appears, it appears like this.
 *
 * The `.fm` carries the accent — the mark is the one piece of chrome that is
 * always allowed to be a colour.
 *
 * Case is CSS rather than typed capitals so the accessible name and the
 * document text stay "bronze.fm", which is how it is written in prose and
 * how a screen reader should say it.
 */
export function Wordmark({
  className = '',
  centered = false,
}: {
  className?: string
  /**
   * Letter-spacing adds a trailing gap after the final glyph, which throws a
   * centred mark visibly left. Pad the same amount back on the leading edge
   * to cancel it. Left-aligned uses run past the right edge harmlessly, so
   * they must NOT pay it — it would look like an indent.
   */
  centered?: boolean
}) {
  return (
    <span
      className={`font-display uppercase tracking-[0.42em] text-parchment ${
        centered ? 'pl-[0.42em]' : ''
      } ${className}`}
    >
      bronze<span className="text-gilt">.fm</span>
    </span>
  )
}
