/**
 * Procedural placeholder artwork.
 *
 * Deterministic SVG generated from a string seed — no downloads, no licensing,
 * and every track gets distinct-but-coherent art. Swap for real artwork by
 * changing the `art` field on a track; nothing else needs to move.
 */

/** xmur3 + mulberry32: small, deterministic, well-distributed. */
function rng(seed: string) {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = h >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Neutral range: near-black through a bright graphite highlight.
 *
 * Deliberately colourless. Artwork is the largest surface in the app, so
 * tinting it is what decides whether the whole interface reads as monochrome
 * or as a bronze wash — the accent is reserved for state, not for the art
 * behind it.
 */
const NEUTRAL = [
  '#0c0c0c',
  '#1c1c1c',
  '#2b2b2b',
  '#3a3a3a',
  '#4c4c4c',
  '#636363',
  '#8a8a8a',
  '#b4b4b4',
]

export type ArtVariant = 'cover' | 'item' | 'video' | 'store' | 'event'

export function artSvg(seed: string, variant: ArtVariant = 'item', size = 800): string {
  const r = rng(seed + variant)
  const pick = (lo: number, hi: number) => NEUTRAL[Math.floor(r() * (hi - lo + 1)) + lo]

  const uid = Math.floor(r() * 1e6).toString(36)
  const angle = Math.floor(r() * 360)
  const deep = pick(0, 1)
  const mid = pick(2, 4)
  const hot = pick(5, 7)

  // Sweeping arcs — count and geometry vary by variant.
  const bandCount = variant === 'cover' ? 5 : 3
  let bands = ''
  for (let i = 0; i < bandCount; i++) {
    const cx = r() * size
    const cy = r() * size
    const rad = size * (0.25 + r() * 0.55)
    const op = 0.1 + r() * 0.22
    const stroke = r() > 0.5 ? hot : mid
    const w = 1 + r() * (variant === 'cover' ? 40 : 18)
    bands += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${rad.toFixed(1)}" fill="none" stroke="${stroke}" stroke-width="${w.toFixed(1)}" opacity="${op.toFixed(2)}"/>`
  }

  // Off-centre light source, so the surface reads as lit rather than flat.
  const gx = (25 + r() * 50).toFixed(0)
  const gy = (20 + r() * 45).toFixed(0)

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
<defs>
  <linearGradient id="b${uid}" gradientTransform="rotate(${angle} 0.5 0.5)">
    <stop offset="0%" stop-color="${deep}"/>
    <stop offset="55%" stop-color="${mid}"/>
    <stop offset="100%" stop-color="${hot}"/>
  </linearGradient>
  <radialGradient id="g${uid}" cx="${gx}%" cy="${gy}%" r="75%">
    <stop offset="0%" stop-color="${hot}" stop-opacity="0.55"/>
    <stop offset="45%" stop-color="${mid}" stop-opacity="0.18"/>
    <stop offset="100%" stop-color="${deep}" stop-opacity="0"/>
  </radialGradient>
  <filter id="n${uid}" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="${Math.floor(r() * 999)}"/>
    <feColorMatrix type="saturate" values="0"/>
    <feComponentTransfer><feFuncA type="linear" slope="0.14"/></feComponentTransfer>
  </filter>
</defs>
<rect width="${size}" height="${size}" fill="url(#b${uid})"/>
${bands}
<rect width="${size}" height="${size}" fill="url(#g${uid})"/>
<rect width="${size}" height="${size}" filter="url(#n${uid})" opacity="0.5" style="mix-blend-mode:overlay"/>
<rect width="${size}" height="${size}" fill="${deep}" opacity="0.20"/>
</svg>`

  return svg.replace(/\n\s*/g, '')
}

/** Data URI, safe for <img src> and CSS url(). */
export function artUrl(seed: string, variant: ArtVariant = 'item', size = 800): string {
  return `data:image/svg+xml,${encodeURIComponent(artSvg(seed, variant, size))}`
}

/** Representative colour for a seed — drives per-track ambient tinting. */
export function artTint(seed: string): string {
  const r = rng(seed + 'tint')
  return NEUTRAL[3 + Math.floor(r() * 3)]
}
