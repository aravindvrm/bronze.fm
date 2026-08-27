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
 * state, never as atmosphere (see index.css). Small cells read as texture at
 * a glance rather than a drawn grid you consciously notice; two
 * repeating-gradients and two radial ones is the entire cost, so it holds at
 * any viewport with no blur stack, no video, no download.
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
      <div
        className={reduceMotion ? '' : 'animate-[pulse_7s_ease-in-out_infinite]'}
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 55% 42% at 50% 22%, rgba(255,255,255,0.05) 0%, transparent 70%)',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-void/30 to-void" />
    </div>
  )
}
