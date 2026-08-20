// Symlinks the (gitignored) master audio folder into public/ so Vite can serve
// it in dev. The audio never enters git; this link is gitignored too.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = path.join(root, 'Bronze')
const destDir = path.join(root, 'public', 'media')
const dest = path.join(destDir, 'audio')

if (!fs.existsSync(src)) {
  console.error(`✗ No audio at ${src}`)
  process.exit(1)
}
fs.mkdirSync(destDir, { recursive: true })
try {
  if (fs.lstatSync(dest)) fs.unlinkSync(dest)
} catch {
  /* not present */
}
fs.symlinkSync(src, dest, 'dir')
console.log(`✓ public/media/audio → ${path.relative(root, src)}`)
