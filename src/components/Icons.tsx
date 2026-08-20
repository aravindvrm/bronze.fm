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
