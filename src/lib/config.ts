/* One place that answers "is a live backend wired?" The whole app is designed
 * to run with NO backend (the sandbox, local dev, previews) on in-memory seed
 * data, and to transparently use the real backend when the env vars are present.
 * Every integration point gates on these so the demo never breaks. */

export function env(key: string): string | undefined {
  let v: unknown
  try { v = typeof import.meta !== 'undefined' ? (import.meta as any).env?.[key] : undefined } catch { /* no import.meta */ }
  // Fallback for non-Vite contexts (Node/Vitest, SSR): read process.env too.
  // Reached via globalThis so the bare `process` identifier isn't referenced
  // (this is a browser project without @types/node).
  if (v == null || v === '') {
    const proc = (globalThis as any)?.process
    if (proc?.env) v = proc.env[key]
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
