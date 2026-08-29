import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Wordmark } from '@/components/Wordmark'
import {
  AccountIcon,
  BackIcon,
  CloseIcon,
  HomeIcon,
  MenuIcon,
  SearchIcon,
  SettingsIcon,
} from '@/components/Icons'

/**
 * Destinations in the drawer.
 *
 * Account and Settings are listed but disabled rather than hidden: the
 * platform is going to have both, and showing them greyed says "not yet"
 * where omitting them would say "never" — the same register the SOON badges
 * on the Store and Events tiles already use. They are rendered as `<span>`,
 * not disabled `<button>`, so the tab order skips them entirely instead of
 * offering focus to something that cannot be actioned.
 */
const LINKS = [
  { label: 'Home', to: '/', Icon: HomeIcon },
  { label: 'Account', to: null, Icon: AccountIcon },
  { label: 'Settings', to: null, Icon: SettingsIcon },
] as const

/**
 * The app's global header: wordmark centre, one control either side.
 *
 * Which controls depends on where you are, following the convention every
 * phone app shares — a root screen offers the menu, a screen you navigated
 * *into* offers a way back:
 *
 *   root (the feed)   menu · wordmark · search
 *   a screen below    back · wordmark · menu
 *
 * The menu shifts right rather than disappearing when Back takes the left
 * slot, so it is reachable from every screen and the right side is never a
 * gap.
 *
 * The wordmark is optically centred with `absolute` rather than by flex
 * spacing, because the two side controls are different widths — a plain
 * `justify-between` would push the mark off-centre by half that difference,
 * which is visible on a phone.
 *
 * Search expands in place over the bar rather than living permanently in it.
 * A phone header has room for one of {wordmark, search field}, not both, and
 * the wordmark is what tells you which app you are in.
 */
export function AppHeader({
  query,
  onQueryChange,
  backTo,
}: {
  /** Present only on screens that actually have something to search. */
  query?: string
  onQueryChange?: (next: string) => void
  /**
   * Where Back goes. An explicit destination rather than history: it is
   * predictable however the screen was reached, and a deep link opened in a
   * fresh tab has no history to pop. Omit on a screen that is its own root
   * — there is nothing above it to return to.
   */
  backTo?: string
}) {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const searchable = onQueryChange !== undefined

  // Focus follows the affordance: opening a search field that isn't focused
  // asks for a second tap to do the thing the first tap already said.
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  // Escape closes whichever layer is open, which is the one keyboard
  // convention a drawer and a search field both owe the user.
  useEffect(() => {
    if (!menuOpen && !searchOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setMenuOpen(false)
      closeSearch()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen, searchOpen])

  // Closing search clears the query as well as the field. Leaving a filter
  // applied behind a control the visitor just dismissed is how a screen ends
  // up looking empty for no visible reason.
  function closeSearch() {
    setSearchOpen(false)
    onQueryChange?.('')
  }

  return (
    <>
      <header
        className="sticky top-0 z-40 border-b border-parchment/15 bg-void/85 backdrop-blur-xl"
        style={{ paddingTop: 'var(--safe-t)' }}
      >
        <div className="relative mx-auto flex h-14 max-w-[var(--app-w)] items-center px-4 sm:px-8">
          {backTo ? (
            <button
              onClick={() => navigate(backTo)}
              aria-label="Back"
              className="relative z-10 -ml-2 p-2 text-parchment transition hover:text-gilt"
            >
              <BackIcon className="size-6" />
            </button>
          ) : (
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              className="relative z-10 -ml-2 p-2 text-parchment transition hover:text-gilt"
            >
              <MenuIcon className="size-6" />
            </button>
          )}

          {/* Centred against the bar, not against the gap between controls. */}
          <button
            onClick={() => navigate('/')}
            aria-label="bronze.fm home"
            className="absolute inset-x-0 mx-auto w-fit"
          >
            <Wordmark className="text-sm" />
          </button>

          {/* Right slot: search where there is something to search, else the
              menu that Back displaced from the left. */}
          {searchable ? (
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              aria-expanded={searchOpen}
              className="relative z-10 -mr-2 ml-auto p-2 text-parchment transition hover:text-gilt"
            >
              <SearchIcon className="size-6" />
            </button>
          ) : (
            backTo && (
              <button
                onClick={() => setMenuOpen(true)}
                aria-label="Open menu"
                aria-expanded={menuOpen}
                className="relative z-10 -mr-2 ml-auto p-2 text-parchment transition hover:text-gilt"
              >
                <MenuIcon className="size-6" />
              </button>
            )
          )}
        </div>

        {/*
          Overlays the bar's contents instead of pushing them aside, so the
          header keeps one height and the page below never reflows when
          search opens.
        */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.15 }}
              // z-20 clears the bar's own controls, which carry z-10 so they
              // sit above the centred wordmark. Without it the overlay paints
              // underneath them and the wordmark shows through the field.
              className="absolute inset-x-0 bottom-0 top-[var(--safe-t)] z-20 flex h-14 items-center gap-2 bg-void px-4 sm:px-8"
            >
              <SearchIcon className="size-5 shrink-0 text-parchment/40" />
              <input
                ref={searchRef}
                type="search"
                value={query ?? ''}
                onChange={(e) => onQueryChange?.(e.target.value)}
                placeholder="Search creators and content"
                aria-label="Search creators and content"
                // The native WebKit clear button is suppressed: it renders in
                // the browser's own blue, immediately beside our close
                // control, so the bar ends up with two adjacent crosses in
                // two different palettes.
                className="min-w-0 flex-1 bg-transparent text-sm text-parchment placeholder:text-parchment/30 focus:outline-none [&::-webkit-search-cancel-button]:appearance-none"
              />
              <button
                onClick={closeSearch}
                aria-label="Close search"
                className="-mr-2 shrink-0 p-2 text-parchment/60 transition hover:text-parchment"
              >
                <CloseIcon className="size-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.2 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-50 bg-parchment/25"
            />
            <motion.nav
              initial={reduceMotion ? false : { x: '-100%' }}
              animate={{ x: 0 }}
              exit={reduceMotion ? undefined : { x: '-100%' }}
              transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
              aria-label="Main"
              className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[80vw] flex-col border-r border-parchment/15 bg-void"
              style={{ paddingTop: 'var(--safe-t)', paddingBottom: 'var(--safe-b)' }}
            >
              <div className="flex h-14 items-center justify-between px-4">
                <Wordmark className="text-sm" />
                <button
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                  className="-mr-2 p-2 text-parchment/60 transition hover:text-parchment"
                >
                  <CloseIcon className="size-5" />
                </button>
              </div>

              <div className="mt-2 flex flex-col">
                {LINKS.map(({ label, to, Icon }) =>
                  to ? (
                    <button
                      key={label}
                      onClick={() => {
                        setMenuOpen(false)
                        navigate(to)
                      }}
                      className="flex items-center gap-3 px-4 py-3.5 text-left text-sm text-parchment transition hover:bg-ink"
                    >
                      <Icon className="size-5 text-gilt" />
                      {label}
                    </button>
                  ) : (
                    <span
                      key={label}
                      title={`${label} — not available yet`}
                      className="flex items-center gap-3 px-4 py-3.5 text-sm text-parchment/30"
                    >
                      <Icon className="size-5" />
                      {label}
                      <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.15em] text-parchment/30">
                        Soon
                      </span>
                    </span>
                  ),
                )}
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
