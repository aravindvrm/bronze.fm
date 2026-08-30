// .docx → DocBlock[].
//
// Reads the XML directly rather than taking a converter dependency: a Word
// document is a zip of XML, and the subset that matters here is small enough
// that a converter would bring a large surface for a narrow job.
//
// What this reads that the first version did not — every one of these was
// silently discarded before, and the table case was the dangerous one,
// because it did not fail. `<w:p>` matches paragraphs ANYWHERE, cells
// included, so a table quietly decomposed into a run of loose paragraphs in
// reading order: plausible-looking nonsense with no error anywhere.
//
//   bold / italic     runs carry their own emphasis
//   hyperlinks        resolved through document.xml.rels to real URLs
//   ordered lists     numbering.xml decides bullet vs decimal
//   tables            read as tables, and no longer flattened into prose
//
// Still not read: embedded images. Extracting them means unpacking the media
// parts and uploading them somewhere the app can serve, which is a storage
// decision rather than a parsing one. They are COUNTED and reported at the
// end of an import rather than passing in silence — a document that loses its
// figures should say so.
import fs from 'node:fs'
import zlib from 'node:zlib'
import { safeHref } from './html.mjs'

/**
 * Minimal zip reader — pulls one member out of the archive by name.
 *
 * Sizes come from the CENTRAL DIRECTORY, not the local file header. When a
 * writer streams an entry it sets the data-descriptor flag and leaves the
 * local header's sizes as zero, filling them in after the payload; trusting
 * them yields an empty body and an inflate error. Word writes this way.
 */
export function readZipEntry(file, wanted) {
  const buf = fs.readFileSync(file)

  let eocd = -1
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd === -1) throw new Error(`${file} is not a zip archive`)

  const count = buf.readUInt16LE(eocd + 10)
  let p = buf.readUInt32LE(eocd + 16)

  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break
    const method = buf.readUInt16LE(p + 10)
    const compSize = buf.readUInt32LE(p + 20)
    const nameLen = buf.readUInt16LE(p + 28)
    const extraLen = buf.readUInt16LE(p + 30)
    const commentLen = buf.readUInt16LE(p + 32)
    const offset = buf.readUInt32LE(p + 42)
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen)

    if (name === wanted) {
      const localExtra = buf.readUInt16LE(offset + 28)
      const localName = buf.readUInt16LE(offset + 26)
      const start = offset + 30 + localName + localExtra
      const body = buf.subarray(start, start + compSize)
      return method === 0 ? body.toString('utf8') : zlib.inflateRawSync(body).toString('utf8')
    }
    p += 46 + nameLen + extraLen + commentLen
  }
  return null
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

function decode(text) {
  return text
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&(amp|lt|gt|quot|apos);/g, (_, e) => ENTITIES[e])
}

/**
 * The spans of one paragraph.
 *
 * A Word paragraph is a sequence of runs, each with its own properties, and
 * a hyperlink is a wrapper carrying a relationship id rather than a URL — the
 * URL lives in a separate parts file, which is why `rels` has to be passed
 * in. Runs that end up styled the same are merged, so a paragraph Word split
 * at every spell-check boundary does not become forty spans.
 */
function spansOfParagraph(xml, rels) {
  /*
   * Which runs are inside a hyperlink, learned first.
   *
   * A `<w:hyperlink>` wraps its runs and carries a relationship id, not a
   * URL — the URL lives in document.xml.rels. Runs are then read in document
   * order and looked up here, rather than pulling the links out and
   * concatenating them separately, which would reorder a paragraph that
   * mixes linked and plain text.
   */
  const linked = new Map()
  for (const [, id, inner] of xml.matchAll(
    /<w:hyperlink[^>]*r:id="([^"]+)"[^>]*>([\s\S]*?)<\/w:hyperlink>/g,
  )) {
    const href = safeHref(rels[id] ?? '')
    if (href) for (const run of inner.match(/<w:r[ >][\s\S]*?<\/w:r>/g) ?? []) linked.set(run, href)
  }

  const spans = []
  for (const run of xml.match(/<w:r[ >][\s\S]*?<\/w:r>/g) ?? []) {
    const [span] = runsOf(run)
    if (!span) continue
    const href = linked.get(run)
    spans.push(href ? { ...span, href } : span)
  }

  return merge(spans)
}

/** One or more `<w:r>` elements → spans, with their own emphasis. */
function runsOf(xml) {
  const out = []
  for (const run of xml.match(/<w:r[ >][\s\S]*?<\/w:r>/g) ?? []) {
    const props = /<w:rPr>[\s\S]*?<\/w:rPr>/.exec(run)?.[0] ?? ''
    // `<w:b/>` sets bold; `<w:b w:val="0"/>` explicitly clears it, which a
    // naive presence check would read as bold.
    const on = (tag) =>
      new RegExp(`<w:${tag}(?:\\s[^>]*)?/>`).test(props) &&
      !new RegExp(`<w:${tag}[^>]*w:val="(?:0|false)"`).test(props)

    const withBreaks = run.replace(/<w:tab[^>]*\/>/g, ' ').replace(/<w:br[^>]*\/>/g, ' ')
    const text = decode(
      [...withBreaks.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((m) => m[1]).join(''),
    )
    if (!text) continue

    const span = { text }
    if (on('b')) span.strong = true
    if (on('i')) span.em = true
    out.push(span)
  }
  return out
}

function merge(spans) {
  const out = []
  for (const span of spans) {
    const last = out[out.length - 1]
    if (last && last.strong === span.strong && last.em === span.em && last.href === span.href) {
      last.text += span.text
    } else {
      out.push({ ...span })
    }
  }
  return out
    .map((s) => ({ ...s, text: s.text.replace(/\s+/g, ' ') }))
    .filter((s) => s.text.trim() !== '')
}

/**
 * numId → 'decimal' | 'bullet'.
 *
 * Word stores the list FORMAT one indirection away: a paragraph names a
 * numId, numbering.xml maps that to an abstractNumId, and the abstract
 * definition holds the numFmt per level. Without following it, every list is
 * a guess — which is how ordered lists used to come out as bullets.
 */
function numberingFormats(xml) {
  if (!xml) return {}
  const abstract = {}
  for (const [, id, body] of xml.matchAll(
    /<w:abstractNum[^>]*w:abstractNumId="(\d+)"[^>]*>([\s\S]*?)<\/w:abstractNum>/g,
  )) {
    // Level 0 is the one a flat list uses.
    const lvl = /<w:lvl[^>]*w:ilvl="0"[^>]*>([\s\S]*?)<\/w:lvl>/.exec(body)?.[1] ?? body
    abstract[id] = /<w:numFmt[^>]*w:val="bullet"/.test(lvl) ? 'bullet' : 'decimal'
  }
  const byNum = {}
  for (const [, numId, body] of xml.matchAll(
    /<w:num[^>]*w:numId="(\d+)"[^>]*>([\s\S]*?)<\/w:num>/g,
  )) {
    const abstractId = /<w:abstractNumId[^>]*w:val="(\d+)"/.exec(body)?.[1]
    byNum[numId] = abstract[abstractId] ?? 'bullet'
  }
  return byNum
}

export function docxToBlocks(file) {
  const xml = readZipEntry(file, 'word/document.xml')
  if (!xml) throw new Error('word/document.xml missing — not a .docx?')

  const relsXml = readZipEntry(file, 'word/_rels/document.xml.rels') ?? ''
  const rels = {}
  for (const [, id, target] of relsXml.matchAll(
    /<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g,
  )) {
    rels[id] = decode(target)
  }
  const formats = numberingFormats(readZipEntry(file, 'word/numbering.xml'))

  const body = /<w:body>([\s\S]*)<\/w:body>/.exec(xml)?.[1] ?? xml
  const images = (body.match(/<w:drawing>/g) ?? []).length

  /*
   * Split the body into TOP-LEVEL parts before reading paragraphs.
   *
   * This is the fix for the table bug: matching `<w:p>` across the whole
   * document catches the paragraphs inside every table cell too, in reading
   * order, with nothing to say they were ever a table. Tables are lifted out
   * first so their paragraphs are only ever read as cells.
   */
  const parts = []
  const tablePattern = /<w:tbl>[\s\S]*?<\/w:tbl>/g
  let cursor = 0
  for (const match of body.matchAll(tablePattern)) {
    if (match.index > cursor) parts.push({ type: 'flow', xml: body.slice(cursor, match.index) })
    parts.push({ type: 'table', xml: match[0] })
    cursor = match.index + match[0].length
  }
  parts.push({ type: 'flow', xml: body.slice(cursor) })

  const raw = []
  for (const part of parts) {
    if (part.type === 'table') {
      const rows = []
      for (const [, rowXml] of part.xml.matchAll(/<w:tr[ >]([\s\S]*?)<\/w:tr>/g)) {
        const cells = []
        for (const [, cellXml] of rowXml.matchAll(/<w:tc>([\s\S]*?)<\/w:tc>/g)) {
          const spans = merge(
            (cellXml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? []).flatMap((p) =>
              spansOfParagraph(p, rels),
            ),
          )
          const span = Number(/<w:gridSpan[^>]*w:val="(\d+)"/.exec(cellXml)?.[1] ?? 0)
          cells.push(span > 1 ? { spans, span } : { spans })
        }
        if (cells.length) rows.push(cells)
      }
      if (rows.length) {
        // Word marks a repeating header row with tblHeader; failing that, the
        // first row is treated as one only when the table has more than one.
        const headed = /<w:tblHeader[^>]*\/>/.test(part.xml) || rows.length > 1
        raw.push(
          headed ? { kind: 'table', head: rows[0], rows: rows.slice(1) } : { kind: 'table', rows },
        )
      }
      continue
    }

    for (const p of part.xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? []) {
      const spans = spansOfParagraph(p, rels)
      const style = /<w:pStyle w:val="([^"]+)"/.exec(p)?.[1] ?? ''

      if (!spans.length) continue

      const heading = /^Heading(\d)$/.exec(style)
      if (heading) {
        raw.push({
          kind: 'h',
          level: Math.min(Number(heading[1]), 3),
          text: spans
            .map((s) => s.text)
            .join('')
            .trim(),
        })
        continue
      }
      if (/^(Quote|IntenseQuote|BlockText)$/.test(style)) {
        raw.push({ kind: 'quote', spans })
        continue
      }
      if (p.includes('<w:numPr>')) {
        const numId = /<w:numId[^>]*w:val="(\d+)"/.exec(p)?.[1]
        raw.push({ kind: 'li', ordered: formats[numId] === 'decimal', spans })
        continue
      }
      raw.push({ kind: 'p', spans })
    }
  }

  // Consecutive list items become one list, so the reader emits a single
  // <ul>/<ol> rather than a run of one-item lists. A change of kind starts a
  // new one: a bulleted list directly under a numbered one is two lists.
  const blocks = []
  for (const block of raw) {
    const last = blocks[blocks.length - 1]
    const wanted = block.kind === 'li' ? (block.ordered ? 'ol' : 'ul') : null
    if (wanted && last?.kind === wanted) last.items.push(block.spans)
    else if (wanted) blocks.push({ kind: wanted, items: [block.spans] })
    else blocks.push(block)
  }

  return { blocks, images }
}
