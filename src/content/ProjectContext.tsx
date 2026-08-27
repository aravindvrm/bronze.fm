import { createContext, useContext } from 'react'
import type { Project } from '@/content/types'

const Ctx = createContext<Project | null>(null)

export function ProjectProvider({
  project,
  children,
}: {
  project: Project
  children: React.ReactNode
}) {
  return <Ctx.Provider value={project}>{children}</Ctx.Provider>
}

/**
 * The Project this view belongs to, resolved from the URL.
 *
 * Deliberately not the player's Project: browsing a project and playing one
 * are different things, so the project being read must not be whatever
 * happens to be playing.
 */
export function useProject(): Project {
  const p = useContext(Ctx)
  if (!p) throw new Error('useProject must be used inside <ProjectProvider>')
  return p
}

/**
 * The Project this view belongs to, or null outside one.
 *
 * Sections can render at creator level too, so they need to ask rather than
 * assume.
 */
export function useOptionalProject(): Project | null {
  return useContext(Ctx)
}
