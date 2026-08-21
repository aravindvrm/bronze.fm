/**
 * Pure logic for the passcode gate in middleware.ts.
 *
 * Kept dependency-free and free of the Vercel Request/Response wrapper so it
 * can run under Vitest (Node) exactly as it runs under the Edge runtime —
 * the Edge Middleware itself cannot be executed outside a real Vercel
 * deployment, so this is the part of the gate that actually gets tested.
 */

const COOKIE_NAME = 'bfm_gate'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 90 // 90 days

/**
 * HMAC-SHA256 over a fixed message, keyed by the shared passcode.
 *
 * The cookie stores this, not the passcode itself: a stolen cookie proves
 * "the server validated a passcode at some point," and is useless for
 * deriving what that passcode was.
 */
export async function gateToken(secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('bronze-fm-gate-v1'))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Constant-time string comparison — a passcode check must not leak timing. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    const key = part.slice(0, eq).trim()
    if (key === name) return decodeURIComponent(part.slice(eq + 1).trim())
  }
  return null
}

export function setCookieHeader(value: string): string {
  return `${COOKIE_NAME}=${value}; Path=/; Max-Age=${MAX_AGE_SECONDS}; HttpOnly; Secure; SameSite=Lax`
}

export function loginPageHtml(error?: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>bronze.fm</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
    background:#0a0705; color:#f5e3c0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
  form { width:min(320px,90vw); text-align:center; }
  h1 { font-family:Georgia,serif; font-size:2rem; margin:0 0 1.5rem; letter-spacing:-0.01em; }
  input { width:100%; box-sizing:border-box; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15);
    border-radius:12px; padding:0.85rem 1rem; color:#f5e3c0; font-size:1rem; outline:none; }
  input:focus { border-color:#cd7f32; }
  button { margin-top:0.75rem; width:100%; padding:0.85rem; border:none; border-radius:12px;
    background:#f5e3c0; color:#0a0705; font-size:0.8rem; text-transform:uppercase; letter-spacing:0.1em; cursor:pointer; }
  p.err { color:#cd7f32; font-size:0.8rem; margin-top:1rem; }
</style></head>
<body>
  <form method="POST">
    <h1>Bronze</h1>
    <input type="password" name="passcode" placeholder="Passcode" autofocus autocomplete="off">
    <button type="submit">Enter</button>
    ${error ? `<p class="err">${error}</p>` : ''}
  </form>
</body></html>`
}

export { COOKIE_NAME }
