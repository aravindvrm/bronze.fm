// HTML → DocBlock[].
//
// The mapper every text format funnels through. Markdown becomes HTML first
// (via `marked`, build-time only), plain text becomes paragraphs, and .docx
// has its own XML reader — but all three land here or in the same block
// shape, so one set of rules decides what a document is allowed to be.
//
// SANITISING IS BY CONSTRUCTION, not by filtering. Nothing here copies markup
// forward: every tag is either mapped to a block or a span this app already
// knows how to draw, or it is discarded and only its text survives. A
// `<script>` is not stripped by a blocklist that might miss a variant — it
// simply has no mapping, and the reader has no way to render markup even if
// one arrived, because the block model is data. The one field that does leave
// the document is a link's href, and that is scheme-checked.
import { parse } from 'node-html-parser'

const SAFE_SCHEME = /^(https?:|mailto:)/i

/** Mirrors safeHref in src/content/blocks.ts — the app-side counterpart. */
export function safeHref(href) {
  const trimmed = (href ?? '').trim()
  if (!trimmed) return undefined
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return trimmed
  return SAFE_SCHEME.test(trimmed) ? trimmed : undefined
}

/** Tags that carry no text worth keeping — dropped whole, children and all. */
const DROP = new Set(['script', 'style', 'noscript', 'head', 'template', 'iframe', 'object'])

const BLOCK_TAGS = new Set([
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'ul',
  'ol',
  'blockquote',
  'pre',
  'table',
  'figure',
  'img',
  'hr',
  'div',
  'section',
  'article',
  'main',
  'body',
  'header',
  'footer',
  'aside',
])

function decodeEntities(text) {
  return text
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
}

/**
 * Collects the inline runs under a node.
 *
 * Emphasis accumulates down the tree, so a `<strong>` inside an `<a>` yields
 * one span that is both bold and a link — which is why Span is flat rather
 * than nested. Adjacent runs with identical styling are merged, so a
 * paragraph broken into a dozen incidental elements does not become a dozen
 * spans in the fixture.
 */
export function spansOf(node, inherited = {}) {
  const out = []

  const walk = (n, style) => {
    if (n.nodeType === 3) {
      const text = decodeEntities(n.rawText).replace(/\s+/g, ' ')
      if (text) out.push({ text, ...style })
      return
    }
    if (n.nodeType !== 1) return

    const tag = n.rawTagName?.toLowerCase()
    if (DROP.has(tag)) return
    if (tag === 'br') {
      out.push({ text: ' ' })
      return
    }

    let next = style
    if (tag === 'strong' || tag === 'b') next = { ...next, strong: true }
    if (tag === 'em' || tag === 'i') next = { ...next, em: true }
    if (tag === 'code' || tag === 'kbd' || tag === 'samp') next = { ...next, code: true }
    if (tag === 'a') {
      const href = safeHref(n.getAttribute('href'))
      // A link with an unusable scheme keeps its words and loses its target,
      // which is the failure that costs the reader least.
      next = href ? { ...next, href } : next
    }

    for (const child of n.childNodes) walk(child, next)
  }

  for (const child of node.childNodes ?? []) walk(child, inherited)

  const merged = []
  for (const span of out) {
    const last = merged[merged.length - 1]
    const same =
      last &&
      last.strong === span.strong &&
      last.em === span.em &&
      last.code === span.code &&
      last.href === span.href
    if (same) last.text += span.text
    else merged.push({ ...span })
  }

  return merged
    .map((s) => ({ ...s, text: s.text }))
    .filter((s) => s.text.trim() !== '' || merged.length === 1)
}

function trimSpans(spans) {
  const out = spans.map((s) => ({ ...s }))
  if (out.length) out[0].text = out[0].text.replace(/^\s+/, '')
  if (out.length) out[out.length - 1].text = out[out.length - 1].text.replace(/\s+$/, '')
  return out.filter((s) => s.text !== '')
}

function cellsOf(row) {
  return row.querySelectorAll('th, td').map((cell) => {
    const span = Number(cell.getAttribute('colspan'))
    const spans = trimSpans(spansOf(cell))
    return span > 1 ? { spans, span } : { spans }
  })
}

/** One element → zero or more blocks. */
function blocksOf(node, out) {
  const tag = node.rawTagName?.toLowerCase()
  if (!tag || DROP.has(tag)) return

  switch (tag) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6': {
      // Six levels collapse to three. The reader draws three, and the
      // contents sheet is unreadable past two levels of indent on a phone.
      const level = Math.min(3, Number(tag[1]))
      const text = spansOf(node)
        .map((s) => s.text)
        .join('')
        .trim()
      if (text) out.push({ kind: 'h', level, text })
      return
    }

    case 'p': {
      const spans = trimSpans(spansOf(node))
      // A paragraph whose only content is an image is a figure, which is how
      // Markdown expresses one.
      const img = node.querySelector('img')
      if (img && spans.length === 0) {
        blocksOf(img, out)
        return
      }
      if (spans.length) out.push({ kind: 'p', spans })
      return
    }

    case 'ul':
    case 'ol': {
      const items = node
        .querySelectorAll(':scope > li')
        .map((li) => trimSpans(spansOf(li)))
        .filter((spans) => spans.length)
      if (!items.length) return
      if (tag === 'ul') out.push({ kind: 'ul', items })
      else {
        const start = Number(node.getAttribute('start'))
        out.push(start > 1 ? { kind: 'ol', items, start } : { kind: 'ol', items })
      }
      return
    }

    case 'blockquote': {
      const spans = trimSpans(spansOf(node))
      if (spans.length) out.push({ kind: 'quote', spans })
      return
    }

    case 'pre': {
      // Raw text, entities decoded and nothing else touched: the line breaks
      // and the leading space of every line are the content here.
      const code = node.querySelector('code') ?? node
      const text = decodeEntities(code.rawText).replace(/\n+$/, '')
      const cls = code.getAttribute('class') ?? ''
      const lang = /language-([\w+-]+)/.exec(cls)?.[1]
      if (text.trim()) out.push(lang ? { kind: 'code', text, lang } : { kind: 'code', text })
      return
    }

    case 'table': {
      const rows = node.querySelectorAll('tr')
      if (!rows.length) return
      const headRow =
        node.querySelector('thead tr') ?? (rows[0].querySelector('th') ? rows[0] : null)
      const bodyRows = rows
        .filter((r) => r !== headRow)
        .map(cellsOf)
        .filter((r) => r.length)
      const block = { kind: 'table', rows: bodyRows }
      if (headRow) block.head = cellsOf(headRow)
      if (block.rows.length || block.head) out.push(block)
      return
    }

    case 'figure': {
      const img = node.querySelector('img')
      if (!img) return
      const src = img.getAttribute('src')
      if (!src) return
      const caption = node.querySelector('figcaption')
      const block = { kind: 'figure', src, alt: img.getAttribute('alt') ?? '' }
      if (caption) {
        const spans = trimSpans(spansOf(caption))
        if (spans.length) block.caption = spans
      }
      out.push(block)
      return
    }

    case 'img': {
      const src = node.getAttribute('src')
      if (!src) return
      const alt = node.getAttribute('alt') ?? ''
      const title = node.getAttribute('title')
      const block = { kind: 'figure', src, alt }
      // Markdown's image title is the closest thing it has to a caption.
      if (title) block.caption = [{ text: title }]
      out.push(block)
      return
    }

    case 'hr':
      out.push({ kind: 'rule' })
      return

    default: {
      // A container: recurse. Anything else that is not a known block but
      // holds text becomes a paragraph, so a document built out of unusual
      // tags still reads rather than vanishing.
      const children = node.childNodes.filter((n) => n.nodeType === 1)
      const hasBlockChild = children.some((n) => BLOCK_TAGS.has(n.rawTagName?.toLowerCase()))
      if (hasBlockChild || BLOCK_TAGS.has(tag)) {
        for (const child of children) blocksOf(child, out)
        return
      }
      const spans = trimSpans(spansOf(node))
      if (spans.length) out.push({ kind: 'p', spans })
    }
  }
}

export function htmlToBlocks(html) {
  /*
   * `pre` is parsed as elements, NOT as raw text.
   *
   * Treating it as a text element looks right — its whitespace is content —
   * but it makes the parser hand back the inner `<code …>` tag as literal
   * characters, so the block ends up containing its own markup and the
   * language class is unreachable. Text nodes keep their whitespace either
   * way; only the tags differ.
   *
   * `script` and `style` are the reverse: their content is dropped rather
   * than kept as text, so nothing they contain can reach a block at all.
   */
  const root = parse(html, { blockTextElements: { script: false, style: false } })
  const out = []
  for (const child of root.childNodes.filter((n) => n.nodeType === 1)) blocksOf(child, out)
  // A fragment with no wrapping element yields loose text nodes; catch them.
  if (!out.length) {
    const spans = trimSpans(spansOf(root))
    if (spans.length) out.push({ kind: 'p', spans })
  }
  return out
}
