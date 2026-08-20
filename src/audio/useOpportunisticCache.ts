import { useEffect, useRef } from 'react'
import { usePlayer } from '@/audio/playerStore'
import { cacheOne } from '@/lib/mediaCache'

/** A track is cached once this much of it has actually been played. */
const LISTENED_FRACTION = 0.5

/**
 * Caches a track once it has genuinely been listened to.
 *
 * The service worker deliberately does not cache on a miss — `<audio>` opens
 * with a small Range probe, so doing that would download a whole track just
 * for skipping past it. Waiting for real listening means the data a listener
 * actually spent is the data that gets kept, and the second play is free.
 */
export function useOpportunisticCache() {
  const item = usePlayer((s) => s.queue[s.index] ?? null)
  const position = usePlayer((s) => s.position)
  const duration = usePlayer((s) => s.duration)
  const attempted = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!item || duration <= 0) return
    if (attempted.current.has(item.hash)) return
    if (position / duration < LISTENED_FRACTION) return

    attempted.current.add(item.hash)
    void cacheOne({ id: item.id, url: item.url, hash: item.hash, bytes: item.bytes })
  }, [item, position, duration])
}
