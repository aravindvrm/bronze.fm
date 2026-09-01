import { describe, expect, it } from 'vitest'
import { countWords, normaliseBlocks, safeHref, stripTitlePage } from '@/content/blocks'
import type { DocBlock } from '@/content/types'

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

describe('stripTitlePage', () => {
  const h = (level: 1 | 2 | 3, text: string): DocBlock => ({ kind: 'h', level, text })
  const p = (text: string): DocBlock => ({ kind: 'p', spans: [{ text }] })

  const TITLE = 'Autonomous: The Agentic Enterprise'

  it('drops leading level-1 headings that restate the title', () => {
    const body = h(2, 'Introduction')
    const blocks = [h(1, 'Autonomous'), h(1, 'The Agentic Enterprise'), body]
    expect(stripTitlePage(blocks, TITLE)).toEqual([body])
  })

  /*
   * The case a later revision of the whitepaper introduced: the same cover
   * page — title, subtitle, byline, date, a hand-built table of contents —
   * authored as ordinary paragraphs because Word's Heading style was not
   * used for it. Nothing in the block kind says "cover page" here; only
   * the first paragraph restating the title does.
   */
  it('drops a whole run of leading paragraphs when the first one restates the title', () => {
    const body = h(1, 'Executive Brief')
    const blocks = [
      p('AUTONOMOUS'),
      p('The Agentic Enterprise'),
      p('A Framework for Building the AI-Native Organization'),
      p('Odean Maye'),
      p('Whitepaper | 2026'),
      p('Contents'),
      p('Executive BriefThe thesis and executive implications'),
      body,
    ]
    expect(stripTitlePage(blocks, TITLE)).toEqual([body])
  })

  it('stops at the first heading of any level, not only level 1', () => {
    const body = h(2, 'A subsection opens the paper')
    const blocks = [p('AUTONOMOUS'), body]
    expect(stripTitlePage(blocks, TITLE)).toEqual([body])
  })

  it('passes a document through untouched when it opens straight into prose', () => {
    const blocks = [p('The modern enterprise is at an inflection point.'), h(2, 'Introduction')]
    expect(stripTitlePage(blocks, TITLE)).toEqual(blocks)
  })

  /*
   * A heading beyond the title's own words is real content, not cover
   * matter — the historical guard, unchanged by the new paragraph case.
   */
  it('leaves a leading heading alone when it is not part of the title', () => {
    const blocks = [h(1, 'A Letter From the Author'), h(2, 'Introduction')]
    expect(stripTitlePage(blocks, TITLE)).toEqual(blocks)
  })

  it('leaves a leading paragraph alone when it does not restate the title', () => {
    const blocks = [p('Draft — do not distribute'), h(2, 'Introduction')]
    expect(stripTitlePage(blocks, TITLE)).toEqual(blocks)
  })

  it('returns an empty document unchanged', () => {
    expect(stripTitlePage([], TITLE)).toEqual([])
  })
})
