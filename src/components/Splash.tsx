import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

const SEEN_KEY = 'bronze:splash-seen'
const HOLD_MS = 1500

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
 * specific thing, usually from a shared URL, and holding that behind a timer
 * would be delay with no purpose. An installed PWA launches at start_url `/`,
 * so the normal open still gets it.
 *
 * Never starts audio: browsers require a user gesture before playback, and a
 * timed screen is not one.
 */
export function Splash() {
  const reduceMotion = useReducedMotion()
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false
    if (window.location.pathname !== '/') return false
    return sessionStorage.getItem(SEEN_KEY) === null
  })

  useEffect(() => {
    if (!visible) return
    sessionStorage.setItem(SEEN_KEY, '1')
    const timer = setTimeout(() => setVisible(false), HOLD_MS)
    return () => clearTimeout(timer)
  }, [visible])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          // Tap to skip: the hold is a flourish, never something to sit through.
          onClick={() => setVisible(false)}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.5, ease: 'easeOut' }}
          className="fixed inset-0 z-[60] grid cursor-pointer place-items-center bg-void"
        >
          <motion.div
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: reduceMotion ? 0 : 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-5"
          >
            <img
              src="/icons/icon-512.png"
              alt=""
              width={96}
              height={96}
              // Explicit dimensions so the mark cannot shift as it decodes.
              className="size-24 rounded-2xl"
            />
            <p className="font-display text-3xl tracking-tight text-parchment">
              bronze<span className="text-gilt">.fm</span>
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
