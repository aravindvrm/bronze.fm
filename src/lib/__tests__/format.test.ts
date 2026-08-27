import { describe, expect, it } from 'vitest'
import { formatRelative, formatTime, formatTotal } from '@/lib/format'

describe('formatTime', () => {
  it('pads seconds', () => {
    expect(formatTime(5)).toBe('0:05')
    expect(formatTime(65)).toBe('1:05')
  })

  it('handles long durations', () => {
    expect(formatTime(3599)).toBe('59:59')
  })

  it('floors partial seconds', () => {
    expect(formatTime(9.9)).toBe('0:09')
  })

  it.each([
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['negative', -5],
  ])('returns 0:00 for %s', (_l, v) => {
    // duration is NaN until loadedmetadata fires — this must not render "NaN:NaN".
    expect(formatTime(v)).toBe('0:00')
  })
})

describe('formatTotal', () => {
  it('renders minutes and seconds', () => {
    expect(formatTotal(2273000)).toBe('37 min 53 sec')
  })

  it('handles zero', () => {
    expect(formatTotal(0)).toBe('0 min 0 sec')
  })
})

describe('formatRelative', () => {
  const now = new Date('2026-08-27T12:00:00.000Z')

  it.each([
    ['just now', '2026-08-27T11:59:45.000Z', 'just now'],
    ['minutes', '2026-08-27T11:45:00.000Z', '15 min ago'],
    ['one hour, singular', '2026-08-27T11:00:00.000Z', '1 hour ago'],
    ['hours, plural', '2026-08-27T06:00:00.000Z', '6 hours ago'],
    ['one day, singular', '2026-08-26T12:00:00.000Z', '1 day ago'],
    ['days, plural', '2026-08-24T12:00:00.000Z', '3 days ago'],
    ['one week, singular', '2026-08-20T12:00:00.000Z', '1 week ago'],
    ['weeks, plural', '2026-08-06T12:00:00.000Z', '3 weeks ago'],
  ])('%s', (_label, iso, expected) => {
    expect(formatRelative(iso, now)).toBe(expected)
  })

  it('falls back to the year past 52 weeks', () => {
    expect(formatRelative('2024-01-15T12:00:00.000Z', now)).toBe('2024')
  })

  it('returns empty for an unparseable date rather than "Invalid Date"', () => {
    expect(formatRelative('not-a-date', now)).toBe('')
  })
})
