import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Wordmark } from '@/components/Wordmark'

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
 * Tap-gated, not timed — the mechanic the per-release splash used to have
 * before the platform restructure folded it into this one global screen.
 * Nobody is forced to sit through the animation on a length someone else
 * chose; "Tap to enter" says explicitly what the gesture does, since a
 * silent full-bleed scene with no timer and no visible action would leave a
 * visitor unsure whether tapping does anything at all.
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
        className={`size-full rounded-full ${still ? '' : 'animate-[spin_6s_linear_infinite]'}`}
        style={{
          // Brighter and more of the ring lit than the first pass: at 18s a
          // rotation barely moved during the splash's ~2s hold, so slowing
          // was never the problem — too little of the ring glowed at once
          // to read as motion even once it sped up. More arc lit plus a
          // hotter peak makes the spin itself the thing you see, not an
          // inference from a sliver sweeping past.
          background:
            'conic-gradient(from 0deg, rgba(205,127,50,0) 0deg, #cd7f32 20deg, #fff1d6 60deg, #f0d3a8 100deg, #cd7f32 150deg, rgba(205,127,50,0.35) 210deg, rgba(205,127,50,0.08) 280deg, rgba(205,127,50,0) 340deg, rgba(205,127,50,0) 360deg)',
          mask: ring,
          WebkitMask: ring,
        }}
      />
    </div>
  )
}

/**
 * The starfield twinkles rather than sitting static — each star breathes
 * opacity on its own cycle, offset so the sky never pulses in unison. Driven
 * by Framer rather than a CSS @keyframes block, matching how the rest of
 * this screen is animated; 70-odd opacity tweens is cheap next to the disc's
 * own gradient repaints.
 */
function Starfield({ still }: { still: boolean }) {
  return (
    <svg className="absolute inset-0 size-full" aria-hidden>
      {STARS.map(([x, y, r, o, dur, delay], i) => (
        <motion.circle
          key={i}
          cx={`${x}%`}
          cy={`${y}%`}
          r={r}
          fill="#fff"
          initial={{ opacity: o }}
          animate={still ? { opacity: o } : { opacity: [o, o * 0.15, o] }}
          transition={{ duration: dur, delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </svg>
  )
}

function AccretionDisc({ still }: { still: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden">
      <Starfield still={still} />

      {/* Warm haze the disc sits in, so the black centre has something to
          eat into rather than meeting a flat background. */}
      <div
        className="absolute size-[140%] opacity-70"
        style={{
          background:
            'radial-gradient(ellipse 46% 30% at 50% 50%, rgba(205,127,50,0.38) 0%, rgba(205,127,50,0.10) 45%, rgba(0,0,0,0) 70%)',
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
            '0 0 2px 2px rgba(250,225,190,1), 0 0 40px 12px rgba(205,127,50,0.55), inset 0 0 18px 3px rgba(0,0,0,1)',
          background: '#000',
        }}
      />

      <Disc still={still} nearSide />
    </div>
  )
}

/**
 * Deterministic, so the sky is identical on every open — position, size and
 * opacity as before, plus a per-star twinkle duration and phase offset drawn
 * from the same PRNG so the cycle is stable too, not re-rolled on rerender.
 */
const STARS: [number, number, number, number, number, number][] = Array.from(
  { length: 70 },
  (_, i) => {
    const a = Math.sin(i * 12.9898) * 43758.5453
    const b = Math.sin(i * 78.233) * 12345.6789
    const c = Math.sin(i * 3.1415) * 9876.5432
    const d = Math.sin(i * 45.164) * 5678.1234
    const frac = (n: number) => n - Math.floor(n)
    return [
      Math.round(frac(a) * 1000) / 10,
      Math.round(frac(b) * 1000) / 10,
      Math.round((0.5 + frac(c) * 1.1) * 10) / 10,
      Math.round((0.25 + frac(a + b) * 0.7) * 100) / 100,
      Math.round((1.8 + frac(c + d) * 2.6) * 10) / 10,
      Math.round(frac(d) * 30) / 10,
    ]
  },
)

export function Splash() {
  const reduceMotion = useReducedMotion()
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
          transition={{ duration: reduceMotion ? 0 : 0.6, ease: 'easeOut' }}
          className="fixed inset-0 z-[60] cursor-pointer overflow-hidden bg-void"
        >
          <AccretionDisc still={!!reduceMotion} />

          <motion.div
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduceMotion ? 0 : 0.35, duration: reduceMotion ? 0 : 1, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-x-0 grid place-items-center gap-7"
            style={{ bottom: 'calc(var(--safe-b) + 4.5rem)' }}
          >
            <Wordmark centered className="text-2xl" />

            {/* Breathing rather than static, so it registers as a live
                prompt rather than a caption — the same treatment the
                per-release splash used for this exact line. */}
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: reduceMotion ? 0.6 : [0, 0.75, 0.35, 0.75] }}
              transition={{
                delay: reduceMotion ? 0 : 1.1,
                duration: reduceMotion ? 0 : 3.2,
                repeat: reduceMotion ? 0 : Infinity,
                repeatType: 'reverse',
              }}
              className="text-[10px] uppercase tracking-[0.3em] text-parchment/50"
            >
              Tap to enter
            </motion.span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
