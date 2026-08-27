/** mm:ss — the only time format the player shows. */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

export function formatTotal(ms: number): string {
  const total = Math.round(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m} min ${s} sec`
}

/**
 * Coarse relative time for the feed — "3 days ago".
 *
 * Deliberately blunt past a week: a feed entry's exact hour stops mattering
 * once it is not recent, and "6 weeks ago" reads better than a date nobody
 * scans. Anything older than a year falls back to the year itself.
 *
 * `now` is injectable so tests can assert the boundaries without freezing
 * the clock globally.
 */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return ''

  const seconds = Math.round((now.getTime() - then.getTime()) / 1000)
  if (seconds < 60) return 'just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'} ago`

  const weeks = Math.floor(days / 7)
  if (weeks < 52) return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`

  return then.getFullYear().toString()
}
