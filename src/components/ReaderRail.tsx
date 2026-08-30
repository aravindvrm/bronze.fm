import { useCallback, useRef } from 'react'

export interface Chapter {
  /** Index into the document's block array. */
  block: number
  text: string
  /** 2 for a section, 3 for a subsection. */
  level: number
  page: number
}

/**
 * The reader's chrome: contents, type size, and the chapter rail.
 *
 * The rail is the paged equivalent of a scrollbar. Paging removes the real
 * one, and a paper this long needs some way to see where you are and to move
 * a long way at once — so the track carries a tick for every chapter, fills
 * to the accent as far as you have read, and can be dragged.
 *
 * Built on the same Pointer Events shape as the player's ScrubBar, and for
 * the same reason: one code path for mouse, touch and pen, with the drag
 * gated on starting inside the track via pointer capture. The two are the
 * app's only scrubbable controls and should feel identical under the thumb.
 */
export function ReaderRail({
  page,
  pages,
  chapters,
  minutesLeft,
  onSeek,
  onOpenContents,
  onCycleType,
}: {
  page: number
  pages: number
  chapters: Chapter[]
  minutesLeft: number
  onSeek: (page: number) => void
  onOpenContents: () => void
  onCycleType: () => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const last = Math.max(1, pages - 1)
  const pct = (page / last) * 100

  const seekFromEvent = useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect()
      if (!rect) return
      const ratio = Math.min(Math.max(0, (clientX - rect.left) / rect.width), 1)
      onSeek(Math.round(ratio * last))
    },
    [last, onSeek],
  )

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    seekFromEvent(e.clientX)
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    seekFromEvent(e.clientX)
  }
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-3 sm:px-6">
      <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-parchment/45">
        <button
          onClick={onOpenContents}
          className="-m-1 p-1 transition hover:text-parchment"
          aria-label="Contents"
        >
          Contents
        </button>
        <span aria-live="polite">
          {page + 1} / {pages}
          {minutesLeft > 0 && ` · ${minutesLeft} min left`}
        </span>
        <button
          onClick={onCycleType}
          className="-m-1 p-1 transition hover:text-parchment"
          aria-label="Change text size"
        >
          {/* Not an icon: two glyphs at two sizes say "type size" without
              needing a legend, and the app's own typeface draws them. */}
          <span className="text-[11px] normal-case tracking-normal">A</span>
          <span className="text-[14px] normal-case tracking-normal">A</span>
        </button>
      </div>

      <div
        ref={trackRef}
        role="slider"
        aria-label="Page"
        aria-valuemin={1}
        aria-valuemax={pages}
        aria-valuenow={page + 1}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') onSeek(page + 1)
          if (e.key === 'ArrowLeft') onSeek(page - 1)
        }}
        className="group relative cursor-pointer touch-none py-3"
      >
        <div className="relative h-[3px] w-full bg-parchment/20">
          <div className="h-full bg-gilt" style={{ width: `${pct}%` }} />

          {/*
            A tick per chapter. Subsections are drawn shorter than sections,
            so the rail reads as a structure rather than as evenly-spaced
            noise. `pointer-events-none` throughout: the track owns the
            pointer capture that makes dragging work, and a tick swallowing
            the pointerdown would kill the drag at exactly the spots someone
            is most likely to aim for.
          */}
          {chapters.map((c) => (
            <span
              key={c.block}
              className={`pointer-events-none absolute top-1/2 w-px -translate-y-1/2 bg-parchment/45 ${
                c.level <= 2 ? 'h-2.5' : 'h-1.5'
              }`}
              style={{ left: `${(c.page / last) * 100}%` }}
            />
          ))}
        </div>

        <div
          className="pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gilt shadow-[0_1px_4px_var(--color-shade)] transition-transform group-hover:scale-125 group-active:scale-125"
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  )
}
