/* Client-side Square Web Payments SDK: turns raw card entry into a single-use
 * token, entirely in the browser. The raw PAN never touches our servers — we
 * only ever forward the opaque token to the save-card function, which stores a
 * durable card-on-file id. Loaded lazily and only when Square is configured; in
 * the sandbox/demo (no keys) the card UI falls back to the prototype field. */
import { squareAppId, squareLocationId, squareSdkSrc, isSquareConfigured } from './config'

let sdkPromise: Promise<any> | null = null

/** Load the Square SDK <script> once; resolves to window.Square. */
function loadSdk(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if ((window as any).Square) return Promise.resolve((window as any).Square)
  if (sdkPromise) return sdkPromise
  sdkPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = squareSdkSrc()
    s.async = true
    s.onload = () => (window as any).Square ? resolve((window as any).Square) : reject(new Error('Square SDK failed to initialize'))
    s.onerror = () => reject(new Error('Square SDK failed to load'))
    document.head.appendChild(s)
  })
  return sdkPromise
}

export interface CardField {
  /** Tokenize the entered card; resolves to a single-use token or throws. */
  tokenize(): Promise<string>
  /** Remove the mounted field. */
  destroy(): Promise<void>
}

/** Mount a Square card input into `container` and return a handle to tokenize it. */
export async function mountCardField(container: HTMLElement): Promise<CardField> {
  if (!isSquareConfigured()) throw new Error('Square is not configured')
  const Square = await loadSdk()
  const payments = Square.payments(squareAppId(), squareLocationId())
  const card = await payments.card()
  await card.attach(container)
  return {
    async tokenize() {
      const result = await card.tokenize()
      if (result.status === 'OK' && result.token) return result.token as string
      const detail = result.errors?.map((e: any) => e.message).join('; ')
      throw new Error(detail || 'Card could not be verified')
    },
    async destroy() { try { await card.destroy() } catch { /* already gone */ } },
  }
}
