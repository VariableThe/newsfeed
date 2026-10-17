/**
 * newsfeed Service Worker
 * Cache-first for shell, network-first for feeds, stale-while-revalidate for static assets
 */

const CACHE = 'newsfeed-v2'
const RUNTIME = 'newsfeed-feeds-v2'
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
  const url = new URL(event.request.url)
  const isSameOrigin = url.origin === self.location.origin

  // Never cache non-ok or opaque responses
  // Never intercept non-GET
  if (event.request.method !== 'GET') {
    return
  }

  // Feed routes: network-first with cache fallback
  if (isSameOrigin && url.pathname.startsWith('/feeds/')) {
    event.respondWith(
      (async () => {
        try {
          const networkResp = await fetch(event.request)
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
          // Total failure: synthetic error response
          return new Response('Feed fetch failed offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' },
          })
        }
      })()
    )
    return
  }

  // Navigations: serve cached shell first, revalidate in background
  // mode lives on the request, not on the parsed URL
  if (isSameOrigin && event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE)
        const cached = await cache.match('/index.html')
        // Cached shell: return it now and revalidate without blocking the response
        if (cached) {
          fetch(event.request)
            .then((networkResp) => {
              if (networkResp.ok) {
                return cache.put(event.request, networkResp.clone())
              }
            })
            .catch(() => {
              // Background revalidation must never affect the served response
            })
          return cached
        }
        // No shell cached, fall back to network without throwing
        try {
          const networkResp = await fetch(event.request)
          return networkResp
        } catch (err) {
          // Last resort: any cached shell, then a plain non-HTML error
          const fallback = await cache.match('/index.html')
          if (fallback) return fallback
          return new Response('Offline', { status: 503, statusText: 'Offline', headers: { 'Content-Type': 'text/plain' } })
        }
      })()
    )
    return
  }

  // Other same-origin static assets: cache-first (consult cache BEFORE network)
  if (isSameOrigin) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE)
        const cached = await cache.match(event.request)
        if (cached) {
          // Revalidate in background
          try {
            const networkResp = await fetch(event.request)
            if (networkResp.ok) {
              cache.put(event.request, networkResp.clone())
            }
          } catch (err) {
            // ignore background revalidate failures
          }
          return cached
        }
        // Not in cache, fetch from network
        try {
          const networkResp = await fetch(event.request)
          if (networkResp.ok) {
            cache.put(event.request, networkResp.clone())
          }
          return networkResp
        } catch (err) {
          // Network rejected, return cached if present (already checked above)
          return cached || new Response('Offline', { status: 503, statusText: 'Offline', headers: { 'Content-Type': 'text/plain' } })
        }
      })()
    )
    return
  }

  // Cross-origin: just fetch
  event.respondWith(fetch(event.request))
})