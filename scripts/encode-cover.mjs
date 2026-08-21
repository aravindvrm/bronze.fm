#!/usr/bin/env node
/**
 * Installs a cover: keeps the master, writes the web encode beside it.
 *
 *   node scripts/encode-cover.mjs <source-image> <content-slug>
 *
 * Two files land in src/assets/covers:
 *   <slug>-original.jpg   the untouched master, never imported, kept so the
 *                         web encode can be regenerated at another quality
 *   <slug>.jpg            what the app imports and the PWA precaches
 *
 * Cover art is square by convention. A non-square source is centre-cropped
 * rather than letterboxed, and the script says so instead of doing it quietly.
 */
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'src/assets/covers')

const [source, slug] = process.argv.slice(2)
if (!source || !slug) {
  console.error('usage: node scripts/encode-cover.mjs <source-image> <content-slug>')
  process.exit(1)
}
if (!fs.existsSync(source)) {
  console.error(`✗ no such file: ${source}`)
  process.exit(1)
}

/** Matches the `size` declared for real covers in src/lib/cover.ts. */
const EDGE = 1024
const QUALITY = 82

const meta = await sharp(source).metadata()
if (meta.width !== meta.height) {
  console.warn(`! source is ${meta.width}x${meta.height}, not square — centre-cropping to ${EDGE}px`)
}
if (meta.width < EDGE || meta.height < EDGE) {
  console.warn(`! source is smaller than ${EDGE}px; it will be upscaled and look soft`)
}

fs.mkdirSync(outDir, { recursive: true })

const master = path.join(outDir, `${slug}-original${path.extname(source).toLowerCase() === '.png' ? '.png' : '.jpg'}`)
fs.copyFileSync(source, master)

const web = path.join(outDir, `${slug}.jpg`)
await sharp(source)
  .resize(EDGE, EDGE, { fit: 'cover', position: 'centre' })
  .jpeg({ quality: QUALITY, mozjpeg: true })
  .toFile(web)

const mb = (p) => `${(fs.statSync(p).size / 1024).toFixed(0)} KB`
console.log(`✓ master  ${path.relative(root, master)}  ${mb(master)}`)
console.log(`✓ web     ${path.relative(root, web)}  ${mb(web)}  (${EDGE}px, q${QUALITY})`)
console.log(`\nsrc/lib/cover.ts must list "${slug}" with size ${EDGE} and type image/jpeg.`)
