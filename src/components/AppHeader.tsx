import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useScrolledPast } from '@/lib/useScrolledPast'
import { content as adapter } from '@/content/adapter'
import { SEARCH_PLACEHOLDER, isQueryable } from '@/content/search'
import type { SearchHit } from '@/content/types'
import { Wordmark } from '@/components/Wordmark'
import { useTheme } from '@/lib/theme'
import {
  AccountIcon,
  BackIcon,
  CloseIcon,
  HomeIcon,
  MenuIcon,
  MoonIcon,
  SearchIcon,
  SettingsIcon,
  SunIcon,
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
 *   root (the feed)   search · wordmark · menu
 *   a screen below    back   · wordmark · menu
 *
 * The menu is ALWAYS on the right, on every screen, and the drawer opens
 * from that same edge — a control that moves between screens is a control
 * you have to look for. The left slot is the one that varies, holding
 * whatever action belongs to the screen you are on: search where there is
 * something to search, a way back where there is somewhere above.
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
  /*
   * Screen-local search.
   *
   * When these are given, the field filters THIS screen and nothing else —
   * the reader's find-in-paper. When they are absent the field searches the
   * whole app instead, showing quick hits and handing off to /search.
   *
   * The distinction is by presence rather than by a mode flag because there
   * is exactly one screen that owns its own query, and a boolean would
   * invite a third state neither branch implements.
   */
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
  const theme = useTheme((s) => s.theme)
  const toggleTheme = useTheme((s) => s.toggle)
  const scrolled = useScrolledPast()
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const screenLocal = onQueryChange !== undefined
  // Every screen can search the app; only some can search themselves.
  const searchable = true

  /* Quick hits, for the global case. */
  const [draft, setDraft] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const text = screenLocal ? (query ?? '') : draft

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
    setDraft('')
    setHits([])
  }

  /*
   * A handful of hits, enough to answer "is the thing I want right here".
   *
   * Flattened across kinds and capped hard: this is a peek, and the screen
   * is where grouping and counts live. Debounced, and late answers are
   * dropped — a slow response to a shorter prefix must not overwrite a fast
   * one to what was actually typed.
   */
  useEffect(() => {
    if (screenLocal || !searchOpen) return
    const q = draft.trim()
    if (!isQueryable(q)) {
      setHits([])
      return
    }
    let stale = false
    const timer = window.setTimeout(() => {
      void adapter.search(q, { perGroup: 3 }).then((found) => {
        if (stale) return
        setHits([...found.creators, ...found.projects, ...found.contents].slice(0, 6))
      })
    }, 180)
    return () => {
      stale = true
      window.clearTimeout(timer)
    }
  }, [draft, screenLocal, searchOpen])

  function seeAll() {
    const q = draft.trim()
    closeSearch()
    navigate(`/search${q ? `?q=${encodeURIComponent(q)}` : ''}`)
  }

  return (
    <>
      <header
        className={`sticky top-0 z-40 transition-colors duration-200 ${
          scrolled ? 'bg-void/80 backdrop-blur-xl' : ''
        }`}
        style={{ paddingTop: 'var(--safe-t)' }}
      >
        {/* px-5 to match every screen's content column, so the controls land
            on the same margins as the page beneath them. */}
        <div className="relative mx-auto flex h-14 max-w-[var(--app-w)] items-center px-5 sm:px-8">
          {/*
            Left slot: whatever this screen offers, and it can be both. Back
            used to win outright, which silently cost the reader its search —
            a screen you can leave AND search inside had no way to reach the
            field. The menu stays alone on the right either way.
          */}
          <div className="relative z-10 -ml-2 flex items-center">
            {backTo && (
              <button
                onClick={() => navigate(backTo)}
                aria-label="Back"
                className="p-2 text-parchment transition hover:text-ember"
              >
                <BackIcon className="size-6" />
              </button>
            )}
            {searchable && (
              <button
                onClick={() => setSearchOpen(true)}
                aria-label="Search"
                aria-expanded={searchOpen}
                className="p-2 text-parchment transition hover:text-ember"
              >
                <SearchIcon className="size-6" />
              </button>
            )}
            {!backTo && !searchable && (
              // Holds the slot so the wordmark's neighbours stay balanced on
              // a screen that offers neither.
              <span className="size-10" aria-hidden />
            )}
          </div>

          {/* Centred against the bar, not against the gap between controls. */}
          {/* The wordmark alone. A reader's chapter title briefly lived under
              it and crowded the bar — where you are inside a screen belongs
              to that screen's own chrome, not to the app's. */}
          <button
            onClick={() => navigate('/')}
            aria-label="bronze.fm home"
            className="absolute inset-x-0 mx-auto w-fit"
          >
            <Wordmark className="text-base" />
          </button>

          {/* Right slot: the menu, on every screen without exception. */}
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className="relative z-10 -mr-2 ml-auto p-2 text-parchment transition hover:text-ember"
          >
            <MenuIcon className="size-6" />
          </button>
        </div>

        {/*
          Overlays the bar's contents instead of pushing them aside, so the
          header keeps one height and the page below never reflows when
          search opens.
        */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              /*
               * Wiped open left to right rather than faded. `clip-path`
               * rather than width or scaleX: the contents are laid out at
               * full size from the first frame and merely revealed, so
               * nothing reflows mid-animation and no glyph is stretched on
               * the way in.
               */
              initial={reduceMotion ? false : { clipPath: 'inset(0 100% 0 0)' }}
              animate={{ clipPath: 'inset(0 0% 0 0)' }}
              exit={reduceMotion ? undefined : { clipPath: 'inset(0 100% 0 0)' }}
              transition={{ duration: reduceMotion ? 0 : 0.32, ease: [0.16, 1, 0.3, 1] }}
              // `inset-0`, not inset-x + top-[safe]: the accent has to fill
              // the safe-area strip too, or a notched phone shows a band of
              // page background sitting above the bar.
              //
              // z-20 clears the bar's own controls, which carry z-10 so they
              // sit above the centred wordmark. Without it the overlay paints
              // underneath them and the wordmark shows through the field.
              style={{ paddingTop: 'var(--safe-t)' }}
              className="absolute inset-0 z-20 flex items-center gap-2 bg-gilt px-5 sm:px-8"
            >
              {/* On the accent, white is the readable pairing — the same
                  inversion the wordmark's badge and the primary buttons use.
                  Full white on #ad630e measures 4.6:1; the softer weights
                  here stay above 3:1. */}
              <SearchIcon className="size-5 shrink-0 text-on-accent/80" />
              <input
                ref={searchRef}
                type="search"
                value={text}
                onChange={(e) =>
                  screenLocal ? onQueryChange?.(e.target.value) : setDraft(e.target.value)
                }
                onKeyDown={(e) => {
                  // Enter is the shortest path to the full results, and the
                  // one a keyboard reaches for without being told.
                  if (!screenLocal && e.key === 'Enter') seeAll()
                }}
                placeholder={screenLocal ? 'Search this paper' : SEARCH_PLACEHOLDER}
                aria-label={screenLocal ? 'Search this paper' : SEARCH_PLACEHOLDER}
                // The native WebKit clear button is suppressed: it renders in
                // the browser's own blue, immediately beside our close
                // control, so the bar ends up with two adjacent crosses in
                // two different palettes.
                className="min-w-0 flex-1 bg-transparent text-sm text-on-accent caret-on-accent placeholder:text-on-accent/80 focus:outline-none [&::-webkit-search-cancel-button]:appearance-none"
              />
              <button
                onClick={closeSearch}
                aria-label="Close search"
                className="-mr-2 shrink-0 p-2 text-on-accent/80 transition hover:text-on-accent"
              >
                <CloseIcon className="size-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/*
          Quick hits, under the bar.
          
          A peek, not the results: a flat handful across all kinds, with the
          grouping and the counts left to the screen. Only for global search
          — the reader filters its own page as you type and has nothing to
          preview.
          
          Outside the wiping overlay above, because that animates `clip-path`
          and anything inside it would be clipped away with the bar.
        */}
        <AnimatePresence>
          {searchOpen && !screenLocal && isQueryable(draft.trim()) && (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: reduceMotion ? 0 : 0.16 }}
              className="absolute inset-x-0 top-full z-20 border-b border-parchment/15 bg-void shadow-lg shadow-shade"
            >
              <div className="mx-auto max-w-[var(--app-w)] px-5 sm:px-8">
                <ul className="divide-y divide-parchment/10">
                  {hits.map((hit) => (
                    <li key={hit.id}>
                      <button
                        onClick={() => {
                          closeSearch()
                          navigate(hit.href)
                        }}
                        className="group/hit flex w-full items-center gap-3 py-2.5 text-left"
                      >
                        {/*
                          A face for a person, a cover for a work — the same
                          two shapes they have everywhere else, so a row is
                          recognisable before it is read. Round with the
                          accent ring for a creator, square for a release, is
                          the whole of the distinction and it needs no label.
                        */}
                        {hit.imageUrl && (
                          <img
                            src={hit.imageUrl}
                            alt=""
                            className={`size-8 shrink-0 object-cover ${
                              hit.kind === 'creator' ? 'rounded-full ring-1 ring-ember/50' : ''
                            }`}
                          />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-parchment transition group-hover/hit:text-ember">
                            {hit.title}
                          </span>
                          {hit.subtitle && (
                            <span className="mt-0.5 block truncate font-mono text-[10px] text-parchment/45">
                              {hit.subtitle}
                            </span>
                          )}
                        </span>
                        {hit.badge && (
                          <span className="shrink-0 border border-ember/35 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-ember/80">
                            {hit.badge}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={seeAll}
                  className="w-full py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-ember transition hover:opacity-80"
                >
                  {hits.length ? 'See all results' : `Search for “${draft.trim()}”`}
                </button>
              </div>
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
            {/* Opens from the right, the edge its button sits on: a panel
                that flies in from the opposite side of the screen reads as
                unrelated to the control that summoned it. Close lands under
                the same thumb that opened it, for the same reason. */}
            <motion.nav
              initial={reduceMotion ? false : { x: '100%' }}
              animate={{ x: 0 }}
              exit={reduceMotion ? undefined : { x: '100%' }}
              transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
              aria-label="Main"
              /* On the accent, like the search bar it shares an edge with —
                 the two are the same gesture opening from the same side. Every
                 colour inside is therefore stated against red, not inherited
                 from the page: an accent-coloured icon would vanish here. */
              className="fixed inset-y-0 right-0 z-50 flex w-72 max-w-[80vw] flex-col bg-gilt"
              style={{ paddingTop: 'var(--safe-t)', paddingBottom: 'var(--safe-b)' }}
            >
              <div className="flex h-14 items-center justify-between px-4">
                <Wordmark className="text-base" inverted />
                <button
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                  className="-mr-2 p-2 text-on-accent/80 transition hover:text-on-accent"
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
                      className="flex items-center gap-3 px-4 py-3.5 text-left text-sm text-on-accent transition hover:bg-on-accent/15"
                    >
                      <Icon className="size-5 text-on-accent" />
                      {label}
                    </button>
                  ) : (
                    <span
                      key={label}
                      title={`${label} — not available yet`}
                      className="flex items-center gap-3 px-4 py-3.5 text-sm text-on-accent/65"
                    >
                      <Icon className="size-5" />
                      {label}
                      <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.15em] text-on-accent/65">
                        Soon
                      </span>
                    </span>
                  ),
                )}
              </div>

              {/*
                At the foot, below the destinations and pushed there by
                `mt-auto`: it is a setting, not a place to go, and putting it
                in the same list would say otherwise.

                A switch rather than a system/light/dark triple. The stored
                choice is the only source of truth — see src/lib/theme.ts for
                why nothing here consults `prefers-color-scheme`.

                Both icons are always drawn, the current one lit and the other
                dimmed, so the control shows its two states at rest rather
                than making you press it to find out what it does.
              */}
              <button
                onClick={toggleTheme}
                role="switch"
                aria-checked={theme === 'dark'}
                aria-label="Dark mode"
                className="mt-auto flex items-center gap-3 border-t border-on-accent/20 px-4 py-4 text-left text-sm text-on-accent transition hover:bg-on-accent/15"
              >
                <SunIcon className={`size-5 ${theme === 'light' ? '' : 'opacity-40'}`} />
                <MoonIcon className={`size-5 ${theme === 'dark' ? '' : 'opacity-40'}`} />
                <span className="ml-1">{theme === 'dark' ? 'Dark' : 'Light'}</span>
                {/* The track and knob, drawn in what sits ON the accent —
                    this whole panel is the accent, so the usual page tokens
                    would be invisible here. */}
                <span
                  aria-hidden
                  className="ml-auto flex h-5 w-9 shrink-0 items-center rounded-full bg-on-accent/25 p-0.5"
                >
                  <span
                    className={`size-4 rounded-full bg-on-accent transition-transform ${
                      theme === 'dark' ? 'translate-x-4' : ''
                    }`}
                  />
                </span>
              </button>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
