/* Adapter factory: real Square when a token is configured, else the deterministic
 * mock (local dev / preview). Everything downstream depends only on the
 * PaymentAdapter interface, so swapping to a marketplace processor later is a
 * one-file change here. */
import type { PaymentAdapter } from '../../../src/lib/payments/adapter'
import { MockAdapter } from '../../../src/lib/payments/adapter'
import { SquareAdapter } from './square'

export function getAdapter(): PaymentAdapter {
  return process.env.SQUARE_ACCESS_TOKEN ? new SquareAdapter() : new MockAdapter()
}
