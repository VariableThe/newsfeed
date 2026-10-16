/**
 * newsfeed Service Worker
 * Cache-first for shell, network-first for feeds, stale-while-revalidate for static assets
 */

const CACHE = 'newsfeed-v1'
const RUNTIME = 'newsfeed-feeds-v1'
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg']

// Extract existing icon paths from manifest for precaching
const manifestIcons = [
  '/icons-192.png',
  '/icons-512.png',
  '/icons-512-maskable.png',
]

const STATIC_SHELL = [...SHELL, ...manifestIcons]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => {
      return cache.addAll(STATIC_SHELL)
    }).then(() => {
      self.skipWaiting()
    })
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE && key !== RUNTIME) {
            return caches.delete(key)
          }
        })
      )
    }).then(() => {
      clients.claim()
    })
  )
})

self.addEventListener('fetch', (event) => {
  // Never cache non-ok or opaque responses
  // Never intercept POSTs
  if (event.request.method !== 'GET' || event.request.method === 'POST') {
    return
  }

  const url = new URL(event.request.url)
  const isSameOrigin = url.origin === self.location.origin

  // Feed routes: network-first with cache fallback
  if (isSameOrigin && url.pathname.startsWith('/feeds/')) {
    event.respondWith(
      (async () => {
        try {
          const networkResp = await fetch(event.request, {
            timeout: 5000,
          })
          if (networkResp.ok) {
            const feedCache = await caches.open(RUNTIME)
            feedCache.put(event.request, networkResp.clone())
          }
          return networkResp
        } catch (err) {
          // Fallback to cache
          const cache = await caches.open(RUNTIME)
          const cached = await cache.match(event.request)
          if (cached) return cached
          // Fallback to network anyway (may fail offline)
          return fetch(event.request)
        }
      })()
    )
    return
  }

  // Other same-origin static assets: stale-while-revalidate
  if (isSameOrigin) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE)
        const cached = await cache.match(event.request)
        const networkResp = await fetch(event.request)
        if (networkResp.ok) {
          cache.put(event.request, networkResp.clone())
        }
        if (cached) {
          return cached
        }
        return networkResp
      })()
    )
    return
  }

  // Cross-origin: just fetch
  event.respondWith(fetch(event.request))
})