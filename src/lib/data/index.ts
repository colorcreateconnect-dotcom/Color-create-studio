/* Data source: one interface, two implementations.
 *  - SupabaseData: talks to Supabase over PostgREST + GoTrue with the ANON key,
 *    so Row-Level Security is always in force (a client can only ever read its
 *    own rows). No service key is ever present in the browser.
 *  - MockData: in-memory, so the app runs with no backend (this sandbox, local
 *    dev, previews). The existing UI store keeps working unchanged.
 *
 * getData() picks Supabase when VITE_SUPABASE_URL is configured, else the mock.
 * Wiring the whole UI onto this source is the next integration step; the
 * financial-core, schema, functions and engine it depends on are already here
 * and tested. */
import type { Job, Property, Quote, Report, Message, PaymentMethod, User } from './types'
import { instantiateJob, VACATION_RENTAL_EDITION, type JobStepInstance } from '../keeMethod'

export interface DataSource {
  readonly name: string
  currentUser(): Promise<User | null>
  properties(ownerId: string): Promise<Property[]>
  jobs(filter: { ownerId?: string; cleanerId?: string }): Promise<Job[]>
  jobSteps(jobId: string): Promise<JobStepInstance[]>
  quotes(ownerId: string): Promise<Quote[]>
  reports(ownerId: string): Promise<Report[]>
  cardOnFile(ownerId: string): Promise<PaymentMethod | null>
  messages(threadKey: string): Promise<Message[]>
}

const env = (k: string): string | undefined =>
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.[k]) || undefined

/* ------------------------------------------------------------- Supabase -- */
class SupabaseData implements DataSource {
  readonly name = 'supabase'
  private url = env('VITE_SUPABASE_URL')!
  private anon = env('VITE_SUPABASE_ANON_KEY')!
  private token = () => (typeof localStorage !== 'undefined' ? localStorage.getItem('sb-access-token') : null)

  private async rest<T>(path: string): Promise<T> {
    const res = await fetch(`${this.url}/rest/v1/${path}`, {
      headers: {
        apikey: this.anon,
        Authorization: `Bearer ${this.token() ?? this.anon}`,
      },
    })
    if (!res.ok) throw new Error(`Supabase ${path} ${res.status}`)
    return res.json()
  }

  async currentUser(): Promise<User | null> {
    const rows = await this.rest<any[]>('users?select=*&limit=1')
    return rows[0] ?? null
  }
  properties(ownerId: string) { return this.rest<Property[]>(`properties?owner_id=eq.${ownerId}&select=*`) }
  jobs(f: { ownerId?: string; cleanerId?: string }) {
    const q = f.ownerId ? `owner_id=eq.${f.ownerId}` : `cleaner_id=eq.${f.cleanerId}`
    return this.rest<Job[]>(`jobs?${q}&select=*`)
  }
  async jobSteps(jobId: string) { return this.rest<JobStepInstance[]>(`job_steps?job_id=eq.${jobId}&select=*&order=ord`) }
  quotes(ownerId: string) { return this.rest<Quote[]>(`quotes?owner_id=eq.${ownerId}&select=id,property_id,status,client_amount,cadence`) }
  reports(ownerId: string) { return this.rest<Report[]>(`reports?owner_id=eq.${ownerId}&select=*`) }
  async cardOnFile(ownerId: string) {
    const rows = await this.rest<PaymentMethod[]>(`payment_methods?owner_id=eq.${ownerId}&select=id,brand,last4,card_type&limit=1`)
    return rows[0] ?? null
  }
  messages(threadKey: string) { return this.rest<Message[]>(`messages?thread_key=eq.${threadKey}&select=*&order=created_at`) }
}

/* ----------------------------------------------------------------- Mock -- */
class MockData implements DataSource {
  readonly name = 'mock'
  async currentUser() { return { id: 'ahleyia', orgId: 'org1', role: 'cleaner' } as User }
  async properties() { return [] as Property[] }
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
  singleton = env('VITE_SUPABASE_URL') ? new SupabaseData() : new MockData()
  return singleton
}
