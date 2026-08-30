import { useMemo, useState } from 'react'
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
 * Colour comes from `--color-ambient`, which follows the accent by default,
 * so retheming the app rethemes the field behind it. It is drawn at 10-32%
 * opacity, which is what keeps it atmosphere rather than a second accent
 * competing with the one that marks state, or with real cover art.
 */

/**
 * Resolves a theme token to a literal colour.
 *
 * tsParticles paints to a canvas, so it needs a concrete value — it cannot
 * take `var(--color-ambient)`. Reading the custom property directly would
 * hand back the *specified* text, which for a token defined as another
 * token is the string "var(--color-gilt)". Painting it onto a probe and
 * reading the computed colour is what forces the cascade to resolve it, and
 * is why the field follows a palette change rather than freezing whatever
 * colour it was written with.
 */
function resolveToken(token: string): string {
  // 'transparent' rather than a literal fallback colour: if the token cannot
  // be read, the field simply does not draw. Naming a colour here would be
  // naming one outside the palette, which is the thing this whole file is
  // being careful about — and it would be the one that survives a retheme.
  if (typeof window === 'undefined') return 'transparent'
  const probe = document.createElement('span')
  probe.style.cssText = `color: var(${token}); position: absolute; visibility: hidden`
  document.body.appendChild(probe)
  const resolved = getComputedStyle(probe).color
  probe.remove()
  return resolved || 'transparent'
}

/**
 * Loads the engine, once for the whole app.
 *
 * Module-level rather than written inline at the call site, and this is
 * load-bearing rather than tidiness: ParticlesProvider keeps its "engine
 * loaded" state in module globals, and a second provider mounting with a
 * DIFFERENT init function throws outright — "init callback must be stable
 * across the app lifecycle". Two providers sharing this one identity is
 * exactly the case it allows, which is what lets the splash carry its own
 * canvas alongside the global field.
 */
const initEngine = async (engine: Parameters<typeof loadSlim>[0]) => {
  await loadSlim(engine)
  await loadLinksPreset(engine)
}

/**
 * The drifting net itself, without a ground or a position of its own.
 *
 * Extracted so the splash can carry the same field as the app behind it. The
 * splash sits above the routed content and must stay opaque — going
 * transparent would reveal the feed rather than the background — so it needs
 * its own copy over its own ground rather than a hole punched through to the
 * global one.
 *
 * `id` must differ per instance: tsParticles keys its containers by it, and
 * two canvases sharing a name leaves one of them blank.
 */
export function ParticleCanvas({ id }: { id: string }) {
  const reduceMotion = useReducedMotion()
  // Read once on mount: the palette is a build-time constant today, and
  // re-reading per render would touch the DOM on every frame the app draws.
  const [ambient] = useState(() => resolveToken('--color-ambient'))
  /*
   * A MASK, not a colour: only the alpha channel matters here, so the black
   * is opacity 1 and never paints. Deliberately not a theme token.
   *
   * Centred, and large enough that the falloff only bites at the very edges.
   * It used to sit at 50% 42% — biased toward the top — which, together with
   * the overlay below, is why the field appeared to stop halfway down the
   * page.
   */
  const fadeMask = 'radial-gradient(ellipse 105% 100% at 50% 50%, #000 55%, transparent 100%)'

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
        /*
         * `paint.color`, NOT `color`.
         *
         * The engine renamed it in v4, and `IParticlesOptions` carries an
         * index signature — so a stray `color` key type-checks, loads
         * silently, and leaves the dots on their default #fff. On a white
         * ground that is invisible: the field was reduced to its links
         * alone, which is why it read as barely there.
         */
        paint: { color: { value: ambient } },
        size: { value: { min: 1, max: 2 } },
        opacity: { value: { min: 0.12, max: 0.32 } },
        move: { enable: !reduceMotion, speed: 0.35, direction: 'none', random: true, outModes: 'out' },
        links: {
          enable: true,
          distance: 110,
          color: ambient,
          opacity: 0.1,
          width: 1,
        },
      },
    }),
    [reduceMotion, ambient],
  )

  return (
    <div className="absolute inset-0" style={{ mask: fadeMask, WebkitMask: fadeMask }}>
      <ParticlesProvider init={initEngine}>
        <Particles id={id} options={options} className="size-full" />
      </ParticlesProvider>
    </div>
  )
}

/**
 * The app's background, mounted once at the App root and sitting behind the
 * routed content.
 *
 * No vertical overlay: there used to be one calming the foot of the screen
 * behind the docked player, but any such gradient veils one end toward the
 * page ground and leaves the other bare, which reads — correctly — as the
 * field being darker at the top. The mini player carries its own translucent
 * ground and never needed it.
 */
export function ParticleField() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-void">
      <ParticleCanvas id="app-field" />
    </div>
  )
}
