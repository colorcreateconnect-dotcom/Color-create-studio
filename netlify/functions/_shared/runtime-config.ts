/* Server-side Supabase config for the functions, with safe built-in fallbacks.
 *
 * Two of the three values a function needs are PUBLIC — the project URL and the
 * publishable/anon key are already shipped inside the browser bundle, so there
 * is no secret in baking them in here as a fallback. Doing so means a manual
 * (zip) deploy works without anyone having to set them in the Netlify
 * dashboard: the ONLY thing left to configure is the one true secret, the
 * service-role key, which bypasses Row-Level Security and therefore must never
 * live in a file that gets shared. It has no fallback on purpose.
 *
 * An env var, when present, always wins — so a different project can still be
 * pointed at without touching this file. */

const PUBLIC_URL = 'https://tskwwtkoboglavonbfyk.supabase.co'
const PUBLIC_ANON = 'sb_publishable_AY5dk79wXfGHqjTdA1OxqQ_FT6WWe98'

/** The Supabase project URL. Public. Env var wins; else the built-in. */
export const SUPABASE_URL = process.env.SUPABASE_URL || PUBLIC_URL

/** The publishable/anon key, used only to verify a caller's token with GoTrue.
 *  Public — RLS is what protects the data, not this key. */
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || PUBLIC_ANON

/** The service-role key. THE secret. Bypasses RLS. No fallback — it must be set
 *  in the environment, never shipped in a file. */
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
