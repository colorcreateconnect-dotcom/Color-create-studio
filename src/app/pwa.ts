/* Registers the service worker and wires the offline photo-sync nudges. Kept out
 * of the render path so the UI (locked visuals) is untouched. */
export function registerPwa() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // When we come back online, ask the SW to flush queued proof photos.
      const flush = () => reg.active?.postMessage({ type: 'flush-photos' })
      window.addEventListener('online', flush)
      // Background Sync where supported (best effort).
      if ('sync' in reg) (reg as any).sync?.register('sync-photos').catch(() => {})
    }).catch(() => { /* SW is an enhancement; the app still works without it */ })
  })
}
