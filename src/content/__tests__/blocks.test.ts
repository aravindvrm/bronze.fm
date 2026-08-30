import { describe, expect, it } from 'vitest'
import { countWords, normaliseBlocks, safeHref } from '@/content/blocks'

/**
 * `content.document` is a jsonb column, so its runtime shape is whatever was
 * written last — not what the current build's types say. Every case here is
 * something a database can hand this app that TypeScript cannot stop.
 *
 * The first one is a regression test in the strictest sense: it shipped. A
 * build went out ahead of its migration, read paragraphs in the pre-spans
 * shape, and threw inside render — which unmounts the entire React tree, so
 * the symptom was not a broken reader but a permanently blank app that no
 * amount of navigating could recover.
 */
describe('normaliseBlocks', () => {
  it('upgrades the pre-spans shape rather than losing the paragraph', () => {
    expect(normaliseBlocks([{ kind: 'p', text: 'Once a plain string.' }])).toEqual([
      { kind: 'p', spans: [{ text: 'Once a plain string.' }] },
    ])
  })

  it('upgrades pre-spans list items too', () => {
    expect(normaliseBlocks([{ kind: 'ul', items: ['One', 'Two'] }])).toEqual([
      { kind: 'ul', items: [[{ text: 'One' }], [{ text: 'Two' }]] },
    ])
  })

  it('leaves a current-shape document exactly as it is', () => {
    const blocks = [
      { kind: 'h', level: 2, text: 'A section' },
      { kind: 'p', spans: [{ text: 'With ' }, { text: 'emphasis', strong: true }] },
      { kind: 'ol', items: [[{ text: 'First' }]], start: 3 },
      { kind: 'code', text: 'const a = 1', lang: 'ts' },
      { kind: 'rule' },
    ]
    expect(normaliseBlocks(blocks)).toEqual(blocks)
  })

  /**
   * Dropping is the whole point. A missing paragraph is a small, local,
   * visible loss; anything thrown from here is a blank app.
   */
  it.each([
    ['an unknown kind', [{ kind: 'chart', series: [1, 2, 3] }]],
    ['a block with no kind', [{ text: 'orphaned' }]],
    ['a null entry', [null]],
    ['a bare string', ['not a block']],
    ['a paragraph with neither spans nor text', [{ kind: 'p' }]],
    ['spans that are not objects', [{ kind: 'p', spans: [1, 2, 3] }]],
    ['a figure with no source', [{ kind: 'figure', alt: 'nothing' }]],
  ])('drops %s without throwing', (_label, input) => {
    expect(normaliseBlocks(input)).toEqual([])
  })

  it.each([[null], [undefined], ['a string'], [42], [{}]])(
    'returns an empty document for %s',
    (input) => {
      expect(normaliseBlocks(input)).toEqual([])
    },
  )

  /** A stored figure src is a URL like any other — same scheme rule. */
  it('refuses a figure whose source is not a usable URL', () => {
    expect(normaliseBlocks([{ kind: 'figure', src: 'javascript:alert(1)', alt: '' }])).toEqual([])
    expect(normaliseBlocks([{ kind: 'figure', src: 'https://a.co/b.png', alt: 'x' }])).toEqual([
      { kind: 'figure', src: 'https://a.co/b.png', alt: 'x' },
    ])
  })

  it('keeps a table, and tolerates a ragged one', () => {
    const [table] = normaliseBlocks([
      {
        kind: 'table',
        head: [{ spans: [{ text: 'A' }] }, { spans: [{ text: 'B' }], span: 2 }],
        rows: [[{ spans: [{ text: '1' }] }], 'not a row'],
      },
    ])
    expect(table).toEqual({
      kind: 'table',
      head: [{ spans: [{ text: 'A' }] }, { spans: [{ text: 'B' }], span: 2 }],
      rows: [[{ spans: [{ text: '1' }] }]],
    })
  })
})

describe('countWords', () => {
  /**
   * Counted from one helper because two call sites used to pick fields off
   * the block union inline, which meant each kind added to the model was
   * silently worth nothing.
   */
  it('counts every kind that carries prose, and no kind that does not', () => {
    expect(
      countWords([
        { kind: 'h', level: 1, text: 'Two words' },
        { kind: 'p', spans: [{ text: 'three words here' }] },
        { kind: 'ul', items: [[{ text: 'one' }], [{ text: 'two' }]] },
        { kind: 'quote', spans: [{ text: 'a quote' }] },
        { kind: 'rule' },
        { kind: 'figure', src: 'https://a.co/b.png', alt: 'ignored entirely' },
      ]),
    ).toBe(2 + 3 + 2 + 2)
  })
})

describe('safeHref', () => {
  it.each([
    ['https://example.com', 'https://example.com'],
    ['mailto:a@b.co', 'mailto:a@b.co'],
    ['/rooted', '/rooted'],
    ['#anchor', '#anchor'],
    ['javascript:alert(1)', undefined],
    ['  JAVASCRIPT:alert(1)', undefined],
    ['data:text/html,x', undefined],
  ])('%s', (input, expected) => {
    expect(safeHref(input)).toBe(expected)
  })
})
