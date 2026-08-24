// Generates the PWA icon set from the bronze.fm cassette logo.
//
// Source is brand/bronzefm-logo-cutout.png — the logo with a real alpha
// channel. The original brand/bronzefm-logo.jpeg beside it is a flattened
// export whose "transparency" is a painted checkerboard, so compositing that
// directly would bake grey squares into every icon. The cutout was isolated by
// saturation (the checkerboard is neutral grey, the artwork is not), which
// survived the JPEG noise where colour-keying did not.
//
// Chrome accepts SVG icons; iOS home-screen icons require PNG, so everything
// here is rasterised.
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'public', 'icons')
const source = path.join(root, 'brand', 'bronzefm-logo-cutout.png')

if (!fs.existsSync(source)) {
  console.error(`✗ missing ${path.relative(root, source)}`)
  process.exit(1)
}

fs.mkdirSync(outDir, { recursive: true })

/** --color-void. The icon sits on the app's own background, not white. */
const VOID = { r: 0x0c, g: 0x0c, b: 0x0d, alpha: 1 }

const { width: srcW, height: srcH } = await sharp(source).metadata()
const aspect = srcW / srcH

/**
 * Widest the logo can be at a given canvas size.
 *
 * A maskable icon may be cropped to a circle of 80% diameter, so the logo's
 * DIAGONAL — not its width — has to fit inside that circle. For a landscape
 * mark this is a much tighter bound than the usual 80% rule of thumb, and
 * getting it wrong clips the ends off the cassette on Android.
 */
function logoWidth(size, maskable) {
  if (!maskable) return Math.round(size * 0.82)
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
    create: { width: t.size, height: t.size, channels: 4, background: VOID },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(path.join(outDir, t.name))

  console.log(`✓ ${t.name} (${t.size}px, logo ${w}px${t.maskable ? ', maskable safe zone' : ''})`)
}
