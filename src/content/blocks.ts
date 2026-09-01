import type { Cell, DocBlock, Span } from '@/content/types'

/**
 * Everything that reads a document's WORDS rather than rendering them.
 *
 * Word counts, read-time estimates and in-paper search all want the prose
 * with no structure attached, and every one of them used to reach into the
 * block union and pick fields off it — which meant each new block kind
 * silently went missing from the search index and the read time. One
 * function, so a kind added to the model is either handled here or is a
 * type error.
 */
export function spansText(spans: Span[]): string {
  return spans.map((s) => s.text).join('')
}

/**
 * Drops the paper's own title page, which the reader prints for itself.
 *
 * A cover page is not one fixed shape across documents. It opened as two
 * level-1 headings — "Autonomous", "The Agentic Enterprise" — when Word's
 * own Heading style was used for it; a later revision of the same paper
 * carried the identical page ("AUTONOMOUS" / subtitle / byline / date / a
 * hand-built table of contents) as ordinary paragraphs instead, because
 * whoever styled that page in Word reached for a Title or body style rather
 * than Heading 1. Nothing in the source distinguishes "this paragraph is
 * cover-page fluff" from "this paragraph is the paper's first line" except
 * the one fact both versions share: the very first block restates the
 * paper's own title.
 *
 * So the rule is content-shaped, not style-shaped: if the leading blocks
 * are level-1 headings the title already contains, drop only those
 * (unchanged from before — a heading beyond the title's own words is real
 * content, not cover matter). Otherwise, if the very FIRST block is a
 * paragraph whose text the title already contains, treat everything up to
 * the next heading of any level as the cover page and drop all of it —
 * subtitle, byline, date and a duplicate table of contents included, since
 * this screen builds its own from the real headings that follow.
 *
 * A document that opens straight into prose — whose first block names
 * neither pattern — passes through untouched. Belongs here rather than in
 * the importer: it is a fact about how this screen lays a paper out, and
 * the fixtures stay a faithful copy of the source.
 */
export function stripTitlePage(blocks: DocBlock[], title: string): DocBlock[] {
  const normalise = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
  const heading = normalise(title)
  const restatesTitle = (b: DocBlock | undefined) =>
    !!b && heading.includes(normalise(blockText(b)))

  let i = 0
  while (
    blocks[i]?.kind === 'h' &&
    (blocks[i] as Extract<DocBlock, { kind: 'h' }>).level === 1 &&
    restatesTitle(blocks[i])
  ) {
    i++
  }

  if (i === 0 && blocks[0]?.kind === 'p' && restatesTitle(blocks[0])) {
    while (blocks[i] && blocks[i].kind !== 'h') i++
  }

  return i ? blocks.slice(i) : blocks
}

export function blockText(block: DocBlock): string {
  switch (block.kind) {
    case 'h':
      return block.text
    case 'p':
    case 'quote':
      return spansText(block.spans)
    case 'ul':
    case 'ol':
      return block.items.map(spansText).join(' ')
    case 'code':
      return block.text
    case 'table':
      return [...(block.head ? [block.head] : []), ...block.rows]
        .map((row) => row.map((cell) => spansText(cell.spans)).join(' '))
        .join(' ')
    case 'figure':
      // The caption is prose; the alt text is a description of a picture and
      // is not something anyone is reading, so it stays out of the count.
      return block.caption ? spansText(block.caption) : ''
    case 'rule':
      return ''
  }
}

export function countWords(blocks: DocBlock[]): number {
  return blocks.reduce((n, b) => {
    const text = blockText(b).trim()
    return n + (text ? text.split(/\s+/).length : 0)
  }, 0)
}

/**
 * Link schemes a document may carry.
 *
 * The block model's whole point is that nothing arrives as markup, so there
 * is no HTML to sanitise at render time — but `href` is the one field that
 * still leaves the document, and `javascript:` in one is script execution on
 * a click. Importers check here rather than each inventing its own rule.
 */
const SAFE_SCHEME = /^(https?:|mailto:)/i

export function safeHref(href: string): string | undefined {
  const trimmed = href.trim()
  // Protocol-relative and rooted paths carry no scheme to abuse.
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return trimmed
  return SAFE_SCHEME.test(trimmed) ? trimmed : undefined
}

/**
 * Makes an arbitrary lump of JSON into blocks this app can render.
 *
 * `content.document` is a jsonb column. Whatever is in it becomes DocBlock[]
 * by assertion alone — TypeScript is checking a shape at compile time that
 * the database is free to contradict at run time, and the two drift the
 * moment a build ships ahead of a migration. That is not hypothetical: when
 * paragraphs gained spans, a deployment reading un-migrated rows got
 * `{kind: 'p', text}` where the renderer expected `spans`, and `spans.map`
 * threw during render. React unmounts the whole tree on a render error, so a
 * single stale paragraph blanked the entire app — permanently, since no
 * client-side navigation could remount it.
 *
 * So every document is normalised on the way in:
 *
 *   - the pre-spans shape is upgraded rather than rejected, because it says
 *     exactly what the new one says and there is no reason to lose a paper
 *     over it;
 *   - anything still unrecognisable is DROPPED. A missing paragraph is a
 *     small, local, visible loss; a thrown error is a blank app.
 *
 * Total by construction: every branch returns, so a block kind added to the
 * model without a case here is a type error rather than a silent gap.
 */
export function normaliseBlocks(input: unknown): DocBlock[] {
  if (!Array.isArray(input)) return []
  return input.flatMap((raw): DocBlock[] => {
    if (!raw || typeof raw !== 'object') return []
    const block = raw as Record<string, unknown>

    // The pre-spans shape: a plain string where spans now go.
    const spans = (value: unknown): Span[] | null => {
      if (typeof value === 'string') return value ? [{ text: value }] : null
      if (!Array.isArray(value)) return null
      const out = value.filter(
        (s): s is Span => !!s && typeof s === 'object' && typeof (s as Span).text === 'string',
      )
      return out.length ? out : null
    }
    const items = (value: unknown): Span[][] | null => {
      if (!Array.isArray(value)) return null
      const out = value.map(spans).filter((s): s is Span[] => s !== null)
      return out.length ? out : null
    }

    switch (block.kind) {
      case 'h': {
        const level = block.level === 2 ? 2 : block.level === 3 ? 3 : 1
        return typeof block.text === 'string' && block.text
          ? [{ kind: 'h', level, text: block.text }]
          : []
      }
      case 'p': {
        const s = spans(block.spans ?? block.text)
        return s ? [{ kind: 'p', spans: s }] : []
      }
      case 'quote': {
        const s = spans(block.spans ?? block.text)
        return s ? [{ kind: 'quote', spans: s }] : []
      }
      case 'ul': {
        const list = items(block.items)
        return list ? [{ kind: 'ul', items: list }] : []
      }
      case 'ol': {
        const list = items(block.items)
        if (!list) return []
        const start = typeof block.start === 'number' ? block.start : undefined
        return [start ? { kind: 'ol', items: list, start } : { kind: 'ol', items: list }]
      }
      case 'code': {
        if (typeof block.text !== 'string') return []
        const lang = typeof block.lang === 'string' ? block.lang : undefined
        return [
          lang ? { kind: 'code', text: block.text, lang } : { kind: 'code', text: block.text },
        ]
      }
      case 'table': {
        const cells = (value: unknown): Cell[] | null => {
          if (!Array.isArray(value)) return null
          const out = value.flatMap((cell): Cell[] => {
            const s = spans((cell as Record<string, unknown>)?.spans) ?? []
            const n = (cell as Record<string, unknown>)?.span
            return [typeof n === 'number' && n > 1 ? { spans: s, span: n } : { spans: s }]
          })
          return out.length ? out : null
        }
        const rows = Array.isArray(block.rows)
          ? block.rows.map(cells).filter((r): r is Cell[] => r !== null)
          : []
        const head = cells(block.head)
        if (!rows.length && !head) return []
        return [head ? { kind: 'table', head, rows } : { kind: 'table', rows }]
      }
      case 'figure': {
        if (typeof block.src !== 'string' || !block.src) return []
        const src = safeHref(block.src)
        // A figure whose source is not a usable URL is not a figure.
        if (!src) return []
        const alt = typeof block.alt === 'string' ? block.alt : ''
        const caption = spans(block.caption)
        return [caption ? { kind: 'figure', src, alt, caption } : { kind: 'figure', src, alt }]
      }
      case 'rule':
        return [{ kind: 'rule' }]
      default:
        return []
    }
  })
}
