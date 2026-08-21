import { describe, expect, it } from 'vitest'
import {
  COOKIE_NAME,
  gateToken,
  loginPageHtml,
  readCookie,
  setCookieHeader,
  timingSafeEqual,
} from './middleware.helpers'

/**
 * middleware.ts itself cannot be executed outside a real Vercel Edge
 * deployment — there is no local emulator available here. This is the part
 * of the gate that actually gets verified: the crypto, the comparison, and
 * the cookie handling that decide whether a request gets through.
 */

describe('gateToken', () => {
  it('is deterministic for the same secret', async () => {
    expect(await gateToken('correct-horse')).toBe(await gateToken('correct-horse'))
  })

  it('differs for a different secret', async () => {
    expect(await gateToken('correct-horse')).not.toBe(await gateToken('wrong-horse'))
  })

  it('produces a fixed-length hex string, not the passcode itself', async () => {
    const token = await gateToken('a-real-passcode')
    expect(token).toMatch(/^[0-9a-f]{64}$/)
    expect(token).not.toContain('a-real-passcode')
  })
})

describe('timingSafeEqual', () => {
  it('matches identical strings', () => {
    expect(timingSafeEqual('abc123', 'abc123')).toBe(true)
  })

  it('rejects a different value of the same length', () => {
    expect(timingSafeEqual('abc123', 'abc124')).toBe(false)
  })

  it('rejects different lengths without throwing', () => {
    expect(timingSafeEqual('short', 'a-lot-longer-string')).toBe(false)
  })

  it('rejects the empty string against a real token', () => {
    // Guards the case where SITE_PASSCODE is unset and something upstream
    // passes '' through instead of failing closed explicitly.
    expect(timingSafeEqual('', 'anything')).toBe(false)
  })
})

describe('readCookie', () => {
  it('finds the named cookie among several', () => {
    expect(readCookie('a=1; bfm_gate=deadbeef; b=2', COOKIE_NAME)).toBe('deadbeef')
  })

  it('returns null when absent', () => {
    expect(readCookie('a=1; b=2', COOKIE_NAME)).toBeNull()
  })

  it('returns null for a null header', () => {
    expect(readCookie(null, COOKIE_NAME)).toBeNull()
  })

  it('decodes a URL-encoded value', () => {
    expect(readCookie(`${COOKIE_NAME}=hello%20world`, COOKIE_NAME)).toBe('hello world')
  })

  it('does not match a cookie whose name only contains the target as a substring', () => {
    // e.g. "not_bfm_gate=x" must not satisfy a lookup for "bfm_gate".
    expect(readCookie('not_bfm_gate=x', COOKIE_NAME)).toBeNull()
  })
})

describe('setCookieHeader', () => {
  it('sets the security attributes a session gate needs', () => {
    const header = setCookieHeader('sometoken')
    expect(header).toContain(`${COOKIE_NAME}=sometoken`)
    expect(header).toContain('HttpOnly')
    expect(header).toContain('Secure')
    expect(header).toContain('SameSite=Lax')
    expect(header).toContain('Path=/')
  })

  it('sets a 90-day expiry', () => {
    expect(setCookieHeader('x')).toContain(`Max-Age=${60 * 60 * 24 * 90}`)
  })
})

describe('loginPageHtml', () => {
  it('is marked noindex, since the whole point is that nobody unauthenticated sees it', () => {
    expect(loginPageHtml()).toContain('noindex')
  })

  it('shows an error message when given one', () => {
    expect(loginPageHtml('Wrong passcode.')).toContain('Wrong passcode.')
  })

  it('renders no error markup when none is given', () => {
    expect(loginPageHtml()).not.toContain('class="err"')
  })
})
