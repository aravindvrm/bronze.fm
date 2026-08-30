import { useEffect, useState } from 'react'
import { content as adapter } from '@/content/adapter'
import { useCreator } from '@/content/CreatorContext'
import { useProject } from '@/content/ProjectContext'
import type { Content, DocBlock } from '@/content/types'
import { projectPath } from '@/lib/tenant'
import { AppHeader } from '@/components/AppHeader'

/**
 * The document interface — `/@dean/atonomos/read`.
 *
 * A scroll of semantic blocks rather than a paginated viewer or an embedded
 * PDF. The source is ten thousand words of headings and prose with no
 * figures, so blocks inherit the app's typography, reflow on a phone, and
 * cache offline as text — where a PDF would be a fixed-width page and an EPUB
 * reader a dependency for something this plain.
 *
 * Basic on purpose for this pass: no pagination, bookmarks or progress. The
 * measure is capped for readability and that is the whole layout.
 */

/**
 * Drops the paper's own title page, which the article prints for itself.
 *
 * An imported .docx opens with its title set as headings — here two of them,
 * "Autonomous" and "The Agentic Enterprise", for a paper whose title is the
 * two joined. The screen has always shown the title separately, so those
 * blocks were a duplicate; it was merely less obvious while the copy sat in
 * the header bar rather than directly above them.
 *
 * Only LEADING level-1 headings, and only those the title already contains,
 * so a document that opens straight into prose — or one whose first heading
 * is real content — passes through untouched. Belongs here rather than in
 * the importer: it is a fact about how this screen lays a paper out, and the
 * fixtures stay a faithful copy of the source.
 */
function stripTitlePage(blocks: DocBlock[], title: string): DocBlock[] {
  const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const heading = normalise(title)
  let i = 0
  while (
    blocks[i]?.kind === 'h' &&
    (blocks[i] as Extract<DocBlock, { kind: 'h' }>).level === 1 &&
    heading.includes(normalise((blocks[i] as Extract<DocBlock, { kind: 'h' }>).text))
  ) {
    i++
  }
  return i ? blocks.slice(i) : blocks
}

function Block({ block }: { block: DocBlock }) {
  if (block.kind === 'h') {
    // h1 is the paper's own title, which the article prints above these, so
    // the document's own headings start one level down.
    if (block.level === 1) {
      return (
        <h2 className="mt-12 text-3xl leading-tight text-parchment first:mt-0 sm:text-4xl">
          {block.text}
        </h2>
      )
    }
    if (block.level === 2) {
      return (
        <h3 className="mt-10 text-2xl leading-snug text-parchment">{block.text}</h3>
      )
    }
    return (
      <h4 className="mt-8 font-display text-base uppercase tracking-[0.12em] text-gilt/80">
        {block.text}
      </h4>
    )
  }

  if (block.kind === 'ul') {
    return (
      <ul className="mt-4 list-disc space-y-2 pl-5 marker:text-gilt/50">
        {block.items.map((item, i) => (
          <li key={i} className="text-[15px] leading-[1.75] text-parchment/70">
            {item}
          </li>
        ))}
      </ul>
    )
  }

  return <p className="mt-4 text-[15px] leading-[1.75] text-parchment/70">{block.text}</p>
}

export function Reader() {
  const creator = useCreator()
  const project = useProject()
  const [content, setContent] = useState<Content | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    void adapter.getContent(creator.slug, project.slug, 'ereader').then((c) => {
      if (cancelled) return
      setContent(c)
      setLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [creator.slug, project.slug])

  const document = stripTitlePage(content?.document ?? [], content?.title ?? project.title)

  return (
    <div className="relative min-h-full">
      {/*
        The app's own header, not the title bar the other screens use.
        
        A paper's title is the document's, not the chrome's: in the bar it
        was truncated to a phone's width and cost the reader the wordmark and
        the menu that every other screen offers. It now opens the article,
        where it can run to as many lines as it needs.
      */}
      <AppHeader backTo={projectPath(creator.slug, project.slug)} />

      <article
        className="mx-auto max-w-2xl px-5 sm:px-6"
        style={{ paddingBottom: 'calc(var(--safe-b) + 8rem)' }}
      >
        {/*
          No byline. Whose paper this is was established on the way in — the
          creator's profile, then the project — and repeating it here is a
          line of chrome between the reader and the first sentence.
        */}
        <h1 className="mt-2 text-3xl leading-tight text-parchment sm:text-4xl">
          {content?.title ?? project.title}
        </h1>

        {loaded && document.length === 0 && (
          <div className="mt-8 border border-parchment/25 p-5">
            <p className="text-sm text-parchment/60">This paper has no text yet.</p>
          </div>
        )}

        <div className="mt-10">
          {document.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </div>
      </article>
    </div>
  )
}
