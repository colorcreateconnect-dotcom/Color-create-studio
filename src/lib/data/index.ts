/* Data source: one interface, two implementations.
 *  - SupabaseData: talks to Supabase over PostgREST + GoTrue with the ANON key,
 *    so Row-Level Security is always in force (a client can only ever read its
 *    own rows). No service key is ever present in the browser. Rows come back
 *    snake_case and are mapped to the camelCase domain types below.
 *  - MockData: in-memory, so the app runs with no backend (this sandbox, local
 *    dev, previews). The existing UI store keeps working unchanged.
 *
 * getData() picks Supabase when it is configured, else the mock. The app
 * hydrates from this source on load (see src/app/backend.ts) and falls back to
 * seed data whenever the backend is absent. */
import type { Job, Property, Quote, Report, Message, PaymentMethod, User } from './types'
import { instantiateJob, VACATION_RENTAL_EDITION, type JobStepInstance } from '../keeMethod'
import { isSupabaseConfigured, supabaseUrl, supabaseAnonKey } from '../config'
import { accessToken, currentSession } from '../supabase'

/** Fields a client supplies to add a property; ids come from the session. */
export interface NewProperty {
  orgId: string; ownerId: string; name: string
  type: 'airbnb' | 'residential' | 'loved_one'
  neighborhood?: string; beds?: number; baths?: number; sourceUrl?: string
  productPreference?: string; signatureScent?: string; baseEdition?: string
}

export interface DataSource {
  readonly name: string
  currentUser(): Promise<User | null>
  properties(ownerId: string): Promise<Property[]>
  orgProperties(): Promise<Property[]>
  jobs(filter: { ownerId?: string; cleanerId?: string }): Promise<Job[]>
  jobSteps(jobId: string): Promise<JobStepInstance[]>
  quotes(ownerId: string): Promise<Quote[]>
  reports(ownerId: string): Promise<Report[]>
  cardOnFile(ownerId: string): Promise<PaymentMethod | null>
  messages(threadKey: string): Promise<Message[]>
  createProperty(input: NewProperty): Promise<Property>
}

/* --------------------------------------------------- row mappers (snake→camel) -- */
const num = (v: any): number | undefined => (v == null ? undefined : Number(v))

function mapUser(r: any): User {
  return { id: r.id, orgId: r.org_id ?? null, role: r.role, fullName: r.full_name, phone: r.phone, email: r.email }
}
function mapProperty(r: any): Property {
  return {
    id: r.id, orgId: r.org_id, ownerId: r.owner_id, name: r.name, type: r.type,
    address: r.address, neighborhood: r.neighborhood, lat: num(r.lat), lng: num(r.lng),
    beds: num(r.beds), baths: num(r.baths), sourceUrl: r.source_url,
    referencePhotos: Array.isArray(r.reference_photos) ? r.reference_photos : [],
    productPreference: r.product_preference, signatureScent: r.signature_scent,
    standingNotes: r.standing_notes, baseEdition: r.base_edition,
    geofenceRadiusM: num(r.geofence_radius_m) ?? 150,
  }
}
function mapJob(r: any): Job {
  return {
    id: r.id, propertyId: r.property_id, ownerId: r.owner_id, cleanerId: r.cleaner_id ?? undefined,
    type: r.type, status: r.status, paymentState: r.payment_state,
    clientAmount: Number(r.client_amount), ecoFinish: !!r.eco_finish,
    windowStart: r.window_start, windowEnd: r.window_end, submittedAt: r.submitted_at,
  }
}
function mapQuote(r: any): Quote {
  return { id: r.id, propertyId: r.property_id ?? undefined, status: r.status, clientAmount: Number(r.client_amount), cadence: r.cadence ?? undefined }
}
function mapReport(r: any): Report {
  return { id: r.id, jobId: r.job_id, propertyId: r.property_id, stepsDone: r.steps_done, stepsTotal: r.steps_total, photoCount: r.photo_count, referenceMatch: r.reference_match ?? undefined, createdAt: r.created_at }
}
function mapPaymentMethod(r: any): PaymentMethod {
  return { id: r.id, brand: r.brand, last4: r.last4, cardType: r.card_type }
}
function mapMessage(r: any): Message {
  return { id: r.id, threadKey: r.thread_key, senderId: r.sender_id ?? undefined, body: r.body, photoKey: r.photo_key ?? undefined, createdAt: r.created_at }
}

// exported for unit tests — the mapping is where a schema drift would bite
export const _mappers = { mapUser, mapProperty, mapJob, mapQuote, mapReport, mapPaymentMethod, mapMessage }

/* ------------------------------------------------------------- Supabase -- */
class SupabaseData implements DataSource {
  readonly name = 'supabase'
  private url = supabaseUrl()
  private anon = supabaseAnonKey()

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    // apikey carries the publishable/anon key. Authorization is set ONLY when a
    // real user JWT exists — PostgREST wants a JWT there, and the new
    // `sb_publishable_…` key format is not a JWT, so sending it as a bearer
    // would 401. With no session, apikey alone drives the `anon` role.
    const tok = accessToken()
    const h: Record<string, string> = { apikey: this.anon, ...extra }
    if (tok) h.Authorization = `Bearer ${tok}`
    return h
  }

  private async rest<T>(path: string): Promise<T> {
    const res = await fetch(`${this.url}/rest/v1/${path}`, { headers: this.headers() })
    if (!res.ok) throw new Error(`Supabase ${path} ${res.status}`)
    return res.json()
  }

  private async restPost<T>(table: string, row: unknown): Promise<T[]> {
    const res = await fetch(`${this.url}/rest/v1/${table}`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json', Prefer: 'return=representation' }),
      body: JSON.stringify(row),
    })
    if (!res.ok) throw new Error(`Supabase insert ${table} ${res.status}: ${await res.text()}`)
    return res.json()
  }

  async currentUser(): Promise<User | null> {
    // Filter by the signed-in uid explicitly: under the org-read policy a staff
    // member can select every user in their org, so `limit=1` alone could return
    // a colleague. The session carries our own id from the GoTrue verify step.
    const uid = currentSession()?.user?.id
    const path = uid ? `users?id=eq.${uid}&select=*` : 'users?select=*&limit=1'
    const rows = await this.rest<any[]>(path)
    return rows[0] ? mapUser(rows[0]) : null
  }
  async properties(ownerId: string) { return (await this.rest<any[]>(`properties?owner_id=eq.${ownerId}&select=*&order=created_at`)).map(mapProperty) }
  async orgProperties() { return (await this.rest<any[]>(`properties?select=*&order=created_at`)).map(mapProperty) }
  async createProperty(input: NewProperty) {
    const [row] = await this.restPost<any>('properties', {
      org_id: input.orgId, owner_id: input.ownerId, name: input.name, type: input.type,
      neighborhood: input.neighborhood ?? null, beds: input.beds ?? null, baths: input.baths ?? null,
      source_url: input.sourceUrl ?? null,
      product_preference: input.productPreference ?? 'eco_non_toxic',
      signature_scent: input.signatureScent ?? 'eucalyptus_mint',
      base_edition: input.baseEdition ?? 'vacation_rental',
    })
    return mapProperty(row)
  }
  async jobs(f: { ownerId?: string; cleanerId?: string }) {
    const q = f.ownerId ? `owner_id=eq.${f.ownerId}` : `cleaner_id=eq.${f.cleanerId}`
    return (await this.rest<any[]>(`jobs?${q}&select=*`)).map(mapJob)
  }
  async jobSteps(jobId: string) { return this.rest<JobStepInstance[]>(`job_steps?job_id=eq.${jobId}&select=*&order=ord`) }
  async quotes(ownerId: string) { return (await this.rest<any[]>(`quotes?owner_id=eq.${ownerId}&select=*`)).map(mapQuote) }
  async reports(ownerId: string) { return (await this.rest<any[]>(`reports?owner_id=eq.${ownerId}&select=*`)).map(mapReport) }
  async cardOnFile(ownerId: string) {
    const rows = await this.rest<any[]>(`payment_methods?owner_id=eq.${ownerId}&is_default=eq.true&select=*&limit=1`)
    return rows[0] ? mapPaymentMethod(rows[0]) : null
  }
  async messages(threadKey: string) { return (await this.rest<any[]>(`messages?thread_key=eq.${threadKey}&select=*&order=created_at`)).map(mapMessage) }
}

/* ----------------------------------------------------------------- Mock -- */
class MockData implements DataSource {
  readonly name = 'mock'
  async currentUser() { return { id: 'ahleyia', orgId: 'org1', role: 'cleaner' } as User }
  async properties() { return [] as Property[] }
  async orgProperties() { return [] as Property[] }
  async createProperty(input: NewProperty) {
    return { id: 'mock-' + input.name, orgId: input.orgId, ownerId: input.ownerId, name: input.name, type: input.type, referencePhotos: [], productPreference: 'eco_non_toxic', signatureScent: 'eucalyptus_mint', baseEdition: 'vacation_rental', geofenceRadiusM: 150, beds: input.beds, baths: input.baths, neighborhood: input.neighborhood } as Property
  }
  async jobs() { return [] as Job[] }
  async jobSteps() { return instantiateJob(VACATION_RENTAL_EDITION) }
  async quotes() { return [] as Quote[] }
  async reports() { return [] as Report[] }
  async cardOnFile() { return { id: 'pm1', brand: 'VISA', last4: '4242', cardType: 'CREDIT' } as PaymentMethod }
  async messages() { return [] as Message[] }
}

let singleton: DataSource | null = null
export function getData(): DataSource {
  if (singleton) return singleton
  singleton = isSupabaseConfigured() ? new SupabaseData() : new MockData()
  return singleton
}
