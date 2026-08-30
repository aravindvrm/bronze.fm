import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * Turns a column of blocks into pages.
 *
 * The layout is done by CSS multi-column, not by this file. Give the flow a
 * fixed height and a column width equal to the viewport, and the browser lays
 * the text out into as many columns as it needs, side by side. Each column IS
 * a page; turning one is a translate. That is the whole trick, and it is why
 * this is a few dozen lines rather than a text-measuring engine: line
 * breaking, widow control and reflow on resize are the browser's job, done in
 * native code, and it repaginates a ten-thousand-word paper in under 60ms.
 *
 * Deliberately not epub.js, Readium or react-reader. Every one of those is an
 * EPUB reader: it wants a packaged .epub, parses its spine, and renders it in
 * an iframe under its own stylesheet. This app's papers are structured JSON
 * imported from .docx and rendered as React with the app's own tokens, so
 * adopting one would mean building an EPUB pipeline, shipping a second copy
 * of every document, and re-implementing the app's typography inside a frame
 * the theme cannot reach — strictly more work for a worse result. Paged.js
 * solves a different problem again: it is a print polyfill, for laying pages
 * out to be printed rather than turned.
 *
 * What this hook owns is bookkeeping: how many pages there are, which one is
 * showing, and which page any given block landed on — the last being what the
 * contents index, the chapter rail and the resume position all read from.
 */

/** Gutter between pages, in CSS pixels. Only ever seen mid-turn. */
export const PAGE_GAP = 40

export interface Pagination {
  page: number
  pages: number
  /** Page index for each block, indexed by its `data-block` attribute. */
  blockPages: number[]
  /** First block visible on the current page — what gets stored as position. */
  anchorBlock: number
  goToPage: (page: number) => void
  goToBlock: (block: number) => void
  turn: (delta: number) => void
  /** Re-measures. Call after anything that changes the flow's metrics. */
  remeasure: () => void
}

export function usePagination(
  outerRef: React.RefObject<HTMLDivElement | null>,
  innerRef: React.RefObject<HTMLDivElement | null>,
  /** Changing any of these invalidates the layout and forces a re-measure. */
  deps: unknown[],
): Pagination {
  const [page, setPage] = useState(0)
  const [pages, setPages] = useState(1)
  const [blockPages, setBlockPages] = useState<number[]>([])

  /*
   * The block to land on after the next measurement, rather than the page.
   *
   * Page numbers do not survive a repagination — the same paper is 55 pages
   * on a phone and 21 on a laptop — so a resize or a type-size change has to
   * restore by content, not by index. A ref because measurement reads it
   * during layout, before any state has settled.
   */
  const anchorRef = useRef(0)
  // Read by `turn`, which is bound to handlers that outlive any one render
  // and would otherwise close over a stale page.
  const pageRef = useRef(0)
  pageRef.current = page

  const measure = useCallback(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return

    const width = outer.clientWidth
    const height = outer.clientHeight
    if (!width || !height) return

    // Both are needed: `width` bounds the flow to one page, `columnWidth`
    // makes the browser break at exactly that measure rather than fitting
    // some number of narrower columns into the space.
    inner.style.width = `${width}px`
    inner.style.columnWidth = `${width}px`
    inner.style.columnGap = `${PAGE_GAP}px`

    /*
     * Quantise the column height to a whole number of body lines.
     *
     * Left at the container's own height, the last line of each page is very
     * likely to be a fraction of a line short of fitting — 722px against a
     * 26.8px leading leaves 26 lines and a 26px remainder — and that
     * remainder shows as a sliver of clipped type along the foot of every
     * page. Rounding the flow down to 26 whole lines gives every page a
     * clean baseline to end on. Read off a paragraph rather than the
     * container: the container carries no line-height of its own, and the
     * body measure is the one that repeats.
     */
    const body = inner.querySelector('p')
    const leading = body ? parseFloat(getComputedStyle(body).lineHeight) : 0
    inner.style.height =
      leading > 0 ? `${Math.floor(height / leading) * leading}px` : `${height}px`

    const pitch = width + PAGE_GAP
    // scrollWidth omits the trailing gap, so it is added back before dividing.
    const total = Math.max(1, Math.round((inner.scrollWidth + PAGE_GAP) / pitch))

    /*
     * Both rects are read inside the SAME transformed element, so they carry
     * the same page offset and it cancels. Adding it back here — which is
     * what this line used to do — subtracted the current page's shift twice,
     * so measuring while on page 15 reported every block fifteen pages early.
     * It looked correct on mount only because the offset is zero on page one.
     */
    const base = inner.getBoundingClientRect().left
    const next: number[] = []
    for (const el of inner.querySelectorAll<HTMLElement>('[data-block]')) {
      const at = Math.round((el.getBoundingClientRect().left - base) / pitch)
      next[Number(el.dataset.block)] = Math.max(0, Math.min(total - 1, at))
    }

    setPages(total)
    setBlockPages(next)
    setPage(Math.max(0, Math.min(total - 1, next[anchorRef.current] ?? 0)))
  }, [outerRef, innerRef])

  /*
   * A layout effect, not a passive one: measuring after paint lets the
   * browser show one frame of the paper as a single un-paginated column,
   * which reads as a flash of the whole document before it snaps into pages.
   */
  useLayoutEffect(() => {
    measure()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measure, ...deps])

  // Held in a ref so the observer below always calls the current closure —
  // subscribing once and capturing `measure` would freeze it at whatever
  // page was showing when the effect last ran.
  const measureRef = useRef(measure)
  measureRef.current = measure

  useEffect(() => {
    const outer = outerRef.current
    if (!outer) return
    const observer = new ResizeObserver(() => measureRef.current())
    observer.observe(outer)
    return () => observer.disconnect()
  }, [outerRef])

  const goToPage = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(pages - 1, next))
      // Remember by content, so the position survives the next reflow.
      const first = blockPages.findIndex((p) => p >= clamped)
      anchorRef.current = first === -1 ? 0 : first
      setPage(clamped)
    },
    [pages, blockPages],
  )

  const goToBlock = useCallback(
    (block: number) => {
      anchorRef.current = block
      setPage(Math.max(0, Math.min(pages - 1, blockPages[block] ?? 0)))
    },
    [pages, blockPages],
  )

  const turn = useCallback((delta: number) => goToPage(pageRef.current + delta), [goToPage])

  const anchor = blockPages.findIndex((p) => p >= page)

  return {
    page,
    pages,
    blockPages,
    anchorBlock: anchor === -1 ? 0 : anchor,
    goToPage,
    goToBlock,
    turn,
    remeasure: measure,
  }
}
