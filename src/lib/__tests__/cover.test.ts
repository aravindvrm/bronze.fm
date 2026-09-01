import { describe, expect, it } from 'vitest'
import { headerBackgroundUrl } from '@/lib/cover'

describe('headerBackgroundUrl', () => {
  it('gives Bronze its own header art', () => {
    expect(headerBackgroundUrl('bronze')).toBeTruthy()
  })

  /*
   * Every OTHER project — the case an e2e test could not reach, since the
   * fixtures define no second Project with a music interface to visit. A
   * header background is decoration a creator supplied, not a fallback
   * every music page needs, so absent one, the header stays plain.
   */
  it('leaves a project with no header art unset', () => {
    expect(headerBackgroundUrl('atonomos')).toBeUndefined()
    expect(headerBackgroundUrl('some-unknown-project')).toBeUndefined()
  })

  it('handles a missing slug without throwing', () => {
    expect(headerBackgroundUrl(null)).toBeUndefined()
    expect(headerBackgroundUrl(undefined)).toBeUndefined()
  })
})
