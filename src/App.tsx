import { useEffect, useState } from 'react'
import { Routes, Route, useLocation, useParams, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AudioProvider } from '@/audio/AudioProvider'
import { usePlayer } from '@/audio/playerStore'
import { content as adapter } from '@/content/adapter'
import { CreatorProvider, useCreator } from '@/content/CreatorContext'
import { ContentProvider } from '@/content/ContentContext'
import type { Content, Creator } from '@/content/types'
import { isDedicatedHost, resolveCreatorSlug } from '@/lib/tenant'
import { MiniPlayer } from '@/components/MiniPlayer'
import { PlayerScreen } from '@/components/PlayerScreen'
import { CreatorProfile } from '@/screens/CreatorProfile'
import { Releases } from '@/screens/Releases'
import { Splash } from '@/screens/Splash'
import { Home } from '@/screens/Home'
import { Music } from '@/screens/Music'
import { StubGrid } from '@/screens/StubGrid'

const Blank = () => <div className="h-full bg-void" />

function NotFound({ what, name }: { what: string; name: string }) {
  return (
    <div className="grid h-full place-items-center bg-void px-8 text-center">
      <p className="text-sm text-parchment/50">
        No {what} called <span className="text-gilt">{name}</span>.
      </p>
    </div>
  )
}

/**
 * One Content and everything inside it.
 *
 *   /dean/bronze          splash — the entry screen for the release
 *   /dean/bronze/home     the four tiles
 *   /dean/bronze/music    track list
 *   /dean/bronze/videos|merch|events
 *
 * The tiles belong to the Content, not the Creator: they are how you move
 * around one release.
 */
function ContentShell() {
  const { contentSlug } = useParams()
  const creator = useCreator()
  const [content, setContent] = useState<Content | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let cancelled = false
    setMissing(false)
    void adapter.getContent(creator.slug, contentSlug ?? '').then((c) => {
      if (cancelled) return
      if (!c) setMissing(true)
      else setContent(c)
    })
    return () => {
      cancelled = true
    }
  }, [creator.slug, contentSlug])

  if (missing) return <NotFound what="release" name={contentSlug ?? ''} />
  if (!content) return <Blank />

  return (
    <ContentProvider content={content}>
      <Routes>
        <Route index element={<Splash />} />
        <Route path="home" element={<Home />} />
        <Route path="music" element={<Music />} />
        <Route
          path="videos"
          element={<StubGrid kind="video" title="Videos" blurb="Official videos, visualisers and studio footage will land here." />}
        />
        <Route
          path="merch"
          element={<StubGrid kind="merch" title="Merch" blurb="Apparel, vinyl and prints tied to this release." />}
        />
        <Route
          path="events"
          element={<StubGrid kind="event" title="Events" blurb="Dates on this release's run." />}
        />
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </ContentProvider>
  )
}

/**
 * Everything under one Creator.
 *
 *   /dean            profile — Releases, Merch, Events
 *   /dean/releases   their records
 *   /dean/merch      everything they sell
 *   /dean/events     every date
 *   /dean/bronze     one Content, with its own sections below it
 *
 * The Creator sections come first so they win the match; a Content slug can
 * never be one of them, enforced by a CHECK constraint.
 */
function CreatorShell() {
  const params = useParams()
  const slug = params.creator ?? resolveCreatorSlug()
  const [creator, setCreator] = useState<Creator | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let cancelled = false
    setMissing(false)
    void adapter.getCreator(slug).then((c) => {
      if (cancelled) return
      if (!c) setMissing(true)
      else setCreator(c)
    })
    return () => {
      cancelled = true
    }
  }, [slug])

  if (missing) return <NotFound what="creator" name={slug} />
  if (!creator) return <Blank />

  return (
    <CreatorProvider creator={creator}>
      <Routes>
        <Route index element={<CreatorProfile />} />
        <Route path="releases" element={<Releases />} />
        <Route
          path="merch"
          element={<StubGrid kind="merch" title="Merch" blurb={`Everything ${creator.name} sells. Checkout arrives with the release.`} />}
        />
        <Route
          path="events"
          element={<StubGrid kind="event" title="Events" blurb={`Every ${creator.name} date, announced as they are confirmed.`} />}
        />
        {/* Last, so the Creator sections above always win the match. */}
        <Route path=":contentSlug/*" element={<ContentShell />} />
      </Routes>
    </CreatorProvider>
  )
}

export default function App() {
  const location = useLocation()
  const expanded = usePlayer((s) => s.expanded)
  const hasQueue = usePlayer((s) => s.queue.length > 0)

  // On a dedicated host the Creator comes from the hostname, so paths carry no
  // creator segment. On the shared host the first segment is the Creator.
  const dedicated = isDedicatedHost()

  // The splash is the release's cover screen and owns the whole viewport; the
  // dock would sit on top of the artwork.
  const onSplash = location.pathname.split('/').filter(Boolean).length === (dedicated ? 1 : 2)

  return (
    <AudioProvider>
      {/*
        No AnimatePresence around the routes. `mode="wait"` couples navigation
        to an exit animation completing — every nav stalls behind it, and an
        interrupted animation strands the user on the old screen. Screens
        animate themselves on mount, which needs neither.
      */}
      <div className="h-full overflow-y-auto no-scrollbar">
        <Routes location={location}>
          {dedicated ? (
            <Route path="/*" element={<CreatorShell />} />
          ) : (
            <>
              <Route path="/" element={<Navigate to={`/${resolveCreatorSlug()}`} replace />} />
              <Route path="/:creator/*" element={<CreatorShell />} />
            </>
          )}
        </Routes>
      </div>

      {/* One player, two presentations — both persist across route changes. */}
      <AnimatePresence>
        {hasQueue && !expanded && !onSplash && <MiniPlayer key="mini" />}
      </AnimatePresence>
      <AnimatePresence>{expanded && <PlayerScreen key="full" />}</AnimatePresence>
    </AudioProvider>
  )
}
