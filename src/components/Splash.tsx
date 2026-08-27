import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Wordmark } from '@/components/Wordmark'

const SEEN_KEY = 'bronze:splash-seen'
const HOLD_MS = 2200

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

/**
 * The accretion disc, drawn rather than filmed.
 *
 * This is CSS and SVG — a few hundred bytes that scale to any screen, cache
 * with the shell, cost no download and no video decode, and tint from the
 * palette. A 4K wallpaper loop would have been ~1.2 MB after transcoding,
 * would decode video on a phone for a two-second screen, and would fix the
 * artwork at one resolution.
 *
 * The disc is the one place bronze appears at full strength, which is the
 * point: it is the app's only colour, so the first thing a visitor sees is
 * the thing that identifies it.
 */
/**
 * One face of the disc: a conic sweep masked into a ring, laid into
 * perspective and spun. `nearSide` keeps only the half that passes in front
 * of the shadow. Both copies share the same animation parameters, so they
 * stay one object rather than drifting apart.
 */
function Disc({ still, nearSide = false }: { still: boolean; nearSide?: boolean }) {
  const ring =
    'radial-gradient(circle, transparent 56%, #000 58%, #000 92%, transparent 97%)'
  return (
    <div
      className="absolute size-[min(78vw,26rem)]"
      style={{
        transform: 'rotateX(74deg)',
        ...(nearSide ? { clipPath: 'inset(50% 0 0 0)' } : null),
      }}
    >
      <div
        className={`size-full rounded-full ${still ? '' : 'animate-[spin_18s_linear_infinite]'}`}
        style={{
          background:
            'conic-gradient(from 0deg, rgba(205,127,50,0) 0deg, #cd7f32 40deg, #f0d3a8 78deg, #cd7f32 120deg, rgba(205,127,50,0.25) 190deg, rgba(205,127,50,0) 300deg, rgba(205,127,50,0) 360deg)',
          mask: ring,
          WebkitMask: ring,
        }}
      />
    </div>
  )
}

function AccretionDisc({ still }: { still: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden">
      {/* Starfield: fixed positions so it reads as a sky rather than noise. */}
      <svg className="absolute inset-0 size-full opacity-70" aria-hidden>
        {STARS.map(([x, y, r, o], i) => (
          <circle key={i} cx={`${x}%`} cy={`${y}%`} r={r} fill="#fff" opacity={o} />
        ))}
      </svg>

      {/* Warm haze the disc sits in, so the black centre has something to
          eat into rather than meeting a flat background. */}
      <div
        className="absolute size-[140%] opacity-60"
        style={{
          background:
            'radial-gradient(ellipse 42% 26% at 50% 50%, rgba(205,127,50,0.30) 0%, rgba(205,127,50,0.07) 45%, rgba(0,0,0,0) 70%)',
        }}
      />

      {/*
        The disc is drawn TWICE around the sphere, and that is what makes it
        a black hole rather than a ringed planet: the far side passes behind
        the shadow, the near side in front of it. A single ring always reads
        as Saturn, because nothing ever crosses the sphere.
        `clip-path` is applied in the element's own coordinates before the
        transform, so clipping the local bottom half yields exactly the near
        side once it is laid down in perspective.
      */}
      <Disc still={still} />

      {/* Photon ring — the bright edge light that reads as gravity, and the
          shadow it wraps. */}
      <div
        className="absolute size-[min(30vw,10rem)] rounded-full"
        style={{
          boxShadow:
            '0 0 1px 1px rgba(240,211,168,0.9), 0 0 26px 7px rgba(205,127,50,0.4), inset 0 0 18px 3px rgba(0,0,0,1)',
          background: '#000',
        }}
      />

      <Disc still={still} nearSide />
    </div>
  )
}

/** Deterministic, so the sky is identical on every open. */
const STARS: [number, number, number, number][] = Array.from({ length: 60 }, (_, i) => {
  const a = Math.sin(i * 12.9898) * 43758.5453
  const b = Math.sin(i * 78.233) * 12345.6789
  const c = Math.sin(i * 3.1415) * 9876.5432
  const frac = (n: number) => n - Math.floor(n)
  return [
    Math.round(frac(a) * 1000) / 10,
    Math.round(frac(b) * 1000) / 10,
    Math.round((0.5 + frac(c) * 1.1) * 10) / 10,
    Math.round((0.25 + frac(a + b) * 0.7) * 100) / 100,
  ]
})

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
          transition={{ duration: reduceMotion ? 0 : 0.6, ease: 'easeOut' }}
          className="fixed inset-0 z-[60] cursor-pointer overflow-hidden bg-void"
        >
          <AccretionDisc still={!!reduceMotion} />

          <motion.div
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduceMotion ? 0 : 0.35, duration: reduceMotion ? 0 : 1, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-x-0 grid place-items-center"
            style={{ bottom: 'calc(var(--safe-b) + 4.5rem)' }}
          >
            <Wordmark centered className="text-2xl" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
