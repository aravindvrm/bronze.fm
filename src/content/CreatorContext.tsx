import { createContext, useContext } from 'react'
import type { Creator } from '@/content/types'

const Ctx = createContext<Creator | null>(null)

export function CreatorProvider({
  creator,
  children,
}: {
  creator: Creator
  children: React.ReactNode
}) {
  return <Ctx.Provider value={creator}>{children}</Ctx.Provider>
}

/** The Creator whose namespace this view is rendering. */
export function useCreator(): Creator {
  const c = useContext(Ctx)
  if (!c) throw new Error('useCreator must be used inside <CreatorProvider>')
  return c
}
