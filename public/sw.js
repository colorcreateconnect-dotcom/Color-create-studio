/* She's Maid In ATL — service worker.
 * Offline is a first-class requirement: the Kee Method checklist keeps working
 * with no signal, and photos are queued and synced when the device is back.
 *
 * - App shell + built assets: cache-first (updated in the background).
 * - Navigations: network-first, falling back to the cached shell / offline page.
 * - API + Netlify Functions: never cached (money-critical; always live).
 * - Photo outbox: IndexedDB queue + Background Sync so proof photos taken
 *   offline upload automatically on reconnect.
 */
const VERSION = 'smia-v3'
const SHELL = `${VERSION}-shell`
const RUNTIME = `${VERSION}-runtime`
const APP_SHELL = ['/', '/index.html', '/offline.html', '/manifest.webmanifest', '/icons/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  )
})

function isApi(url) {
  return url.pathname.startsWith('/.netlify/functions/') || url.pathname.startsWith('/rest/v1/') || url.pathname.startsWith('/auth/v1/')
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return // never cache mutations
  const url = new URL(request.url)

  // Money-critical + data calls: always live, never cached.
  if (isApi(url) || url.origin !== self.location.origin) return

  // Navigations: network-first with an offline fallback (checklist shell).
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(RUNTIME).then((c) => c.put(request, copy))
          return res
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/index.html')).then((r) => r || caches.match('/offline.html'))),
    )
    return
  }

  // Static assets: cache-first, refresh in the background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((res) => {
        if (res && res.ok) caches.open(RUNTIME).then((c) => c.put(request, res.clone()))
        return res
      }).catch(() => cached)
      return cached || network
    }),
  )
})

/* -------------------------------------------------- photo outbox (offline) -- */
const DB = 'smia-outbox'
const STORE = 'photos'

function idb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
async function outboxAll() {
  const db = await idb()
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readonly').objectStore(STORE).getAll()
    tx.onsuccess = () => resolve(tx.result || [])
    tx.onerror = () => resolve([])
  })
}
async function outboxDelete(id) {
  const db = await idb()
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
  })
}

async function flushOutbox() {
  const items = await outboxAll()
  for (const item of items) {
    try {
      const res = await fetch('/.netlify/functions/upload-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      })
      if (res.ok) await outboxDelete(item.id)
    } catch {
      break // still offline — try again on the next sync
    }
  }
  const clients = await self.clients.matchAll()
  clients.forEach((c) => c.postMessage({ type: 'photos-synced' }))
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-photos') event.waitUntil(flushOutbox())
})

// The page can nudge a flush when it detects reconnection (Background Sync is
// not on every browser, so this is the always-available fallback).
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'flush-photos') event.waitUntil(flushOutbox())
})
