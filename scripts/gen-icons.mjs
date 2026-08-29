// Generates the PWA icon set from the bronze.fm mark.
//
// Source is brand/bronzefm-mark.png, drawn by scripts/gen-mark.mjs from the
// app's own font and palette. Run that first if the accent or the mark
// changes; this script only sizes and mounts what it produced.
//
// Chrome accepts SVG icons; iOS home-screen icons require PNG, so everything
// here is rasterised.
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'public', 'icons')
const source = path.join(root, 'brand', 'bronzefm-mark.png')

if (!fs.existsSync(source)) {
  console.error(`✗ missing ${path.relative(root, source)} — run: node scripts/gen-mark.mjs`)
  process.exit(1)
}

fs.mkdirSync(outDir, { recursive: true })

/**
 * The icon's ground, read from the theme rather than restated here.
 *
 * It was pinned to #0b0b0b, the app's background from an earlier dark
 * palette, and stayed dark long after the app turned light — so the icon
 * had the wrong ground and nothing said so. Reading --color-void means a
 * palette change carries the icon with it, the same rule the rest of the
 * app follows.
 */
function themeColour(name) {
  const css = fs.readFileSync(path.join(root, 'src/index.css'), 'utf8')
  const m = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{3,8})`))
  if (!m) throw new Error(`--color-${name} missing or not a hex in src/index.css`)
  const hex = m[1].slice(1)
  const full = hex.length === 3 ? [...hex].map((d) => d + d).join('') : hex
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
    alpha: 1,
  }
}

const GROUND = themeColour('void')

const { width: srcW, height: srcH } = await sharp(source).metadata()
const aspect = srcW / srcH

/**
 * Widest the logo can be at a given canvas size.
 *
 * A maskable icon may be cropped to a circle of 80% diameter, so the logo's
 * DIAGONAL — not its width — has to fit inside that circle. For a landscape
 * mark this is a much tighter bound than the usual 80% rule of thumb, and
 * getting it wrong clips the edges off the mark on Android.
 */
function logoWidth(size, maskable) {
  if (!maskable) {
    /*
     * A wide mark earns more width. The usual ~0.82 leaves a margin sized
     * for a squarish logo; on a 2.2:1 lockup that margin is dead space on
     * the sides while the glyphs — whose height is what legibility actually
     * depends on — are already small. Scaling the allowance with aspect
     * trades side margin for glyph height, capped so it never runs to the
     * very edge.
     */
    const generous = 0.82 + Math.min(0.1, (aspect - 1) * 0.06)
    return Math.round(size * Math.min(0.92, generous))
  }
  const safeDiameter = size * 0.8
  return Math.round(safeDiameter / Math.hypot(1, 1 / aspect))
}

const targets = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-maskable-512.png', size: 512, maskable: true },
  // iOS applies its own corner rounding and never treats this as maskable.
  { name: 'apple-touch-icon.png', size: 180 },
]

for (const t of targets) {
  const w = logoWidth(t.size, t.maskable)
  const logo = await sharp(source).resize({ width: w }).png().toBuffer()

  await sharp({
    create: { width: t.size, height: t.size, channels: 4, background: GROUND },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(path.join(outDir, t.name))

  console.log(`✓ ${t.name} (${t.size}px, logo ${w}px${t.maskable ? ', maskable safe zone' : ''})`)
}
