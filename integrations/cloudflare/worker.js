/**
 * Cloudflare Worker: Edge caching + KV fallback for offline-ish profile access.
 *
 * Bindings expected (see wrangler.toml.example):
 * - FITTRACK_KV: KV namespace for cached JSON snapshots
 * - ENV.BACKEND_ORIGIN: e.g. https://your-backend.example.com or tunnel URL
 */

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url)

    // Health
    if (url.pathname === '/health') {
      return json({ status: 'ok' })
    }

    // Static asset edge cache (HTML/JS/CSS/images)
    if (req.method === 'GET' && isStaticAsset(url.pathname)) {
      const cache = caches.default
      const cached = await cache.match(req)
      if (cached) return cached
      const resp = await fetch(req)
      if (resp.ok) {
        // Cache for 1 day at edge
        const toCache = new Response(resp.body, resp)
        toCache.headers.set('Cache-Control', 'public, max-age=86400, s-maxage=86400')
        ctx.waitUntil(cache.put(req, toCache.clone()))
        return toCache
      }
      return resp
    }

    // API proxy with KV fallback for profile endpoints
    if (url.pathname.startsWith('/api/')) {
      const backend = env.BACKEND_ORIGIN || 'http://localhost:8000'
      const forwardUrl = backend + url.pathname.replace(/^\/api\//, '/') + url.search
      const cacheKey = kvKeyFromPath(url.pathname)

      // Only cache idempotent GETs for known profile-ish endpoints
      const eligibleForKV = req.method === 'GET' && (
        /\/clients\/(\d+)\/(profile|measurements|meals)/.test(url.pathname) ||
        /\/trainers\/dashboard/.test(url.pathname) ||
        /\/public\/profile\/[a-zA-Z0-9_-]+/.test(url.pathname)
      )

      try {
        const upstreamResp = await fetch(forwardUrl, {
          method: req.method,
          headers: req.headers,
          body: req.method === 'GET' ? undefined : req.body
        })

        if (eligibleForKV && upstreamResp.ok) {
          const copy = new Response(upstreamResp.body, upstreamResp)
          const data = await copy.clone().text()
          // Store JSON snapshot for 24h
          ctx.waitUntil(env.FITTRACK_KV.put(cacheKey, data, { expirationTtl: 86400 }))
          // Encourage CDN caching too
          copy.headers.set('Cache-Control', 'public, max-age=300, s-maxage=600')
          return copy
        }

        return upstreamResp
      } catch (e) {
        // Origin unreachable: serve last known good snapshot from KV if available
        if (eligibleForKV) {
          const cached = await env.FITTRACK_KV.get(cacheKey)
          if (cached) {
            return new Response(cached, {
              headers: {
                'Content-Type': 'application/json',
                'X-Edge-Fallback': 'KV'
              }
            })
          }
        }
        return new Response('Service unavailable', { status: 503 })
      }
    }

    return new Response('Not found', { status: 404 })
  }
}

function isStaticAsset(pathname) {
  return /\.(?:html|js|css|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|mp4|webm)$/.test(pathname) || pathname === '/'
}

function kvKeyFromPath(pathname) {
  // Example: /api/clients/1/profile -> kv:clients:1:profile
  return 'kv:' + pathname.replace(/^\/api\//, '').replace(/[\/#?]/g, ':')
}

function json(obj) {
  return new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' } })
}
