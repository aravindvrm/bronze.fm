import { useEffect, useState } from 'react'
import { Routes, Route, useLocation, useParams, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AudioProvider } from '@/audio/AudioProvider'
import { usePlayer } from '@/audio/playerStore'
import { content as adapter } from '@/content/adapter'
import { CreatorProvider, useCreator } from '@/content/CreatorContext'
import { ProjectProvider } from '@/content/ProjectContext'
import { contentTypeFromSegment, type Creator, type Project } from '@/content/types'
import {
  HANDLE_PREFIX,
  defaultCreatorSlug,
  isDedicatedHost,
  resolveCreatorSlug,
} from '@/lib/tenant'
import { MiniPlayer } from '@/components/MiniPlayer'
import { PlayerScreen } from '@/components/PlayerScreen'
import { InstallBanner } from '@/components/InstallBanner'
import { UpdateBanner } from '@/components/UpdateBanner'
import { Splash } from '@/components/Splash'
import { CreatorProfile } from '@/screens/CreatorProfile'
import { Feed } from '@/screens/Feed'
import { Search } from '@/screens/Search'
import { ProjectHub } from '@/screens/ProjectHub'
import { Music } from '@/screens/Music'
import { Reader } from '@/screens/Reader'
import { StubGrid } from '@/screens/StubGrid'
import { ScreenBoundary } from '@/components/ScreenBoundary'

const Blank = () => <div className="h-full bg-void" />

function NotFound({ what, name }: { what: string; name: string }) {
  return (
    <div className="grid h-full place-items-center bg-void px-8 text-center">
      <p className="text-sm text-parchment/50">
        No {what} called <span className="text-ember">{name}</span>.
      </p>
    </div>
  )
}

/**
 * One Project and the typed interfaces onto it.
 *
 *   /@deanMaye/bronze          project hub
 *   /@deanMaye/bronze/music    the album
 *   /@deanMaye/atonomos/read   the whitepaper
 *
 * The trailing segment selects a Content by type rather than naming one by
 * slug — a Project holds at most one Content of each type, so the type is the
 * address.
 */
function ProjectShell() {
  const { projectSlug } = useParams()
  const creator = useCreator()
  const [project, setProject] = useState<Project | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let cancelled = false
    setMissing(false)
    setProject(null)
    void adapter.getProject(creator.slug, projectSlug ?? '').then((p) => {
      if (cancelled) return
      if (!p) setMissing(true)
      else setProject(p)
    })
    return () => {
      cancelled = true
    }
  }, [creator.slug, projectSlug])

  if (missing) return <NotFound what="project" name={projectSlug ?? ''} />
  if (!project) return <Blank />

  return (
    <ProjectProvider project={project}>
      <Routes>
        <Route index element={<ProjectHub />} />
        <Route path=":typeSegment" element={<ContentShell />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </ProjectProvider>
  )
}

/** Resolves the type segment to the Content it names, or an honest 404. */
function ContentShell() {
  const { typeSegment } = useParams()
  const type = contentTypeFromSegment(typeSegment ?? '')
  if (!type) return <NotFound what="section" name={typeSegment ?? ''} />
  if (type === 'music') return <Music />
  if (type === 'ereader') return <Reader />
  return <NotFound what="section" name={typeSegment ?? ''} />
}

/**
 * Everything under one Creator.
 *
 *   /@deanMaye            profile
 *   /@deanMaye/store      creator-level section
 *   /@deanMaye/events     creator-level section
 *   /@deanMaye/bronze     a Project, with its interfaces below it
 *
 * Creator sections are matched before Project slugs, so a Project can never be
 * called `store`. RESERVED_PROJECT_SLUGS and a CHECK constraint enforce that
 * from both ends.
 */
function CreatorShell() {
  const params = useParams()
  const handle = params.handle ?? ''

  /*
   * On the shared host the route pattern is `/:handle/*`, which matches any
   * first segment — so the `@` has to be enforced here rather than assumed.
   * Without this check `/anything` would be treated as a creator handle,
   * which is exactly the top-level collision the prefix exists to prevent.
   * On a dedicated host there is no handle segment at all and the hostname
   * supplies the Creator.
   */
  const dedicated = isDedicatedHost()
  const valid = dedicated || handle.startsWith(HANDLE_PREFIX)
  const slug = dedicated
    ? (resolveCreatorSlug() ?? defaultCreatorSlug())
    : handle.slice(HANDLE_PREFIX.length)

  const [creator, setCreator] = useState<Creator | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    if (!valid || !slug) return
    let cancelled = false
    setMissing(false)
    setCreator(null)
    void adapter.getCreator(slug).then((c) => {
      if (cancelled) return
      if (!c) setMissing(true)
      else setCreator(c)
    })
    return () => {
      cancelled = true
    }
  }, [slug, valid])

  if (!valid || !slug) return <NotFound what="page" name={`/${handle}`} />
  if (missing) return <NotFound what="creator" name={slug} />
  if (!creator) return <Blank />

  return (
    <CreatorProvider creator={creator}>
      <Routes>
        <Route index element={<CreatorProfile />} />
        <Route
          path="store"
          element={
            <StubGrid kind="store" title="Store" blurb={`Everything ${creator.name} sells.`} />
          }
        />
        <Route
          path="events"
          element={
            <StubGrid
              kind="event"
              title="Events"
              blurb={`Every ${creator.name} date, announced as they are confirmed.`}
            />
          }
        />
        {/* Last, so the Creator sections above always win the match. */}
        <Route path=":projectSlug/*" element={<ProjectShell />} />
      </Routes>
    </CreatorProvider>
  )
}

export default function App() {
  const location = useLocation()
  const expanded = usePlayer((s) => s.expanded)
  const hasQueue = usePlayer((s) => s.queue.length > 0)

  // On a dedicated host the Creator comes from the hostname, so paths carry no
  // handle segment and the root is that Creator's profile rather than the feed.
  const dedicated = isDedicatedHost()

  return (
    <AudioProvider>
      {/*
        No AnimatePresence around the routes. `mode="wait"` couples navigation
        to an exit animation completing — every nav stalls behind it, and an
        interrupted animation strands the user on the old screen. Screens
        animate themselves on mount, which needs neither.
      */}
      {/* Marked so AppHeader can watch it: the page scrolls in here, not on
          the window, so window.scrollY never moves. */}
      <div data-app-scroll className="h-full overflow-y-auto no-scrollbar">
        {/*
          Keyed by path, so a screen that throws does not carry its failure to
          the next one: React keeps a boundary's error state until the
          boundary itself is replaced. Without the key, one broken screen
          would show its own error message on every route thereafter — the
          same trap as the crash it is here to contain, one level up.
        */}
        <ScreenBoundary key={location.pathname}>
          <Routes location={location}>
            {/*
              Ahead of the handle route, and that order is load-bearing:
              `/:handle/*` matches `/search` with a handle of "search", and
              the `@` prefix is only checked inside the shell — so the
              mismatch would surface as a not-found page rather than as
              anything that looks like a routing mistake.

              On the dedicated-host branch too. A creator's own domain is
              still the app, and the search there reaches whatever that
              deployment reaches.
            */}
            <Route path="/search" element={<Search />} />
            {dedicated ? (
              <Route path="/*" element={<CreatorShell />} />
            ) : (
              <>
                <Route path="/" element={<Feed />} />
                {/*
                The `@` is part of the segment, not a separator: it is what
                makes a handle unambiguous against every current and future
                top-level route, so no reserved-word list is needed here.
              */}
                <Route path="/:handle/*" element={<CreatorShell />} />
              </>
            )}
          </Routes>
        </ScreenBoundary>
      </div>

      {/* One player, two presentations — both persist across route changes. */}
      <AnimatePresence>{hasQueue && !expanded && <MiniPlayer key="mini" />}</AnimatePresence>
      <AnimatePresence>{expanded && <PlayerScreen key="full" />}</AnimatePresence>

      {!expanded && <InstallBanner />}
      {!expanded && <UpdateBanner />}

      {/* Above everything, including the player: it covers the app on open. */}
      <Splash />
    </AudioProvider>
  )
}
