import { useReducedMotion } from 'framer-motion'

/**
 * The app's background, everywhere — mounted once at the App root, `fixed`
 * behind the routed content, rather than a flat void fill. Started as the
 * Creator profile's own backdrop (replacing a blurred wash of borrowed
 * project-cover art) and was promoted here once it read as the right base
 * for the whole app rather than one screen's decoration.
 *
 * Fixed, not absolute: every screen that wants it visible only has to drop
 * its own opaque background, not mount this itself. It stays put under
 * scroll too, so the vignette keeps framing the viewport rather than
 * scrolling away after the first screen's height.
 *
 * Neutral, not bronze — bronze reads as deliberate only while it marks
 * state, never as atmosphere (see index.css).
 */
export function AmbientGrid() {
  const reduceMotion = useReducedMotion()
  const fade = 'radial-gradient(ellipse 78% 62% at 50% 28%, #000 0%, transparent 78%)'
  const cell = 16
  const lines =
    `repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0 1px, transparent 1px ${cell}px), ` +
    `repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0 1px, transparent 1px ${cell}px)`

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-void">
      <div
        className="absolute inset-0"
        style={{ backgroundImage: lines, mask: fade, WebkitMask: fade }}
      />
      <DotLayers still={!!reduceMotion} fade={fade} cell={cell} />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-void/30 to-void" />
    </div>
  )
}

/**
 * Nodes lit at scattered grid intersections, each on its own breathing
 * cycle — this is the "pulsating" in AmbientGrid, not the single soft glow
 * the first pass used, which read as one wash rather than anything on the
 * grid itself.
 *
 * Three CSS background layers rather than individual dot elements: this runs
 * for as long as the app is open on every screen, unlike the splash's
 * few-second starfield, so it can't spend a DOM node and a Framer tween per
 * dot the way that did. A repeating radial-gradient draws one dot per tile
 * at zero per-dot cost; `at 0 0` anchors that dot to the tile's corner
 * rather than its centre, which is what lands it exactly on a grid
 * intersection rather than floating mid-cell. Each layer sits on a different
 * offset of the same lattice (still every intersection a multiple of `cell`)
 * and pulses on its own duration and delay, so the sky of dots breathes
 * asynchronously instead of in lockstep.
 */
function DotLayers({ still, fade, cell }: { still: boolean; fade: string; cell: number }) {
  const spacing = cell * 3
  const layers = [
    { x: 0, y: 0, opacity: 0.6, duration: 5, delay: 0 },
    { x: cell, y: cell * 2, opacity: 0.45, duration: 7, delay: 1.6 },
    { x: cell * 2, y: cell, opacity: 0.4, duration: 6, delay: 3.1 },
  ]

  return (
    <>
      {layers.map((l, i) => (
        <div
          key={i}
          // Tailwind's built-in pulse keyframe (2s default); duration and
          // delay are overridden per layer via inline style, the same way
          // the grid lines' mask is set inline rather than as a class.
          className={still ? '' : 'animate-pulse'}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `radial-gradient(circle at 0 0, rgba(255,255,255,${l.opacity}) 0.9px, rgba(255,255,255,0) 1.6px)`,
            backgroundSize: `${spacing}px ${spacing}px`,
            backgroundPosition: `${l.x}px ${l.y}px`,
            mask: fade,
            WebkitMask: fade,
            animationDuration: `${l.duration}s`,
            animationDelay: `${l.delay}s`,
          }}
        />
      ))}
    </>
  )
}
