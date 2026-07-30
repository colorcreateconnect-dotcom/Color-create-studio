/* Domain types shared by the data layer — a typed mirror of the Postgres
 * schema. Client-facing shapes deliberately omit private pricing fields; those
 * live only in the *_internal types used by staff/admin endpoints. */

export type Role = 'cleaner' | 'owner' | 'org_admin'
export type PropertyType = 'airbnb' | 'residential' | 'loved_one'
export type EditionType = 'vacation_rental' | 'luxury_home'
export type ProductPreference = 'eco_non_toxic' | 'standard_disinfectant'
export type Scent = 'eucalyptus_mint' | 'fresh_linen' | 'citrus' | 'lavender' | 'unscented'
export type PaymentState =
  | 'scheduled' | 'capture_failed' | 'captured' | 'deposit_released'
  | 'awaiting_approval' | 'approved' | 'auto_approved_48h' | 'final_released'
  | 'settled' | 'disputed' | 'refunded'

export interface User {
  id: string; orgId: string | null; role: Role
  fullName?: string; phone?: string; email?: string
  /** 'invited' = provisioned by the studio, hasn't claimed their login yet. */
  onboardingState?: 'invited' | 'active'
}

export interface Property {
  id: string; orgId: string; ownerId: string; name: string; type: PropertyType
  address?: string; neighborhood?: string; lat?: number; lng?: number
  beds?: number; baths?: number; sourceUrl?: string; referencePhotos: string[]
  productPreference: ProductPreference; signatureScent: Scent; standingNotes?: string
  baseEdition: EditionType; geofenceRadiusM: number
}

/** Client-facing job — carries the single client_amount, never rate/hours/split. */
export interface Job {
  id: string; propertyId: string; ownerId: string; cleanerId?: string
  type: 'turnover' | 'residential' | 'deep'; status: string; paymentState: PaymentState
  clientAmount: number; ecoFinish: boolean
  windowStart?: string; windowEnd?: string; submittedAt?: string
}

export interface PaymentMethod { id: string; brand: string; last4: string; cardType: 'CREDIT' | 'DEBIT' | 'UNKNOWN' }

/** Client-safe quote — the one number only. */
export interface Quote { id: string; propertyId?: string; status: 'draft' | 'sent' | 'accepted' | 'declined'; clientAmount: number; cadence?: string }

export interface Report { id: string; jobId: string; propertyId: string; stepsDone: number; stepsTotal: number; photoCount: number; referenceMatch?: boolean; createdAt: string }

/** A client-visible charge line (receipts). Never carries processor internals. */
export interface Charge { id: string; jobId: string; kind: string; amount: number; createdAt: string }
export interface Message { id: string; threadKey: string; senderId?: string; body: string; photoKey?: string; createdAt: string }
