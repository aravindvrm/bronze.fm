import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { marked } from 'marked'
import { htmlToBlocks, safeHref } from './html.mjs'
import { docxToBlocks } from './docx.mjs'

/**
 * The import path is the one place a document can be silently mangled.
 *
 * Every case here is something the previous importer got wrong without
 * failing: a table flattened into loose prose, a numbered list turned into
 * bullets, emphasis and links dropped on the floor. Silent wrongness is
 * exactly what a test is for — nothing about the resulting page looks broken.
 */

// ── A .docx, built by hand ───────────────────────────────────────────────
// Word documents are zips of XML. Rather than commit a binary fixture nobody
// can read or amend, each test writes the exact XML it means to exercise into
// a STORED (uncompressed) zip, which is a format short enough to emit here
// and which the parser reads by the same path as a real file.

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function storedZip(entries) {
  const locals = []
  const central = []
  let offset = 0

  for (const [name, content] of Object.entries(entries)) {
    const nameBuf = Buffer.from(name, 'utf8')
    const body = Buffer.from(content, 'utf8')
    const sum = crc32(body)

    const local = Buffer.alloc(30 + nameBuf.length)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0, 8) // stored
    local.writeUInt32LE(sum, 14)
    local.writeUInt32LE(body.length, 18)
    local.writeUInt32LE(body.length, 22)
    local.writeUInt16LE(nameBuf.length, 26)
    nameBuf.copy(local, 30)
    locals.push(local, body)

    const dir = Buffer.alloc(46 + nameBuf.length)
    dir.writeUInt32LE(0x02014b50, 0)
    dir.writeUInt16LE(20, 6)
    dir.writeUInt16LE(0, 10) // stored
    dir.writeUInt32LE(sum, 16)
    dir.writeUInt32LE(body.length, 20)
    dir.writeUInt32LE(body.length, 24)
    dir.writeUInt16LE(nameBuf.length, 28)
    dir.writeUInt32LE(offset, 42)
    nameBuf.copy(dir, 46)
    central.push(dir)

    offset += local.length + body.length
  }

  const dirBuf = Buffer.concat(central)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(central.length, 8)
  end.writeUInt16LE(central.length, 10)
  end.writeUInt32LE(dirBuf.length, 12)
  end.writeUInt32LE(offset, 16)

  return Buffer.concat([...locals, dirBuf, end])
}

function writeDocx(bodyXml, extra = {}) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'docx-')), 'test.docx')
  fs.writeFileSync(
    file,
    storedZip({
      'word/document.xml': `<?xml version="1.0"?><w:document><w:body>${bodyXml}</w:body></w:document>`,
      ...extra,
    }),
  )
  return file
}

const run = (text, props = '') =>
  `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}<w:t>${text}</w:t></w:r>`
const para = (inner, props = '') => `<w:p>${props ? `<w:pPr>${props}</w:pPr>` : ''}${inner}</w:p>`

describe('docx import', () => {
  /**
   * The bug this exists for. The old parser matched `<w:p>` across the whole
   * document, so the paragraphs inside every table cell came out as loose
   * paragraphs in reading order — a table silently became prose that looked
   * like the author had written it that way.
   */
  it('reads a table as a table, not as scrambled prose', () => {
    const cell = (text) => `<w:tc>${para(run(text))}</w:tc>`
    const file = writeDocx(
      para(run('Before the table.')) +
        `<w:tbl>` +
        `<w:tr>${cell('Region')}${cell('Q1')}</w:tr>` +
        `<w:tr>${cell('North')}${cell('12')}</w:tr>` +
        `</w:tbl>` +
        para(run('After the table.')),
    )

    const { blocks } = docxToBlocks(file)
    expect(blocks.map((b) => b.kind)).toEqual(['p', 'table', 'p'])

    const table = blocks[1]
    expect(table.head.map((c) => c.spans[0].text)).toEqual(['Region', 'Q1'])
    expect(table.rows).toHaveLength(1)
    expect(table.rows[0].map((c) => c.spans[0].text)).toEqual(['North', '12'])
  })

  it('keeps bold and italic, and ignores a run that explicitly clears them', () => {
    const file = writeDocx(
      para(
        run('plain ') +
          run('bold', '<w:b/>') +
          run(' and ') +
          run('italic', '<w:i/>') +
          run(' and ') +
          run('neither', '<w:b w:val="0"/>'),
      ),
    )
    const { blocks } = docxToBlocks(file)
    expect(blocks[0].spans).toEqual([
      { text: 'plain ' },
      { text: 'bold', strong: true },
      { text: ' and ' },
      { text: 'italic', em: true },
      { text: ' and neither' },
    ])
  })

  it('resolves a hyperlink through the relationships part', () => {
    const file = writeDocx(
      para(run('See ') + `<w:hyperlink r:id="rId7">${run('the source')}</w:hyperlink>` + run('.')),
      {
        'word/_rels/document.xml.rels': `<Relationships><Relationship Id="rId7" Target="https://example.com/paper" /></Relationships>`,
      },
    )
    const { blocks } = docxToBlocks(file)
    expect(blocks[0].spans).toEqual([
      { text: 'See ' },
      { text: 'the source', href: 'https://example.com/paper' },
      { text: '.' },
    ])
  })

  /**
   * Word puts the list format two indirections away — numId to
   * abstractNumId to numFmt — so without following it every list is a guess.
   * The old importer guessed "bullet" every time.
   */
  it('tells an ordered list from a bulleted one', () => {
    const numbering = `<w:numbering>
      <w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:numFmt w:val="decimal"/></w:lvl></w:abstractNum>
      <w:abstractNum w:abstractNumId="2"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/></w:lvl></w:abstractNum>
      <w:num w:numId="10"><w:abstractNumId w:val="1"/></w:num>
      <w:num w:numId="20"><w:abstractNumId w:val="2"/></w:num>
    </w:numbering>`
    const item = (text, numId) => para(run(text), `<w:numPr><w:numId w:val="${numId}"/></w:numPr>`)

    const file = writeDocx(item('First', 10) + item('Second', 10) + item('Bullet', 20), {
      'word/numbering.xml': numbering,
    })
    const { blocks } = docxToBlocks(file)
    expect(blocks.map((b) => b.kind)).toEqual(['ol', 'ul'])
    expect(blocks[0].items).toHaveLength(2)
    expect(blocks[1].items).toHaveLength(1)
  })

  it('counts embedded images rather than dropping them in silence', () => {
    const file = writeDocx(para(`<w:r><w:drawing></w:drawing></w:r>`) + para(run('Body.')))
    expect(docxToBlocks(file).images).toBe(1)
  })
})

describe('markdown and html import', () => {
  const md = (source) => htmlToBlocks(marked.parse(source, { async: false }))

  it('carries emphasis, code and links through markdown', () => {
    const [block] = md('Some **bold**, some *italic*, `code`, and a [link](https://example.com).')
    expect(block.kind).toBe('p')
    expect(block.spans).toEqual([
      { text: 'Some ' },
      { text: 'bold', strong: true },
      { text: ', some ' },
      { text: 'italic', em: true },
      { text: ', ' },
      { text: 'code', code: true },
      { text: ', and a ' },
      { text: 'link', href: 'https://example.com' },
      { text: '.' },
    ])
  })

  it('reads ordered lists, quotes, rules and tables', () => {
    const blocks = md('1. One\n2. Two\n\n> Quoted.\n\n---\n\n| A | B |\n|---|---|\n| 1 | 2 |\n')
    expect(blocks.map((b) => b.kind)).toEqual(['ol', 'quote', 'rule', 'table'])
    expect(blocks[0].items.map((i) => i[0].text)).toEqual(['One', 'Two'])
    expect(blocks[3].head.map((c) => c.spans[0].text)).toEqual(['A', 'B'])
  })

  it('keeps a fenced block verbatim, with its language', () => {
    const [block] = md('```ts\nconst a = 1\n  const b = 2\n```')
    expect(block).toEqual({ kind: 'code', text: 'const a = 1\n  const b = 2', lang: 'ts' })
  })

  /**
   * The block model's purpose: nothing arrives as markup, so there is no
   * untrusted HTML at render time. A script tag has no mapping to a block, so
   * it cannot survive — this asserts that rather than trusting it.
   */
  it('gives script and style no way through', () => {
    const blocks = htmlToBlocks(
      '<p>Before</p><script>alert(1)</script><style>body{}</style><p>After</p>',
    )
    expect(blocks.map((b) => b.spans[0].text)).toEqual(['Before', 'After'])
    expect(JSON.stringify(blocks)).not.toContain('alert')
  })

  it('strips a dangerous href but keeps the words', () => {
    const [block] = md('A [trap](javascript:alert(1)) in the prose.')
    expect(block.spans.every((s) => s.href === undefined)).toBe(true)
    expect(block.spans.map((s) => s.text).join('')).toContain('trap')
  })

  it.each([
    ['https://example.com', 'https://example.com'],
    ['mailto:a@b.co', 'mailto:a@b.co'],
    ['/local/path', '/local/path'],
    ['javascript:alert(1)', undefined],
    ['JaVaScRiPt:alert(1)', undefined],
    ['data:text/html,<script>', undefined],
    ['vbscript:msgbox', undefined],
  ])('safeHref(%s)', (input, expected) => {
    expect(safeHref(input)).toBe(expected)
  })
})
