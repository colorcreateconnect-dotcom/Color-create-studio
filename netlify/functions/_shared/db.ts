/* Minimal, dependency-free Supabase access for Netlify Functions, using the
 * PostgREST endpoint with the SERVICE-ROLE key. This key bypasses RLS and must
 * NEVER reach the browser — it lives only in Netlify env vars and is read only
 * inside functions. (Client code uses the anon key + RLS; see src/lib/data.) */

import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from './runtime-config'

const URL = SUPABASE_URL
const SERVICE_KEY = SUPABASE_SERVICE_ROLE_KEY

/** Which server-side variables are missing, if any.
 *
 *  The project URL is baked in as a public fallback (see runtime-config.ts), so
 *  the only thing that can be missing is the one real secret — the service-role
 *  key. A named check is worth it: without it, an authenticated call fails
 *  misleadingly as "Sign in to continue" because the caller lookup gives up
 *  before it starts, blaming the request for a deployment problem. */
export function missingServerConfig(): string[] {
  const missing: string[] = []
  if (!URL) missing.push('SUPABASE_URL')
  if (!SERVICE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY')
  return missing
}

/** 500 naming exactly what to set, or null when the environment is complete. */
export function configErrorResponse(): { statusCode: number; headers: any; body: string } | null {
  const missing = missingServerConfig()
  if (!missing.length) return null
  return json(500, {
    error: missing.length === 1 && missing[0] === 'SUPABASE_SERVICE_ROLE_KEY'
      ? 'Almost there — this deployment just needs the database secret key. In Netlify → Site configuration → Environment variables, add SUPABASE_SERVICE_ROLE_KEY with your Supabase service_role key.'
      : 'This deployment is missing server configuration: ' + missing.join(', ')
        + '. Set them in Netlify → Site configuration → Environment variables.',
    code: 'SERVER_NOT_CONFIGURED',
    missing,
  })
}

function headers(extra: Record<string, string> = {}) {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

export async function sbSelect<T = any>(table: string, query: string): Promise<T[]> {
  const res = await fetch(`${URL}/rest/v1/${table}?${query}`, { headers: headers() })
  if (!res.ok) throw new Error(`Supabase select ${table} ${res.status}: ${await res.text()}`)
  return res.json()
}

export async function sbInsert<T = any>(table: string, rows: unknown): Promise<T[]> {
  const res = await fetch(`${URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: headers({ Prefer: 'return=representation' }),
    body: JSON.stringify(rows),
  })
  if (!res.ok) throw new Error(`Supabase insert ${table} ${res.status}: ${await res.text()}`)
  return res.json()
}

export async function sbUpdate<T = any>(table: string, query: string, patch: unknown): Promise<T[]> {
  const res = await fetch(`${URL}/rest/v1/${table}?${query}`, {
    method: 'PATCH',
    headers: headers({ Prefer: 'return=representation' }),
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(`Supabase update ${table} ${res.status}: ${await res.text()}`)
  return res.json()
}

export async function sbDelete(table: string, query: string): Promise<void> {
  const res = await fetch(`${URL}/rest/v1/${table}?${query}`, {
    method: 'DELETE',
    headers: headers({ Prefer: 'return=minimal' }),
  })
  if (!res.ok) throw new Error(`Supabase delete ${table} ${res.status}: ${await res.text()}`)
}

export const dbConfigured = () => !!URL && !!SERVICE_KEY

export function json(statusCode: number, body: unknown) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}
