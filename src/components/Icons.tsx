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
