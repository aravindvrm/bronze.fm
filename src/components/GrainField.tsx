import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'

/**
 * The splash's backdrop: a halftone screen under film grain.
 *
 * Replaces the linked-dot particle network, which read as dated — that
 * constellation-with-lines effect is a decade-old web idiom and puts the app
 * in the wrong era before a word is read. This is the other kind of dot: a
 * print screen, the rosette you see when you put a loupe on a magazine.
 * Static as a form, so it dates far less readily, and it belongs to the same
 * world as the mono type and the hard accent block in the mark.
 *
 * Hand-rolled on a 2D canvas rather than pulled from a library. It is two
 * loops and a noise tile; the particle library was 40 KB to draw a thing this
 * app no longer wants.
 *
 * Two layers:
 *
 *   HALFTONE  a dot grid on a rotated screen angle, dot size driven by a
 *             slow-moving field. Where the field is strong the dots swell
 *             and merge; where it is weak they shrink to nothing. That
 *             gradient IS the image — there is no underlying picture.
 *   GRAIN     fine noise over the top, resampled each frame. Film grain
 *             rather than a static texture: the flicker is what stops the
 *             halftone from reading as a flat printed sheet.
 *
 * The centre is deliberately cleared, so the wordmark sits on white and the
 * texture builds toward the edges.
 */

/** Halftone cell pitch, in CSS pixels. Tighter reads as finer stock. */
const PITCH = 9
/** Classic screen angle. Off-axis so the grid never aligns with the type. */
const ANGLE = (15 * Math.PI) / 180
const COS = Math.cos(ANGLE)
const SIN = Math.sin(ANGLE)
/** Edge of one square of pre-generated noise, in device pixels. */
const GRAIN_TILE = 128
/**
 * Film runs at 24; grain sampled much above ~15 stops reading as grain and
 * starts to shimmer. It also sets the halftone's cadence, which is fine —
 * the field moves slowly enough that the step is invisible.
 */
const FPS = 15

/**
 * Resolves a theme token to concrete channel values.
 *
 * A canvas needs numbers, not `var(--color-ambient)`. Reading the custom
 * property directly returns the *specified* text, which for a token defined
 * as another token is the literal string "var(--color-gilt)" — painting it
 * onto a probe and reading the computed colour is what forces the cascade to
 * resolve it, and is why this follows a palette change rather than freezing
 * whatever colour it was written with.
 */
function resolveToken(token: string): [number, number, number] | null {
  if (typeof window === 'undefined') return null
  const probe = document.createElement('span')
  probe.style.cssText = `color: var(${token}); position: absolute; visibility: hidden`
  document.body.appendChild(probe)
  const resolved = getComputedStyle(probe).color
  probe.remove()
  const parts = resolved.match(/[\d.]+/g)
  if (!parts || parts.length < 3) return null
  return [Number(parts[0]), Number(parts[1]), Number(parts[2])]
}

/** Hermite ramp — 0 below `a`, 1 above `b`, eased in between. */
function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export function GrainField() {
  const ref = useRef<HTMLCanvasElement>(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const accent = resolveToken('--color-ambient')
    // No token, no field. Naming a fallback colour here would be naming one
    // outside the palette — the single thing this file must not do.
    if (!ctx || !accent) return
    const [r, g, b] = accent

    // Retina is worth it for the grain, which is the one layer whose whole
    // character is per-pixel. Capped at 2: a 3x phone would triple the fill
    // cost of every frame for a texture nobody can resolve at that density.
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    /*
     * One square of noise, generated once and tiled. Regenerating full-screen
     * noise every frame is the naive version of this and costs a megapixel of
     * random() per frame; a tile plus a random offset per frame is visually
     * identical, because grain has no structure to give the repeat away.
     */
    const tile = document.createElement('canvas')
    tile.width = tile.height = GRAIN_TILE
    const tileCtx = tile.getContext('2d')
    if (!tileCtx) return
    const noise = tileCtx.createImageData(GRAIN_TILE, GRAIN_TILE)
    for (let i = 0; i < noise.data.length; i += 4) {
      noise.data[i] = r
      noise.data[i + 1] = g
      noise.data[i + 2] = b
      // Sparse and uneven: most pixels carry nothing, a few carry a little.
      noise.data[i + 3] = Math.random() < 0.5 ? 0 : Math.random() * 46
    }
    tileCtx.putImageData(noise, 0, 0)
    const grain = ctx.createPattern(tile, 'repeat')

    let width = 0
    let height = 0
    const resize = () => {
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
    }
    resize()

    const draw = (time: number) => {
      if (!width || !height) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)

      // ── Halftone ──────────────────────────────────────────────────────
      ctx.save()
      ctx.rotate(ANGLE)
      /*
       * Rotating the grid means the visible rectangle no longer sits inside
       * the grid's own bounds, so the loop covers a square of the diagonal
       * and runs from its negative half. Cheaper than clipping each cell.
       */
      const reach = Math.hypot(width, height)
      const t = time / 1000
      for (let y = -reach; y < reach; y += PITCH) {
        for (let x = -reach; x < reach; x += PITCH) {
          /*
           * Into screen space, to sample the field where the dot actually
           * lands. The context is already rotated by +ANGLE, so this applies
           * that same rotation — NOT its inverse. Getting the sign wrong
           * culls a rectangle at the wrong angle, which shows up as the
           * texture ending along a hard diagonal.
           */
          const sx = x * COS - y * SIN
          const sy = x * SIN + y * COS
          if (sx < -PITCH || sy < -PITCH || sx > width + PITCH || sy > height + PITCH) continue

          const nx = sx / width
          const ny = sy / height

          /*
           * The "image" the screen is reproducing. Mostly a constant — the
           * composition comes from the centre clearing below, not from here
           * — with two slow sine terms riding on top at scales that never
           * repeat in step, so the texture breathes without ever showing a
           * period. Weighted low so neither term can carve a diagonal band
           * across the screen, which is what an evenly-weighted pair did.
           */
          const field =
            0.66 +
            0.16 * Math.sin(nx * 3.4 + t * 0.09) * Math.cos(ny * 2.6 - t * 0.07) +
            0.1 * Math.sin((nx + ny) * 4.4 - t * 0.05)

          // Clears the middle of the screen for the wordmark. Elliptical
          // rather than round because the viewport is tall.
          const dx = nx - 0.5
          const dy = (ny - 0.5) * 0.62
          const open = smoothstep(0.14, 0.5, Math.hypot(dx, dy))

          const coverage = field * open
          if (coverage <= 0.02) continue

          const radius = coverage * PITCH * 0.46
          if (radius < 0.18) continue

          // Roughly half the first pass, which sat at 0.62/0.5. A halftone
          // gets its weight from coverage as much as from ink: the dots
          // nearly touch at this pitch, so alpha that reads as restrained on
          // one dot reads as a solid wash across a few thousand.
          ctx.globalAlpha = Math.min(0.3, coverage * 0.34)
          ctx.fillStyle = `rgb(${r} ${g} ${b})`
          ctx.beginPath()
          ctx.arc(x, y, radius, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.restore()

      // ── Grain ─────────────────────────────────────────────────────────
      if (grain) {
        ctx.save()
        ctx.globalAlpha = 0.34
        // A fresh offset each frame is what makes one tile read as moving
        // grain rather than as wallpaper.
        ctx.translate(-Math.random() * GRAIN_TILE, -Math.random() * GRAIN_TILE)
        ctx.fillStyle = grain
        ctx.fillRect(0, 0, width + GRAIN_TILE, height + GRAIN_TILE)
        ctx.restore()
      }
    }

    const observer = new ResizeObserver(() => {
      resize()
      draw(0)
    })
    observer.observe(canvas)

    // Reduced motion gets the texture, held still. The point of the setting
    // is the movement, not the picture — a printed page does not animate.
    if (reduceMotion) {
      draw(0)
      return () => observer.disconnect()
    }

    let raf = 0
    let last = 0
    const loop = (time: number) => {
      raf = requestAnimationFrame(loop)
      if (time - last < 1000 / FPS) return
      last = time
      draw(time)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [reduceMotion])

  return (
    <canvas
      ref={ref}
      data-testid="splash-field"
      aria-hidden
      className="pointer-events-none absolute inset-0 size-full"
    />
  )
}
