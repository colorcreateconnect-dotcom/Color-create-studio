/* One place that answers "is a live backend wired?" The whole app is designed
 * to run with NO backend (the sandbox, local dev, previews) on in-memory seed
 * data, and to transparently use the real backend when the env vars are present.
 * Every integration point gates on these so the demo never breaks. */

export function env(key: string): string | undefined {
  let viteEnv: any
  try { viteEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined } catch { /* no import.meta */ }
  // process is reached via globalThis so the bare identifier isn't referenced
  // (browser project, no @types/node).
  const proc: any = (globalThis as any)?.process
  // Under Vitest, prefer process.env: a developer's real .env.local is injected
  // into import.meta.env by Vite and would otherwise leak backend creds into the
  // hermetic config-detection tests (which set values via vi.stubEnv → process.env).
  const underTest = !!(viteEnv?.VITEST || viteEnv?.MODE === 'test' || proc?.env?.VITEST)
  let v: unknown
  if (underTest) {
    v = proc?.env?.[key]
  } else {
    v = viteEnv?.[key]
    if (v == null || v === '') v = proc?.env?.[key]
  }
  return v && String(v).trim() ? String(v) : undefined
}

/** Supabase (auth + RLS-guarded reads) is live when the URL + anon key exist. */
export function isSupabaseConfigured(): boolean {
  return !!env('VITE_SUPABASE_URL') && !!env('VITE_SUPABASE_ANON_KEY')
}

/** Square Web Payments SDK (client-side tokenization) is live when app + location exist. */
export function isSquareConfigured(): boolean {
  return !!env('VITE_SQUARE_APP_ID') && !!env('VITE_SQUARE_LOCATION_ID')
}

export function supabaseUrl(): string { return env('VITE_SUPABASE_URL') || '' }
export function supabaseAnonKey(): string { return env('VITE_SUPABASE_ANON_KEY') || '' }
export function squareAppId(): string { return env('VITE_SQUARE_APP_ID') || '' }
export function squareLocationId(): string { return env('VITE_SQUARE_LOCATION_ID') || '' }

/** Square's SDK host differs by environment; sandbox app ids are prefixed `sandbox-`. */
export function squareSdkSrc(): string {
  const sandbox = squareAppId().startsWith('sandbox-')
  return sandbox
    ? 'https://sandbox.web.squarecdn.com/v1/square.js'
    : 'https://web.squarecdn.com/v1/square.js'
}
