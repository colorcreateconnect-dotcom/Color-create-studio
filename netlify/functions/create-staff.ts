/* Add someone to the team — the cleaner equivalent of create-client.
 *
 * Ahleyia fills in what she knows (who they are, how to reach them, their
 * split), the account is provisioned immediately so she can assign them work
 * straight away, and they finish their own side from a one-time link: email and
 * a password of their choosing. Payout details, background check and Kee Method
 * certification are completed inside the app once they are signed in — those
 * belong to them, not to her. */
import { sbSelect, sbInsert, sbUpdate, json } from './_shared/db'
import { requireCaller, isStaff } from './_shared/auth'
import { newToken, hashToken, expiryFromNow, createAuthUser, deleteAuthUser, emailLooksValid } from './_shared/invite'

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  const auth = await requireCaller(event)
  if ('error' in auth) return auth.error
  const { caller } = auth
  // Hiring is the business owner's call, not any cleaner's.
  if (caller.role !== 'org_admin' || !caller.orgId) {
    return json(403, { error: 'Only the business owner can add someone to the team', code: 'FORBIDDEN' })
  }

  let body: any
  try { body = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'Bad JSON' }) }
  const { fullName, phone, email, smsConsent } = body

  if (!fullName || !String(fullName).trim()) return json(400, { error: 'Their name is required' })
  if (!phone && !email) return json(400, { error: 'A phone number or an email is required so they can be reached' })
  if (email && !emailLooksValid(email)) return json(400, { error: 'That email doesn’t look right' })

  let authUser: { id: string }
  try {
    authUser = await createAuthUser({ email, phone, fullName, role: 'cleaner', orgId: caller.orgId })
  } catch (e: any) {
    const msg = String(e?.message || '')
    if (/already|exists|registered/i.test(msg)) {
      return json(409, { error: 'Someone with that email or phone already has an account.', code: 'ALREADY_EXISTS' })
    }
    return json(502, { error: 'Could not create their account: ' + msg })
  }

  try {
    // The signup trigger may already have made the row from the metadata.
    const row = {
      org_id: caller.orgId, role: 'cleaner', full_name: fullName,
      phone: phone ?? null, email: email ?? null, onboarding_state: 'invited',
      sms_consent: !!smsConsent, sms_consent_at: smsConsent ? new Date().toISOString() : null,
    }
    const [existing] = await sbSelect('users', `id=eq.${authUser.id}&select=id`)
    if (existing) await sbUpdate('users', `id=eq.${authUser.id}`, row)
    else await sbInsert('users', [{ id: authUser.id, ...row }])

    const token = newToken()
    const expiresAt = expiryFromNow()
    await sbInsert('client_invites', [{
      org_id: caller.orgId, owner_id: authUser.id,
      token_hash: hashToken(token), created_by: caller.id, expires_at: expiresAt,
    }])

    const origin = event.headers?.origin || `https://${event.headers?.host || ''}`
    return json(200, {
      ok: true,
      staffId: authUser.id,
      inviteToken: token,
      inviteUrl: `${origin}/?invite=${token}`,
      expiresAt,
    })
  } catch (e: any) {
    try { await deleteAuthUser(authUser.id) } catch { /* best effort rollback */ }
    return json(500, { error: 'Could not add them to the team: ' + (e?.message || 'unknown error') })
  }
}
