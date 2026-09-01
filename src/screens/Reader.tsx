import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { content as adapter } from '@/content/adapter'
import { useCreator } from '@/content/CreatorContext'
import { useProject } from '@/content/ProjectContext'
import { usePlayer } from '@/audio/playerStore'
import type { Content, DocBlock, Span } from '@/content/types'
import { blockText, countWords, normaliseBlocks, stripTitlePage } from '@/content/blocks'
import { projectPath } from '@/lib/tenant'
import { AppHeader } from '@/components/AppHeader'
import { ReaderRail, type Chapter } from '@/components/ReaderRail'
import { ReaderIndex } from '@/components/ReaderIndex'
import { ReaderCoach } from '@/components/ReaderCoach'
import { SizeHint } from '@/components/SizeHint'
import { PAGE_GAP, usePagination } from '@/lib/usePagination'
import { useImmersion } from '@/lib/immersion'
import {
  DEFAULT_SCALE_INDEX,
  SCALES,
  coachSeen,
  loadPosition,
  loadScaleIndex,
  markCoached,
  savePosition,
  saveScaleIndex,
} from '@/lib/readerPrefs'

/**
 * The document interface — `/@deanMaye/atonomos/read`.
 *
 * A paged reader, not a scroll. Ten thousand words in one continuous column
 * gives you no sense of where you are, nowhere to stop, and nothing to
 * return to; pages give a position that can be named, remembered and jumped
 * to, which is what the contents list, the chapter rail and the resume
 * position are all built on.
 *
 * Paging is CSS multi-column — see `usePagination` for why that rather than
 * an EPUB library. This screen owns everything above it: which chapters
 * exist, what page each landed on, how far through you are, and the gestures
 * that turn a page.
 *
 * It takes the whole viewport rather than living inside the app's scroll
 * container, because a paged surface has nothing to scroll. That is also why
 * the header cannot use its scrolled-past grounding here: nothing ever
 * scrolls past it.
 */

/** Rough average reading pace, in words per minute. */
const WPM = 230

/**
 * Width of each gesture margin, as a fraction of the page.
 *
 * The same number decides where a tap turns a page, where a vertical drag
 * sets the text size, and where the coaching overlay draws its bands — so it
 * is written once and passed to the overlay rather than guessed at twice.
 */
const EDGE = 0.22

/**
 * Vertical travel, in pixels, before a swipe counts as a size change.
 *
 * ONE step per gesture, however far the finger travels. This used to step
 * again every 80px, so an ordinary swipe moved two rungs at once and the
 * control felt like it was lurching rather than adjusting — most of the
 * "one step changes a lot" was really two steps. Lift and swipe again to keep
 * going, which is also what makes each change legible.
 */
const SIZE_SWIPE_PX = 45

/**
 * A run of text, with whatever emphasis it carries.
 *
 * A link is an anchor and nothing more elaborate: `rel="noreferrer"` because
 * an imported document is somebody else's writing pointing somewhere this app
 * does not control, and `target="_blank"` because losing your place in a
 * paper to follow a citation is a poor trade. `href` was checked for scheme
 * at import; this is where it is used.
 */
function Run({ span }: { span: Span }) {
  const classes = [
    span.strong && 'font-semibold text-parchment',
    span.em && 'italic',
    span.code && 'rounded bg-parchment/[0.07] px-1 py-0.5 font-mono text-[0.85em]',
  ]
    .filter(Boolean)
    .join(' ')

  if (span.href) {
    return (
      <a
        href={span.href}
        target="_blank"
        rel="noreferrer"
        className={`${classes} text-ember underline decoration-ember/40 underline-offset-2`}
      >
        {span.text}
      </a>
    )
  }
  return classes ? <span className={classes}>{span.text}</span> : <>{span.text}</>
}

function Runs({ spans }: { spans: Span[] }) {
  return (
    <>
      {spans.map((span, i) => (
        <Run key={i} span={span} />
      ))}
    </>
  )
}

/**
 * One block, in the reader's own typography.
 *
 * `break-inside: avoid` on headings, and `break-after: avoid` so a heading
 * never ends up alone at the foot of a page with its section overleaf. The
 * orphan and widow counts stop a paragraph leaving a single line behind.
 * These are the one thing paged text needs that scrolled text does not.
 *
 * Figures, tables and code get `break-inside: avoid` for a different reason:
 * a table split down a column boundary is unreadable in a way a split
 * paragraph is not, so they move whole to the next page even at the cost of
 * white space.
 */
function Block({ block, index }: { block: DocBlock; index: number }) {
  const avoid = { breakInside: 'avoid', breakAfter: 'avoid' } as const
  const whole = { breakInside: 'avoid' } as const

  switch (block.kind) {
    case 'h': {
      if (block.level === 1) {
        return (
          <h2
            data-block={index}
            style={avoid}
            className="mb-3 mt-8 text-[1.7em] leading-tight text-parchment first:mt-0"
          >
            {block.text}
          </h2>
        )
      }
      if (block.level === 2) {
        return (
          <h3
            data-block={index}
            style={avoid}
            className="mb-2 mt-7 text-[1.32em] leading-snug text-parchment"
          >
            {block.text}
          </h3>
        )
      }
      return (
        <h4
          data-block={index}
          style={avoid}
          className="mb-1.5 mt-6 font-display text-[0.95em] uppercase tracking-[0.12em] text-ember/80"
        >
          {block.text}
        </h4>
      )
    }

    case 'ul':
      return (
        <ul data-block={index} className="mt-3 list-disc space-y-2 pl-5 marker:text-ember/50">
          {block.items.map((spans, i) => (
            <li key={i} className="leading-[1.75] text-parchment/75">
              <Runs spans={spans} />
            </li>
          ))}
        </ul>
      )

    case 'ol':
      return (
        <ol
          data-block={index}
          start={block.start}
          className="mt-3 list-decimal space-y-2 pl-6 marker:font-mono marker:text-[0.85em] marker:text-ember/60"
        >
          {block.items.map((spans, i) => (
            <li key={i} className="leading-[1.75] text-parchment/75">
              <Runs spans={spans} />
            </li>
          ))}
        </ol>
      )

    case 'quote':
      return (
        <blockquote
          data-block={index}
          className="mt-4 border-l-2 border-ember/50 pl-4 italic leading-[1.75] text-parchment/65"
        >
          <Runs spans={block.spans} />
        </blockquote>
      )

    case 'code':
      return (
        <pre
          data-block={index}
          style={whole}
          // Code is the one thing here that must NOT reflow — its line breaks
          // are content. It scrolls sideways within the page rather than
          // wrapping, which would silently change what it says.
          className="mt-4 overflow-x-auto bg-parchment/[0.05] p-3 font-mono text-[0.8em] leading-[1.6] text-parchment/80"
        >
          <code>{block.text}</code>
        </pre>
      )

    case 'table':
      return (
        <div data-block={index} style={whole} className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-[0.85em]">
            {block.head && (
              <thead>
                <tr>
                  {block.head.map((cell, i) => (
                    <th
                      key={i}
                      colSpan={cell.span}
                      className="border-b border-parchment/25 py-2 pr-3 text-left font-semibold text-parchment"
                    >
                      <Runs spans={cell.spans} />
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      colSpan={cell.span}
                      className="border-b border-parchment/10 py-2 pr-3 align-top leading-[1.6] text-parchment/75"
                    >
                      <Runs spans={cell.spans} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )

    case 'figure':
      return (
        <figure data-block={index} style={whole} className="mt-5">
          {/*
            Capped well under the page height, because a figure taller than
            the column cannot be paginated at all — the browser would give it
            a page of its own and clip whatever did not fit.
          */}
          <img
            src={block.src}
            alt={block.alt}
            className="max-h-[45%] w-full object-contain"
            loading="lazy"
          />
          {block.caption && (
            <figcaption className="mt-2 font-mono text-[0.7em] leading-relaxed text-parchment/45">
              <Runs spans={block.caption} />
            </figcaption>
          )}
        </figure>
      )

    case 'rule':
      return <hr data-block={index} className="my-8 border-parchment/20" />

    case 'p':
      return (
        <p
          data-block={index}
          style={{ orphans: 2, widows: 2 }}
          className="mt-3 leading-[1.75] text-parchment/75"
        >
          <Runs spans={block.spans} />
        </p>
      )
  }
}

export function Reader() {
  const creator = useCreator()
  const project = useProject()
  const hasQueue = usePlayer((s) => s.queue.length > 0)
  const reduceMotion = useReducedMotion()

  const [content, setContent] = useState<Content | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [scaleIndex, setScaleIndex] = useState(DEFAULT_SCALE_INDEX)
  const [indexOpen, setIndexOpen] = useState(false)
  const [query, setQuery] = useState('')
  /*
   * The top bar, once you are actually reading.
   *
   * It goes on the first page turn and comes back on a tap in the middle of
   * the page — the dead zone between the two edges that turn pages, so the
   * three gestures never collide. It is CLIPPED rather than unmounted, and
   * its box keeps its height either way: collapsing it would grow the text
   * column, repaginate the paper mid-read, and renumber every page under
   * the reader's thumb.
   */
  const [chrome, setChrome] = useState(true)
  /** The gesture explainer, shown the first time anyone opens a paper. */
  const [coaching, setCoaching] = useState(false)
  /** Which rung the text size is on, while it is worth saying. */
  const [sizeHint, setSizeHint] = useState<number | null>(null)

  /*
   * The docked player is mounted at the App root so playback survives
   * navigation, which puts it outside this tree — the flag is how it hears
   * that the page wants the room. Lowered on the way out, or it would stay
   * hidden on every other screen.
   */
  const setImmersed = useImmersion((s) => s.setImmersed)
  useEffect(() => setImmersed(!chrome), [chrome, setImmersed])
  useEffect(() => () => setImmersed(false), [setImmersed])

  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)

  useEffect(() => setScaleIndex(loadScaleIndex()), [])
  useEffect(() => setCoaching(!coachSeen()), [])

  const dismissCoach = useCallback(() => {
    setCoaching(false)
    markCoached()
  }, [])

  useEffect(() => {
    let cancelled = false
    void adapter.getContent(creator.slug, project.slug, 'ereader').then((c) => {
      if (cancelled) return
      setContent(c)
      setLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [creator.slug, project.slug])

  const title = content?.title ?? project.title
  /*
   * Normalised again here, not only at the adapter.
   *
   * Belt and braces on purpose: this is the one component that dereferences
   * block fields, and it is the one whose failure takes the whole app down
   * with it. A second pass over already-clean data costs one array walk on
   * load.
   */
  const blocks = useMemo(
    () => stripTitlePage(normaliseBlocks(content?.document ?? []), title),
    [content?.document, title],
  )

  const { page, pages, blockPages, anchorBlock, goToPage, goToBlock, turn } = usePagination(
    outerRef,
    innerRef,
    [blocks, scaleIndex, hasQueue],
  )

  // ── Position ────────────────────────────────────────────────────────────
  // Restored once, when the paper first has pages. Later measurements keep
  // their own anchor, so re-running this would drag the reader backwards on
  // every rotation.
  const restored = useRef(false)
  useEffect(() => {
    if (restored.current || !content || pages <= 1 || blockPages.length === 0) return
    restored.current = true
    const at = loadPosition(content.id)
    if (at > 0) goToBlock(at)
  }, [content, pages, blockPages.length, goToBlock])

  useEffect(() => {
    if (!content || !restored.current) return
    savePosition(content.id, anchorBlock)
  }, [content, anchorBlock])

  // ── Chapters ────────────────────────────────────────────────────────────
  const chapters: Chapter[] = useMemo(
    () =>
      blocks
        .map((b, i) => ({ b, i }))
        // Every heading, at whatever depth. Filtering to the top level left
        // six ticks on a sixty-page rail and an index that skipped half the
        // paper — the subsections are most of its structure.
        .filter(({ b }) => b.kind === 'h')
        .map(({ b, i }) => ({
          block: i,
          text: (b as Extract<DocBlock, { kind: 'h' }>).text,
          level: (b as Extract<DocBlock, { kind: 'h' }>).level,
          page: blockPages[i] ?? 0,
        })),
    [blocks, blockPages],
  )

  const section = useMemo(() => {
    let found = ''
    for (const c of chapters) {
      if (c.page <= page) found = c.text
      else break
    }
    return found
  }, [chapters, page])

  // ── Progress ────────────────────────────────────────────────────────────
  const totalWords = useMemo(() => countWords(blocks), [blocks])
  const minutesLeft = pages > 1 ? Math.ceil((totalWords * (1 - page / (pages - 1))) / WPM) : 0

  // ── Search ──────────────────────────────────────────────────────────────
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    return blocks
      .map((b, i) => ({ i, text: blockText(b) }))
      .filter(({ text }) => text.toLowerCase().includes(q))
      .slice(0, 40)
      .map(({ i, text }) => {
        // A window around the hit, so a result shows the phrase in context
        // rather than whichever words a paragraph happens to open with.
        const at = text.toLowerCase().indexOf(q)
        const from = Math.max(0, at - 40)
        return {
          block: i,
          page: blockPages[i] ?? 0,
          excerpt: (from > 0 ? '…' : '') + text.slice(from, at + q.length + 60).trim() + '…',
        }
      })
  }, [query, blocks, blockPages])

  // ── Input ───────────────────────────────────────────────────────────────
  /*
   * One step up or down the size ladder, clamped rather than wrapped.
   *
   * The old control cycled — press past the largest and you were back at the
   * smallest — which is the only sane behaviour for a single button and
   * exactly the wrong one for a gesture. Swiping up should never make the
   * text suddenly tiny.
   */
  const step = useCallback((delta: number) => {
    setScaleIndex((i) => {
      const next = Math.max(0, Math.min(SCALES.length - 1, i + delta))
      if (next !== i) saveScaleIndex(next)
      // Shown even at the ends of the ladder, so a swipe that changes nothing
      // still says why: the marks are already all the way up or all the way
      // down. Silence there reads as a missed gesture.
      setSizeHint(next)
      return next
    })
  }, [])

  // Cleared on a timer rather than on pointerup: the swipe is over long
  // before anyone has finished reading what changed.
  useEffect(() => {
    if (sizeHint === null) return
    const timer = window.setTimeout(() => setSizeHint(null), 1100)
    return () => window.clearTimeout(timer)
  }, [sizeHint])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Not while typing in the search field, where these keys mean text.
      if (e.target instanceof HTMLInputElement) return
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault()
        setChrome(false)
        turn(1)
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        setChrome(false)
        turn(-1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [turn])

  /*
   * One pointer handler for every gesture the page offers.
   *
   *   horizontal, anywhere      swipe to turn
   *   tap in a margin           turn a page
   *   tap in the middle         the bar comes back
   *   vertical, in the middle   text size
   *
   * Size started in the margins, which was wrong: the margins are where page
   * turns live, so the two gestures were competing for the same strip of
   * screen and a swipe that drifted off the horizontal did the wrong thing.
   * They are separated by POSITION now rather than by direction, which is a
   * far cheaper distinction for a thumb to make than for a handler.
   *
   * A text selection suppresses everything — dragging across a sentence to
   * select it must not also turn the page.
   */
  const down = useRef<{ x: number; y: number; middle: boolean } | null>(null)
  const sized = useRef(false)

  /** True when a point is between the two page-turn margins. */
  const inMiddle = (e: React.PointerEvent) => {
    const box = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - box.left
    const edge = box.width * EDGE
    return x >= edge && x <= box.width - edge
  }

  const onPointerDown = (e: React.PointerEvent) => {
    down.current = { x: e.clientX, y: e.clientY, middle: inMiddle(e) }
    sized.current = false
    /*
     * Capture the pointer for the whole gesture.
     *
     * Without it a swipe that ends over a child element — which is most of
     * them, since the page is wall-to-wall text — delivers its pointerup to
     * that child, and the handler here never sees where the finger let go.
     * Capture also means `pointercancel` reliably arrives if the browser
     * decides to claim the gesture for itself.
     */
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const start = down.current
    if (!start || !start.middle || sized.current) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    // Committed to vertical only once it clearly is: a swipe that wanders is
    // still a page turn until it stops being one.
    if (Math.abs(dy) < SIZE_SWIPE_PX || Math.abs(dy) < Math.abs(dx)) return
    // Up is bigger, matching every brightness and volume gesture there is.
    step(dy < 0 ? 1 : -1)
    sized.current = true
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const start = down.current
    down.current = null
    if (!start) return
    if (sized.current) return
    // A drag that selected text was someone selecting text, not turning a page.
    if (window.getSelection()?.toString()) return

    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      setChrome(false)
      turn(dx < 0 ? 1 : -1)
      return
    }
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      const box = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - box.left
      const edge = box.width * EDGE
      if (x < edge) {
        setChrome(false)
        turn(-1)
      } else if (x > box.width - edge) {
        setChrome(false)
        turn(1)
      } else {
        // The middle of the page is the only thing that brings the bar back.
        setChrome((on) => !on)
      }
    }
  }
  const onPointerCancel = () => {
    down.current = null
  }

  const scale = SCALES[scaleIndex]

  return (
    // Fixed, not `min-h-full`: paged text fills the viewport exactly and
    // never scrolls, so the screen owns its own height rather than growing
    // inside the app's scroller.
    /*
     * `100dvh`, not the height `inset-0` implies.
     *
     * On iOS Safari a fixed, fully-inset element is laid out against the
     * LARGE viewport — the one without the browser's toolbars — so its foot
     * sits underneath the toolbar that is actually on screen, taking the last
     * line of every page and part of the rail with it. `dvh` is the viewport
     * that is really visible, and it tracks the toolbar as it comes and goes.
     * `inset-x-0 top-0` still pins the rest.
     */
    <div className="fixed inset-x-0 top-0 z-30 flex flex-col bg-void" style={{ height: '100dvh' }}>
      {/*
        A vertical wipe, not a slide or a fade. `clip-path` leaves the box
        exactly where it is — nothing below it moves, so the text column
        keeps its height and the paper is never repaginated by the chrome
        coming and going. Focus brings it back, so a keyboard user is never
        left tabbing into a bar they cannot see.
      */}
      <motion.div
        onFocusCapture={() => setChrome(true)}
        animate={{ clipPath: chrome ? 'inset(0 0 0% 0)' : 'inset(0 0 100% 0)' }}
        initial={false}
        transition={{
          duration: reduceMotion ? 0 : 0.28,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="shrink-0"
      >
        <AppHeader
          backTo={projectPath(creator.slug, project.slug)}
          query={query}
          onQueryChange={setQuery}
        />
      </motion.div>

      {/*
        The measured box carries no padding of its own: `clientWidth`
        includes padding, so a padded element would hand the paginator a
        width wider than the text it actually lays out, and every page would
        break a gutter early.
      */}
      <div
        data-testid="reader-page"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        /*
         * Every direction is ours; only pinch-zoom stays with the browser.
         *
         * This was `pan-y pinch-zoom`, which reads as harmless on a surface
         * that never scrolls — but `pan-y` is a promise the browser may take
         * vertical movement for panning, and once it does it stops sending
         * pointermove at all. The text-size gesture fired not once. There is
         * nothing to pan here: the page is fixed and paged.
         */
        style={{ touchAction: 'pinch-zoom' }}
        className="relative flex-1 overflow-hidden px-5 sm:px-6"
      >
        <div
          ref={outerRef}
          className="mx-auto h-full max-w-3xl overflow-hidden"
          style={{ fontSize: `calc(1.0625rem * ${scale})` }}
        >
          {/* The flow itself is the document, so it carries the `article`
              element rather than a wrapper around it. */}
          <article
            ref={innerRef}
            className="h-full"
            style={{
              transform: `translateX(calc(-${page} * (100% + ${PAGE_GAP}px)))`,
              transition: 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <h1 className="mb-6 text-[2em] font-semibold leading-tight text-parchment">{title}</h1>
            {blocks.map((block, i) => (
              <Block key={i} block={block} index={i} />
            ))}
          </article>
        </div>

        {loaded && blocks.length === 0 && (
          <p className="absolute inset-x-0 top-8 px-5 text-sm text-parchment/60">
            This paper has no text yet.
          </p>
        )}
      </div>

      {/* Results sit over the page rather than replacing it: a search that
          blanks the paper loses the place you were reading. */}
      {query.trim().length >= 2 && (
        <div className="absolute inset-x-0 bottom-0 top-14 z-20 overflow-y-auto bg-void/97 px-5 py-4 sm:px-6">
          <p className="mx-auto max-w-3xl font-mono text-[10px] uppercase tracking-[0.25em] text-parchment/45">
            {matches.length === 0 ? 'Nothing matches' : `${matches.length} matches`}
          </p>
          <ul className="mx-auto max-w-3xl">
            {matches.map((m) => (
              <li key={m.block}>
                <button
                  onClick={() => {
                    setQuery('')
                    goToBlock(m.block)
                  }}
                  className="flex w-full items-baseline gap-3 border-b border-parchment/10 py-3 text-left text-sm leading-relaxed text-parchment/70 transition hover:text-parchment"
                >
                  <span className="min-w-0 flex-1">{m.excerpt}</span>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-parchment/40">
                    {m.page + 1}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <SizeHint level={sizeHint} of={SCALES.length} />

      <ReaderCoach open={coaching} margin={EDGE} onDismiss={dismissCoach} />

      <ReaderIndex
        open={indexOpen}
        minutesLeft={minutesLeft}
        chapters={chapters}
        currentBlock={anchorBlock}
        onSelect={(block) => {
          setIndexOpen(false)
          goToBlock(block)
        }}
        onShowGestures={() => {
          setIndexOpen(false)
          setCoaching(true)
        }}
        onClose={() => setIndexOpen(false)}
      />

      {/* Clears the docked mini player, which floats over this screen. */}
      <div style={{ paddingBottom: hasQueue ? '5.25rem' : 'var(--safe-b)' }}>
        <ReaderRail
          page={page}
          pages={pages}
          chapters={chapters}
          chapter={section}
          onSeek={goToPage}
          onOpenContents={() => setIndexOpen(true)}
        />
      </div>
    </div>
  )
}
