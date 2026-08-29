import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { Content } from '@/content/types'
import { cacheAvailable, clearMedia, manifestFor, planSync, runSync, usage } from '@/lib/mediaCache'

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(0)} MB`

/**
 * Explicit "save offline" control.
 *
 * Deliberately opt-in: this album is 66 MB, and pulling that down unasked on
 * a cellular connection would be hostile. Tracks a listener plays through are
 * cached anyway (see useOpportunisticCache) — this is for taking the whole
 * record somewhere with no signal.
 */
export function OfflineControl({ content }: { content: Content }) {
  const [state, setState] = useState<'idle' | 'working' | 'done'>('idle')
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [cached, setCached] = useState(0)
  const [totalBytes, setTotalBytes] = useState(0)
  const [quota, setQuota] = useState<{ usage: number; quota: number } | null>(null)

  const supported = cacheAvailable()

  const refresh = async () => {
    if (!content || !supported) return
    const entries = manifestFor(content)
    setTotalBytes(entries.reduce((a, e) => a + e.bytes, 0))
    const plan = await planSync(entries)
    setCached(plan.cachedBytes)
    setState(plan.stale.length + plan.missing.length === 0 ? 'done' : 'idle')
    setQuota(await usage())
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content])

  if (!content || !supported) return null

  const save = async () => {
    setState('working')
    const entries = manifestFor(content)
    await runSync(entries, (done, total) => setProgress({ done, total }))
    await refresh()
  }

  const remove = async () => {
    await clearMedia()
    await refresh()
  }

  const pct = totalBytes > 0 ? Math.round((cached / totalBytes) * 100) : 0

  return (
    <div className="rounded-md border border-parchment/[0.14] p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-parchment">Save offline</p>
          <p className="mt-0.5 text-[11px] text-parchment/40">
            {state === 'working'
              ? `Saving ${progress.done} of ${progress.total}…`
              : state === 'done'
                ? `Saved · ${mb(totalBytes)}`
                : `${mb(totalBytes)} · ${pct}% cached`}
          </p>
        </div>

        {state === 'done' ? (
          <button
            onClick={remove}
            className="shrink-0 rounded-full border border-parchment/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-parchment/60 transition hover:text-parchment"
          >
            Remove
          </button>
        ) : (
          <button
            onClick={save}
            disabled={state === 'working'}
            className="shrink-0 rounded-full bg-parchment px-4 py-1.5 text-[11px] uppercase tracking-[0.12em] text-void transition disabled:opacity-50"
          >
            {state === 'working' ? 'Saving' : 'Save'}
          </button>
        )}
      </div>

      {state === 'working' && progress.total > 0 && (
        <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-parchment/10">
          <motion.div
            className="h-full bg-gilt"
            animate={{ width: `${(progress.done / progress.total) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      {quota && quota.quota > 0 && (
        <p className="mt-3 text-[10px] text-parchment/25">
          {mb(quota.usage)} used of {mb(quota.quota)} available
        </p>
      )}
    </div>
  )
}
