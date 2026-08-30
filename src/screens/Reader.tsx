import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { content as adapter } from '@/content/adapter'
import { useCreator } from '@/content/CreatorContext'
import { useProject } from '@/content/ProjectContext'
import { usePlayer } from '@/audio/playerStore'
import type { Content, DocBlock } from '@/content/types'
import { projectPath } from '@/lib/tenant'
import { AppHeader } from '@/components/AppHeader'
import { ReaderRail, type Chapter } from '@/components/ReaderRail'
import { ReaderIndex } from '@/components/ReaderIndex'
import { PAGE_GAP, usePagination } from '@/lib/usePagination'
import {
  DEFAULT_SCALE_INDEX,
  SCALES,
  loadPosition,
  loadScaleIndex,
  savePosition,
  saveScaleIndex,
} from '@/lib/readerPrefs'

/**
 * The document interface — `/@dean/atonomos/read`.
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
 * Drops the paper's own title page, which the reader prints for itself.
 *
 * An imported .docx opens with its title set as headings — here two of them,
 * "Autonomous" and "The Agentic Enterprise", for a paper whose title is the
 * two joined.
 *
 * Only LEADING level-1 headings, and only those the title already contains,
 * so a document that opens straight into prose — or one whose first heading
 * is real content — passes through untouched. Belongs here rather than in the
 * importer: it is a fact about how this screen lays a paper out, and the
 * fixtures stay a faithful copy of the source.
 */
function stripTitlePage(blocks: DocBlock[], title: string): DocBlock[] {
  const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const heading = normalise(title)
  let i = 0
  while (
    blocks[i]?.kind === 'h' &&
    (blocks[i] as Extract<DocBlock, { kind: 'h' }>).level === 1 &&
    heading.includes(normalise((blocks[i] as Extract<DocBlock, { kind: 'h' }>).text))
  ) {
    i++
  }
  return i ? blocks.slice(i) : blocks
}

function blockText(block: DocBlock): string {
  return block.kind === 'ul' ? block.items.join(' ') : block.text
}

/**
 * `break-inside: avoid` on headings, and `break-after: avoid` so a heading
 * never ends up alone at the foot of a page with its section overleaf. The
 * orphan and widow counts stop a paragraph leaving a single line behind.
 * These are the one thing paged text needs that scrolled text does not.
 */
function Block({ block, index }: { block: DocBlock; index: number }) {
  const avoid = { breakInside: 'avoid', breakAfter: 'avoid' } as const

  if (block.kind === 'h') {
    if (block.level === 1) {
      return (
        <h2 data-block={index} style={avoid} className="mb-3 mt-8 text-[1.7em] leading-tight text-parchment first:mt-0">
          {block.text}
        </h2>
      )
    }
    if (block.level === 2) {
      return (
        <h3 data-block={index} style={avoid} className="mb-2 mt-7 text-[1.32em] leading-snug text-parchment">
          {block.text}
        </h3>
      )
    }
    return (
      <h4
        data-block={index}
        style={avoid}
        className="mb-1.5 mt-6 font-display text-[0.95em] uppercase tracking-[0.12em] text-gilt/80"
      >
        {block.text}
      </h4>
    )
  }

  if (block.kind === 'ul') {
    return (
      <ul data-block={index} className="mt-3 list-disc space-y-2 pl-5 marker:text-gilt/50">
        {block.items.map((item, i) => (
          <li key={i} className="leading-[1.75] text-parchment/75">
            {item}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <p data-block={index} style={{ orphans: 2, widows: 2 }} className="mt-3 leading-[1.75] text-parchment/75">
      {block.text}
    </p>
  )
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

  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)

  useEffect(() => setScaleIndex(loadScaleIndex()), [])

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
  const blocks = useMemo(
    () => stripTitlePage(content?.document ?? [], title),
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
  const totalWords = useMemo(
    () => blocks.reduce((n, b) => n + blockText(b).split(/\s+/).length, 0),
    [blocks],
  )
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
  const cycleType = useCallback(() => {
    setScaleIndex((i) => {
      const next = (i + 1) % SCALES.length
      saveScaleIndex(next)
      return next
    })
  }, [])

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
   * Swipe, and tap-the-edge.
   *
   * One pointer handler for both: a gesture that travels far enough is a
   * swipe, one that barely moves is a tap, and where it landed decides the
   * direction. A text selection suppresses both — dragging across a sentence
   * to select it must not also turn the page.
   */
  const down = useRef<{ x: number; y: number } | null>(null)
  const onPointerDown = (e: React.PointerEvent) => {
    down.current = { x: e.clientX, y: e.clientY }
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
  const onPointerUp = (e: React.PointerEvent) => {
    const start = down.current
    down.current = null
    if (!start) return
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
      const zone = box.width * 0.22
      const x = e.clientX - box.left
      if (x < zone) {
        setChrome(false)
        turn(-1)
      } else if (x > box.width - zone) {
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
    <div className="fixed inset-0 z-30 flex flex-col bg-void">
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
        transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
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
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        // Vertical panning and pinch-zoom stay with the browser; horizontal
        // movement is ours. Without this the platform can take a sideways
        // drag for its own back-navigation gesture and the swipe never lands.
        style={{ touchAction: 'pan-y pinch-zoom' }}
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

      <ReaderIndex
        open={indexOpen}
        minutesLeft={minutesLeft}
        chapters={chapters}
        currentBlock={anchorBlock}
        onSelect={(block) => {
          setIndexOpen(false)
          goToBlock(block)
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
          onCycleType={cycleType}
        />
      </div>
    </div>
  )
}
