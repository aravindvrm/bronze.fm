import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

/**
 * What just happened to the text size.
 *
 * The gesture had no feedback beyond the text itself reflowing, which is the
 * vaguest possible signal: the page repaginates, everything moves, and it is
 * genuinely hard to tell whether you changed the size by one step, by two, or
 * at all. A ladder of four marks answers all three at once — which step you
 * are on, how many there are, and that something registered.
 *
 * It appears on change and leaves on its own. A control that stayed would be
 * the permanent chrome the gestures exist to avoid.
 */
export function SizeHint({ level, of }: { level: number | null; of: number }) {
  const reduceMotion = useReducedMotion()

  return (
    <AnimatePresence>
      {level !== null && (
        <motion.div
          // `key` on the level so a second step re-runs the entrance rather
          // than sitting still: without it, stepping twice in quick
          // succession looks identical to stepping once.
          key={level}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.18 }}
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3 border border-parchment/20 bg-void px-6 py-5 shadow-xl shadow-shade"
        >
          <div className="flex items-baseline gap-1 text-parchment">
            <span className="text-sm">A</span>
            <span className="text-2xl">A</span>
          </div>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: of }, (_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full transition-all ${
                  i <= level ? 'w-5 bg-gilt' : 'w-2 bg-parchment/20'
                }`}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
