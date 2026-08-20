#!/usr/bin/env node
/**
 * Synthesises stand-in audio for CI.
 *
 * The masters are gitignored, so CI has no media — but the browser tests need
 * real, decodable audio at the exact paths the fixtures reference, otherwise
 * playback, seeking and Range handling cannot be exercised at all.
 *
 * Silent MP3s are generated at each item's real duration, so duration
 * assertions hold while nothing of the album is shipped or committed.
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = path.join(root, 'src/content/fixtures/bronze.manifest.json')
const outDir = path.join(root, 'Bronze')

if (!fs.existsSync(manifestPath)) {
  console.error(`✗ ${path.relative(root, manifestPath)} not found — run \`npm run fixtures\` first`)
  process.exit(1)
}

const { items } = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
fs.mkdirSync(outDir, { recursive: true })

let made = 0
let skipped = 0

for (const item of items) {
  // The fixture URL is /media/audio/<encoded filename>.
  const filename = decodeURIComponent(item.url.split('/').pop())
  const dest = path.join(outDir, filename)

  if (fs.existsSync(dest)) {
    skipped++
    continue
  }

  const seconds = Math.max(1, item.durationMs / 1000).toFixed(3)
  const channels = item.channels === 1 ? 'mono' : 'stereo'
  execFileSync(
    'ffmpeg',
    [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-f', 'lavfi',
      '-i', `anullsrc=r=${item.sampleRate}:cl=${channels}`,
      '-t', seconds,
      '-b:a', '128k',
      dest,
    ],
    { stdio: 'inherit' },
  )
  made++
}

console.log(`✓ stand-in audio ready — ${made} generated, ${skipped} already present`)
