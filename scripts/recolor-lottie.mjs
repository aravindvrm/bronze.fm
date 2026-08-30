#!/usr/bin/env node
/**
 * Remaps every fill/stroke color in a Lottie JSON onto the bronze palette.
 *
 *   node scripts/recolor-lottie.mjs <source.json> <output.json>
 *
 * Built for stock Lottie loaders, which are almost always exported with an
 * arbitrary demo colorway (often a rainbow sweep) that has nothing to do with
 * the app it ends up in. This walks every shape layer in original order,
 * finds each solid fill/stroke color (`ty: 'fl' | 'st'`), and replaces it
 * with a color sampled from the same *position* along a bronze gradient —
 * preserving whatever per-layer sweep/stagger the animation used, just
 * recast into the app's palette instead of the original hue.
 *
 * Deliberately narrow in scope: this only handles the case a stock loader
 * actually is — solid per-shape colors, no gradients-within-a-shape, no
 * animated color keyframes, no embedded raster assets. It refuses rather
 * than silently mishandling anything outside that.
 */
import fs from 'node:fs'
import path from 'node:path'

const [srcPath, outPath] = process.argv.slice(2)
if (!srcPath || !outPath) {
  console.error('usage: node scripts/recolor-lottie.mjs <source.json> <output.json>')
  process.exit(1)
}

// Matches --color-antique / --color-bronze / --color-brass / --color-gilt in
// src/index.css. Update both places together if the palette ever changes.
const STOPS = ['#6b4423', '#cd7f32', '#d9a05b', '#e8c48a'].map(hexToRgb01)

function hexToRgb01(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

/** Position t (0..1) along a multi-stop gradient. */
function sampleGradient(stops, t) {
  const segs = stops.length - 1
  const scaled = Math.min(Math.max(t, 0), 1) * segs
  const i = Math.min(Math.floor(scaled), segs - 1)
  const local = scaled - i
  const [r0, g0, b0] = stops[i]
  const [r1, g1, b1] = stops[i + 1]
  return [lerp(r0, r1, local), lerp(g0, g1, local), lerp(b0, b1, local)]
}

let solidColorsSeen = 0
let touched = 0
let refused = false

/** Collects every solid fl/st color node in layer order, deepest-first walk. */
function collectColorNodes(shapes, out) {
  for (const sh of shapes) {
    if (sh.ty === 'fl' || sh.ty === 'st') {
      const c = sh.c
      if (!c || !Array.isArray(c.k)) continue
      solidColorsSeen++
      if (c.k.length && typeof c.k[0] === 'object') {
        // Animated color keyframes — outside this script's scope.
        refused = true
        continue
      }
      out.push(c)
    }
    if (sh.ty === 'gr' && Array.isArray(sh.it)) {
      collectColorNodes(sh.it, out)
    }
  }
}

const data = JSON.parse(fs.readFileSync(srcPath, 'utf8'))
if (Array.isArray(data.assets) && data.assets.some((a) => a.p || a.u)) {
  console.error(
    '✗ this file references embedded/raster assets — recoloring text alone will not touch those.',
  )
  process.exit(1)
}

const nodes = []
for (const layer of data.layers ?? []) {
  if (Array.isArray(layer.shapes)) collectColorNodes(layer.shapes, nodes)
}

if (refused) {
  console.error('✗ found an animated color property (color changes over time within one shape).')
  console.error(
    '  This script only remaps static per-shape colors. Refusing rather than half-recoloring.',
  )
  process.exit(1)
}
if (nodes.length === 0) {
  console.error('✗ no solid fill/stroke colors found — nothing to recolor.')
  process.exit(1)
}

nodes.forEach((c, i) => {
  const t = nodes.length > 1 ? i / (nodes.length - 1) : 0
  const [r, g, b] = sampleGradient(STOPS, t)
  const alpha = c.k[3] ?? 1
  c.k = [Number(r.toFixed(4)), Number(g.toFixed(4)), Number(b.toFixed(4)), alpha]
  touched++
})

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(data))
console.log(`✓ recolored ${touched}/${solidColorsSeen} solid colors → ${outPath}`)
