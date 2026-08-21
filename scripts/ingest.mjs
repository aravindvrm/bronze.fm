#!/usr/bin/env node
/**
 * Uploads the local masters to Supabase and writes the rows that describe
 * them — the step that makes the Supabase-backed adapter (rather than local
 * fixtures) have anything to show.
 *
 * Ground truth for titles, ordering and credits is bronze.generated.ts, not
 * the raw filenames — that file already carries the cleaned titles and the
 * hashes computed from the actual bytes (`npm run fixtures` produces it).
 * This script re-hashes each file itself before upload and refuses to
 * proceed on a mismatch, so a stale generated file can't silently ship wrong
 * data.
 *
 * Runs with the service-role key. Never invoked from the browser, never
 * committed with a real key in it.
 *
 * Usage: SUPABASE_SERVICE_ROLE_KEY=... node scripts/ingest.mjs [--publish]
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const audioDir = path.join(root, 'Bronze')
const PUBLISH = process.argv.includes('--publish')

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('✗ set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (service role, not anon) before running.')
  process.exit(1)
}
if (!fs.existsSync(audioDir)) {
  console.error(`✗ no local masters at ${path.relative(root, audioDir)} — nothing to ingest.`)
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

// Ground truth is the JSON manifest, not the .ts fixture: that file uses
// TypeScript-only syntax (`import type`) which a plain `node script.mjs`
// cannot parse. gen-fixtures.mjs writes both from the same data, so there is
// still exactly one source of truth for "what this album's tracklist is".
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, 'src/content/fixtures/bronze.manifest.json'), 'utf8'),
)
const dean = manifest.creator
const bronze = manifest

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 16)
}

async function upsertCreator() {
  const { data, error } = await sb
    .from('creators')
    .upsert({ slug: dean.slug, name: dean.name, tier: dean.tier }, { onConflict: 'slug' })
    .select()
    .single()
  if (error) throw new Error(`creator upsert failed: ${error.message}`)
  return data
}

async function uploadAsset(creatorRow, item, localPath) {
  const actualHash = sha256(localPath)
  if (actualHash !== item.hash) {
    throw new Error(
      `hash mismatch for "${item.title}": generated fixture says ${item.hash}, file on disk hashes to ${actualHash}. ` +
        `Run "npm run fixtures" to regenerate before ingesting.`,
    )
  }

  const storagePath = `${dean.slug}/${bronze.slug}/audio/${actualHash}.mp3`

  // Content-addressed: if this exact path is already uploaded, the bytes
  // cannot have changed (the hash is in the path), so re-uploading is a no-op
  // that only costs an API round trip — cheap, and it makes the script safe
  // to re-run.
  const { data: existing } = await sb.storage.from('media').list(path.dirname(storagePath), {
    search: path.basename(storagePath),
  })
  if (!existing?.length) {
    const bytes = fs.readFileSync(localPath)
    const { error: upErr } = await sb.storage
      .from('media')
      .upload(storagePath, bytes, { contentType: 'audio/mpeg', upsert: false })
    if (upErr) throw new Error(`upload failed for ${storagePath}: ${upErr.message}`)
  }

  const { data: asset, error } = await sb
    .from('assets')
    .upsert(
      {
        creator_id: creatorRow.id,
        kind: 'audio',
        storage_path: storagePath,
        content_hash: actualHash,
        bytes: item.bytes,
        mime: 'audio/mpeg',
        duration_ms: item.durationMs,
      },
      { onConflict: 'creator_id,content_hash,kind' },
    )
    .select()
    .single()
  if (error) throw new Error(`asset upsert failed for "${item.title}": ${error.message}`)
  return asset
}

async function upsertContent(creatorRow) {
  const { data, error } = await sb
    .from('content')
    .upsert(
      {
        owner_creator_id: creatorRow.id,
        type: bronze.type,
        slug: bronze.slug,
        title: bronze.title,
        published: PUBLISH,
      },
      { onConflict: 'owner_creator_id,slug' },
    )
    .select()
    .single()
  if (error) throw new Error(`content upsert failed: ${error.message}`)
  return data
}

async function upsertItem(contentRow, creatorRow, item, asset) {
  const { error } = await sb.from('content_items').upsert(
    {
      content_id: contentRow.id,
      creator_id: creatorRow.id,
      position: item.position,
      title: item.title,
      is_interlude: item.isInterlude,
      media_asset_id: asset.id,
    },
    { onConflict: 'content_id,position' },
  )
  if (error) throw new Error(`content_items upsert failed for "${item.title}": ${error.message}`)
}

async function upsertContentCredits(contentRow, creatorRow) {
  for (const credit of bronze.credits) {
    if (credit.creatorSlug !== dean.slug) continue // only Creator we have rows for
    const { error } = await sb.from('content_creators').upsert(
      { content_id: contentRow.id, creator_id: creatorRow.id, role: credit.role },
      { onConflict: 'content_id,creator_id,role' },
    )
    if (error) throw new Error(`content_creators upsert failed: ${error.message}`)
  }
}

console.log(`Ingesting "${bronze.title}" (${bronze.items.length} items)${PUBLISH ? ' — publishing' : ' — staying unpublished'}`)

const creatorRow = await upsertCreator()
const contentRow = await upsertContent(creatorRow)
await upsertContentCredits(contentRow, creatorRow)

let done = 0
for (const item of bronze.items) {
  const filename = decodeURIComponent(item.url.split('/').pop())
  const localPath = path.join(audioDir, filename)
  if (!fs.existsSync(localPath)) throw new Error(`missing local file for "${item.title}": ${filename}`)

  const asset = await uploadAsset(creatorRow, item, localPath)
  await upsertItem(contentRow, creatorRow, item, asset)
  done++
  console.log(`  ✓ [${item.position}/${bronze.items.length}] ${item.title}`)
}

console.log(`\n✓ ${done} items ingested for ${dean.slug}/${bronze.slug}.`)
if (!PUBLISH) {
  console.log('  content.published = false — invisible to anon until re-run with --publish.')
}
