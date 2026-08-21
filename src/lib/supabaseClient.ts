import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

/**
 * Lazily constructs the anon-key client on first real use.
 *
 * Deliberately not built at module-eval time: this module is statically
 * imported by the Supabase adapter, which is itself statically imported by
 * `content/adapter.ts` so the choice of adapter can be a plain runtime
 * branch (no `require()`, which does not exist in a browser bundle). If
 * construction happened at import time, a fixtures-only build would need
 * Supabase env vars to exist even though it never talks to Supabase.
 */
export function getSupabase(): SupabaseClient {
  if (client) return client

  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!url || !anonKey) {
    throw new Error(
      'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required when VITE_CONTENT_SOURCE=supabase.',
    )
  }

  // Safe to ship in the bundle — RLS is the real boundary, not this key.
  // Never construct a client here with the service-role key; that belongs in
  // ingest scripts only and must never reach the browser.
  client = createClient(url, anonKey, { auth: { persistSession: false } })
  return client
}
