/* What a client sees when they open the link Ahleyia sent them.
 *
 * This endpoint is reachable without signing in — the token IS the credential —
 * so it returns only that client's own, client-safe details: their name, their
 * home, and the single agreed price. Never internal pricing, never anyone
 * else's data, never the token itself. */
import { sbSelect, json } from './_shared/db'
import { hashToken, inviteState, INVITE_MESSAGE } from './_shared/invite'

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })
  let body: any
  try { body = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'Bad JSON' }) }
  const token = String(body?.token || '')
  if (!token) return json(400, { error: 'Missing link token' })

  const [invite] = await sbSelect('client_invites', `token_hash=eq.${hashToken(token)}&select=*`)
  const state = inviteState(invite)
  if (state !== 'valid') {
    return json(410, { error: INVITE_MESSAGE[state], code: state.toUpperCase() })
  }

  const [person] = await sbSelect('users', `id=eq.${invite.owner_id}&select=full_name,email,phone,role`)
  const [org] = await sbSelect('organizations', `id=eq.${invite.org_id}&select=name`)
  const isCleaner = person?.role === 'cleaner' || person?.role === 'org_admin'

  // A cleaner is joining the team: they have no home and no price of their own,
  // so none of that is looked up or returned for them.
  if (isCleaner) {
    return json(200, {
      ok: true,
      kind: 'staff',
      studio: org?.name || 'She’s Maid In ATL',
      fullName: person?.full_name || null,
      email: person?.email || null,
      phone: person?.phone || null,
      properties: [],
      agreedPrice: null,
      cadence: null,
    })
  }

  const client = person
  const props = await sbSelect('properties', `owner_id=eq.${invite.owner_id}&select=name,neighborhood,type,beds,baths&order=created_at`)
  const [quote] = await sbSelect('quotes', `owner_id=eq.${invite.owner_id}&select=client_amount,cadence&order=created_at.desc&limit=1`)

  return json(200, {
    ok: true,
    kind: 'client',
    studio: org?.name || 'She’s Maid In ATL',
    fullName: client?.full_name || null,
    // Whether we already know an email decides what the form asks for.
    email: client?.email || null,
    phone: client?.phone || null,
    properties: props.map((p: any) => ({
      name: p.name, neighborhood: p.neighborhood, type: p.type,
      beds: p.beds != null ? Number(p.beds) : null,
      baths: p.baths != null ? Number(p.baths) : null,
    })),
    // The ONE number a client may see. No rate, hours or split ever leaves here.
    agreedPrice: quote?.client_amount != null ? Number(quote.client_amount) : null,
    cadence: quote?.cadence || null,
  })
}
