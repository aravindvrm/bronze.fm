import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect } from 'react'

/**
 * The gestures, shown once.
 *
 * A paged reader has no visible controls — that is the point of it — so the
 * first time someone opens one, nothing on screen says that the edges turn
 * pages or that the margins set the text size. Every ereader solves this the
 * same way, with a diagram over the first page that goes away, and there is
 * no cleverer answer: an affordance drawn permanently would be the clutter
 * the gestures exist to avoid.
 *
 * It draws the ACTUAL zones — the same 22% margins the handler tests — so it
 * is a map of the page rather than a picture of some gestures. Anything that
 * moves those numbers has to move them here too, which is why they arrive as
 * a prop rather than being written twice.
 *
 * Margins turn pages; the middle sets the text size. Size lived in the
 * margins first and competed with the page turns for the same strip of
 * screen — separating them by position rather than by direction is a much
 * easier distinction for a thumb to make.
 *
 * Dismissed by any touch, and by a timer, and by using any of the gestures it
 * describes. Someone who already knows how a reader works should not have to
 * find the dismiss.
 *
 * Shown once, but reachable again: "Gestures" in the contents sheet re-opens
 * it. A one-shot explanation that cannot be summoned back is a poor deal when
 * it is the only account of how the screen works — miss it and there is
 * nothing left to ask.
 */
export function ReaderCoach({
  open,
  margin,
  onDismiss,
}: {
  open: boolean
  /** Width of each gesture margin, as a fraction of the page. */
  margin: number
  onDismiss: () => void
}) {
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!open) return
    // Long enough to read twice without hurrying. It used to be 5.2s, which
    // is easy to miss entirely if you started reading the page instead — and
    // missing it used to mean never seeing it again.
    const timer = window.setTimeout(onDismiss, 7000)
    return () => window.clearTimeout(timer)
  }, [open, onDismiss])

  const zone = `${margin * 100}%`

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.35 }}
          onPointerDown={onDismiss}
          /*
            Near-opaque, not the 92% this started at. The page underneath is
            dark type at full contrast, and at 92% it read straight through
            the overlay — two documents fighting over the same pixels, with
            the instructions losing. A hint of the page is enough to say what
            the diagram is about.
          */
          className="absolute inset-0 z-20 select-none bg-void/[0.975]"
          role="note"
          aria-label="How to use the reader"
        >
          {/* The two page-turn margins, drawn where they actually are. */}
          <Band side="left" width={zone} />
          <Band side="right" width={zone} />

          <div
            className="absolute inset-y-0 flex flex-col items-center justify-center gap-2 text-center"
            style={{ left: zone, right: zone }}
          >
            <Arrow direction="up" />
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-parchment/70">
              Text size
            </span>
            <Arrow direction="down" />
            <p className="mt-3 max-w-[15rem] px-2 font-mono text-[10px] leading-relaxed text-parchment/45">
              Swipe up or down here.
              <br />
              Tap for the bar.
            </p>
          </div>

          <p
            className="absolute inset-x-0 text-center font-mono text-[9px] uppercase tracking-[0.25em] text-parchment/35"
            style={{ bottom: '1.5rem' }}
          >
            Tap to dismiss
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Band({ side, width }: { side: 'left' | 'right'; width: string }) {
  return (
    <div
      className={`absolute inset-y-0 flex flex-col items-center justify-center gap-2 border-gilt/25 bg-gilt/[0.06] ${
        side === 'left' ? 'border-r' : 'border-l'
      }`}
      style={{ width, [side]: 0 }}
    >
      <Arrow direction={side === 'left' ? 'left' : 'right'} />
      <span className="font-mono text-[9px] uppercase leading-tight tracking-[0.15em] text-parchment/55">
        Turn
      </span>
    </div>
  )
}

/**
 * Drifting in its own direction, because a static arrow is a symbol and a
 * moving one is an instruction. Held still under reduced motion, where the
 * arrowhead alone still says which way.
 */
function Arrow({ direction }: { direction: 'up' | 'down' | 'left' | 'right' }) {
  const reduceMotion = useReducedMotion()
  const axis = direction === 'up' || direction === 'down' ? 'y' : 'x'
  const to = direction === 'up' || direction === 'left' ? -5 : 5
  const rotate = { up: 0, right: 90, down: 180, left: 270 }[direction]

  return (
    <motion.svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-5 text-gilt"
      style={{ rotate }}
      animate={reduceMotion ? {} : { [axis === 'y' ? 'y' : 'x']: [0, to, 0] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
    >
      <path d="M12 19V5M5 12l7-7 7 7" />
    </motion.svg>
  )
}
