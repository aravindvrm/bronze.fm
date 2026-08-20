import { describe, expect, it } from 'vitest'
import { formatTime, formatTotal } from '@/lib/format'

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
