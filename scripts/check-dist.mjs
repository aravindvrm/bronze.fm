#!/usr/bin/env node
/**
 * Fails the build if anything that must never be published made it into dist/.
 *
 * This exists because it already happened: public/media/audio was a symlink to
 * the master folder, and `vite build` copies public/ into dist/, so every build
 * embedded 66 MB of unreleased audio. Deploying dist/ would have served the
 * album as plain downloadable files.
 *
 * The Vite media plugin uses apply:'serve' so it cannot run during a build, but
 * that is a convention a future change could quietly undo. This check is the
 * thing that actually holds the line.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')

const FORBIDDEN_EXT = /\.(mp3|m4a|aac|ogg|opus|wav|flac|aiff?|mov|mkv)$/i
const FORBIDDEN_NAME = /^(\.env($|\..*)|.*\.pem|.*\.key|id_rsa.*)$/i
/** Nothing in a static bundle has a legitimate reason to be this big. */
const MAX_FILE_BYTES = 8 * 1024 * 1024
const MAX_TOTAL_BYTES = 25 * 1024 * 1024

if (!fs.existsSync(dist)) {
  console.error('✗ dist/ not found — run `npm run build` first')
  process.exit(1)
}

const problems = []
let total = 0
let count = 0

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    // AppleDouble sidecars: this repo lives on an ExFAT volume, which has no
    // native xattr support, so macOS writes a ._ companion for every file.
    if (entry.name.startsWith('._')) continue

    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full)
      continue
    }

    const rel = path.relative(dist, full)
    const { size } = fs.statSync(full)
    total += size
    count++

    if (FORBIDDEN_EXT.test(entry.name)) {
      problems.push(`media file in build output: ${rel} (${(size / 1048576).toFixed(1)} MB)`)
    }
    if (FORBIDDEN_NAME.test(entry.name)) {
      problems.push(`secret-shaped file in build output: ${rel}`)
    }
    if (size > MAX_FILE_BYTES) {
      problems.push(`file over ${MAX_FILE_BYTES / 1048576} MB: ${rel} (${(size / 1048576).toFixed(1)} MB)`)
    }
  }
}

walk(dist)

// Anything VITE_-prefixed is inlined into the bundle by design; a service-role
// key reaching it would be a live credential leak on a public site.
const SECRET_PATTERNS = [
  [/service_role/i, 'service_role key reference'],
  [/sb_secret_[A-Za-z0-9_-]+/, 'Supabase secret key'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key block'],
]

function scanText(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('._')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      scanText(full)
      continue
    }
    if (!/\.(js|mjs|css|html|json|webmanifest|map)$/i.test(entry.name)) continue
    const text = fs.readFileSync(full, 'utf8')
    for (const [re, label] of SECRET_PATTERNS) {
      if (re.test(text)) problems.push(`${label} found in ${path.relative(dist, full)}`)
    }
  }
}

scanText(dist)

if (total > MAX_TOTAL_BYTES) {
  problems.push(`dist/ is ${(total / 1048576).toFixed(1)} MB, over the ${MAX_TOTAL_BYTES / 1048576} MB budget`)
}

const summary = `${count} files, ${(total / 1048576).toFixed(2)} MB`

if (problems.length) {
  console.error(`✗ dist/ check failed (${summary})\n`)
  for (const p of problems) console.error(`  · ${p}`)
  console.error('\nNothing under public/ may reference the master audio — the build copies public/ into dist/.')
  process.exit(1)
}

console.log(`✓ dist/ clean — ${summary}`)
