/* Scheduled worker: at 48h with no owner response and no open dispute, the
 * balance AUTO-RELEASES (treated as auto-approved). Runs hourly. */
import { sbSelect, sbUpdate, sbInsert, json } from './_shared/db'
import { notify, MSG } from './_shared/sms'
import { transition, releaseAmounts, shouldAutoRelease } from '../../src/lib/payments/state'

export const config = { schedule: '@hourly' }

export const handler = async () => {
  const now = Date.now()
  // Candidates: awaiting approval, submitted at least 48h ago.
  const cutoff = new Date(now - 48 * 3600_000).toISOString()
  const jobs = await sbSelect('jobs', `payment_state=eq.awaiting_approval&submitted_at=lte.${cutoff}&select=id,client_amount,cleaner_id,owner_id,submitted_at,properties(name)`)

  let released = 0
  for (const job of jobs) {
    const [openDispute] = await sbSelect('disputes', `job_id=eq.${job.id}&open=eq.true&select=id&limit=1`)
    if (!shouldAutoRelease(new Date(job.submitted_at).getTime(), now, !!openDispute)) continue

    const auto = transition('awaiting_approval', 'auto_approved_48h')
    const finalReleased = transition(auto, 'final_released')
    const { final } = releaseAmounts(Number(job.client_amount))

    await sbInsert('approvals', [{ job_id: job.id, kind: 'auto_48h' }])
    await sbInsert('payouts', [{ job_id: job.id, cleaner_id: job.cleaner_id, kind: 'approval_50', amount: final }])
    await sbUpdate('jobs', `id=eq.${job.id}`, { payment_state: finalReleased })

    // Both sides hear about money that moved without anyone pressing a button.
    const propName = job.properties?.name || 'your home'
    await notify(job.cleaner_id, MSG.autoReleasedCleaner(final))
    await notify(job.owner_id, MSG.autoReleasedOwner(propName))
    released++
  }
  return json(200, { ok: true, considered: jobs.length, released })
}
