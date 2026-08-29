import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

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
 * `.FM` carries the accent, the same split the static Wordmark uses
 * everywhere else in the app: the mark is the one piece of chrome always
 * allowed to be a colour.
 */
const LETTERS = [
  { char: 'B', axis: 'y', from: -40 },
  { char: 'R', axis: 'y', from: 40 },
  { char: 'O', axis: 'x', from: -40 },
  { char: 'N', axis: 'x', from: 40 },
  { char: 'Z', axis: 'y', from: -40 },
  { char: 'E', axis: 'y', from: 40 },
  { char: '.', axis: 'x', from: -40, accent: true },
  { char: 'F', axis: 'x', from: 40, accent: true },
  { char: 'M', axis: 'y', from: -40, accent: true },
] as const

const STEP = 0.15
const REVEAL = 1.5
/** When the last letter has settled, so the prompt follows rather than
 *  competing with the animation it belongs to. */
const SETTLED = STEP * LETTERS.length + REVEAL * 0.55

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
      className="flex select-none font-display text-[clamp(2rem,12vw,5rem)] font-bold leading-none tracking-[0.06em]"
    >
      {LETTERS.map(({ char, axis, from, ...rest }, i) => {
        const accent = 'accent' in rest && rest.accent
        return (
          <motion.span
            key={i}
            aria-hidden
            // `false` skips the enter animation outright, so reduced motion
            // gets the finished mark rather than a faster version of the
            // same movement.
            initial={still ? false : { opacity: 0, [axis]: from }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{
              delay: still ? 0 : STEP * (i + 1),
              duration: still ? 0 : REVEAL,
              ease: [0.16, 1, 0.3, 1],
            }}
            className={`inline-block ${accent ? 'text-gilt' : 'text-parchment'}`}
          >
            {char}
          </motion.span>
        )
      })}
    </div>
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
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: still ? 0 : 0.6, ease: 'easeOut' }}
          className="fixed inset-0 z-[60] grid cursor-pointer place-items-center overflow-hidden bg-void"
        >
          <Wordmark still={still} />

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
