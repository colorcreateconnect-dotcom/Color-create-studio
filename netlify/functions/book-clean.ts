/* Book a clean — creates the job.
 *
 * Scheduling is privileged: `jobs` deliberately has no client INSERT policy, so
 * a booking cannot be forged from the browser. This endpoint verifies the
 * caller, authorizes them against the property, prices the job with the SAME
 * engine the quote screens use, and instantiates the Kee Method steps so the
 * cleaner's checklist exists the moment the job does.
 *
 * Authorization: staff in the property's org may book for any of its
 * properties; an owner may book only their own. No card is charged here —
 * money moves at check-in (one capture on arrival), never at booking. */
import { sbSelect, sbInsert, json } from './_shared/db'
import { requireCaller, isStaff } from './_shared/auth'
import { sendNotice } from './_shared/notify'
import { busyWindows, conflictIn } from '../../src/lib/availability'
import { airbnbQuote, residentialQuote, type Staging } from '../../src/lib/pricing'

const EDITION_FOR: Record<string, 'vacation_rental' | 'luxury_home'> = {
  turnover: 'vacation_rental',
  residential: 'luxury_home',
  deep: 'luxury_home',
}

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  const auth = await requireCaller(event)
  if ('error' in auth) return auth.error
  const { caller } = auth

  let body: any
  try { body = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'Bad JSON' }) }
  const { propertyId, windowStart, windowEnd, type, staging, hours, ecoFinish, cleanerId } = body
  if (!propertyId) return json(400, { error: 'propertyId is required' })

  const [prop] = await sbSelect('properties', `id=eq.${propertyId}&select=id,org_id,owner_id,managed_by,type,beds,base_edition`)
  if (!prop) return json(404, { error: 'Property not found' })

  /* --- authorize against THIS property ---
     Three ways in, and no others: the client booking their own home, the studio
     owner booking anything in her organization, or a contractor booking a home
     in their OWN book. A contractor may not book against the studio's client or
     another contractor's — that is somebody else's arrangement and price. */
  const ownsIt = caller.id === prop.owner_id
  const adminHere = caller.role === 'org_admin' && !!caller.orgId && caller.orgId === prop.org_id
  const managesIt = isStaff(caller) && prop.managed_by === caller.id
  if (!ownsIt && !adminHere && !managesIt) {
    return json(403, { error: 'You can’t book a clean for that property', code: 'FORBIDDEN' })
  }

  // --- price it with the shared engine (client sees ONE number) ---
  const jobType: 'turnover' | 'residential' | 'deep' =
    type === 'residential' || type === 'deep' ? type : (prop.type === 'airbnb' ? 'turnover' : 'residential')
  let clientAmount: number
  if (jobType === 'turnover') {
    clientAmount = airbnbQuote(Number(prop.beds) || 2, (staging as Staging) || 'standard').clientNumber
  } else {
    const h = Number(hours) > 0 ? Number(hours) : 3
    clientAmount = residentialQuote(h, { deep: jobType === 'deep' }).clientNumber
  }

  // --- the edition whose steps become this job's checklist ---
  const editionType = EDITION_FOR[jobType]
  const [edition] = await sbSelect('editions', `type=eq.${editionType}&select=id&limit=1`)

  /* --- nobody is expected in two homes at once ---
     A contractor's own clients and the studio's compete for the same hours,
     because it is one person. Checked here rather than only in the calendar:
     the calendar can be stale, and this is the endpoint that commits. */
  const assignedTo = cleanerId ?? (isStaff(caller) ? caller.id : null)
  if (assignedTo && windowStart) {
    const start = new Date(windowStart)
    const end = windowEnd ? new Date(windowEnd) : new Date(start.getTime() + 2 * 3600_000)
    if (!isNaN(start.getTime())) {
      const theirJobs = await sbSelect('jobs', `or=(cleaner_id.eq.${assignedTo},created_by.eq.${assignedTo})&status=neq.cancelled&select=id,window_start,window_end,status`)
      const theirBlocks = await sbSelect('availability_blocks', `cleaner_id=eq.${assignedTo}&select=id,starts_at,ends_at,reason`)
      const busy = busyWindows(
        theirJobs.map((j: any) => ({ id: j.id, windowStart: j.window_start, windowEnd: j.window_end, status: j.status })),
        theirBlocks.map((b: any) => ({ id: b.id, startsAt: b.starts_at, endsAt: b.ends_at, reason: b.reason })),
      )
      const clash = conflictIn({ start: start.getTime(), end: end.getTime() }, busy)
      if (clash) {
        return json(409, {
          error: assignedTo === caller.id
            ? `You’re not free then — ${clash.reason.toLowerCase()}.`
            : 'They’re not free in that window.',
          code: 'NOT_AVAILABLE',
          reason: clash.reason,
        })
      }
    }
  }

  const [job] = await sbInsert('jobs', [{
    org_id: prop.org_id,
    property_id: prop.id,
    owner_id: prop.owner_id,
    created_by: caller.id,
    cleaner_id: assignedTo,
    type: jobType,
    edition_id: edition?.id ?? null,
    window_start: windowStart ?? null,
    window_end: windowEnd ?? null,
    status: 'scheduled',
    payment_state: 'scheduled',
    client_amount: clientAmount,
    eco_finish: ecoFinish === false ? false : true,
  }])

  // --- instantiate the Kee Method steps for this job ---
  // Two plain queries (phases, then their steps) rather than an embedded filter:
  // simpler to reason about, and no dependency on PostgREST embedding syntax.
  // The job already exists at this point, so a step failure must NOT 500 the
  // booking — the checklist can be repaired without re-booking.
  let stepCount = 0
  let stepsError: string | undefined
  if (edition?.id) {
    try {
      const phases = await sbSelect('phases', `edition_id=eq.${edition.id}&select=id,ord,title&order=ord`)
      if (phases.length) {
        const ids = phases.map((p: any) => `"${p.id}"`).join(',')
        const steps = await sbSelect('steps', `phase_id=in.(${ids})&select=id,phase_id,ord,text,photo_required&order=ord`)
        const phaseOrd: Record<string, number> = {}
        const phaseTitle: Record<string, string> = {}
        phases.forEach((p: any) => { phaseOrd[p.id] = p.ord; phaseTitle[p.id] = p.title })
        const ordered = steps.slice().sort((a: any, b: any) =>
          (phaseOrd[a.phase_id] - phaseOrd[b.phase_id]) || (a.ord - b.ord))
        if (ordered.length) {
          await sbInsert('job_steps', ordered.map((st: any, i: number) => ({
            job_id: job.id,
            step_id: st.id,
            ord: i + 1,
            text: st.text,
            photo_required: !!st.photo_required,
            // The phase travels with the step, so reading the checklist needs
            // no joins back through steps → phases.
            phase_title: phaseTitle[st.phase_id] ?? null,
            phase_ord: phaseOrd[st.phase_id] ?? null,
          })))
          stepCount = ordered.length
        }
      }
    } catch (e: any) {
      stepsError = e?.message || 'Checklist could not be created'
    }
  }

  // Tell the client it's on the calendar — unless they booked it themselves, in
  // which case they were just looking at the confirmation.
  if (!ownsIt) {
    const [named] = await sbSelect('properties', `id=eq.${prop.id}&select=name`)
    await sendNotice('booked', { orgId: prop.org_id, userId: prop.owner_id }, {
      subject: named?.name, link: 'schedule', jobId: job.id,
    })
  }

  return json(200, {
    ok: true,
    jobId: job.id,
    clientAmount,
    type: jobType,
    steps: stepCount,
    ...(stepsError ? { stepsError } : {}),
    // Booking never charges. The one capture happens at geofenced check-in.
    charged: false,
  })
}
