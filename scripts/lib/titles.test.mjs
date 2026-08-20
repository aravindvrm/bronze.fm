import { describe, expect, it } from 'vitest'
import { cleanTitle } from './titles.mjs'

describe('cleanTitle', () => {
  it('strips the leading track number', () => {
    expect(cleanTitle('02 - Bronze.mp3')).toBe('Bronze')
  })

  it('restores an apostrophe lost to filename escaping', () => {
    expect(cleanTitle('03 - Let_s Play A Game.mp3')).toBe("Let's Play A Game")
  })

  it('keeps parenthetical markers', () => {
    expect(cleanTitle('01 - Bronze Age (Skit).mp3')).toBe('Bronze Age (Skit)')
  })

  it('leaves working-title stamps alone', () => {
    // Deliberate: these are Dean's to rename, not ours to guess at.
    expect(cleanTitle('13 - 8.3 The Wait Is Over.mp3')).toBe('8.3 The Wait Is Over')
  })

  it('collapses repeated whitespace', () => {
    expect(cleanTitle('05 -   Polished   Bronze.mp3')).toBe('Polished Bronze')
  })

  it('is case-insensitive about the extension', () => {
    expect(cleanTitle('07 - Naked.MP3')).toBe('Naked')
  })
})
