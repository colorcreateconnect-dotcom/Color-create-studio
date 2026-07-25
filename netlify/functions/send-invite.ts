/* Text a client their invitation link.
 *
 * The caller sends only a client id: the phone number, the client's name and
 * the message body are all resolved server-side, so this cannot be used to
 * send arbitrary text to an arbitrary number.
 *
 * A fresh token is minted each time and any earlier unclaimed invite for that
 * client is revoked — so "send it again" cannot leave two live links, and a
 * link she previously texted to a wrong number stops working. */
import { sbSelect, sbInsert, sbUpdate, json } from './_shared/db'
import { requireCaller, isStaff } from './_shared/auth'
import { newToken, hashToken, expiryFromNow } from './_shared/invite'
import { notify, smsConfigured, MSG } from './_shared/sms'

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  const auth = await requireCaller(event)
  if ('error' in auth) return auth.error
  const { caller } = auth
  if (!isStaff(caller) || !caller.orgId) {
    return json(403, { error: 'Only the studio can send an invitation', code: 'FORBIDDEN' })
  }

  let body: any
  try { body = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'Bad JSON' }) }
  const clientId = String(body?.clientId || '')
  if (!clientId) return json(400, { error: 'clientId is required' })

  const [client] = await sbSelect('users', `id=eq.${clientId}&select=id,org_id,full_name,phone,sms_consent,sms_opted_out,onboarding_state`)
  if (!client) return json(404, { error: 'Client not found' })
  if (client.org_id !== caller.orgId) return json(403, { error: 'That client isn’t yours', code: 'FORBIDDEN' })
  if (client.onboarding_state === 'active') {
    return json(409, { error: 'They’ve already set up their login — they can just sign in.', code: 'ALREADY_ACTIVE' })
  }

  // Retire any earlier unclaimed link so only one is ever live.
  await sbUpdate('client_invites', `owner_id=eq.${clientId}&claimed_at=is.null&revoked_at=is.null`,
    { revoked_at: new Date().toISOString() })

  const token = newToken()
  const expiresAt = expiryFromNow()
  await sbInsert('client_invites', [{
    org_id: caller.orgId, owner_id: clientId,
    token_hash: hashToken(token), created_by: caller.id, expires_at: expiresAt,
  }])

  const origin = event.headers?.origin || `https://${event.headers?.host || ''}`
  const inviteUrl = `${origin}/?invite=${token}`

  const outcome = await notify(clientId, MSG.invite(client.full_name || '', inviteUrl))

  return json(200, {
    ok: true,
    inviteUrl,             // always returned, so she can copy it if the text didn't go
    expiresAt,
    texted: outcome.sent,
    // Why it didn't send, so the UI can say something useful rather than "failed".
    smsReason: outcome.sent ? null : outcome.reason,
    smsConfigured: smsConfigured(),
  })
}
