/* The client claims the account Ahleyia set up for them.
 *
 * They supply the two things only they should own: their email and a password
 * of their choosing. The link is single-use — it is marked claimed in the same
 * step — and the account flips from 'invited' to 'active'. Their card is saved
 * afterwards, from inside the app, by the existing save-card endpoint (which
 * requires them to be signed in as themselves).
 *
 * Reachable without a session, because the whole point is that they do not have
 * one yet: the token is the credential, and it is verified here. */
import { sbSelect, sbUpdate, json } from './_shared/db'
import {
  hashToken, inviteState, INVITE_MESSAGE,
  updateAuthUser, passwordProblem, emailLooksValid,
} from './_shared/invite'

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })
  let body: any
  try { body = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'Bad JSON' }) }

  const token = String(body?.token || '')
  const email = String(body?.email || '').trim().toLowerCase()
  const password = String(body?.password || '')
  if (!token) return json(400, { error: 'Missing link token' })
  if (!emailLooksValid(email)) return json(422, { error: 'Enter the email where your reports and receipts should go.' })
  const pwProblem = passwordProblem(password)
  if (pwProblem) return json(422, { error: pwProblem, code: 'WEAK_PASSWORD' })

  const hash = hashToken(token)
  const [invite] = await sbSelect('client_invites', `token_hash=eq.${hash}&select=*`)
  const state = inviteState(invite)
  if (state !== 'valid') return json(410, { error: INVITE_MESSAGE[state], code: state.toUpperCase() })

  // Claim the link FIRST, conditioned on it still being unclaimed. Two people
  // opening the same link at once cannot both get through: the second update
  // matches no rows.
  const claimed = await sbUpdate(
    'client_invites',
    `id=eq.${invite.id}&claimed_at=is.null&revoked_at=is.null`,
    { claimed_at: new Date().toISOString() },
  )
  if (!claimed.length) {
    return json(410, { error: INVITE_MESSAGE.claimed, code: 'CLAIMED' })
  }

  try {
    await updateAuthUser(invite.owner_id, { email, password })
  } catch (e: any) {
    // Give the link back so a fixable problem (e.g. email already in use) does
    // not burn their one invitation.
    await sbUpdate('client_invites', `id=eq.${invite.id}`, { claimed_at: null })
    const msg = String(e?.message || '')
    if (/already|exists|registered/i.test(msg)) {
      return json(409, { error: 'That email is already used by another account. Try signing in, or use a different email.', code: 'EMAIL_TAKEN' })
    }
    return json(502, { error: 'Could not finish setting up your login: ' + msg })
  }

  await sbUpdate('users', `id=eq.${invite.owner_id}`, { email, onboarding_state: 'active' })

  return json(200, {
    ok: true,
    email,
    // The app signs them in with these credentials straight away.
    message: 'Your account is ready.',
  })
}
