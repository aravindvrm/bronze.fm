/**
 * The bronze.fm wordmark.
 *
 * One component because it is a logo, not a heading that happens to say the
 * product name: it drifted once already, set in caps on the splash and
 * lowercase on the feed. Anywhere the mark appears, it appears like this.
 *
 * `.fm` sits in a solid accent block rather than merely being tinted — the
 * mark is the one piece of chrome always allowed to be a colour, and a filled
 * block reads as a logotype at the small sizes the header uses, where
 * coloured text alone just read as an oddly-tinted word.
 *
 * Case is CSS rather than typed capitals so the accessible name and the
 * document text stay "bronze.fm", which is how it is written in prose and
 * how a screen reader should say it.
 */
export function Wordmark({
  className = '',
  inverted = false,
}: {
  className?: string
  /**
   * For placing the mark ON the accent rather than on the page: the word
   * turns white and the block swaps to a white ground with accent text.
   * Both directions are the same two colours, so the pairing keeps its
   * 5.45:1 either way round.
   */
  inverted?: boolean
}) {
  return (
    <span className={`inline-flex items-baseline font-display uppercase ${className}`}>
      {/*
        Letter-spacing puts a gap AFTER the final glyph too, so `bronze` ends
        with 0.42em of air that would otherwise stack on top of the block's
        own margin and push it visibly off. Cancelled here, then re-added
        deliberately as the one gap that should exist.
      */}
      <span
        className={`-mr-[0.42em] tracking-[0.42em] ${inverted ? 'text-on-accent' : 'text-parchment'}`}
      >
        bronze
      </span>

      <span
        className={`ml-[0.2em] px-[0.34em] py-[0.1em] ${
          inverted ? 'bg-on-accent text-gilt' : 'bg-gilt text-on-accent'
        }`}
      >
        {/* Same trailing-gap cancellation, so the block's padding is even on
            both sides instead of 0.42em wider on the right. */}
        <span className="-mr-[0.42em] inline-block tracking-[0.42em]">.fm</span>
      </span>
    </span>
  )
}
