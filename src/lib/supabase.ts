/* Dependency-free Supabase auth (GoTrue over REST), matching the codebase's
 * no-SDK style. Clients sign in with phone + a texted OTP; the business/admin
 * account uses email + password. The resulting access token is persisted to
 * `sb-access-token` — the exact key src/lib/data reads — so RLS-guarded reads
 * carry the signed-in identity. The service-role key is NEVER here; this is the
 * anon key only, so Row-Level Security is always in force. */
import { supabaseUrl, supabaseAnonKey, isSupabaseConfigured } from './config'

export interface Session {
  accessToken: string
  refreshToken: string
  expiresAt: number // epoch seconds
  user: { id: string; phone?: string; email?: string }
}

const TOKEN_KEY = 'sb-access-token'
const SESSION_KEY = 'sb-session'

function store(): Storage | null {
  try { return typeof localStorage !== 'undefined' ? localStorage : null } catch { return null }
}

function persist(s: Session | null) {
  const st = store(); if (!st) return
  if (s) { st.setItem(TOKEN_KEY, s.accessToken); st.setItem(SESSION_KEY, JSON.stringify(s)) }
  else { st.removeItem(TOKEN_KEY); st.removeItem(SESSION_KEY) }
}

/** The current session from storage, or null. Does not refresh. */
export function currentSession(): Session | null {
  const st = store(); if (!st) return null
  try { const raw = st.getItem(SESSION_KEY); return raw ? (JSON.parse(raw) as Session) : null } catch { return null }
}

export function accessToken(): string | null {
  return store()?.getItem(TOKEN_KEY) ?? null
}

export function isSignedIn(): boolean {
  const s = currentSession()
  return !!s && s.expiresAt * 1000 > Date.now()
}

async function auth<T>(path: string, body: unknown, query = ''): Promise<T> {
  const res = await fetch(`${supabaseUrl()}/auth/v1/${path}${query}`, {
    method: 'POST',
    headers: { apikey: supabaseAnonKey(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data && (data.msg || data.error_description || data.error)) || `auth ${path} ${res.status}`)
  return data as T
}

/** Map a GoTrue token response to our Session shape. */
function toSession(d: any): Session {
  return {
    accessToken: d.access_token,
    refreshToken: d.refresh_token,
    expiresAt: Math.floor(Date.now() / 1000) + (Number(d.expires_in) || 3600),
    user: { id: d.user?.id, phone: d.user?.phone, email: d.user?.email },
  }
}

/** Step 1 of client sign-in — text a one-time code to the phone. */
export async function sendPhoneOtp(phone: string): Promise<void> {
  await auth('otp', { phone: normalizePhone(phone), channel: 'sms' })
}

/** Step 2 — verify the texted code; on success the session is persisted. */
export async function verifyPhoneOtp(phone: string, token: string): Promise<Session> {
  const d = await auth<any>('verify', { type: 'sms', phone: normalizePhone(phone), token })
  const s = toSession(d); persist(s); return s
}

/** Business/admin sign-in — email + password (GoTrue password grant). */
export async function signInWithPassword(email: string, password: string): Promise<Session> {
  const d = await auth<any>('token', { email, password }, '?grant_type=password')
  const s = toSession(d); persist(s); return s
}

/** Exchange a stored refresh token for a fresh access token. */
export async function refresh(): Promise<Session | null> {
  const cur = currentSession(); if (!cur?.refreshToken) return null
  try {
    const d = await auth<any>('token', { refresh_token: cur.refreshToken }, '?grant_type=refresh_token')
    const s = toSession(d); persist(s); return s
  } catch { persist(null); return null }
}

/** Restore on app load: return a valid session, refreshing if it has expired. */
export async function restore(): Promise<Session | null> {
  if (!isSupabaseConfigured()) return null
  const s = currentSession()
  if (!s) return null
  if (s.expiresAt * 1000 > Date.now() + 60_000) return s
  return refresh()
}

export async function signOut(): Promise<void> {
  const tok = accessToken()
  persist(null)
  if (tok && isSupabaseConfigured()) {
    try {
      await fetch(`${supabaseUrl()}/auth/v1/logout`, {
        method: 'POST',
        headers: { apikey: supabaseAnonKey(), Authorization: `Bearer ${tok}` },
      })
    } catch { /* local sign-out already done */ }
  }
}

/** E.164-ish normalization: strip formatting, default to US (+1) when 10 digits. */
export function normalizePhone(input: string): string {
  const digits = (input || '').replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) return digits
  const d = digits.replace(/\D/g, '')
  if (d.length === 10) return `+1${d}`
  if (d.length === 11 && d.startsWith('1')) return `+${d}`
  return `+${d}`
}
