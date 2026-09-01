type P = { className?: string }

export const PlayIcon = ({ className = 'size-6' }: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l10.3-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14Z" />
  </svg>
)

export const PauseIcon = ({ className = 'size-6' }: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <rect x="6" y="4.5" width="4" height="15" rx="1.2" />
    <rect x="14" y="4.5" width="4" height="15" rx="1.2" />
  </svg>
)

export const NextIcon = ({ className = 'size-6' }: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M6 5.2v13.6a1 1 0 0 0 1.53.85l9-6.8a1 1 0 0 0 0-1.7l-9-6.8A1 1 0 0 0 6 5.2Z" />
    <rect x="17.4" y="4.6" width="2.6" height="14.8" rx="1.1" />
  </svg>
)

export const PrevIcon = ({ className = 'size-6' }: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M18 5.2v13.6a1 1 0 0 1-1.53.85l-9-6.8a1 1 0 0 1 0-1.7l9-6.8A1 1 0 0 1 18 5.2Z" />
    <rect x="4" y="4.6" width="2.6" height="14.8" rx="1.1" />
  </svg>
)

export const ChevronDown = ({ className = 'size-6' }: P) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    className={className}
    aria-hidden
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
)

export const ContentsIcon = ({ className = 'size-6' }: P) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    className={className}
    aria-hidden
  >
    <path d="M4 6h16M4 12h16M4 18h10" />
  </svg>
)

export const SunIcon = ({ className = 'size-6' }: P) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    className={className}
    aria-hidden
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
)

export const MoonIcon = ({ className = 'size-6' }: P) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </svg>
)

export const BackIcon = ({ className = 'size-6' }: P) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    <path d="m15 18-6-6 6-6" />
  </svg>
)

export const QueueIcon = ({ className = 'size-6' }: P) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    className={className}
    aria-hidden
  >
    <path d="M4 6h11M4 12h11M4 18h7" />
    <path d="M18 10v8.5" />
    <circle cx="16.4" cy="18.6" r="1.9" fill="currentColor" stroke="none" />
    <path d="M18 10c1.2.5 2.4.7 3 .7" />
  </svg>
)

export const VolumeIcon = ({ className = 'size-5', muted = false }: P & { muted?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" fill="currentColor" />
    {muted ? (
      <path d="m16 9 5 6M21 9l-5 6" />
    ) : (
      <>
        <path d="M15.5 8.8a4.5 4.5 0 0 1 0 6.4" />
        <path d="M18.5 6.2a8.5 8.5 0 0 1 0 11.6" />
      </>
    )}
  </svg>
)

/*
 * Section icons — Material Symbols (Apache-2.0), inlined like the rest of this
 * file so they take `currentColor` and tint with the tile they sit on. Their
 * 0 -960 960 960 viewBox is Material's own coordinate system, not a mistake.
 */

export const MusicIcon = ({ className = 'size-6' }: P) => (
  <svg viewBox="0 -960 960 960" fill="currentColor" className={className} aria-hidden>
    <path d="M127-167q-47-47-47-113t47-113q47-47 113-47 23 0 42.5 5.5T320-418v-342l480-80v480q0 66-47 113t-113 47q-66 0-113-47t-47-113q0-66 47-113t113-47q23 0 42.5 5.5T720-498v-165l-320 63v320q0 66-47 113t-113 47q-66 0-113-47Z" />
  </svg>
)

export const VideosIcon = ({ className = 'size-6' }: P) => (
  <svg viewBox="0 -960 960 960" fill="currentColor" className={className} aria-hidden>
    <path d="m460-380 280-180-280-180v360ZM320-240q-33 0-56.5-23.5T240-320v-480q0-33 23.5-56.5T320-880h480q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H320Zm0-80h480v-480H320v480ZM160-80q-33 0-56.5-23.5T80-160v-560h80v560h560v80H160Zm160-720v480-480Z" />
  </svg>
)

export const StoreIcon = ({ className = 'size-6' }: P) => (
  <svg viewBox="0 -960 960 960" fill="currentColor" className={className} aria-hidden>
    <path d="M223.5-103.5Q200-127 200-160t23.5-56.5Q247-240 280-240t56.5 23.5Q360-193 360-160t-23.5 56.5Q313-80 280-80t-56.5-23.5Zm400 0Q600-127 600-160t23.5-56.5Q647-240 680-240t56.5 23.5Q760-193 760-160t-23.5 56.5Q713-80 680-80t-56.5-23.5ZM246-720l96 200h280l110-200H246Zm-38-80h590q23 0 35 20.5t1 41.5L692-482q-11 20-29.5 31T622-440H324l-44 80h480v80H280q-45 0-68-39.5t-2-78.5l54-98-144-304H40v-80h130l38 80Zm134 280h280-280Z" />
  </svg>
)

export const EventsIcon = ({ className = 'size-6' }: P) => (
  <svg viewBox="0 -960 960 960" fill="currentColor" className={className} aria-hidden>
    <path d="M80-80q29-74 38.5-152.5T130-390q-39-15-64.5-50T40-520v-80q115-38 234.5-116T480-880q86 86 205.5 164T920-600v80q0 45-25.5 80T830-390q2 79 11.5 157.5T880-80H80Zm156-520h488q-78-44-140.5-90.5T480-772q-41 35-103.5 81.5T236-600Zm344 140q25 0 42.5-17.5T640-520H520q0 25 17.5 42.5T580-460Zm-200 0q25 0 42.5-17.5T440-520H320q0 25 17.5 42.5T380-460Zm-200 0q25 0 42.5-17.5T240-520H120q0 25 17.5 42.5T180-460Zm6 300h107q9-60 14-119t8-119q-9-5-18-10.5T280-422q-15 15-32.5 24.5T210-383q-2 57-7 112.5T186-160Zm188 0h212q-8-55-12.5-110T566-381q-26-2-47.5-12.5T480-421q-17 17-39.5 27.5T394-381q-3 56-7.5 111T374-160Zm293 0h107q-12-55-17-110.5T750-383q-20-5-38-14.5T680-422q-8 8-17 13.5T645-398q3 60 8.5 119T667-160Zm113-300q25 0 42.5-17.5T840-520H720q0 25 17.5 42.5T780-460Z" />
  </svg>
)

export const ReadIcon = ({ className = 'size-6' }: P) => (
  <svg viewBox="0 -960 960 960" fill="currentColor" className={className} aria-hidden>
    <path d="M560-564v-68q33-14 67.5-21t72.5-7q26 0 51 4t49 10v64q-24-9-48.5-13.5T700-600q-38 0-73 9.5T560-564Zm0 220v-68q33-14 67.5-21t72.5-7q26 0 51 4t49 10v64q-24-9-48.5-13.5T700-380q-38 0-73 9t-67 27Zm0-110v-68q33-14 67.5-21t72.5-7q26 0 51 4t49 10v64q-24-9-48.5-13.5T700-490q-38 0-73 9.5T560-454ZM260-320q47 0 91.5 10.5T440-278v-394q-41-24-87-36t-93-12q-36 0-71.5 7T120-692v396q35-12 69.5-18t70.5-6Zm260 42q44-21 88.5-31.5T700-320q36 0 70.5 6t69.5 18v-396q-33-14-68.5-21t-71.5-7q-47 0-93 12t-87 36v394Zm-40 118q-48-38-104-59t-116-21q-42 0-82.5 11T100-198q-21 11-40.5-1T40-234v-482q0-11 5.5-21T62-752q46-24 96-36t102-12q58 0 113.5 15T480-740q51-30 106.5-45T700-800q52 0 102 12t96 36q11 5 16.5 15t5.5 21v482q0 23-19.5 35t-40.5 1q-37-20-77.5-31T700-240q-60 0-116 21t-104 59Z" />
  </svg>
)

/*
 * Social marks — the real logomarks, from Simple Icons (simpleicons.org),
 * which is CC0 and exists for exactly this purpose.
 *
 * These replaced a set of deliberately-vague stand-ins written to dodge the
 * trademark question. That conflated two separate things: the artwork
 * licence, which CC0 settles outright, and trademark, which no icon set can
 * waive but which does not bar using a platform's mark to link to a profile
 * on that platform. That is nominative use, and it is what every social row
 * on the web does. The stand-ins also failed at the job — the X one was a
 * bare ✕, indistinguishable from a close button.
 *
 * Filled paths on a 24px grid, inheriting `currentColor`, so they take the
 * accent and dimmed treatments the profile already applies.
 */

export const InstagramIcon = ({ className = 'size-5' }: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
  </svg>
)

export const SpotifyIcon = ({ className = 'size-5' }: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
  </svg>
)

export const YoutubeIcon = ({ className = 'size-5' }: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
)

export const LinkedInIcon = ({ className = 'size-5' }: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
)

export const XIcon = ({ className = 'size-5' }: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
  </svg>
)

export const MenuIcon = ({ className = 'size-6' }: P) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    className={className}
    aria-hidden
  >
    <path d="M3 6h18M3 12h18M3 18h18" />
  </svg>
)

export const SearchIcon = ({ className = 'size-6' }: P) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    className={className}
    aria-hidden
  >
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)

export const CloseIcon = ({ className = 'size-6' }: P) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    className={className}
    aria-hidden
  >
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

export const HomeIcon = ({ className = 'size-6' }: P) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z" />
  </svg>
)

export const AccountIcon = ({ className = 'size-6' }: P) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    className={className}
    aria-hidden
  >
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
  </svg>
)

export const SettingsIcon = ({ className = 'size-6' }: P) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    className={className}
    aria-hidden
  >
    <circle cx="12" cy="12" r="3.25" />
    <path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3" />
  </svg>
)

/**
 * A heart, in one shape with two fills.
 *
 * One path rather than an outline icon and a solid one, because two
 * different silhouettes swapping on tap is a shape change where the design
 * only asks for a colour change — the outline reads as slightly smaller
 * than the fill at the same size, so the row twitches when it is pressed.
 * `filled` moves paint into the interior and leaves the edge where it is.
 */
export const HeartIcon = ({ className = 'size-6', filled = false }: P & { filled?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    <path d="M12 20.3 4.6 13a4.6 4.6 0 0 1 6.5-6.5l.9.9.9-.9A4.6 4.6 0 1 1 19.4 13Z" />
  </svg>
)
