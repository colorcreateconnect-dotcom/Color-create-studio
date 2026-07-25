/* Add a client Ahleyia already works with, from before the app.
 *
 * She supplies what she knows — who they are, the home, the agreed price and
 * how often. This provisions the real account and property immediately (so the
 * client can be scheduled and billed like any other), records their agreed
 * price as an accepted quote, and returns a one-time link for them to claim
 * their own login.
 *
 * The client themselves later supplies email, password and card. Nothing here
 * charges anything. */
import { sbSelect, sbInsert, sbUpdate, json } from './_shared/db'
import { requireCaller, isStaff } from './_shared/auth'
import { newToken, hashToken, expiryFromNow, createAuthUser, deleteAuthUser, emailLooksValid } from './_shared/invite'

const PROPERTY_TYPES = ['airbnb', 'residential', 'loved_one']

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  const auth = await requireCaller(event)
  if ('error' in auth) return auth.error
  const { caller } = auth
  if (!isStaff(caller) || !caller.orgId) {
    return json(403, { error: 'Only the studio can add a client', code: 'FORBIDDEN' })
  }

  let body: any
  try { body = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'Bad JSON' }) }
  const {
    fullName, phone, email,
    propertyName, address, neighborhood, propertyType, beds, baths,
    agreedPrice, cadence, notes, signatureScent, productPreference, smsConsent,
  } = body

  if (!fullName || !String(fullName).trim()) return json(400, { error: 'Their name is required' })
  if (!phone && !email) return json(400, { error: 'A phone number or an email is required so they can be reached' })
  if (email && !emailLooksValid(email)) return json(400, { error: 'That email doesn’t look right' })
  if (!propertyName || !String(propertyName).trim()) return json(400, { error: 'The home’s name is required' })

  const type = PROPERTY_TYPES.includes(propertyType) ? propertyType : 'residential'

  // 1) The auth account. They replace the placeholder password when they claim.
  let authUser: { id: string }
  try {
    authUser = await createAuthUser({ email, phone, fullName })
  } catch (e: any) {
    const msg = String(e?.message || '')
    if (/already|exists|registered/i.test(msg)) {
      return json(409, { error: 'Someone with that email or phone already has an account.', code: 'ALREADY_EXISTS' })
    }
    return json(502, { error: 'Could not create their account: ' + msg })
  }

  // From here on, roll the auth user back if anything fails — never leave a
  // half-created client behind.
  try {
    // 2) The app-side user row. The signup trigger may already have made one.
    const [existing] = await sbSelect('users', `id=eq.${authUser.id}&select=id`)
    if (existing) {
      await sbUpdate('users', `id=eq.${authUser.id}`, {
        org_id: caller.orgId, role: 'owner', full_name: fullName,
        phone: phone ?? null, email: email ?? null, onboarding_state: 'invited',
        sms_consent: !!smsConsent, sms_consent_at: smsConsent ? new Date().toISOString() : null,
      })
    } else {
      await sbInsert('users', [{
        id: authUser.id, org_id: caller.orgId, role: 'owner', full_name: fullName,
        phone: phone ?? null, email: email ?? null, onboarding_state: 'invited',
        sms_consent: !!smsConsent, sms_consent_at: smsConsent ? new Date().toISOString() : null,
      }])
    }

    // 3) Their home.
    const [property] = await sbInsert('properties', [{
      org_id: caller.orgId,
      owner_id: authUser.id,
      name: propertyName,
      type,
      address: address ?? null,
      neighborhood: neighborhood ?? null,
      beds: beds ?? null,
      baths: baths ?? null,
      standing_notes: notes ?? null,
      product_preference: productPreference ?? 'eco_non_toxic',
      signature_scent: signatureScent ?? 'eucalyptus_mint',
      base_edition: type === 'airbnb' ? 'vacation_rental' : 'luxury_home',
    }])

    // 4) Their agreed price, recorded as an already-accepted quote — this is an
    //    existing arrangement, not a new pitch. One client-visible number.
    let quoteId: string | null = null
    if (agreedPrice != null && Number(agreedPrice) > 0) {
      const [q] = await sbInsert('quotes', [{
        org_id: caller.orgId, owner_id: authUser.id, property_id: property.id,
        status: 'accepted', client_amount: Number(agreedPrice), cadence: cadence ?? null,
      }])
      quoteId = q.id
    }

    // 5) The one-time link. Only its hash is stored.
    const token = newToken()
    await sbInsert('client_invites', [{
      org_id: caller.orgId,
      owner_id: authUser.id,
      token_hash: hashToken(token),
      created_by: caller.id,
      expires_at: expiryFromNow(),
    }])

    const origin = event.headers?.origin || `https://${event.headers?.host || ''}`
    return json(200, {
      ok: true,
      clientId: authUser.id,
      propertyId: property.id,
      quoteId,
      inviteToken: token,                       // shown once — she sends this
      inviteUrl: `${origin}/?invite=${token}`,
      expiresAt: expiryFromNow(),
    })
  } catch (e: any) {
    try { await deleteAuthUser(authUser.id) } catch { /* best effort rollback */ }
    return json(500, { error: 'Could not add that client: ' + (e?.message || 'unknown error') })
  }
}
