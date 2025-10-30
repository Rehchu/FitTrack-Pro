/**
 * FitTrack Pro - Edge Worker Template
 * Deployed automatically for each trainer via central registration API
 */

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url)

    // Health check
    if (url.pathname === '/health') {
      return json({ status: 'ok', worker: 'fittrack-pro' })
    }

    // Static asset edge cache
    if (req.method === 'GET' && isStaticAsset(url.pathname)) {
      const cache = caches.default
      const cached = await cache.match(req)
      if (cached) return cached
      
      const resp = await fetch(req)
      if (resp.ok) {
        const toCache = new Response(resp.body, resp)
        toCache.headers.set('Cache-Control', 'public, max-age=86400')
        ctx.waitUntil(cache.put(req, toCache.clone()))
        return toCache
      }
      return resp
    }

    // API proxy with KV fallback
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/public/')) {
      const backend = env.BACKEND_ORIGIN || 'http://localhost:8000'
      const forwardPath = url.pathname.replace(/^\/api\//, '/')
      const forwardUrl = backend + forwardPath + url.search
      const cacheKey = kvKeyFromPath(url.pathname)

      // Cache eligible GET requests
      const eligibleForKV = req.method === 'GET' && (
        /\/clients\/(\d+)\/(measurements|meals)/.test(url.pathname) ||
        /\/public\/profile\/[a-zA-Z0-9_-]+/.test(url.pathname) ||
        /\/trainers\/dashboard/.test(url.pathname)
      )

      try {
        // Forward request to trainer's local backend
        const upstreamResp = await fetch(forwardUrl, {
          method: req.method,
          headers: req.headers,
          body: req.method === 'GET' ? undefined : req.body
        })

        // Cache successful GET responses in KV
        if (eligibleForKV && upstreamResp.ok) {
          const copy = new Response(upstreamResp.body, upstreamResp)
          const data = await copy.clone().text()
          ctx.waitUntil(env.FITTRACK_KV.put(cacheKey, data, { expirationTtl: 86400 }))
          copy.headers.set('Cache-Control', 'public, max-age=300')
          return copy
        }

        return upstreamResp

      } catch (error) {
        // Backend unreachable - try KV fallback
        if (eligibleForKV) {
          const cached = await env.FITTRACK_KV.get(cacheKey)
          if (cached) {
            return new Response(cached, {
              headers: {
                'Content-Type': 'application/json',
                'X-Edge-Fallback': 'true'
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
  return 'kv:' + pathname.replace(/^\/api\//, '').replace(/[\/#?]/g, ':')
}

function json(obj) {
  return new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' } })
}
