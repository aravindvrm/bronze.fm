import { createContext, useContext } from 'react'
import type { Content } from '@/content/types'

const Ctx = createContext<Content | null>(null)

export function ContentProvider({
  content,
  children,
}: {
  content: Content
  children: React.ReactNode
}) {
  return <Ctx.Provider value={content}>{children}</Ctx.Provider>
}

/**
 * The Content this view belongs to, resolved from the URL.
 *
 * Deliberately not the player's Content: viewing a release and playing one are
 * different things, so a release being browsed must not be whatever happens to
 * be playing.
 */
export function useContentItem(): Content {
  const c = useContext(Ctx)
  if (!c) throw new Error('useContentItem must be used inside <ContentProvider>')
  return c
}
