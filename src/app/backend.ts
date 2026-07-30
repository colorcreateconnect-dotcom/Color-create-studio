/* The bridge between the prototype store and the real backend.
 *
 * The whole app runs on in-memory seed data when no backend is configured (the
 * sandbox, local dev, previews). When Supabase + the functions ARE configured,
 * the money-path actions and auth call the real endpoints instead, and the app
 * hydrates the signed-in identity + card + jobs on load. Every call site checks
 * `backendActive()` and falls back to the demo behavior when it's false, so the
 * clickable prototype never breaks. */
import { isSupabaseConfigured } from '../lib/config'
import { restore, signInWithPassword, signUpWithPassword, signOut } from '../lib/supabase'
import { getData, threadKeyForOwner } from '../lib/data'
import type { User, PaymentMethod, Job, Property, Message, Quote, Report, Charge } from '../lib/data/types'
import type { AvailabilityBlock } from '../lib/data'
export { threadKeyForOwner }
import { ApiError } from '../lib/api'
export { getData }

export { signInWithPassword, signUpWithPassword, signOut }
export * as api from '../lib/api'

/** Is a live backend wired? Everything gates on this. */
export function backendActive(): boolean {
  return isSupabaseConfigured()
}

export interface Hydration {
  signedIn: boolean
  user: User | null
  card: PaymentMethod | null
  jobs: Job[]
  properties: Property[]
  clients: User[]
  staff: User[]
  messages: Message[]
  quotes: Quote[]
  reports: Report[]
  charges: Charge[]
  /** Hours the signed-in contractor is not working. */
  blocks: AvailabilityBlock[]
  activeJobId?: string
}

const ACTIVE_PAYMENT_STATES = ['scheduled', 'captured', 'deposit_released', 'awaiting_approval']

/** Load the signed-in identity, card on file, jobs, and properties — enough to
 *  drive the money-path actions and the live screens. Safe to call when signed
 *  out (returns signedIn:false) or when the backend is absent. */
export async function hydrate(): Promise<Hydration> {
  const empty: Hydration = { signedIn: false, user: null, card: null, jobs: [], properties: [], clients: [], staff: [], messages: [], quotes: [], reports: [], charges: [], blocks: [] }
  if (!backendActive()) return empty
  const session = await restore().catch(() => null)
  if (!session) return empty
  const data = getData()
  const user = await data.currentUser().catch(() => null)
  if (!user) return { ...empty, signedIn: true }
  const isOwner = user.role === 'owner'
  // An owner sees their own jobs. Staff see the whole org's — including cleans
  // nobody is assigned to yet, which are exactly the ones the schedule has to
  // surface. (Filtering to cleaner_id = me hid every unassigned job.)
  const jobs = await (isOwner ? data.jobs({ ownerId: user.id }) : data.orgJobs()).catch(() => [] as Job[])
  // Owner sees their own properties; staff/admin see the whole org's + its clients.
  const properties = await (isOwner ? data.properties(user.id) : data.orgProperties()).catch(() => [] as Property[])
  const clients = isOwner ? [] : await data.orgClients().catch(() => [] as User[])
  // Staff see who else works for the studio — the team screen and the
  // "assign this clean" pickers both need real people.
  const staff = isOwner ? [] : await data.orgStaff().catch(() => [] as User[])
  const card = isOwner ? await data.cardOnFile(user.id).catch(() => null) : null
  // Owner: their own thread, quotes, reports and receipts. Staff: the org's quotes.
  const messages = isOwner ? await data.messages(threadKeyForOwner(user.id)).catch(() => [] as Message[]) : []
  const quotes = await (isOwner ? data.quotes(user.id) : data.orgQuotes()).catch(() => [] as Quote[])
  const reports = isOwner ? await data.reports(user.id).catch(() => [] as Report[]) : []
  const charges = isOwner ? await data.chargesForJobs(jobs.map((j) => j.id)).catch(() => [] as Charge[]) : []
  // A contractor's own time off. Their jobs already imply their busy windows.
  const blocks = isOwner ? [] : await data.availabilityBlocks(user.id).catch(() => [] as AvailabilityBlock[])
  const active = jobs.find((j) => ACTIVE_PAYMENT_STATES.includes(j.paymentState))
  return { signedIn: true, user, card, jobs, properties, clients, staff, messages, quotes, reports, charges, blocks, activeJobId: active?.id }
}

/** Current device position — the geofence input for check-in. Rejects clearly
 *  when the browser has no geolocation or the user denies permission. */
export function getPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Location isn’t available on this device'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => reject(new Error(e?.message || 'Turn on location to check in at the property')),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    )
  })
}

/** A user-facing message for any backend error, preferring the server's own text. */
export function errMsg(e: unknown, fallback = 'Something went wrong — try again'): string {
  if (e instanceof ApiError) return e.message
  if (e instanceof Error && e.message) return e.message
  return fallback
}

/** Parse a tip label ("$20", "20%", "No tip") into dollars, or undefined. */
export function parseTip(label: string | undefined, base: number): number | undefined {
  if (!label || /no tip/i.test(label)) return undefined
  const pct = label.match(/(\d+(?:\.\d+)?)\s*%/)
  if (pct) return Math.round(base * (Number(pct[1]) / 100) * 100) / 100
  const dollars = label.match(/\$?\s*(\d+(?:\.\d+)?)/)
  return dollars ? Number(dollars[1]) : undefined
}
