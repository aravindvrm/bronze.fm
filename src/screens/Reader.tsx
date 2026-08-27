import { useEffect, useState } from 'react'
import { content as adapter } from '@/content/adapter'
import { useCreator } from '@/content/CreatorContext'
import { useProject } from '@/content/ProjectContext'
import type { Content } from '@/content/types'
import { projectPath } from '@/lib/tenant'
import { ScreenHeader } from '@/components/ScreenHeader'

/**
 * The document interface — `/@dean/atonomos/read`.
 *
 * The body is not carried by the fixtures source: this repository is public
 * and the whitepaper is unpublished, so its prose is ingested straight into
 * Supabase rather than committed, exactly as the album masters are. See
 * src/content/fixtures/atonomos.ts.
 *
 * Rendering, when the body lands, is plain semantic blocks rather than a
 * paginated viewer: the source document is 10,000 words of headings and
 * paragraphs with no figures, so a scroll inherits the app's typography and
 * caches offline as text, where a PDF or EPUB reader would add a dependency
 * and a worse reading experience on a phone.
 */
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

  return (
    <div className="min-h-full bg-void">
      <ScreenHeader
        title={content?.title ?? project.title}
        titleOf="content"
        to={projectPath(creator.slug, project.slug)}
        width="narrow"
      />

      <div
        className="mx-auto max-w-3xl px-5 sm:px-6"
        style={{ paddingBottom: 'calc(var(--safe-b) + 8rem)' }}
      >
        {loaded && (
          <>
            {content?.credits.length ? (
              <p className="text-[11px] uppercase tracking-[0.2em] text-parchment/40">
                {content.credits.map((c) => c.name).join(' · ')}
              </p>
            ) : null}

            <div className="mt-8 rounded-md border border-white/[0.14] p-5">
              <p className="text-sm text-parchment/60">
                The full paper isn’t published here yet.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-parchment/40">
                Its text is held outside the repository and loads from the backend once
                ingested.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
