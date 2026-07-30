/* Minimal, dependency-free Supabase access for Netlify Functions, using the
 * PostgREST endpoint with the SERVICE-ROLE key. This key bypasses RLS and must
 * NEVER reach the browser — it lives only in Netlify env vars and is read only
 * inside functions. (Client code uses the anon key + RLS; see src/lib/data.) */

const URL = process.env.SUPABASE_URL || ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/** Which server-side variables are missing, if any.
 *
 *  Worth a named check rather than letting it fail downstream. With SUPABASE_URL
 *  unset, `${URL}/rest/v1/...` becomes a relative path and fetch dies with
 *  "Failed to parse URL from /rest/v1/..." — while an authenticated call fails
 *  even more misleadingly as "Sign in to continue", because the caller lookup
 *  gives up before it starts. Both blame the request for what is a deployment
 *  problem, which is a bad half-hour for whoever is debugging it. */
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
    error: 'This deployment is missing server configuration: ' + missing.join(', ')
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
