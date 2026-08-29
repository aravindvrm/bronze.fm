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
 * The disc is the one place the accent appears at full strength, which is
 * the point: it is the app's only colour, so the first thing a visitor sees
 * is the thing that identifies it.
 */
/**
 * One ring's shape and motion. Every ring still tilts on X — that's the axis
 * the near/far crossing trick depends on (see `Disc` below) — but each also
 * carries its own static Y and Z tilt, so the set reads as several rings
 * strewn around the sphere at different angles rather than concentric
 * copies of one plane. All colour stays inside the accent family (the
 * app's one colour, per `ParticleField`) — these vary temperature and depth
 * within it, from a hot pale peak down to a low oxblood glow, rather than
 * introducing a second hue.
 */
interface RingSpec {
  size: string
  rotateX: number
  rotateY: number
  rotateZ: number
  duration: number
  reverse?: boolean
  /** Where the lit band sits, as a percent of the disc's radius — narrow
   *  for a thin line of light rather than a broad glowing belt. */
  band: [number, number]
  gradient: string
}

const RINGS: RingSpec[] = [
  {
    size: 'min(78vw,26rem)',
    rotateX: 74,
    rotateY: 0,
    rotateZ: 0,
    duration: 6,
    band: [58, 63],
    gradient:
      'conic-gradient(from 0deg, rgba(201,44,16,0) 0deg, #c92c10 20deg, #ffece4 60deg, #f0a894 100deg, #c92c10 150deg, rgba(201,44,16,0.35) 210deg, rgba(201,44,16,0.08) 280deg, rgba(201,44,16,0) 340deg, rgba(201,44,16,0) 360deg)',
  },
  {
    size: 'min(64vw,21.5rem)',
    rotateX: 58,
    rotateY: 14,
    rotateZ: 30,
    duration: 9,
    reverse: true,
    band: [61, 65],
    gradient:
      'conic-gradient(from 40deg, rgba(240,163,148,0) 0deg, #f0a394 30deg, #ffffff 70deg, #fadcd5 110deg, #e07f6a 160deg, rgba(240,163,148,0.3) 220deg, rgba(240,163,148,0.06) 290deg, rgba(240,163,148,0) 350deg, rgba(240,163,148,0) 360deg)',
  },
  {
    size: 'min(94vw,31rem)',
    rotateX: 80,
    rotateY: -10,
    rotateZ: -20,
    duration: 13,
    band: [63.5, 66.5],
    gradient:
      'conic-gradient(from 200deg, rgba(122,26,12,0) 0deg, #7a1a0c 25deg, #cc5f48 65deg, #9c3520 105deg, #7a1a0c 150deg, rgba(122,26,12,0.3) 215deg, rgba(122,26,12,0.06) 285deg, rgba(122,26,12,0) 345deg, rgba(122,26,12,0) 360deg)',
  },
  {
    size: 'min(52vw,17.5rem)',
    rotateX: 48,
    rotateY: 18,
    rotateZ: 45,
    duration: 7.5,
    reverse: true,
    band: [59.5, 63],
    gradient:
      'conic-gradient(from 110deg, rgba(224,110,86,0) 0deg, #e06e56 25deg, #fff4f0 65deg, #f8cec2 110deg, #b8452c 155deg, rgba(224,110,86,0.3) 215deg, rgba(224,110,86,0.06) 285deg, rgba(224,110,86,0) 345deg, rgba(224,110,86,0) 360deg)',
  },
]

/**
 * One face of one ring: a conic sweep masked into a thin band, laid into
 * perspective and spun. `nearSide` keeps only the half that passes in front
 * of the shadow. Both copies of a ring share the same spec, so they stay one
 * object rather than drifting apart.
 *
 * The clip is cut from the element's own untransformed box, before any
 * transform is applied — so it's judged purely against `rotateX`, the axis
 * actually responsible for which half reads as nearer. Writing `rotateX`
 * last in the transform list keeps it the innermost (first-applied)
 * rotation; the ring's own Y/Z tilt then just carries that already-correct
 * split along for the ride, rather than re-splitting the shape.
 */
function Disc({ ring, still, nearSide = false }: { ring: RingSpec; still: boolean; nearSide?: boolean }) {
  const [bandIn, bandOut] = ring.band
  const mask = `radial-gradient(circle, transparent ${bandIn - 1.5}%, #000 ${bandIn}%, #000 ${bandOut}%, transparent ${bandOut + 1.5}%)`
  return (
    <div
      className="absolute"
      style={{
        width: ring.size,
        height: ring.size,
        transform: `rotateZ(${ring.rotateZ}deg) rotateY(${ring.rotateY}deg) rotateX(${ring.rotateX}deg)`,
        ...(nearSide ? { clipPath: 'inset(50% 0 0 0)' } : null),
      }}
    >
      <div
        className="size-full rounded-full"
        style={{
          background: ring.gradient,
          mask,
          WebkitMask: mask,
          animation: still
            ? undefined
            : `spin ${ring.duration}s linear infinite${ring.reverse ? ' reverse' : ''}`,
        }}
      />
    </div>
  )
}

/**
 * Fine dust suspended in light, not stars in a night sky — white specks read
 * as a hole in the page against this ground, so the same twinkle mechanic
 * now draws in ink instead, kept faint enough to read as texture rather than
 * print debris. Each speck still breathes opacity on its own cycle, offset
 * so the field never pulses in unison. Driven by Framer rather than a CSS
 * @keyframes block, matching how the rest of this screen is animated;
 * 70-odd opacity tweens is cheap next to the disc's own gradient repaints.
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
          fill="#111111"
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
          eat into rather than meeting a flat white background. */}
      <div
        className="absolute size-[140%] opacity-60"
        style={{
          background:
            'radial-gradient(ellipse 46% 30% at 50% 50%, rgba(201,44,16,0.28) 0%, rgba(201,44,16,0.08) 45%, rgba(201,44,16,0) 70%)',
        }}
      />

      {/*
        Each ring is drawn TWICE around the sphere, and that is what makes it
        a black hole rather than a ringed planet: the far side passes behind
        the shadow, the near side in front of it. A single ring always reads
        as Saturn, because nothing ever crosses the sphere. Far copies of
        every ring go down first, then the shadow, then every near copy —
        so a nearer ring's far half never wrongly draws over a farther
        ring's near half.
      */}
      {RINGS.map((ring, i) => (
        <Disc key={`far-${i}`} ring={ring} still={still} />
      ))}

      {/* Photon ring — the bright edge light that reads as gravity, and the
          shadow it wraps. */}
      <div
        className="absolute size-[min(30vw,10rem)] rounded-full"
        style={{
          boxShadow:
            '0 0 2px 2px rgba(255,240,235,1), 0 0 40px 12px rgba(201,44,16,0.5), inset 0 0 18px 3px rgba(0,0,0,1)',
          background: '#000',
        }}
      />

      {RINGS.map((ring, i) => (
        <Disc key={`near-${i}`} ring={ring} still={still} nearSide />
      ))}
    </div>
  )
}

/**
 * Deterministic, so the field is identical on every open — position and
 * size as before; opacity rescaled down from the old white-on-black range
 * (up to 0.95) to one that reads as faint ink texture on a white ground
 * rather than print debris — plus a per-speck twinkle duration and phase
 * offset drawn from the same PRNG so the cycle is stable too, not re-rolled
 * on rerender.
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
      Math.round((0.05 + frac(a + b) * 0.22) * 100) / 100,
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
