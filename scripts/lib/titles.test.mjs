import { describe, expect, it } from 'vitest'
import { cleanTitle, isInterludeTitle } from './titles.mjs'

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

describe('isInterludeTitle', () => {
  it('matches the original "(Skit)" marker', () => {
    expect(isInterludeTitle('01 - Bronze Age (Skit).mp3')).toBe(true)
  })

  /*
   * The reworked album renamed every skit to a "(Scene N)" — same four
   * tracks, same durations, new word. Losing this match would silently
   * recategorise a 10-second narrative beat as a full song: it would gain
   * an artist credit it doesn't have and lose its "Interlude" label in the
   * track list and queue.
   */
  it('matches the reworked "(Scene N)" marker', () => {
    expect(isInterludeTitle('01 - Bronze Age (Opening Scene).mp3')).toBe(true)
    expect(isInterludeTitle('05 - Polished Bronze (Scene 2).mp3')).toBe(true)
    expect(isInterludeTitle('08 - Bronze Alloy (Scene 3).mp3')).toBe(true)
    expect(isInterludeTitle('12 - Bronze Medal (Scene 4).mp3')).toBe(true)
  })

  it('does not match a real song title', () => {
    expect(isInterludeTitle('10 - WeWork.mp3')).toBe(false)
    expect(isInterludeTitle('02 - Bronze.mp3')).toBe(false)
  })

  it('does not match "scene" as a substring of another word', () => {
    expect(isInterludeTitle('06 - Behind the Scenes.mp3')).toBe(false)
  })
})
