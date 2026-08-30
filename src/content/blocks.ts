import type { DocBlock, Span } from '@/content/types'

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
