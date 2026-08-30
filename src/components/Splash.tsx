import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { GrainField } from '@/components/GrainField'

const SEEN_KEY = 'bronze:splash-seen'

/**
 * The app-open splash.
 *
 * Deliberately not a route (PLAN.md §8.2): as a URL it would be
 * deep-linkable, would sit in history so Back returns to it, and would be a
 * dead end on refresh. It is a transient state, so it lives in
 * sessionStorage — which is also exactly what "once per cold open" means,
 * since a session ends when the tab or the installed app closes.
 *
 * Shown only at the root. A deep link into a project is someone arriving at a
 * specific thing, usually from a shared URL, and holding that behind a tap
 * would be friction with no purpose. An installed PWA launches at start_url
 * `/`, so the normal open still gets it.
 *
 * Tap-gated, not timed. Nobody is forced to sit through the animation on a
 * length someone else chose; "Tap to enter" says explicitly what the gesture
 * does, since a silent full-bleed screen with no timer and no visible action
 * would leave a visitor unsure whether tapping does anything at all. Tapping
 * during the reveal is honoured immediately — the animation is decoration,
 * never a gate.
 */

/**
 * The wordmark, one letter at a time.
 *
 * Each letter arrives from its own direction, in sequence. The alternation
 * is what makes it read as typography assembling itself rather than a single
 * block sliding in — and the directions are deliberately not a repeating
 * cycle, so the eye cannot predict the next one.
 *
 * `.FM` sits in a solid accent block, matching the static Wordmark used
 * everywhere else in the app. The block arrives as one object on the same
 * cadence while its own letters keep animating inside it, so it reads as a
 * badge landing rather than three more loose characters.
 */
const WORD = [
  { char: 'B', axis: 'y', from: -40 },
  { char: 'R', axis: 'y', from: 40 },
  { char: 'O', axis: 'x', from: -40 },
  { char: 'N', axis: 'x', from: 40 },
  { char: 'Z', axis: 'y', from: -40 },
  { char: 'E', axis: 'y', from: 40 },
] as const

const BADGE = [
  { char: '.', axis: 'x', from: -40 },
  { char: 'F', axis: 'x', from: 40 },
  { char: 'M', axis: 'y', from: -40 },
] as const

/*
 * Tightened once the tagline was added: the mark used to have the screen to
 * itself and could take its time, but it is now the first of three beats
 * rather than the whole show. Faster cadence between letters and a shorter
 * settle each, which keeps the full sequence under ~2.4s instead of ~3.3s.
 */
const STEP = 0.09
const REVEAL = 0.9
const LETTER_COUNT = WORD.length + BADGE.length

const TAGLINE = 'Create. Share. Thrive.'
const TYPE_MS = 42
/**
 * The tagline starts before the final letters have fully eased in, rather
 * than after. The reveal's tail is slow by design, so waiting for it to
 * finish outright leaves a dead beat in the middle of the sequence.
 */
const TAGLINE_START = STEP * LETTER_COUNT + REVEAL * 0.45
/** Everything has had its turn, so the prompt can arrive without talking
 *  over the animation it belongs to. */
const SETTLED = TAGLINE_START + (TAGLINE.length * TYPE_MS) / 1000 + 0.25

function Wordmark({ still }: { still: boolean }) {
  return (
    <div
      /*
       * `role="img"`, not a heading. The splash overlays the feed, which has
       * its own h1 naming the app — two headings with the same accessible
       * name is a confusing thing to hand a screen reader, and this is a
       * drawn rendition of the mark rather than the page's title. The label
       * also spares anyone the nine separate letter spans.
       */
      role="img"
      aria-label="bronze.fm"
      /*
       * Sized against the viewport rather than a breakpoint: the mark is the
       * only thing on this screen, so it should fill the width it is given
       * on any device instead of stepping between two fixed sizes. The
       * ceiling stops it from becoming a billboard on a desktop monitor.
       */
      className="flex select-none items-baseline font-display text-[clamp(2rem,12vw,5rem)] font-bold leading-none tracking-[0.06em]"
    >
      <span className="text-parchment">
        {WORD.map(({ char, axis, from }, i) => (
          <Letter key={char} still={still} axis={axis} from={from} index={i}>
            {char}
          </Letter>
        ))}
      </span>

      {/*
        The badge lands as one object — it is a shape, not three characters —
        and its letters animate inside it, so the two motions layer rather
        than one replacing the other.
      */}
      <motion.span
        initial={still ? false : { opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: still ? 0 : STEP * (WORD.length + 1),
          duration: still ? 0 : REVEAL,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="ml-[0.16em] bg-gilt px-[0.16em] py-[0.07em] text-void"
      >
        {BADGE.map(({ char, axis, from }, i) => (
          <Letter key={char} still={still} axis={axis} from={from} index={WORD.length + i}>
            {char}
          </Letter>
        ))}
      </motion.span>
    </div>
  )
}

function Letter({
  children,
  still,
  axis,
  from,
  index,
}: {
  children: string
  still: boolean
  axis: 'x' | 'y'
  from: number
  index: number
}) {
  return (
    <motion.span
      aria-hidden
      // `false` skips the enter animation outright, so reduced motion gets
      // the finished mark rather than a faster version of the same movement.
      initial={still ? false : { opacity: 0, [axis]: from }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{
        delay: still ? 0 : STEP * (index + 1),
        duration: still ? 0 : REVEAL,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="inline-block"
    >
      {children}
    </motion.span>
  )
}

/**
 * The tagline, typed out.
 *
 * Set in the mono face at 500 — the weight the design system specifies for
 * it, and the first place in the app that asks for it explicitly rather than
 * inheriting 400.
 *
 * The full string is always in the DOM, visually hidden, so assistive
 * technology reads one sentence instead of announcing a partial line on
 * every keystroke. The animated copy beside it is hidden from that tree.
 *
 * Width is reserved by an invisible copy of the finished string, so the
 * centred block does not creep sideways as characters land — a typewriter
 * that shoves its own line around reads as a layout bug.
 */
function Tagline({ still }: { still: boolean }) {
  const [typed, setTyped] = useState(still ? TAGLINE.length : 0)

  useEffect(() => {
    if (still) return
    let interval: number | undefined
    const start = window.setTimeout(() => {
      interval = window.setInterval(() => {
        setTyped((n) => {
          if (n >= TAGLINE.length) {
            window.clearInterval(interval)
            return n
          }
          return n + 1
        })
      }, TYPE_MS)
    }, TAGLINE_START * 1000)

    return () => {
      window.clearTimeout(start)
      window.clearInterval(interval)
    }
  }, [still])

  return (
    <p className="mt-5 font-mono text-[clamp(0.72rem,3.3vw,1rem)] font-medium tracking-[0.02em] text-parchment/55">
      <span className="sr-only">{TAGLINE}</span>

      <span aria-hidden className="relative inline-block text-left">
        {/*
          Holds the final width; never painted. It reserves room for the
          CURSOR as well as the text — sized off the same rule the real one
          uses — because a trailing space is narrower than the caret, and the
          caret then wrapped onto a line of its own once the last character
          landed.
        */}
        <span className="invisible whitespace-nowrap">
          {TAGLINE}
          <span className="ml-[0.1em] inline-block w-[0.55em]" />
        </span>
        <span className="absolute inset-0 whitespace-nowrap">
          {TAGLINE.slice(0, typed)}
          <Cursor still={still} />
        </span>
      </span>
    </p>
  )
}

/**
 * A hard square-wave blink rather than a fade: a terminal cursor snaps on
 * and off, and easing it makes it read as a pulsing dot instead. Held solid
 * under reduced motion, where a blink is the whole of the animation.
 */
function Cursor({ still }: { still: boolean }) {
  return (
    <motion.span
      animate={still ? { opacity: 1 } : { opacity: [1, 1, 0, 0] }}
      transition={
        still
          ? { duration: 0 }
          : { duration: 1, times: [0, 0.5, 0.5, 1], repeat: Infinity, ease: 'linear' }
      }
      className="ml-[0.1em] inline-block w-[0.55em] border-b-2 border-gilt align-baseline"
    />
  )
}

export function Splash() {
  const reduceMotion = useReducedMotion()
  const still = !!reduceMotion
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false
    if (window.location.pathname !== '/') return false
    return sessionStorage.getItem(SEEN_KEY) === null
  })

  // Marked seen on the dismissing tap, not on mount: marking it up front
  // would let a visitor who reloads mid-screen — before ever tapping — lose
  // the splash on the retry, which is not what "once per cold open" means.
  function enter() {
    sessionStorage.setItem(SEEN_KEY, '1')
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          onClick={enter}
          /*
           * Wiped away right to left rather than faded.
           *
           * A fade dissolves two screens through each other; a wipe pulls one
           * off to reveal the other, which is what actually happens here —
           * the app was behind the splash the whole time. Same `clip-path`
           * technique the search bar opens with, run in the opposite
           * direction, so the two reads as one motion language.
           */
          initial={{ clipPath: 'inset(0 0% 0 0)' }}
          exit={{ clipPath: still ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)' }}
          transition={{ duration: still ? 0 : 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[60] grid cursor-pointer place-items-center overflow-hidden bg-void"
        >
          {/* Halftone and grain, over the splash's own opaque ground. */}
          <GrainField />

          <div className="relative flex flex-col items-center">
            <Wordmark still={still} />
            <Tagline still={still} />
          </div>

          {/* Breathing rather than static, so it registers as a live prompt
              rather than a caption. Held back until the mark has assembled:
              arriving mid-reveal, it would compete with the one thing this
              screen exists to show. */}
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: still ? 0.6 : [0, 0.75, 0.35, 0.75] }}
            transition={{
              delay: still ? 0 : SETTLED,
              duration: still ? 0 : 3.2,
              repeat: still ? 0 : Infinity,
              repeatType: 'reverse',
            }}
            className="absolute inset-x-0 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-parchment/50"
            style={{ bottom: 'calc(var(--safe-b) + 4.5rem)' }}
          >
            Tap to enter
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
