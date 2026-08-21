import { next } from '@vercel/edge'
import { COOKIE_NAME, gateToken, loginPageHtml, readCookie, setCookieHeader, timingSafeEqual } from './middleware.helpers'

/**
 * Gates the entire deployment behind a shared passcode.
 *
 * The Supabase anon/publishable key ships in the client bundle by necessity
 * — that's how a static SPA talks to Supabase at all. But the media bucket's
 * "public" flag turned out to bypass RLS for *listing*, not just for
 * fetching a known path: `storage.objects.list` on a public bucket enumerates
 * every file with zero prior knowledge, confirmed directly against the live
 * project. So once any visitor extracts that key from devtools — which
 * "someone I show this to" plausibly includes, even by accident — the whole
 * catalog is downloadable directly from Supabase, forever, independent of
 * this site.
 *
 * RLS and bucket policy cannot retroactively protect a key that already
 * leaked, so the fix has to sit here: block the request before the browser
 * ever receives the JS bundle that contains the key. Gating the whole origin
 * — HTML, JS, everything — rather than just the app's own routes is the
 * point; a bookmarked asset URL must not bypass this either.
 *
 * A shared-passcode cookie rather than Vercel's own Deployment Protection:
 * that feature may be plan-gated, and this works identically on any plan,
 * lives in the repo, and is testable independent of the dashboard.
 */

export const config = {
  matcher: '/:path*',
}

export default async function middleware(request: Request): Promise<Response> {
  const secret = process.env.SITE_PASSCODE

  // Fail closed: an unset passcode locks everyone out, including whoever
  // forgot to set it, rather than silently leaving the gate open.
  if (!secret) {
    return new Response(loginPageHtml('Access temporarily unavailable.'), {
      status: 503,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })
  }

  const expected = await gateToken(secret)
  const cookie = readCookie(request.headers.get('cookie'), COOKIE_NAME)

  if (cookie && timingSafeEqual(cookie, expected)) {
    return next()
  }

  if (request.method === 'POST') {
    const form = await request.formData()
    const attempt = String(form.get('passcode') ?? '')

    if (timingSafeEqual(attempt, secret)) {
      const url = new URL(request.url)
      // POST → redirect → GET, so a page refresh never re-submits the form.
      return new Response(null, {
        status: 303,
        headers: {
          location: url.pathname + url.search,
          'set-cookie': setCookieHeader(expected),
        },
      })
    }

    return new Response(loginPageHtml('Wrong passcode.'), {
      status: 401,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })
  }

  return new Response(loginPageHtml(), {
    status: 401,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}
