/* Turning on notifications, from the browser's side.
 *
 * Web Push needs no provider and costs nothing per message — the browser's own
 * push service delivers it, and the only credential is a VAPID keypair the
 * studio generates once. The private half stays in the Netlify env; only the
 * public half comes down here, which is what it is for.
 *
 * Everything degrades honestly:
 *   - No service worker / no Push API (older iOS Safari, a desktop browser with
 *     it disabled) → `pushSupport()` says so, and the app just doesn't offer it.
 *   - Permission denied → we say so and stop asking. The in-app notification
 *     list still works; a notice is a database row first and a push second.
 *   - No VAPID keys configured on the server → same as above.
 *
 * iOS note: Safari only allows push for a site the user has ADDED TO THEIR HOME
 * SCREEN. `navigator.standalone === false` on iOS means asking is pointless, so
 * we tell them to add it first rather than firing a prompt that can never
 * succeed. */

export type PushState =
  | 'unsupported'      // this browser can't do it at all
  | 'needs-install'    // iOS, and the app isn't on the home screen yet
  | 'default'          // supported, never asked
  | 'granted'
  | 'denied'

/** What this device can actually do, without asking for anything. */
export function pushSupport(): PushState {
  if (typeof window === 'undefined') return 'unsupported'
  const hasSw = 'serviceWorker' in navigator
  const hasPush = 'PushManager' in window
  const hasNotif = 'Notification' in window
  if (!hasSw || !hasPush || !hasNotif) {
    // On iOS this is what you see in a normal Safari tab; adding to the home
    // screen is what unlocks it, so say that instead of "unsupported".
    return isIos() && !isStandalone() ? 'needs-install' : 'unsupported'
  }
  if (isIos() && !isStandalone()) return 'needs-install'
  const p = Notification.permission
  return p === 'granted' ? 'granted' : (p === 'denied' ? 'denied' : 'default')
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  // iPadOS 13+ reports as a Mac; the touch-point check separates it.
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && (navigator as any).maxTouchPoints > 1)
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (navigator as any).standalone === true
    || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
}

/** VAPID keys arrive base64url; PushManager wants raw bytes. */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

/** A PushSubscription in the shape the server stores. */
export interface PushKeys { endpoint: string; keys: { p256dh: string; auth: string } }

function toStored(sub: PushSubscription): PushKeys | null {
  const json: any = sub.toJSON()
  const p256dh = json?.keys?.p256dh
  const auth = json?.keys?.auth
  if (!json?.endpoint || !p256dh || !auth) return null
  return { endpoint: json.endpoint, keys: { p256dh, auth } }
}

/** Ask, then subscribe. Returns the subscription for the caller to register
 *  with the server, or a reason it didn't happen. */
export async function enablePush(publicKey: string): Promise<
  { ok: true; subscription: PushKeys } | { ok: false; reason: PushState | 'no-key' | 'failed'; detail?: string }
> {
  const state = pushSupport()
  if (state === 'unsupported' || state === 'needs-install' || state === 'denied') return { ok: false, reason: state }
  if (!publicKey) return { ok: false, reason: 'no-key' }

  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission()
  if (permission !== 'granted') return { ok: false, reason: permission === 'denied' ? 'denied' : 'default' }

  try {
    const reg = await navigator.serviceWorker.ready
    // An existing subscription made with a different key must go, or the push
    // service keeps encrypting to a key the server no longer holds.
    const existing = await reg.pushManager.getSubscription()
    if (existing) {
      const same = sameKey(existing, publicKey)
      if (same) {
        const stored = toStored(existing)
        if (stored) return { ok: true, subscription: stored }
      }
      await existing.unsubscribe().catch(() => { /* replaced below anyway */ })
    }
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })
    const stored = toStored(sub)
    if (!stored) return { ok: false, reason: 'failed', detail: 'The browser returned an incomplete subscription' }
    return { ok: true, subscription: stored }
  } catch (e: any) {
    return { ok: false, reason: 'failed', detail: e?.message || 'Could not turn on notifications' }
  }
}

function sameKey(sub: PushSubscription, publicKey: string): boolean {
  const raw = (sub.options as any)?.applicationServerKey
  if (!raw) return false
  try {
    const a = new Uint8Array(raw)
    const b = urlBase64ToUint8Array(publicKey)
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
    return true
  } catch { return false }
}

/** Stop pushing to this device. Returns the endpoint so the caller can tell
 *  the server to drop the row. */
export async function disablePush(): Promise<string | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return null
    const endpoint = sub.endpoint
    await sub.unsubscribe()
    return endpoint
  } catch { return null }
}

/** Is this device currently subscribed? (Permission alone isn't enough — a
 *  subscription can be dropped by the browser.) */
export async function currentEndpoint(): Promise<string | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    return sub?.endpoint ?? null
  } catch { return null }
}
