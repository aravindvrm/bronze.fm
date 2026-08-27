import { useReducedMotion } from 'framer-motion'

/**
 * A drawn backdrop for the Creator profile, replacing the borrowed
 * project-cover wash.
 *
 * The profile used to blur up the first Project's cover art behind the
 * header, which meant Dean's page background was literally the Bronze album
 * art — the wrong thing to own a Creator's identity, and exactly the ambient
 * colour the monochrome palette can't survive (bronze reads as deliberate
 * only while it marks state, never atmosphere; see index.css). This is
 * neutral for the same reason: two layered grids, faded to the edges by a
 * radial mask, with a slow opacity breathe standing in for "pulsating" — no
 * colour, so it never competes with a real photo or a project's own cover.
 *
 * Two lines + two gradients is the whole cost: no blur stack, no video, no
 * download, and it holds at any viewport since it's drawn, not photographed.
 */
export function AmbientGrid() {
  const reduceMotion = useReducedMotion()
  const fade = 'radial-gradient(ellipse 70% 60% at 50% 30%, #000 0%, transparent 75%)'
  const lines =
    'repeating-linear-gradient(0deg, rgba(255,255,255,0.07) 0 1px, transparent 1px 34px), ' +
    'repeating-linear-gradient(90deg, rgba(255,255,255,0.07) 0 1px, transparent 1px 34px)'

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-void">
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
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-void/40 to-void" />
    </div>
  )
}
