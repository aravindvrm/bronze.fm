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
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden>
    <path d="m6 9 6 6 6-6" />
  </svg>
)

export const BackIcon = ({ className = 'size-6' }: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="m15 18-6-6 6-6" />
  </svg>
)

export const QueueIcon = ({ className = 'size-6' }: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden>
    <path d="M4 6h11M4 12h11M4 18h7" />
    <path d="M18 10v8.5" />
    <circle cx="16.4" cy="18.6" r="1.9" fill="currentColor" stroke="none" />
    <path d="M18 10c1.2.5 2.4.7 3 .7" />
  </svg>
)

export const VolumeIcon = ({ className = 'size-5', muted = false }: P & { muted?: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
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
 * Social glyphs — deliberately generic renderings of each platform's shape
 * (a camera lens, a play triangle, a soundwave, a slash) rather than a traced
 * reproduction of the trademarked logomark. Enough to identify the platform
 * next to a label; not a copy of the brand asset.
 */

export const InstagramIcon = ({ className = 'size-5' }: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className} aria-hidden>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="4.2" />
    <circle cx="17" cy="7" r="0.9" fill="currentColor" stroke="none" />
  </svg>
)

export const SpotifyIcon = ({ className = 'size-5' }: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className={className} aria-hidden>
    <circle cx="12" cy="12" r="9" />
    <path d="M7 10c3.5-1 6.5-1 10 .8" />
    <path d="M7.5 13c2.8-.8 5.2-.8 8 .6" />
    <path d="M8 16c2.2-.6 4-.6 6 .4" />
  </svg>
)

export const YoutubeIcon = ({ className = 'size-5' }: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" className={className} aria-hidden>
    <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
    <path d="M10.5 9.3v5.4l4.8-2.7-4.8-2.7Z" fill="currentColor" stroke="none" />
  </svg>
)

export const LinkedInIcon = ({ className = 'size-5' }: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className={className} aria-hidden>
    <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
    <path d="M8 10.5v6" />
    <circle cx="8" cy="7.6" r="0.9" fill="currentColor" stroke="none" />
    <path d="M12 16.5v-3.4a2.4 2.4 0 0 1 4.8 0v3.4" />
  </svg>
)

export const XIcon = ({ className = 'size-5' }: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className={className} aria-hidden>
    <path d="M5 5l14 14M19 5 5 19" />
  </svg>
)

export const MenuIcon = ({ className = 'size-6' }: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden>
    <path d="M3 6h18M3 12h18M3 18h18" />
  </svg>
)

export const SearchIcon = ({ className = 'size-6' }: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)

export const CloseIcon = ({ className = 'size-6' }: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

export const HomeIcon = ({ className = 'size-6' }: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z" />
  </svg>
)

export const AccountIcon = ({ className = 'size-6' }: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
  </svg>
)

export const SettingsIcon = ({ className = 'size-6' }: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden>
    <circle cx="12" cy="12" r="3.25" />
    <path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3" />
  </svg>
)
