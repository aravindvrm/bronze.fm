// Renders the bronze.fm app mark to brand/bronzefm-mark.png.
//
// The mark is "B" beside the accent block carrying ".FM", on one line — the
// wordmark abbreviated to what survives at 32px, since the full BRONZE.FM
// lockup is illegible at favicon size.
//
// A single line is about 2.1:1, so it sits as a band inside a square icon
// rather than filling it. Spacing is therefore as tight as the mark will
// take — minimal gap, minimal block padding — and gen-icons.mjs lets a wide
// mark run nearer the icon's edge than a square one, so the glyphs come out
// as large as the shape allows.
//
// Rendered in a browser rather than composed in sharp, because the glyphs
// must be real Geist: sharp rasterises SVG through librsvg, which resolves
// fonts via fontconfig, and Geist is a woff2 inside this repo rather than a
// font installed on the machine. A browser loads it the same way the app
// does, so the icon and the header wordmark are drawn from one source of
// truth. Run rarely; the PNG is committed.
//
//   node scripts/gen-mark.mjs
//
// Colours are read from src/index.css so the mark cannot drift from the
// palette — the whole point of the token block is that this is the only
// place the accent is written down.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const css = fs.readFileSync(path.join(root, 'src/index.css'), 'utf8')

/** Pulls a colour token out of the theme block, so this never hard-codes one. */
function token(name) {
  const m = css.match(new RegExp(`--color-${name}:\\s*([^;]+);`))
  if (!m) throw new Error(`--color-${name} missing from src/index.css`)
  return m[1].trim()
}

const ACCENT = token('gilt')
const INK = token('parchment')
const ON_ACCENT = token('on-accent')

const fontData = fs
  .readFileSync(path.join(root, 'src/assets/fonts/geist-latin.woff2'))
  .toString('base64')

// 1024px of type: far larger than any icon, so every downscale is a
// reduction and never an enlargement.
const SIZE = 1024

const html = `<!doctype html><meta charset="utf-8">
<style>
  @font-face {
    font-family: 'Geist';
    font-weight: 100 900;
    src: url(data:font/woff2;base64,${fontData}) format('woff2');
  }
  html, body { margin: 0; background: transparent; }
  /*
    Same weight and the same block treatment the Wordmark component uses, so
    the icon is the app's own mark rather than a lookalike — only the
    arrangement differs, for the reason at the top of this file.
  */
  .mark {
    display: inline-flex;
    align-items: baseline;
    font-family: 'Geist';
    font-weight: 700;
    font-size: ${SIZE}px;
    line-height: 1;
    letter-spacing: -0.03em;
  }
  .b { color: ${INK}; }
  .badge {
    /* Tighter than the header wordmark's block. Every 0.01em of padding here
       widens the lockup, and width is what costs glyph height once this is
       fitted into a square. */
    margin-left: 0.06em;
    padding: 0.08em 0.1em;
    letter-spacing: -0.01em;
    background: ${ACCENT};
    color: ${ON_ACCENT};
  }
</style>
<div class="mark"><span class="b">B</span><span class="badge">.FM</span></div>`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 4000, height: 2000 } })
await page.setContent(html)
await page.evaluate(() => document.fonts.ready)
const shot = await page.locator('.mark').screenshot({ omitBackground: true })
await browser.close()

// Trim to the ink itself. The icon pipeline owns all margins, so anything
// left here would be counted twice and shrink the mark inside every icon.
const out = path.join(root, 'brand', 'bronzefm-mark.png')
fs.mkdirSync(path.dirname(out), { recursive: true })
await sharp(shot).trim().png().toFile(out)

const { width, height } = await sharp(out).metadata()
console.log(`✓ brand/bronzefm-mark.png — ${width}×${height} (aspect ${(width / height).toFixed(2)})`)
console.log(`  accent ${ACCENT} · ink ${INK} · on-accent ${ON_ACCENT}, all read from src/index.css`)
