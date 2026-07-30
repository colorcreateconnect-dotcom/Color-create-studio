/* Someone who cleans for a living, starting their own book.
 *
 * The other way in is Ahleyia's invitation — she adds you, you claim a link,
 * you work her jobs. That is the right shape for a cleaner she hires. It is the
 * wrong shape for an independent contractor who found the app on their own:
 * nobody hired them, their clients are theirs, and Ahleyia has no business
 * seeing that book.
 *
 * So this gives them their own studio. A new organization with one person in
 * it, and they run it — their clients, their homes, their cleans, their
 * numbers. If Ahleyia later takes them on, that is her invitation and a
 * different flow.
 *
 * Why a function rather than the browser: after 0011 the signup trigger makes
 * everyone an `owner` with no org, precisely so that role cannot be chosen by
 * whoever is calling. Promoting an account is therefore privileged work. This
 * endpoint requires the caller's own token and only ever creates a NEW
 * organization — there is no parameter that names an existing one, so it cannot
 * be pointed at somebody else's studio however it is called. */
import { sbSelect, sbInsert, sbUpdate, json } from './_shared/db'
import { requireCaller, mayStartOwnStudio } from './_shared/auth'
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from './_shared/runtime-config'
import { studioNameFor } from './_shared/studio'

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  const auth = await requireCaller(event)
  if ('error' in auth) return auth.error
  const { caller } = auth

  /* Already in a studio — Ahleyia's or their own. Starting a second one would
     strand whichever book they left behind, so this refuses instead of moving
     them. Someone who genuinely wants out has to be removed from the first. */
  if (!mayStartOwnStudio(caller)) {
    return json(409, {
      error: caller.role === 'org_admin'
        ? 'You already have a studio.'
        : 'You’re already part of a studio. Ask them to release you first.',
      code: 'ALREADY_IN_ORG',
    })
  }

  let body: any
  try { body = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'Bad JSON' }) }

  const [me] = await sbSelect('users', `id=eq.${caller.id}&select=id,full_name,email,phone,role,org_id`)
  if (!me) return json(404, { error: 'No account found', code: 'NO_USER' })
  // Re-read rather than trust the token's snapshot: two taps in a row must not
  // create two studios.
  if (me.org_id) return json(409, { error: 'You already have a studio.', code: 'ALREADY_IN_ORG' })

  const person = String(me.full_name || '').trim()
  const studioName = studioNameFor(body.studioName, person)

  let org: { id: string }
  try {
    const [row] = await sbInsert('organizations', [{
      name: studioName,
      contact_email: me.email ?? null,
      contact_phone: me.phone ?? null,
    }])
    org = row
  } catch (e: any) {
    return json(502, { error: 'Could not start your studio: ' + (e?.message || 'unknown error') })
  }

  try {
    await sbUpdate('users', `id=eq.${caller.id}`, {
      org_id: org.id,
      role: 'org_admin',
      full_name: person || null,
      onboarding_state: 'active',
    })
  } catch (e: any) {
    // Don't leave an organization nobody belongs to.
    try { await sbDeleteOrg(org.id) } catch { /* best effort */ }
    return json(500, { error: 'Could not set your account up: ' + (e?.message || 'unknown error') })
  }

  return json(200, { ok: true, orgId: org.id, studioName, role: 'org_admin' })
}

/* Rollback helper. Kept local because deleting an organization is not something
   any other endpoint should be able to reach for. */
async function sbDeleteOrg(id: string): Promise<void> {
  const url = SUPABASE_URL
  const key = SUPABASE_SERVICE_ROLE_KEY
  await fetch(`${url}/rest/v1/organizations?id=eq.${id}`, {
    method: 'DELETE',
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
}
