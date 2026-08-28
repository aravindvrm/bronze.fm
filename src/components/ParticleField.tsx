import { useMemo } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Particles, ParticlesProvider } from '@tsparticles/react'
import { loadSlim } from '@tsparticles/slim'
import { loadLinksPreset } from '@tsparticles/preset-links'
import type { ISourceOptions } from '@tsparticles/engine'

/**
 * The app's background, everywhere — mounted once at the App root, `fixed`
 * behind the routed content. Replaces the drawn dot-grid: that read as a
 * repeating pattern rather than the organic drifting node network it was
 * meant to evoke, and getting the real thing by hand — particles wandering,
 * links forming and breaking as neighbours drift in and out of range,
 * fading cleanly at the edges — is exactly the well-trodden ground
 * tsParticles' `links` preset already covers, at ~387k weekly downloads and
 * actively maintained, rather than a hand-rolled canvas loop reinventing it
 * worse.
 *
 * `@tsparticles/slim` rather than the full engine: this only ever needs the
 * links preset, and slim is the trimmed build meant for exactly that.
 *
 * A dull, desaturated blue — bronze's complement, not a second accent: kept
 * dim and low-saturation enough that it reads as atmosphere sitting behind
 * the app rather than competing with bronze (the one accent colour that
 * actually marks state) or with real cover art.
 */
export function ParticleField() {
  const reduceMotion = useReducedMotion()
  // Looser than the first pass, which cropped most of a tall phone viewport
  // away — this covers the visible screen and only fades right at its edges.
  const fade = 'radial-gradient(ellipse 92% 88% at 50% 42%, #000 0%, transparent 92%)'

  const options: ISourceOptions = useMemo(
    () => ({
      background: { color: 'transparent' },
      fpsLimit: 30,
      detectRetina: true,
      fullScreen: { enable: false },
      // Purely decorative — a background must never intercept the taps and
      // scrolls meant for the screen it sits behind.
      interactivity: { events: { onHover: { enable: false }, onClick: { enable: false } } },
      particles: {
        /*
         * `density`'s built-in scaling divides by a fixed reference area
         * (its own default is a wide, roughly-desktop 800×800-ish canvas),
         * so on this app's actual canvas — a tall, narrow phone viewport,
         * about a third of that reference area — it quietly diluted 42
         * particles down to barely a dozen, most of them outside the
         * visible screen. Density is off here and the count is instead the
         * number actually wanted on a phone-sized field; it will look
         * emptier on the wide desktop layout, which is the direction this
         * should err in rather than the reverse.
         */
        number: { value: 90, density: { enable: false } },
        shape: { type: 'circle' },
        color: { value: '#7a93ab' },
        size: { value: { min: 1, max: 2 } },
        opacity: { value: { min: 0.12, max: 0.32 } },
        move: { enable: !reduceMotion, speed: 0.35, direction: 'none', random: true, outModes: 'out' },
        links: {
          enable: true,
          distance: 110,
          color: '#7a93ab',
          opacity: 0.1,
          width: 1,
        },
      },
    }),
    [reduceMotion],
  )

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-void">
      <div className="absolute inset-0" style={{ mask: fade, WebkitMask: fade }}>
        <ParticlesProvider
          init={async (engine) => {
            await loadSlim(engine)
            await loadLinksPreset(engine)
          }}
        >
          <Particles id="app-field" options={options} className="size-full" />
        </ParticlesProvider>
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-void/30 to-void" />
    </div>
  )
}
