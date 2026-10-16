# newsfeed

A personal, phone-first RSS news reader. It curates nine publisher feeds (BBC
World, Business and Science; New York Times World, Technology, Health and
Sports; Economic Times Markets and Tech), pulls them straight from the
publishers in the browser, and gives you three ways to read them: a swipe deck,
a chronological feed, and a saved list.

newsfeed is a static site. There is no backend, no database and no account: the
build output is HTML, CSS and JavaScript, and every fetch goes from the phone to
the publisher. It is deployed at https://news.vrbl.win and lives at
https://github.com/VariableThe/newsfeed.

## Features

- **Deck** — one story at a time, advanced by swiping, by explicit buttons, or
  by the arrow keys and Enter on a keyboard. Save or open while you swipe.
- **Feed** — chronological list of everything loaded, with search plus topic and
  source filters, an unread-only toggle, and per-source status so you can see
  which feeds actually returned items.
- **Saved** — the articles you kept, stored as full snapshots so they survive a
  reload and read offline.
- **Reader** — full text when the feed carries `content:encoded`, otherwise the
  excerpt with a clear statement that it is only an excerpt, plus a link to the
  publisher. Share through `navigator.share` with a clipboard fallback.
- **PWA / offline** — installable from the manifest, icons for 192, 512 and
  maskable, precached app shell and a network-first cache for feed responses.
- **Notifications** — trending-only, via the real Notification API, with
  quiet hours and dedupe by seen id. Unsupported and denied states say so
  instead of pretending to work.
- **Trending** — detected, not assigned: the same normalised headline from two
  or more distinct sources within 60 minutes.
- **Settings** — notifications and quiet hours, theme (system / light / dark),
  topic and source preferences, and a reset.

## How it works

### The transport chain

Most publishers do not send CORS headers, so a browser `fetch` straight to the
feed is blocked. `src/services/transport.ts` therefore tries four routes in
order and stops at the first success:

1. **same-origin `/feeds/<id>`** — described below.
2. **the feed URL directly** — works when the publisher sends permissive CORS
   headers, which most of them do not.
3. **`https://api.cors.lol/?url=<encoded>`** — third-party CORS proxy.
4. **`https://api.rss2json.com/v1/api.json?rss_url=<encoded>`** — third-party
   proxy that returns JSON rather than XML.

Each attempt has an 8 second `AbortController` timeout. Timeouts, network
errors and 5xx responses get at most one retry after a 500 ms backoff; 4xx
responses never retry. An HTML body served with a 200 counts as a failure,
because a publisher login or redirect page is not a feed. Every attempt is
recorded as `{ via, error }` and the failures are surfaced in the UI, so an
empty screen always comes with a reason.

### Why `/feeds/<id>` exists, in development and in production

`/feeds/<id>` is a same-origin path that resolves to the real feed URL. The
browser only ever talks to its own origin, so no CORS preflight happens and no
third-party proxy has to be trusted or be online.

It exists twice, from one catalog:

- **Production** — `vercel.json` rewrites each `/feeds/<id>` to the publisher
  URL at the Vercel edge. The feed is fetched by Vercel, not by the phone, and
  returned from the same origin as the app. A `CDN-Cache-Control:
  public, max-age=300, stale-while-revalidate=600` header means one upstream
  fetch serves everyone for five minutes and keeps serving stale content while
  it refreshes.
- **Development** — `vite.config.ts` builds an equivalent dev-server proxy from
  the same `FEEDS` catalog, so `npm run dev` behaves like production without
  `vercel dev`. The proxy sets `followRedirects` and sends a stable
  `newsfeed/1.0 (+https://news.vrbl.win)` user-agent: without it, publishers
  redirect phone requests to their mobile domains, which the app cannot parse.

The two configurations are kept in sync deliberately: `src/config/pwaConfig.test.ts`
fails if a catalog feed has no `/feeds/<id>` rewrite, if a rewrite points
anywhere other than that feed's catalog URL, or if the Vite proxy stops mapping
the catalog. Without that guard, the same-origin path could silently become an
open proxy.

### Data integrity

- **Stable ids** — `src/lib/hash.ts` derives an article id from a content hash,
  so the same article has the same id across reloads and machines. Saved state
  and read state stay valid.
- **Dedupe** — `dedupeArticles` normalises URLs (drops tracking parameters,
  lowercases the host, strips `www.`, removes fragments and trailing slashes)
  and normalises titles, then keeps one winner per URL and one per
  title-in-hour-bucket. Ties are broken deterministically by timestamp, then id.
- **Ordering** — `sortByRecency` is a total, deterministic order by timestamp
  with the id as tiebreaker. There is no random shuffling.
- **Persistence** — `src/state/persistence.ts` writes one versioned
  `localStorage` payload. Anything that does not validate against the current
  schema version is discarded rather than partially trusted. Saved articles are
  stored as full snapshots rather than ids, so the saved list still renders when
  the network is gone; read ids are capped at 3000 and seen ids at 500 to keep
  the payload bounded.
- **RSS parsing** — `src/services/rssParser.ts` handles RSS 2.0 and Atom with
  `DOMParser`: CDATA, HTML entities, `content:encoded`, images from
  `media:content`, `media:thumbnail` and `enclosure`, and a missing-date
  fallback chain (item date, then channel date, then caller fallback, then the
  epoch). It never substitutes the current time, because a fake "just now"
  timestamp is worse than an honest old one.

### No fabricated content

If every transport fails, the UI says so and offers retry. It does not invent
articles, badges, counts or timestamps. Article counts come from parsed items,
trending comes from the 2+ source rule, and a feed that returns an empty channel
is shown as a feed with zero items. This is a deliberate policy: the previous
build substituted about 12 KB of fake articles, and the difference between
"nothing loaded" and "here is some plausible-looking news" is the difference
between a usable reader and a misleading one.

## Project structure

```
src/
  components/   UI: deck, feed, saved, reader, settings, tab bar, shared primitives
  config/       pwaConfig.test.ts — the guard keeping vercel.json and vite.config.ts in sync
  data/         feeds.ts, the curated feed catalog, plus its test
  hooks/        useHashRoute (hash routing), useMediaQuery (responsive behaviour)
  lib/          pure logic: contentId, normalizeUrl / normalizeTitle / stripHtml,
                dedupe / recency ordering / trending, source colours, formatters
  services/     transport, rssParser, feedService, cache, notifications
  state/        reducer, versioned localStorage persistence, selectors, React store
  test/         vitest setup
  types/        NewsArticle, FeedSource and the feed/status types
public/
  manifest.webmanifest, sw.js, icons-192.png, icons-512.png,
  icons-512-maskable.png, favicon.svg
vercel.json     /feeds/<id> rewrites and cache headers
vite.config.ts  dev-only /feeds/<id> proxy generated from the feed catalog
```

## Local development

```
npm install
npm run dev
```

The dev server proxies `/feeds/*` through `vite.config.ts`, which imports the
same feed catalog the app does. Adding a feed to the catalog is enough for the
proxy to cover it, and the app behaves the same way it will in production:
same-origin first, proxies only as a fallback.

## Commands

| Command             | What it does                                   |
| ------------------- | ---------------------------------------------- |
| `npm run dev`       | Vite dev server with the `/feeds/*` proxy      |
| `npm run build`     | `tsc -b` then the production Vite build        |
| `npm run preview`   | Serve the production build locally             |
| `npm run typecheck` | `tsc -b`, no emit                              |
| `npm run lint`      | ESLint over the repo                           |
| `npm test`          | Vitest, single run                             |
| `npm run test:watch`| Vitest in watch mode                           |

CI (`.github/workflows/ci.yml`) runs `npm ci`, `typecheck`, `lint`, `test` and
`build` on Node 24 for pushes to `main` and for every pull request into `main`.
Keep the local commands and that list identical.

## Testing

The suite is offline by design: `fetch` is faked and XML/JSON fixtures live in
`src/services/__tests__/fixtures/`, so tests never touch the network, never
depend on a publisher being up, and never fail because a feed changed. Covered:
the transport chain (ordering, timeouts, retry-versus-no-retry, HTML-as-failure,
attempt reporting), RSS 2.0 and Atom parsing including CDATA, entities,
`content:encoded`, images and the missing-date fallbacks, the feed cache,
dedupe / ordering / trending, persistence validation and legacy-key cleanup,
the reducer, selectors, notifications and quiet hours, the formatters and
hashing, and the main UI flows through Testing Library. `src/config/pwaConfig.test.ts`
additionally treats `vercel.json`, `vite.config.ts`, the manifest and
`index.html` as tested artefacts.

## Deployment

Vercel, static build, no server-side code. `vercel.json` carries the feed
rewrites and the cache header for `/feeds/:path*`. The repository is the source
of truth for what is deployed at https://news.vrbl.win.

The service worker is registered only when `import.meta.env.PROD` is true, so
offline behaviour and installability need a production build
(`npm run build && npm run preview`, or a real deployment). In `npm run dev`
there is no service worker, and a stale cache from a previous preview can hide
changes — unregister it in devtools if the app looks frozen.

## Adding or removing a feed

Everything hangs off one catalog, `src/data/feeds.ts`: an `id` (kebab-case,
unique), a `name`, an https `url`, an optional `homepage`, and at least one
topic. `FEED_IDS` and `ALL_TOPICS` are derived from it, and the feed tests check
those invariants.

Two things must stay in step with the catalog:

1. `vercel.json` — add a `{ "source": "/feeds/<id>", "destination": "<feed url>" }`
   rewrite. Production has no other path to the feed.
2. `vite.config.ts` — nothing to edit, as the dev proxy is generated from
   `FEEDS`, but the file is part of the guard below.

`src/config/pwaConfig.test.ts` fails if any of this drifts: a catalog feed with
no rewrite, a rewrite that is not a catalog feed, a rewrite whose destination is
not that feed's catalog URL, or a Vite proxy that no longer maps the catalog.
That is intentional — an unsynchronised rewrite is either a broken feed or an
accidental open proxy.

## Known limitations

- **`nyt-sports` and `et-markets` currently return valid but empty RSS
  channels upstream.** The app shows them as feeds with zero items. That is the
  publisher's data, not a parsing bug.
- **The third-party proxies are best-effort.** `api.cors.lol` and
  `api.rss2json.com` are frequently rate-limited or down, which is exactly why
  same-origin `/feeds/<id>` is attempted first. If the edge rewrite is
  unavailable and both proxies refuse, a refresh fails and says so.
- **The test suite is offline.** It exercises the app against fixtures, so it
  cannot catch a publisher changing its feed format in production.
- **Feeds are curated, not configurable in the UI.** Adding or removing a
  source is a code change plus a deployment.
- **No backend means no cross-device sync.** Read, saved, filter and theme
  state live in the browser's `localStorage` on one device.
- **Excerpt-only articles stay excerpt-only.** Several publishers ship only a
  short description, so the reader says so and links out rather than fetching
  and scraping the article page.
