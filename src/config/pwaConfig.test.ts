import { describe, it, expect } from 'vitest'
import vercelRaw from '../../vercel.json?raw'
import manifestRaw from '../../public/manifest.webmanifest?raw'
import indexHtmlRaw from '../../index.html?raw'
import viteConfigRaw from '../../vite.config.ts?raw'
import { FEEDS, FEED_IDS } from '../data/feeds'

interface VercelRewrite {
  source: string
  destination: string
}

interface VercelConfig {
  rewrites?: VercelRewrite[]
}

interface ManifestIcon {
  src: string
  sizes?: string
  purpose?: string
}

interface WebManifest {
  name?: string
  short_name?: string
  start_url?: string
  display?: string
  theme_color?: string
  background_color?: string
  icons?: ManifestIcon[]
}

function parseJson<T>(raw: string, label: string): T {
  try {
    return JSON.parse(raw) as T
  } catch {
    throw new Error(`${label} is not valid JSON`)
  }
}

// --- vercel.json guards ---

describe('vercel.json feed rewrites', () => {
  it('every FEED_IDS entry has a matching /feeds/<id> rewrite', () => {
    const vercel = parseJson<VercelConfig>(vercelRaw, 'vercel.json')
    const rewrites = vercel.rewrites ?? []
    for (const id of FEED_IDS) {
      const rewrite = rewrites.find((r) => r.source === `/feeds/${id}`)
      expect(rewrite, `vercel.json must have a rewrite for /feeds/${id}`).toBeDefined()
      expect(rewrite?.destination).toMatch(/^https:/)
    }
  })

  it('no rewrite whose source is not a catalog feed path (no accidental open proxy)', () => {
    const vercel = parseJson<VercelConfig>(vercelRaw, 'vercel.json')
    const rewrites = vercel.rewrites ?? []
    const nonFeedSources = rewrites.filter(
      (r) => !FEED_IDS.includes(r.source.replace('/feeds/', '')),
    )
    expect(nonFeedSources).toHaveLength(0)
  })

  it("each destination equals that feed's catalog url", () => {
    const vercel = parseJson<VercelConfig>(vercelRaw, 'vercel.json')
    const rewrites = vercel.rewrites ?? []
    for (const rewrite of rewrites) {
      const feedId = rewrite.source.replace('/feeds/', '')
      const feed = FEEDS.find((f) => f.id === feedId)
      expect(feed, `Feed ${feedId} not found in catalog`).toBeDefined()
      expect(rewrite.destination).toBe(feed?.url)
    }
  })
})

// --- vite.config.ts proxy guard ---

describe('vite.config.ts proxy sync', () => {
  it('FEEDS is imported from the catalog', () => {
    expect(viteConfigRaw).toMatch(
      /import\s+{\s*FEEDS\s*}/,
    )
  })

  it('server.proxy maps every catalog feed id under /feeds/', () => {
    expect(viteConfigRaw).toContain('proxy')
    expect(viteConfigRaw).toContain("'/feeds/' + feed.id")
    for (const feed of FEEDS) {
      expect(FEED_IDS).toContain(feed.id)
    }
    expect(FEED_IDS).toHaveLength(FEEDS.length)
  })

  it('proxy targets the feed origin and rewrites to a fixed upstream path', () => {
    expect(viteConfigRaw).toContain('new URL(feed.url)')
    expect(viteConfigRaw).toContain('.origin')
    expect(viteConfigRaw).toContain('pathname')
    expect(viteConfigRaw).not.toContain('path.url')
  })

  it('proxy resolves upstream redirects with a stable non-handset app identity', () => {
    expect(viteConfigRaw).toContain('followRedirects: true')
    expect(viteConfigRaw).toContain("'user-agent'")
    expect(viteConfigRaw).toContain('newsfeed/1.0')
    expect(viteConfigRaw).not.toMatch(/iPhone|Android/)
  })
})

// --- manifest.webmanifest guards ---

describe('manifest.webmanifest', () => {
  it('parses as JSON', () => {
    const manifest = parseJson<WebManifest>(manifestRaw, 'manifest.webmanifest')
    expect(manifest).toBeDefined()
  })

  it('has required fields: name, short_name, start_url, display standalone, theme_color, background_color', () => {
    const manifest = parseJson<WebManifest>(manifestRaw, 'manifest.webmanifest')
    expect(manifest.name).toBeDefined()
    expect(manifest.short_name).toBeDefined()
    expect(manifest.start_url).toBeDefined()
    expect(manifest.display).toBe('standalone')
    expect(manifest.theme_color).toBeDefined()
    expect(manifest.background_color).toBeDefined()
  })

  it('has 192 icon, 512 icon and maskable icon, each pointing at an /icons- asset', () => {
    const manifest = parseJson<WebManifest>(manifestRaw, 'manifest.webmanifest')
    const icons = manifest.icons ?? []

    const icon192 = icons.find((i) => i.sizes === '192x192')
    expect(icon192, 'manifest must have a 192x192 icon').toBeDefined()
    expect(icon192?.src).toMatch(/^\/icons-/)

    const icon512 = icons.find((i) => i.sizes === '512x512')
    expect(icon512, 'manifest must have a 512x512 icon').toBeDefined()
    expect(icon512?.src).toMatch(/^\/icons-/)

    const maskable = icons.find((i) => i.purpose === 'maskable')
    expect(maskable, 'manifest must have a maskable icon').toBeDefined()
    expect(maskable?.src).toMatch(/^\/icons-/)
  })
})

// --- index.html guards ---

describe('index.html', () => {
  it('contains rel="manifest"', () => {
    expect(indexHtmlRaw).toContain('rel="manifest"')
  })

  it('contains theme-color meta', () => {
    expect(indexHtmlRaw).toContain('name="theme-color"')
  })

  it('contains viewport-fit=cover', () => {
    expect(indexHtmlRaw).toContain('viewport-fit=cover')
  })

  it('contains no vite.svg reference', () => {
    expect(indexHtmlRaw).not.toContain('vite.svg')
  })

  it('has lang="en"', () => {
    expect(indexHtmlRaw).toMatch(/<html[^>]*lang="en"/)
  })
})
