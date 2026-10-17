import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { FEEDS } from './src/data/feeds'
import type { FeedSource } from './src/types'

const APP_USER_AGENT = 'newsfeed/1.0 (+https://news.vrbl.win)'

interface FeedProxyEntry {
  target: string
  changeOrigin: boolean
  followRedirects: boolean
  headers: Record<string, string>
  rewrite: (path: string) => string
}

function proxyEntry(feed: FeedSource): FeedProxyEntry {
  const upstream = new URL(feed.url)
  const fixedPath = upstream.pathname + upstream.search
  return {
    target: upstream.origin,
    changeOrigin: true,
    // Resolve upstream redirects (e.g. desktop -> mobile hosts) inside the
    // proxy so the browser never follows them cross-origin and hits CORS.
    followRedirects: true,
    // Present a stable non-handset identity so publishers serve the canonical
    // feed instead of redirecting to a mobile host.
    headers: { 'user-agent': APP_USER_AGENT },
    rewrite: () => fixedPath,
  }
}

function feedProxyMap(): Record<string, FeedProxyEntry> {
  const proxy: Record<string, FeedProxyEntry> = {}
  for (const feed of FEEDS) {
    proxy['/feeds/' + feed.id] = proxyEntry(feed)
  }
  return proxy
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: feedProxyMap(),
  },
})
