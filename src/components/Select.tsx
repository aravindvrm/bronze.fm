import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

/**
 * The app's dropdown — the first one, so it is built to be the only one.
 *
 * Not a native `<select>`. That would be less code and accessible for free,
 * but on a phone it hands the choice to the OS: a full-height wheel on iOS,
 * a system dialog on Android, neither of which can be told about this app's
 * type, its square corners or its accent. A control that looks like the OS
 * in the middle of a screen that looks like this one is the seam worth the
 * extra code to avoid.
 *
 * What that costs is the keyboard and screen-reader behaviour a native
 * select gives away, so it is all here deliberately: listbox semantics,
 * arrows and Home/End to move, Enter or Space to take, Escape to leave with
 * focus back on the trigger, and a click anywhere else to dismiss.
 *
 * Chips were what this replaced. They read well at three types and fall
 * apart at eight — a row that either wraps onto two lines or scrolls
 * sideways, in a header that has room for neither.
 */

export interface SelectOption<T extends string> {
  value: T
  label: string
  /** A count, a duration — anything that belongs to the option but is not it. */
  hint?: string
}

export function Select<T extends string>({
  value,
  options,
  onChange,
  label,
  /** Marks the trigger as carrying a choice worth noticing. */
  accented = false,
}: {
  value: T
  options: SelectOption<T>[]
  onChange: (value: T) => void
  /** Names the control for anyone who cannot see where it sits. */
  label: string
  accented?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listId = useId()
  const reduceMotion = useReducedMotion()

  const selected = options.find((o) => o.value === value) ?? options[0]

  // Opening lands on the current choice, not the top of the list: the first
  // arrow press should step away from where you are, not jump to the start.
  useEffect(() => {
    if (open)
      setActive(
        Math.max(
          0,
          options.findIndex((o) => o.value === value),
        ),
      )
  }, [open, options, value])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    // `pointerdown`, not `click`: a click fires after the press completes, so
    // a dismissing tap would also land on whatever is underneath it.
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const close = (refocus = true) => {
    setOpen(false)
    if (refocus) triggerRef.current?.focus()
  }

  const take = (option: SelectOption<T>) => {
    onChange(option.value)
    close()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(options.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActive(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActive(options.length - 1)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      take(options[active])
    } else if (e.key === 'Tab') {
      // Leaving by keyboard should not strand an open panel behind.
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className="relative" onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 border px-2.5 py-1 font-mono text-[10px] tracking-[0.08em] transition ${
          accented
            ? 'border-ember/60 bg-gilt/15 text-ember'
            : 'border-parchment/20 text-parchment/55 hover:border-parchment/35 hover:text-parchment'
        }`}
      >
        {selected?.label}
        {/* Rotates rather than swapping glyph, so the control says which way
            it is going as well as which state it is in. */}
        <motion.span
          aria-hidden
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.18 }}
          className="leading-none"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="size-2.5"
          >
            <path d="m5 9 7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            id={listId}
            role="listbox"
            aria-label={label}
            aria-activedescendant={`${listId}-${active}`}
            tabIndex={-1}
            initial={reduceMotion ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: reduceMotion ? 0 : 0.14 }}
            /*
              Anchored to the trigger's right edge, because this sits at the
              right of a header row and a left-anchored panel would hang off
              the screen. `min-w-full` so it is never narrower than the thing
              that opened it.
            */
            className="absolute right-0 z-30 mt-1 min-w-full whitespace-nowrap border border-parchment/20 bg-void shadow-lg shadow-shade"
          >
            {options.map((option, i) => {
              const isSelected = option.value === value
              return (
                <li
                  key={option.value}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={isSelected}
                  onPointerEnter={() => setActive(i)}
                  onClick={() => take(option)}
                  className={`flex cursor-pointer items-center gap-4 border-l-2 py-2 pl-2.5 pr-3 font-mono text-[10px] tracking-[0.08em] transition ${
                    isSelected
                      ? 'border-l-ember text-ember'
                      : 'border-l-transparent text-parchment/70'
                  } ${i === active ? 'bg-parchment/[0.06]' : ''}`}
                >
                  <span className="flex-1">{option.label}</span>
                  {option.hint && (
                    <span className={isSelected ? 'text-ember/60' : 'text-parchment/35'}>
                      {option.hint}
                    </span>
                  )}
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
