import { useEffect, useState } from 'react'
import { content as adapter } from '@/content/adapter'
import { useCreator } from '@/content/CreatorContext'
import { useProject } from '@/content/ProjectContext'
import type { Content, DocBlock } from '@/content/types'
import { projectPath } from '@/lib/tenant'
import { ScreenHeader } from '@/components/ScreenHeader'

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

function Block({ block }: { block: DocBlock }) {
  if (block.kind === 'h') {
    // h1 is the paper's own title, which the header already shows, so the
    // document's headings start one level down visually.
    if (block.level === 1) {
      return (
        <h2 className="mt-12 font-content text-3xl leading-tight text-parchment first:mt-0 sm:text-4xl">
          {block.text}
        </h2>
      )
    }
    if (block.level === 2) {
      return (
        <h3 className="mt-10 font-content text-2xl leading-snug text-parchment">{block.text}</h3>
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

  const document = content?.document ?? []

  return (
    <div className="min-h-full bg-void">
      <ScreenHeader
        title={content?.title ?? project.title}
        titleOf="content"
        to={projectPath(creator.slug, project.slug)}
        width="narrow"
      />

      <article
        className="mx-auto max-w-2xl px-5 sm:px-6"
        style={{ paddingBottom: 'calc(var(--safe-b) + 8rem)' }}
      >
        {content?.credits.length ? (
          <p className="text-[11px] uppercase tracking-[0.2em] text-parchment/40">
            {content.credits.map((c) => c.name).join(' · ')}
          </p>
        ) : null}

        {loaded && document.length === 0 && (
          <div className="mt-8 rounded-md border border-white/[0.14] p-5">
            <p className="text-sm text-parchment/60">This paper has no text yet.</p>
          </div>
        )}

        <div className="mt-8">
          {document.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </div>
      </article>
    </div>
  )
}
