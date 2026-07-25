/* The job payment state machine — the money model as an explicit, testable
 * graph. One capture on arrival; the split is a *release schedule*, never a
 * second charge. Illegal transitions throw so a bug can't, say, double-capture
 * or release before capture. */

export type PaymentState =
  | 'scheduled' // job booked, card on file with recorded consent
  | 'capture_failed' // charge failed at check-in — job is HELD before the clean proceeds
  | 'captured' // full service amount captured in one charge at GPS check-in
  | 'deposit_released' // 50% (arrival) released to the cleaner
  | 'awaiting_approval' // clean submitted; owner has a 24h review window
  | 'approved' // owner approved within the window
  | 'auto_approved_48h' // no response by 48h → auto-approved
  | 'final_released' // remaining 50% released
  | 'settled' // fully reconciled
  | 'disputed' // owner opened a dispute — pauses auto-release
  | 'refunded' // charge refunded

export const PAYMENT_TRANSITIONS: Record<PaymentState, PaymentState[]> = {
  scheduled: ['captured', 'capture_failed', 'refunded'],
  capture_failed: ['captured', 'refunded'], // retry after the owner updates their card
  // 'settled' is the concierge capture-at-close path: one charge at close, no
  // 50/50 arrival split. Cleaning jobs still go captured → deposit_released.
  captured: ['deposit_released', 'settled', 'disputed', 'refunded'],
  deposit_released: ['awaiting_approval', 'disputed', 'refunded'],
  awaiting_approval: ['approved', 'auto_approved_48h', 'disputed'],
  approved: ['final_released', 'disputed'],
  auto_approved_48h: ['final_released'],
  final_released: ['settled', 'disputed', 'refunded'],
  disputed: ['approved', 'final_released', 'refunded'], // resolved: re-clean→approve, or refund
  settled: ['disputed', 'refunded'], // a late chargeback can still land
  refunded: [],
}

export function canTransition(from: PaymentState, to: PaymentState): boolean {
  return PAYMENT_TRANSITIONS[from]?.includes(to) ?? false
}

export class IllegalPaymentTransition extends Error {
  constructor(from: PaymentState, to: PaymentState) {
    super(`Illegal payment transition: ${from} → ${to}`)
    this.name = 'IllegalPaymentTransition'
  }
}

export function transition(from: PaymentState, to: PaymentState): PaymentState {
  if (!canTransition(from, to)) throw new IllegalPaymentTransition(from, to)
  return to
}

/** Two release milestones off a single captured amount (integer cents-safe). */
export function releaseAmounts(fullServiceAmount: number): { arrival: number; final: number } {
  const arrival = Math.round(fullServiceAmount * 100 / 2) / 100
  const final = Math.round((fullServiceAmount - arrival) * 100) / 100
  return { arrival, final }
}

export const REVIEW_WINDOW_HOURS = 24
export const AUTO_RELEASE_HOURS = 48

/**
 * Given when the report was submitted and "now", decide whether the balance
 * auto-releases. A held dispute suppresses it regardless of the clock.
 */
export function shouldAutoRelease(
  submittedAtMs: number,
  nowMs: number,
  disputeOpen: boolean,
): boolean {
  if (disputeOpen) return false
  return nowMs - submittedAtMs >= AUTO_RELEASE_HOURS * 3600_000
}
