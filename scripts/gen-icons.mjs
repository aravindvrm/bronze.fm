// Rasterises the procedural cover art into PWA icons.
// Chrome accepts SVG icons; iOS home-screen icons require PNG.
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'public', 'icons')
fs.mkdirSync(outDir, { recursive: true })

// Mirrors src/lib/art.ts so the icon matches the in-app cover.
const BRONZE = ['#1a0f07', '#3d2614', '#6b4423', '#9c6b34', '#cd7f32', '#d9a05b', '#e8c48a', '#f5e3c0']

function icon(size, { maskable = false } = {}) {
  // Maskable icons need their content inside a safe circle of 80% diameter.
  const pad = maskable ? size * 0.1 : 0
  const inner = size - pad * 2
  const r = inner * 0.5
  const cx = size / 2
  const cy = size / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${BRONZE[1]}"/>
      <stop offset="55%" stop-color="${BRONZE[4]}"/>
      <stop offset="100%" stop-color="${BRONZE[6]}"/>
    </linearGradient>
    <radialGradient id="s" cx="35%" cy="28%" r="70%">
      <stop offset="0%" stop-color="${BRONZE[7]}" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="${BRONZE[0]}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="${BRONZE[0]}"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#g)"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#s)"/>
  <circle cx="${cx}" cy="${cy}" r="${r * 0.62}" fill="none" stroke="${BRONZE[0]}" stroke-opacity="0.35" stroke-width="${size * 0.02}"/>
  <circle cx="${cx}" cy="${cy}" r="${r * 0.1}" fill="${BRONZE[0]}" fill-opacity="0.55"/>
</svg>`
}

const targets = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-maskable-512.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180 },
]

for (const t of targets) {
  const svg = Buffer.from(icon(t.size, { maskable: t.maskable }))
  await sharp(svg).png().toFile(path.join(outDir, t.name))
  console.log(`✓ ${t.name} (${t.size}px)`)
}
