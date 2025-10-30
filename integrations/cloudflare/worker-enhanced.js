/**
 * FitTrack Pro - Enhanced Cloudflare Worker
 * Version: 1.1.0 - GitHub Actions Auto-Deploy Active
 * 
 * Features:
 * - KV caching for offline support
 * - D1 database for edge data
 * - Workers AI for intelligent features
 * - Vectorize for semantic search
 * - Durable Objects for real-time chat
 * - Analytics Engine for tracking
 * - Hyperdrive for database acceleration (optional)
 * 
 * Free Tier Optimized:
 * - 100,000 requests/day
 * - 10,000 AI neurons/day
 * - Smart caching to minimize backend calls
 */

import { ChatRoom } from './chat-room.js';

export { ChatRoom };

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const path = url.pathname;
    const forceAIProvider = (url.searchParams.get('ai') || '').toLowerCase(); // '' | 'openai' | 'cf'

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID',
    };

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // ==================== HEALTH CHECK ====================
      if (path === '/health') {
        return jsonResponse({ 
          status: 'ok', 
          timestamp: Date.now(),
          features: {
            kv: !!env.FITTRACK_KV,
            d1: !!env.FITTRACK_D1,
            ai: !!env.AI,
            vectorize: !!env.VECTORIZE,
            analytics: !!env.ANALYTICS,
            chat: !!env.CHAT_ROOM
          }
        }, corsHeaders);
      }
      
      // ==================== PWA ASSETS ====================
      
      // PWA Manifest
      if (path === '/manifest.json') {
        return jsonResponse({
          name: 'FitTrack Pro - Client Profile',
          short_name: 'FitTrack',
          description: 'Track your fitness journey',
          start_url: '/',
          display: 'standalone',
          background_color: '#1a1d2e',
          theme_color: '#1a1d2e',
          icons: [
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }, {
          ...corsHeaders,
          'Content-Type': 'application/manifest+json'
        });
      }
      
      // Service Worker for offline support
      if (path === '/sw.js') {
        const swCode = getServiceWorkerCode();
        return new Response(swCode, {
          headers: {
            'Content-Type': 'application/javascript',
            'Cache-Control': 'public, max-age=3600',
            ...corsHeaders
          }
        });
      }

      // ==================== REAL-TIME CHAT (Durable Objects) ====================
      if (path.startsWith('/chat/')) {
        const roomId = path.split('/')[2];
        if (!roomId) {
          return jsonResponse({ error: 'Room ID required' }, corsHeaders, 400);
        }

        const id = env.CHAT_ROOM.idFromName(roomId);
        const stub = env.CHAT_ROOM.get(id);
        return stub.fetch(req);
      }

      // ==================== AI-POWERED FEATURES ====================
      
      // AI Meal Suggestions
      if (path === '/api/ai/suggest-meal' && req.method === 'POST') {
        await trackAnalytics(env, 'ai_meal_suggestion', req);
        const { goals, restrictions, calories } = await req.json();
        
        // Check rate limit
        const userId = req.headers.get('X-User-ID') || 'anonymous';
        await checkRateLimit(env, userId, 'ai_requests', 100);

        const mealPlan = await generateMealPlan(env, goals, restrictions, calories, forceAIProvider);
        
        return jsonResponse({ meals: mealPlan }, corsHeaders);
      }

      // AI Workout Suggestions
      if (path === '/api/ai/suggest-workout' && req.method === 'POST') {
        await trackAnalytics(env, 'ai_workout_suggestion', req);
        const { fitnessLevel, goals, equipment, duration } = await req.json();
        
        const userId = req.headers.get('X-User-ID') || 'anonymous';
        await checkRateLimit(env, userId, 'ai_requests', 100);

        const workout = await generateWorkoutPlan(env, fitnessLevel, goals, equipment, duration, forceAIProvider);
        
        return jsonResponse({ workout }, corsHeaders);
      }

      // Progress Insights (AI Analysis)
      if (path === '/api/ai/progress-insights' && req.method === 'POST') {
        await trackAnalytics(env, 'ai_progress_insights', req);
        const { measurements, goals } = await req.json();
        
        const insights = await analyzeProgress(env, measurements, goals, forceAIProvider);
        
        return jsonResponse({ insights }, corsHeaders);
      }

      // ==================== SEMANTIC SEARCH (Vectorize) ====================
      
      // Semantic Exercise Search
      if (path === '/api/exercises/semantic') {
        await trackAnalytics(env, 'semantic_search', req);
        const query = url.searchParams.get('q');
        const limit = parseInt(url.searchParams.get('limit') || '20');

        if (!query) {
          return jsonResponse({ error: 'Query required' }, corsHeaders, 400);
        }

        const exercises = await semanticExerciseSearch(env, query, limit);
        
        return jsonResponse({ exercises }, corsHeaders);
      }

      // Index exercises (admin only)
      if (path === '/api/admin/index-exercises' && req.method === 'POST') {
        const authHeader = req.headers.get('Authorization');
        // TODO: Verify admin token
        
        const { exercises } = await req.json();
        await indexExercisesInVectorize(env, exercises);
        
        return jsonResponse({ success: true, indexed: exercises.length }, corsHeaders);
      }

      // ==================== EDGE CACHING (KV + D1) ====================
      
      // Public profile with friendly URLs: /client/{clientname} or /profile/{token}
      if (path.startsWith('/client/') || path.startsWith('/profile/')) {
        await trackAnalytics(env, 'profile_view', req);
        
        const isClientPath = path.startsWith('/client/');
        const identifier = path.split('/').pop();
        
        // If it's a client name path, look up the token first
        let token = identifier;
        if (isClientPath) {
          // Query D1 for client by friendly name
          const clientLookup = await env.FITTRACK_D1.prepare(
            'SELECT share_token FROM clients WHERE LOWER(REPLACE(name, " ", "")) = LOWER(?)'
          ).bind(identifier).first();
          
          if (!clientLookup) {
            return serveProfileHTML(null, corsHeaders, 404);
          }
          token = clientLookup.share_token;
        }
        
        // Try D1 cache first (faster than KV)
        const cachedProfile = await getProfileFromD1(env, token);
        if (cachedProfile) {
          return serveProfileHTML(cachedProfile, {
            ...corsHeaders,
            'X-Cache': 'D1-HIT',
            'Cache-Control': 'public, max-age=300'
          });
        }

        // Try KV cache
        const kvCached = await env.FITTRACK_KV.get(`profile:${token}`, 'json');
        if (kvCached) {
          // Store in D1 for next time
          ctx.waitUntil(cacheProfileInD1(env, token, kvCached));
          return serveProfileHTML(kvCached, {
            ...corsHeaders,
            'X-Cache': 'KV-HIT',
            'Cache-Control': 'public, max-age=300'
          });
        }

        // Fetch from backend (only if configured)
        const backend = env.BACKEND_ORIGIN || '';
        if (!backend) {
          return serveProfileHTML(null, corsHeaders, 404);
        }
        const backendResp = await fetch(`${backend}/public/profile/${token}`);
        
        if (!backendResp.ok) {
          return serveProfileHTML(null, corsHeaders, 404);
        }

        const profile = await backendResp.json();

        // Cache in both KV and D1
        ctx.waitUntil(Promise.all([
          env.FITTRACK_KV.put(`profile:${token}`, JSON.stringify(profile), { expirationTtl: 1800 }),
          cacheProfileInD1(env, token, profile)
        ]));

        return serveProfileHTML(profile, {
          ...corsHeaders,
          'X-Cache': 'MISS',
          'Cache-Control': 'public, max-age=300'
        });
      }
      
      // Legacy API endpoint for backward compatibility
      if (path.startsWith('/public/profile/')) {
        const token = path.split('/').pop();
        return Response.redirect(`${url.origin}/profile/${token}`, 301);
      }

      // ==================== ANALYTICS DASHBOARD ====================
      
      // Get analytics for trainer
      if (path === '/api/analytics/dashboard') {
        const trainerId = url.searchParams.get('trainerId');
        if (!trainerId) {
          return jsonResponse({ error: 'Trainer ID required' }, corsHeaders, 400);
        }

        const analytics = await getTrainerAnalytics(env, trainerId);
        
        return jsonResponse(analytics, corsHeaders);
      }

      // ==================== FILE UPLOADS (R2) ====================
      
      if (path.startsWith('/api/uploads')) {
        if (!env.R2_UPLOADS) {
          return jsonResponse({ error: 'R2 not configured' }, corsHeaders, 500);
        }

        // List objects: GET /api/uploads?prefix=...&limit=100
        if (path === '/api/uploads' && req.method === 'GET') {
          const prefix = url.searchParams.get('prefix') || '';
          const limit = parseInt(url.searchParams.get('limit') || '100');
          const listed = await env.R2_UPLOADS.list({ prefix, limit });
          const objects = (listed.objects || []).map(o => ({ key: o.key, size: o.size, uploaded: o.uploaded }));
          return jsonResponse({ objects }, corsHeaders);
        }

        // Get object: GET /api/uploads/{key}
        if (req.method === 'GET') {
          const key = path.replace(/^\/api\/uploads\/?/, '');
          if (!key) return jsonResponse({ error: 'Key required' }, corsHeaders, 400);
          const obj = await env.R2_UPLOADS.get(key);
          if (!obj) return jsonResponse({ error: 'Not found' }, corsHeaders, 404);
          const headers = new Headers(corsHeaders);
          if (obj.httpMetadata?.contentType) headers.set('Content-Type', obj.httpMetadata.contentType);
          return new Response(obj.body, { status: 200, headers });
        }

        // Upload object: POST /api/uploads?key=... or POST /api/uploads/{key}
        if (req.method === 'POST') {
          let key = url.searchParams.get('key') || '';
          if (!key) key = path.replace(/^\/api\/uploads\/?/, '');
          if (!key) return jsonResponse({ error: 'Key required' }, corsHeaders, 400);

          const ctype = req.headers.get('content-type') || 'application/octet-stream';
          let body;
          if (ctype.startsWith('application/json')) {
            const data = await req.json();
            const b64 = data.data_base64;
            if (!b64) return jsonResponse({ error: 'data_base64 required' }, corsHeaders, 400);
            const binStr = atob(b64);
            const bytes = new Uint8Array(binStr.length);
            for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
            body = bytes;
          } else {
            body = req.body; // stream
          }

          await env.R2_UPLOADS.put(key, body, { httpMetadata: { contentType: ctype } });
          return jsonResponse({ ok: true, key }, corsHeaders, 201);
        }

        // Delete object: DELETE /api/uploads/{key}
        if (req.method === 'DELETE') {
          const key = path.replace(/^\/api\/uploads\/?/, '');
          if (!key) return jsonResponse({ error: 'Key required' }, corsHeaders, 400);
          await env.R2_UPLOADS.delete(key);
          return jsonResponse({ ok: true, key }, corsHeaders);
        }

        return jsonResponse({ error: 'Method not allowed' }, corsHeaders, 405);
      }

      // ==================== API PROXY WITH SMART CACHING ====================
      
      if (path.startsWith('/api/')) {
        await trackAnalytics(env, 'api_request', req);
        
        const backend = env.BACKEND_ORIGIN || '';
        if (!backend) {
          return jsonResponse({ error: 'No backend configured for this endpoint' }, corsHeaders, 404);
        }
        const backendPath = path.replace(/^\/api/, '');
        const forwardUrl = `${backend}${backendPath}${url.search}`;

        // Determine if this endpoint should be cached
        const cacheKey = `api:${backendPath}${url.search}`;
        const isCacheable = req.method === 'GET' && (
          /\/clients\/\d+\/profile/.test(backendPath) ||
          /\/clients\/\d+\/measurements/.test(backendPath) ||
          /\/trainers\/dashboard/.test(backendPath)
        );

        // Try cache first
        if (isCacheable) {
          const cached = await env.FITTRACK_KV.get(cacheKey, 'json');
          if (cached) {
            return jsonResponse(cached, {
              ...corsHeaders,
              'X-Cache': 'HIT'
            });
          }
        }

        // Forward request to backend
        try {
          const backendResp = await fetch(forwardUrl, {
            method: req.method,
            headers: {
              ...Object.fromEntries(req.headers),
              'X-Forwarded-For': req.headers.get('CF-Connecting-IP') || '',
              'X-Real-IP': req.headers.get('CF-Connecting-IP') || ''
            },
            body: req.method !== 'GET' ? req.body : undefined
          });

          const data = await backendResp.json();

          // Cache successful GET responses
          if (isCacheable && backendResp.ok) {
            ctx.waitUntil(
              env.FITTRACK_KV.put(cacheKey, JSON.stringify(data), { expirationTtl: 300 })
            );
          }

          return jsonResponse(data, {
            ...corsHeaders,
            'X-Cache': 'MISS'
          }, backendResp.status);

        } catch (error) {
          // Backend unreachable - try KV fallback
          if (isCacheable) {
            const staleCache = await env.FITTRACK_KV.get(cacheKey, 'json');
            if (staleCache) {
              return jsonResponse(staleCache, {
                ...corsHeaders,
                'X-Cache': 'STALE',
                'X-Backend-Error': error.message
              });
            }
          }

          return jsonResponse({ 
            error: 'Backend unavailable', 
            message: error.message 
          }, corsHeaders, 503);
        }
      }

      // ==================== STATIC ASSETS ====================
      
      if (isStaticAsset(path)) {
        const cache = caches.default;
        let response = await cache.match(req);

        if (!response) {
          response = await fetch(req);
          if (response.ok) {
            const cachedResponse = new Response(response.body, response);
            cachedResponse.headers.set('Cache-Control', 'public, max-age=86400');
            ctx.waitUntil(cache.put(req, cachedResponse.clone()));
          }
        }

        return response;
      }

      return jsonResponse({ error: 'Not found' }, corsHeaders, 404);

    } catch (error) {
      console.error('Worker error:', error);
      return jsonResponse({ 
        error: 'Internal server error', 
        message: error.message 
      }, corsHeaders, 500);
    }
  }
};

// ==================== AI FUNCTIONS ====================

async function generateMealPlan(env, goals, restrictions, calories, providerPref = '') {
  const prompt = `As a nutritionist, create 3 healthy meal ideas for:

Goals: ${goals}
Dietary Restrictions: ${restrictions || 'None'}
Target Calories: ${calories || 'Not specified'}

For each meal, provide:
1. Meal name
2. Main ingredients
3. Estimated calories
4. Protein, carbs, fat (grams)

Format as JSON array.`;

  const preferOpenAI = providerPref === 'openai';
  let responseText = '';

  // Choose provider: prefer Workers AI unless explicitly asked for OpenAI, with fallback
  if (!preferOpenAI) {
    try {
      const cfResp = await env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
        messages: [
          { role: 'system', content: 'You are a professional nutritionist. Respond only with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 512
      });
      responseText = cfResp.response || '';
    } catch (e) {
      // Fallback to OpenAI if configured
      const alt = await openaiChat(env, [
        { role: 'system', content: 'You are a professional nutritionist. Respond only with valid JSON.' },
        { role: 'user', content: prompt }
      ], 512);
      responseText = alt || '';
    }
  } else {
    // Forced OpenAI path
    responseText = await openaiChat(env, [
      { role: 'system', content: 'You are a professional nutritionist. Respond only with valid JSON.' },
      { role: 'user', content: prompt }
    ], 384) || '';
  }

  try {
    // Try to parse JSON from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Failed to parse AI response:', e);
  }

  // Fallback: return raw text
  return [{ name: 'AI Suggestion', description: responseText }];
}

async function generateWorkoutPlan(env, fitnessLevel, goals, equipment, duration, providerPref = '') {
  const prompt = `Create a ${duration || 30} minute workout for:

Fitness Level: ${fitnessLevel}
Goals: ${goals}
Equipment: ${equipment || 'Bodyweight only'}

Provide 5-7 exercises with sets and reps.
Format as JSON array with: name, sets, reps, rest_seconds.`;

  const preferOpenAI = providerPref === 'openai';
  let responseText = '';

  if (!preferOpenAI) {
    try {
      const cfResp = await env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
        messages: [
          { role: 'system', content: 'You are a certified personal trainer. Respond only with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 512
      });
      responseText = cfResp.response || '';
    } catch (_) {
      const alt = await openaiChat(env, [
        { role: 'system', content: 'You are a certified personal trainer. Respond only with valid JSON.' },
        { role: 'user', content: prompt }
      ], 512);
      responseText = alt || '';
    }
  } else {
    responseText = await openaiChat(env, [
      { role: 'system', content: 'You are a certified personal trainer. Respond only with valid JSON.' },
      { role: 'user', content: prompt }
    ], 384) || '';
  }

  try {
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Failed to parse AI response:', e);
  }

  return [{ name: 'AI Workout', description: responseText }];
}

async function analyzeProgress(env, measurements, goals, providerPref = '') {
  const prompt = `Analyze this fitness progress:

Measurements: ${JSON.stringify(measurements)}
Goals: ${goals}

Provide:
1. Key achievements
2. Areas for improvement
3. Motivational message
4. Next steps

Be concise and encouraging.`;

  const preferOpenAI = providerPref === 'openai';
  if (!preferOpenAI) {
    try {
      const cfResp = await env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
        messages: [
          { role: 'system', content: 'You are a supportive fitness coach.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 256
      });
      return cfResp.response;
    } catch (_) {
      const altText = await openaiChat(env, [
        { role: 'system', content: 'You are a supportive fitness coach.' },
        { role: 'user', content: prompt }
      ], 256);
      return altText || 'Unable to generate insights right now.';
    }
  } else {
    const text = await openaiChat(env, [
      { role: 'system', content: 'You are a supportive fitness coach.' },
      { role: 'user', content: prompt }
    ], 192);
    return text || 'Unable to generate insights right now.';
  }
}

// ==================== OPENAI FALLBACK ====================

function getOpenAIKey(env) {
  return env.OPENAI_API_KEY || env.OPENAI_API_KEY_ALT || '';
}

async function openaiChat(env, messages, max_tokens) {
  const key = getOpenAIKey(env);
  if (!key) return '';

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: Math.min(512, Math.max(64, max_tokens || 256))
      })
    });

    if (!resp.ok) {
      const t = await resp.text().catch(() => '');
      console.error('OpenAI error', resp.status, t);
      return '';
    }
    const data = await resp.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (e) {
    console.error('OpenAI fetch failed', e);
    return '';
  }
}

// ==================== VECTORIZE FUNCTIONS ====================

async function semanticExerciseSearch(env, query, limit = 20) {
  // Generate embedding for search query
  const embedding = await env.AI.run('@cf/baai/bge-small-en-v1.5', {
    text: query
  });

  // Query vector index
  const results = await env.VECTORIZE.query(embedding.data[0], {
    topK: limit,
    returnMetadata: true
  });

  return results.matches.map(match => ({
    ...match.metadata,
    similarity: match.score,
    id: match.id
  }));
}

async function indexExercisesInVectorize(env, exercises) {
  const vectors = [];

  for (const exercise of exercises) {
    const text = `${exercise.name} ${exercise.description || ''} ${exercise.target_muscles || ''} ${exercise.category || ''}`;
    
    const embedding = await env.AI.run('@cf/baai/bge-small-en-v1.5', {
      text: text
    });

    vectors.push({
      id: `exercise_${exercise.id}`,
      values: embedding.data[0],
      metadata: {
        name: exercise.name,
        category: exercise.category,
        difficulty: exercise.difficulty,
        equipment: exercise.equipment,
        target_muscles: exercise.target_muscles,
        description: exercise.description
      }
    });
  }

  // Batch insert (max 1000 per batch)
  for (let i = 0; i < vectors.length; i += 1000) {
    const batch = vectors.slice(i, i + 1000);
    await env.VECTORIZE.upsert(batch);
  }

  return vectors.length;
}

// ==================== D1 CACHING FUNCTIONS ====================

async function getProfileFromD1(env, token) {
  const now = Math.floor(Date.now() / 1000);
  const result = await env.FITTRACK_D1.prepare(
    'SELECT profile_data FROM profile_cache WHERE cache_key = ? AND expires_at > ?'
  ).bind(`profile:${token}`, now).first();

  if (result) {
    return JSON.parse(result.profile_data);
  }
  return null;
}

async function cacheProfileInD1(env, token, profile) {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 1800; // 30 minutes

  await env.FITTRACK_D1.prepare(
    `INSERT OR REPLACE INTO profile_cache (cache_key, client_id, profile_data, expires_at)
     VALUES (?, ?, ?, ?)`
  ).bind(
    `profile:${token}`,
    profile.id || 0,
    JSON.stringify(profile),
    expiresAt
  ).run();
}

// ==================== ANALYTICS FUNCTIONS ====================

async function trackAnalytics(env, eventType, req) {
  if (!env.ANALYTICS) return;

  const userId = req.headers.get('X-User-ID') || 'anonymous';
  const userAgent = req.headers.get('User-Agent') || '';

  env.ANALYTICS.writeDataPoint({
    indexes: [userId, eventType],
    doubles: [Date.now()],
    blobs: [userAgent.substring(0, 100)]
  });

  // Also store in D1 for detailed analysis
  if (env.FITTRACK_D1) {
    const url = new URL(req.url);
    const now = Math.floor(Date.now() / 1000);
    
    await env.FITTRACK_D1.prepare(
      `INSERT INTO analytics_events (event_type, trainer_id, metadata, timestamp)
       VALUES (?, ?, ?, ?)`
    ).bind(
      eventType,
      parseInt(userId) || 0,
      JSON.stringify({ path: url.pathname, method: req.method }),
      now
    ).run().catch(() => {}); // Ignore errors for analytics
  }
}

async function getTrainerAnalytics(env, trainerId) {
  const last7Days = Math.floor(Date.now() / 1000) - (7 * 86400);

  const events = await env.FITTRACK_D1.prepare(
    `SELECT event_type, COUNT(*) as count
     FROM analytics_events
     WHERE trainer_id = ? AND timestamp > ?
     GROUP BY event_type
     ORDER BY count DESC`
  ).bind(parseInt(trainerId), last7Days).all();

  const totalEvents = await env.FITTRACK_D1.prepare(
    'SELECT COUNT(*) as total FROM analytics_events WHERE trainer_id = ? AND timestamp > ?'
  ).bind(parseInt(trainerId), last7Days).first();

  return {
    period: 'last_7_days',
    total_events: totalEvents?.total || 0,
    events_by_type: events.results || []
  };
}

// ==================== RATE LIMITING ====================

async function checkRateLimit(env, userId, limitType, dailyLimit) {
  const today = new Date().toISOString().split('T')[0];
  const key = `ratelimit:${limitType}:${userId}:${today}`;
  
  const current = parseInt(await env.FITTRACK_KV.get(key) || '0');
  
  if (current >= dailyLimit) {
    throw new Error(`Daily limit reached for ${limitType} (${dailyLimit})`);
  }

  await env.FITTRACK_KV.put(key, String(current + 1), { expirationTtl: 86400 });
  
  return current + 1;
}

// ==================== HELPER FUNCTIONS ====================

function jsonResponse(data, headers = {}, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });
}

function isStaticAsset(pathname) {
  return /\.(?:html|js|css|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|mp4|webm)$/.test(pathname) || pathname === '/';
}

// ==================== PWA PROFILE PAGE ====================

function serveProfileHTML(profile, headers = {}, status = 200) {
  if (!profile) {
    return new Response(getNotFoundHTML(), {
      status: 404,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        ...headers
      }
    });
  }

  const html = getProfileHTML(profile);
  
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...headers
    }
  });
}

function getProfileHTML(profile) {
  const { client, trainer, measurements, meals, achievements } = profile;
  const clientName = client?.name || 'Client';
  const trainerName = trainer?.name || 'Trainer';
  const latestWeight = measurements?.[0]?.weight || 0;
  const latestBodyFat = measurements?.[0]?.body_fat || 0;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${clientName}'s fitness journey with ${trainerName}">
    <meta name="theme-color" content="#1a1d2e">
    
    <!-- PWA Manifest -->
    <link rel="manifest" href="/manifest.json">
    
    <!-- Apple Touch Icons -->
    <link rel="apple-touch-icon" href="/icon-192.png">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="${clientName} - FitTrack">
    
    <title>${clientName} - FitTrack Pro</title>
    
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #1a1d2e 0%, #2a2f42 100%);
            color: #e5e7eb;
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            padding: 30px 0;
            border-bottom: 2px solid #FF4B39;
            margin-bottom: 30px;
        }
        .header h1 {
            font-size: 2.5rem;
            background: linear-gradient(135deg, #FF4B39 0%, #FFB82B 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 10px;
        }
        .trainer-badge {
            display: inline-block;
            background: #2a2f42;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.9rem;
            color: #9ca3af;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .stat-card {
            background: #2a2f42;
            padding: 25px;
            border-radius: 12px;
            border-left: 4px solid #1BB55C;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        }
        .stat-label {
            font-size: 0.85rem;
            color: #9ca3af;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
        }
        .stat-value {
            font-size: 2rem;
            font-weight: bold;
            color: #1BB55C;
        }
        .section {
            background: #2a2f42;
            padding: 30px;
            border-radius: 12px;
            margin: 20px 0;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        }
        .section-title {
            font-size: 1.5rem;
            margin-bottom: 20px;
            color: #FFB82B;
        }
        .achievement-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 15px;
        }
        .achievement {
            background: linear-gradient(135deg, #FF4B39 0%, #FFB82B 100%);
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            font-weight: bold;
            color: #1a1d2e;
        }
        .install-prompt {
            position: fixed;
            bottom: 20px;
            left: 20px;
            right: 20px;
            background: #1BB55C;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            display: none;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            z-index: 1000;
        }
        .install-prompt.show { display: flex; }
        .install-btn {
            background: white;
            color: #1BB55C;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            font-weight: bold;
            cursor: pointer;
        }
        @media (max-width: 768px) {
            .header h1 { font-size: 2rem; }
            .stats-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${clientName}</h1>
            <div class="trainer-badge">Training with ${trainerName}</div>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Current Weight</div>
                <div class="stat-value">${latestWeight} kg</div>
            </div>
            <div class="stat-card" style="border-left-color: #FFB82B;">
                <div class="stat-label">Body Fat</div>
                <div class="stat-value" style="color: #FFB82B;">${latestBodyFat}%</div>
            </div>
            <div class="stat-card" style="border-left-color: #FF4B39;">
                <div class="stat-label">Total Progress</div>
                <div class="stat-value" style="color: #FF4B39;">${measurements?.length || 0}</div>
            </div>
        </div>
        
        ${achievements && achievements.length > 0 ? `
        <div class="section">
            <div class="section-title">🏆 Achievements</div>
            <div class="achievement-grid">
                ${achievements.map(a => `<div class="achievement">${a.name}</div>`).join('')}
            </div>
        </div>
        ` : ''}
        
        <div class="section">
            <div class="section-title">💪 Progress Journey</div>
            <p style="color: #9ca3af; line-height: 1.6;">
                ${clientName} is on an amazing fitness journey! 
                ${measurements?.length || 0} measurements recorded so far.
            </p>
        </div>
    </div>
    
    <div class="install-prompt" id="installPrompt">
        <span>📱 Install this profile as an app!</span>
        <button class="install-btn" id="installBtn">Install</button>
    </div>
    
    <script>
        // PWA Install Prompt
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            document.getElementById('installPrompt').classList.add('show');
        });
        
        document.getElementById('installBtn').addEventListener('click', async () => {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                document.getElementById('installPrompt').classList.remove('show');
            }
            deferredPrompt = null;
        });
        
        // Register service worker for offline support
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(err => {
                console.log('Service Worker registration failed:', err);
            });
        }
    </script>
</body>
</html>`;
}

function getNotFoundHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Profile Not Found - FitTrack Pro</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1d2e 0%, #2a2f42 100%);
            color: #e5e7eb;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            text-align: center;
            padding: 20px;
        }
        h1 { font-size: 4rem; color: #FF4B39; margin-bottom: 10px; }
        p { font-size: 1.2rem; color: #9ca3af; }
    </style>
</head>
<body>
    <div>
        <h1>404</h1>
        <p>Client profile not found</p>
    </div>
</body>
</html>`;
}

function getServiceWorkerCode() {
  return `
const CACHE_NAME = 'fittrack-profile-v1';
const urlsToCache = [
  '/',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
          return response;
        });
      })
  );
});
`;
}

