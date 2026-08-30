import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect } from 'react'
import type { Chapter } from '@/components/ReaderRail'
import { CloseIcon } from '@/components/Icons'

/**
 * The paper's contents, as a sheet over the page.
 *
 * A sheet rather than a side drawer: the app's one drawer is the global menu,
 * opening from the right, and a second panel arriving from the same edge with
 * different contents would read as that menu having changed. This belongs to
 * the document, so it comes up from the document.
 *
 * Every entry carries its page number. That is the thing a contents list can
 * offer once the paper is paginated and a printed one cannot — it is live,
 * and it re-numbers itself when the type size changes.
 */
export function ReaderIndex({
  open,
  chapters,
  currentBlock,
  onSelect,
  onClose,
}: {
  open: boolean
  chapters: Chapter[]
  /** The block the reader is currently on, for marking where they are. */
  currentBlock: number
  onSelect: (block: number) => void
  onClose: () => void
}) {
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // The last chapter at or before the reader's position — the section they
  // are inside, not the next one coming up.
  const activeBlock = chapters.reduce(
    (found, c) => (c.block <= currentBlock ? c.block : found),
    chapters[0]?.block ?? -1,
  )

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            onClick={onClose}
            className="absolute inset-0 z-30 bg-parchment/25"
          />
          <motion.nav
            aria-label="Contents"
            initial={reduceMotion ? false : { y: '100%' }}
            animate={{ y: 0 }}
            exit={reduceMotion ? undefined : { y: '100%' }}
            transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-x-0 bottom-0 z-30 max-h-[70%] overflow-y-auto border-t border-parchment/15 bg-void"
            style={{ paddingBottom: 'var(--safe-b)' }}
          >
            <div className="mx-auto max-w-3xl px-5 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-parchment/45">
                  Contents
                </h2>
                <button
                  onClick={onClose}
                  aria-label="Close contents"
                  className="-mr-2 p-2 text-parchment/60 transition hover:text-parchment"
                >
                  <CloseIcon className="size-5" />
                </button>
              </div>

              <ul className="mt-2">
                {chapters.map((c) => {
                  const here = c.block === activeBlock
                  return (
                    <li key={c.block}>
                      <button
                        onClick={() => onSelect(c.block)}
                        aria-current={here ? 'true' : undefined}
                        className={`flex w-full items-baseline gap-3 border-b border-parchment/10 py-3 text-left transition hover:text-gilt ${
                          here ? 'text-gilt' : 'text-parchment'
                        } ${c.level > 2 ? 'pl-4 text-sm text-parchment/65' : 'text-[15px]'}`}
                      >
                        <span className="min-w-0 flex-1 truncate">{c.text}</span>
                        <span className="shrink-0 font-mono text-[11px] tabular-nums text-parchment/40">
                          {c.page + 1}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  )
}
