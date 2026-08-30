import { useMemo, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Particles, ParticlesProvider } from '@tsparticles/react'
import { loadSlim } from '@tsparticles/slim'
import { loadLinksPreset } from '@tsparticles/preset-links'
import type { ISourceOptions } from '@tsparticles/engine'

/**
 * The drifting node network behind the splash.
 *
 * It used to sit behind the whole app. It does not any more: movement in the
 * margins of every screen is something the eye keeps returning to, and this
 * is a reading surface. On the splash there is nothing to distract FROM —
 * one mark, one line, and a tap — so the field is the screen's texture
 * rather than a competing one, and it can be drawn far stronger than it ever
 * could behind a feed.
 *
 * Particles wandering, links forming and breaking as neighbours drift in and
 * out of range, fading cleanly at the edges: that is exactly the well-trodden
 * ground tsParticles' `links` preset covers, rather than a hand-rolled canvas
 * loop reinventing it worse. `@tsparticles/slim` rather than the full engine,
 * since the links preset is all this ever needs.
 *
 * Colour comes from `--color-ambient`, which follows the accent by default,
 * so retheming the app rethemes this too.
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
 * Loads the engine, once.
 *
 * Module-level rather than written inline at the call site, and that is
 * load-bearing rather than tidiness: ParticlesProvider keeps its "engine
 * loaded" state in module globals and throws outright on a provider whose
 * init is a different function — "init callback must be stable across the
 * app lifecycle". One shared identity is what keeps a second instance legal
 * should this ever be mounted twice again.
 */
const initEngine = async (engine: Parameters<typeof loadSlim>[0]) => {
  await loadSlim(engine)
  await loadLinksPreset(engine)
}

/**
 * The net itself, with no ground and no position of its own — it fills
 * whichever positioned box it is dropped into.
 *
 * `id` must be unique per instance: tsParticles keys its containers by it,
 * and two canvases sharing a name leaves one of them blank.
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
        size: { value: { min: 1, max: 2.5 } },
        /*
         * Stronger than the old app-wide values (dots 0.12-0.32, links 0.1),
         * which were set to keep the field clear of cover art and of the
         * accent wherever it marks state — constraints that do not exist on
         * a screen holding one wordmark and one line.
         *
         * But only stronger, not loud. The first pass ran to 0.75 and the
         * net crowded the mark it is supposed to sit behind: on a field this
         * dense, opacity reads as weight, and the links compound it wherever
         * dots cluster. Visible at a glance, still plainly the background.
         */
        opacity: { value: { min: 0.22, max: 0.48 } },
        /*
         * A drift, not a motion graphic. Slower than it looks like it needs
         * to be: this sits behind everything the app asks you to read, and
         * peripheral movement is what pulls the eye off the text — the links
         * make it worse, since a whole triangle snaps into existence when two
         * dots cross the threshold. At 0.35 that was constant; at 0.12 the
         * shapes take long enough to form that they read as ambient.
         */
        move: { enable: !reduceMotion, speed: 0.12, direction: 'none', random: true, outModes: 'out' },
        links: {
          enable: true,
          distance: 110,
          color: ambient,
          opacity: 0.18,
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

