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
      // ==================== DESKTOP PAUSED: REDIRECT ALL TO TRAINER PORTAL ====================
      // While desktop app is paused, redirect any requests (except health) to the trainer portal login
      if (path !== '/health') {
        const target = 'https://fittrack-trainer.rehchu1.workers.dev/login';
        return Response.redirect(target, 302);
      }

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
      
      // ==================== ROOT LANDING PAGE ====================
      if (path === '/' || path === '') {
        const html = getWelcomeHTML(url.origin);
        return new Response(html, {
          status: 200,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=60'
          }
        });
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
        let numericClientId = null;
        if (isClientPath) {
          // If numeric, treat as client id
          if (/^\d+$/.test(identifier)) {
            numericClientId = parseInt(identifier);
            const clientById = await env.FITTRACK_D1.prepare(
              'SELECT id, share_token FROM clients WHERE id = ?'
            ).bind(numericClientId).first();
            if (!clientById) {
              return serveProfileHTML(null, corsHeaders, 404);
            }
            if (!clientById.share_token) {
              const bytes = new Uint8Array(16); crypto.getRandomValues(bytes);
              const newTok = Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');
              await env.FITTRACK_D1.prepare('UPDATE clients SET share_token = ? WHERE id = ?').bind(newTok, clientById.id).run();
              token = newTok;
            } else {
              token = clientById.share_token;
            }
          } else {
            // Query D1 for client by a friendly name (remove spaces and newlines)
            const clientLookup = await env.FITTRACK_D1.prepare(
              'SELECT id, share_token FROM clients WHERE LOWER(REPLACE(REPLACE(REPLACE(name, " ", ""), char(10), ""), char(13), "")) = LOWER(?)'
            ).bind(identifier).first();
            
            if (!clientLookup) {
              return serveProfileHTML(null, corsHeaders, 404);
            }
            if (!clientLookup.share_token) {
              const bytes = new Uint8Array(16); crypto.getRandomValues(bytes);
              const newTok = Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');
              await env.FITTRACK_D1.prepare('UPDATE clients SET share_token = ? WHERE id = ?').bind(newTok, clientLookup.id).run();
              token = newTok;
            } else {
              token = clientLookup.share_token;
            }
          }
          
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

        // Fetch from backend if configured; otherwise fall back to minimal D1-based profile
        const backend = env.BACKEND_ORIGIN || '';
        let profile = null;
        if (backend) {
          const backendResp = await fetch(`${backend}/public/profile/${token}`);
          if (backendResp.ok) {
            profile = await backendResp.json();
          }
        }

        // Minimal profile fallback using D1 if backend is unavailable or returned non-OK
        if (!profile) {
          const whereClause = numericClientId ? 'c.id = ?' : 'c.share_token = ?';
          const bindVal = numericClientId ? numericClientId : token;
          const client = await env.FITTRACK_D1.prepare(
            `SELECT c.id as client_id, c.name as client_name, c.email as client_email, c.avatar_url as client_avatar,
                    COALESCE(t.business_name, 'Trainer') as trainer_name, COALESCE(t.logo_url, t.avatar_url) as trainer_logo
             FROM clients c LEFT JOIN trainers t ON c.trainer_id = t.id WHERE ${whereClause}`
          ).bind(bindVal).first();
          if (!client) {
            return serveProfileHTML(null, corsHeaders, 404);
          }
         
           // Fetch measurements (last 10, ordered by date)
           const measurements = await env.FITTRACK_D1.prepare(
             `SELECT * FROM measurements WHERE client_id = ? ORDER BY measurement_date DESC LIMIT 10`
           ).bind(client.client_id).all();
         
           // Fetch active quests
           const quests = await env.FITTRACK_D1.prepare(
             `SELECT * FROM quests WHERE client_id = ? AND status = 'active' ORDER BY created_at DESC`
           ).bind(client.client_id).all();
         
           // Fetch achievements
           const achievements = await env.FITTRACK_D1.prepare(
             `SELECT * FROM achievements WHERE client_id = ? ORDER BY earned_date DESC`
           ).bind(client.client_id).all();
         
           // Fetch milestones
           const milestones = await env.FITTRACK_D1.prepare(
             `SELECT * FROM milestones WHERE client_id = ? ORDER BY achieved_date DESC LIMIT 10`
           ).bind(client.client_id).all();
         
           // Fetch XP tracking
           const xpData = await env.FITTRACK_D1.prepare(
             `SELECT * FROM xp_tracking WHERE client_id = ?`
           ).bind(client.client_id).first();
         
           // Fetch progress photos (last 20)
           const photos = await env.FITTRACK_D1.prepare(
             `SELECT * FROM progress_photos WHERE client_id = ? ORDER BY taken_date DESC LIMIT 20`
           ).bind(client.client_id).all();
         
           profile = {
             client: { 
               id: client.client_id, 
               name: client.client_name, 
               email: client.client_email, 
               avatar_url: client.client_avatar 
             },
             trainer: { 
               name: client.trainer_name, 
               logo_url: client.trainer_logo 
             },
             measurements: measurements?.results || [],
             quests: quests?.results || [],
             achievements: achievements?.results || [],
             milestones: milestones?.results || [],
             xp: xpData || { total_xp: 0, level: 1, quests_completed: 0, achievements_unlocked: 0 },
             photos: photos?.results || [],
             meals: []
           };
        }

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

      // ==================== TRAINER PORTAL & MANAGEMENT ====================
      
      // Unique trainer portal: /trainer/{trainerId}
      if (path.startsWith('/trainer/')) {
        const trainerId = path.split('/')[2];
        if (!trainerId) {
          return jsonResponse({ error: 'Trainer ID required' }, corsHeaders, 400);
        }
        
        // Get trainer profile from D1 (JOIN with users table)
        const trainer = await env.FITTRACK_D1.prepare(
          'SELECT t.id, t.business_name as name, u.email, t.logo_url, t.profile_completed FROM trainers t JOIN users u ON t.user_id = u.id WHERE t.id = ?'
        ).bind(trainerId).first();
        
        if (!trainer) {
          return new Response('Trainer not found', { status: 404, headers: corsHeaders });
        }
        
        // Check if profile is completed
        // Temporarily allow access even if profile isn't marked complete
        // This avoids users getting stuck on stale cache or gating; we can re-enable later
        // if (!trainer.profile_completed) {
        //   const html = getTrainerIncompleteHTML();
        //   return new Response(html, { status: 403, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } });
        // }
        
        // Serve a lightweight Trainer Portal HTML directly from the worker
        const html = getTrainerPortalHTML(trainer, url.origin);
        return new Response(html, { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' } });
      }
      
      // Get trainer profile: GET /api/trainers/{id}/profile
      if (path.match(/^\/api\/trainers\/\d+\/profile$/) && req.method === 'GET') {
        const trainerId = path.split('/')[3];
        
        const trainer = await env.FITTRACK_D1.prepare(
          'SELECT t.id, t.business_name as name, u.email, t.logo_url, t.profile_completed, t.created_at FROM trainers t JOIN users u ON t.user_id = u.id WHERE t.id = ?'
        ).bind(trainerId).first();
        
        if (!trainer) {
          return jsonResponse({ error: 'Trainer not found' }, corsHeaders, 404);
        }
        
        return jsonResponse(trainer, corsHeaders);
      }
      
      // Update trainer profile: PUT /api/trainers/{id}/profile
      if (path.match(/^\/api\/trainers\/\d+\/profile$/) && req.method === 'PUT') {
        const trainerId = path.split('/')[3];
        
        // Handle multipart form data for logo upload
        const contentType = req.headers.get('Content-Type') || '';
  let logoUrl = null;
  let name = null;
        
        if (contentType.includes('multipart/form-data')) {
          const formData = await req.formData();
          const logoFile = formData.get('logo');
          name = formData.get('name');
          
          if (logoFile && env.R2_UPLOADS) {
            // Upload logo to R2
            const ext = logoFile.name.split('.').pop();
            const logoKey = `trainers/${trainerId}/logo-${Date.now()}.${ext}`;
            
            await env.R2_UPLOADS.put(logoKey, logoFile.stream(), {
              httpMetadata: { contentType: logoFile.type }
            });
            
            logoUrl = `${url.origin}/api/uploads/${logoKey}`;
          }
        } else {
          const body = await req.json();
          name = body.name;
          logoUrl = body.logo_url;
        }
        
        // Update trainer in D1
        const updates = [];
        const values = [];
        
        if (name) {
          // trainers table column is business_name
          updates.push('business_name = ?');
          values.push(name);
        }
        
        if (logoUrl) {
          updates.push('logo_url = ?');
          values.push(logoUrl);
        }
        
        if (updates.length > 0) {
          values.push(trainerId);
          await env.FITTRACK_D1.prepare(
            `UPDATE trainers SET ${updates.join(', ')} WHERE id = ?`
          ).bind(...values).run();
        }
        
        // Check if profile is now complete (logo is optional)
        const trainer = await env.FITTRACK_D1.prepare(
          'SELECT t.id, t.business_name as name, u.email, t.logo_url FROM trainers t JOIN users u ON t.user_id = u.id WHERE t.id = ?'
        ).bind(trainerId).first();
        
        // Profile is complete if business name and email are set (logo is optional)
        const profileCompleted = !!(trainer.name && trainer.email);
        
        if (profileCompleted) {
          await env.FITTRACK_D1.prepare(
            'UPDATE trainers SET profile_completed = 1 WHERE id = ?'
          ).bind(trainerId).run();
        }
        
        return jsonResponse({ 
          success: true, 
          profile_completed: profileCompleted,
          logo_url: logoUrl || trainer.logo_url
        }, corsHeaders);
      }
      
      // Change trainer password: PUT /api/trainers/{id}/password
      if (path.match(/^\/api\/trainers\/\d+\/password$/) && req.method === 'PUT') {
        const trainerId = path.split('/')[3];
        const { currentPassword, newPassword } = await req.json();
        
        if (!currentPassword || !newPassword) {
          return jsonResponse({ error: 'Current and new passwords required' }, corsHeaders, 400);
        }
        
        if (newPassword.length < 8) {
          return jsonResponse({ error: 'Password must be at least 8 characters' }, corsHeaders, 400);
        }
        
        // Get trainer's user_id and current password hash from users table
        const trainer = await env.FITTRACK_D1.prepare(
          'SELECT t.user_id, u.password_hash FROM trainers t JOIN users u ON t.user_id = u.id WHERE t.id = ?'
        ).bind(trainerId).first();
        
        if (!trainer) {
          return jsonResponse({ error: 'Trainer not found' }, corsHeaders, 404);
        }
        
        // Verify current password (in production, use bcrypt)
        // For now, simple check - you should implement proper password hashing
        const currentHash = await hashPassword(currentPassword);
        
        if (currentHash !== trainer.password_hash) {
          return jsonResponse({ error: 'Current password is incorrect' }, corsHeaders, 401);
        }
        
        // Hash new password
        const newHash = await hashPassword(newPassword);
        
        // Update password in users table
        await env.FITTRACK_D1.prepare(
          'UPDATE users SET password_hash = ? WHERE id = ?'
        ).bind(newHash, trainer.user_id).run();
        
        return jsonResponse({ success: true, message: 'Password updated successfully' }, corsHeaders);
      }

      // ==================== CLIENT MANAGEMENT ====================
      
      // Get all clients for a trainer: GET /api/clients?trainerId=1
      if (path === '/api/clients' && req.method === 'GET') {
        const trainerId = url.searchParams.get('trainerId');
        if (!trainerId || !env.FITTRACK_D1) {
          return jsonResponse({ clients: [] }, { ...corsHeaders, 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' });
        }

        const clients = await env.FITTRACK_D1.prepare(
          'SELECT id, name, email, phone, share_token, created_at FROM clients WHERE trainer_id = ? ORDER BY created_at DESC'
        ).bind(parseInt(trainerId)).all();

        return jsonResponse(
          { clients: clients.results || [] },
          { ...corsHeaders, 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' }
        );
      }

      // Issue share tokens for existing clients without one: POST /api/admin/clients/issue-tokens?trainerId=1
      if (path === '/api/admin/clients/issue-tokens' && req.method === 'POST') {
        const trainerId = url.searchParams.get('trainerId');
        if (!trainerId || !env.FITTRACK_D1) {
          return jsonResponse({ updated: 0 }, corsHeaders, 400);
        }
        const trainerIdNum = parseInt(trainerId);
        const rows = await env.FITTRACK_D1.prepare('SELECT id FROM clients WHERE trainer_id = ? AND (share_token IS NULL OR share_token = "")').bind(trainerIdNum).all();
        const toUpdate = rows.results || [];
        for (const r of toUpdate) {
          const bytes = new Uint8Array(16); crypto.getRandomValues(bytes);
          const tok = Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');
          await env.FITTRACK_D1.prepare('UPDATE clients SET share_token = ? WHERE id = ?').bind(tok, r.id).run();
        }
        return jsonResponse({ updated: toUpdate.length }, corsHeaders);
      }

      // Get single client by id: GET /api/clients/{id}
      if (path.match(/^\/api\/clients\/(\d+)$/) && req.method === 'GET') {
        const id = parseInt(path.split('/').pop());
        const row = await env.FITTRACK_D1.prepare('SELECT id, trainer_id, name, email, phone, share_token FROM clients WHERE id = ?').bind(id).first();
        return jsonResponse({ client: row || null }, corsHeaders, row ? 200 : 404);
      }

      // Create client: POST /api/clients
      if (path === '/api/clients' && req.method === 'POST') {
        if (!env.FITTRACK_D1) {
          return jsonResponse({ error: 'Database not available' }, corsHeaders, 500);
        }

        const { name, email, phone, trainerId } = await req.json();
        
        if (!name || !trainerId) {
          return jsonResponse({ error: 'Name and trainer ID required' }, corsHeaders, 400);
        }
        let userId;
        const trainerIdNum = parseInt(trainerId);

        if (email) {
          // Check if a user already exists with this email
          const existingUser = await env.FITTRACK_D1.prepare(
            'SELECT id, user_type FROM users WHERE email = ?'
          ).bind(email).first();

          if (existingUser) {
            if (existingUser.user_type !== 'client') {
              return jsonResponse({ error: 'Email belongs to an existing non-client user' }, corsHeaders, 409);
            }

            // Check if this user already has a client record
            const existingClient = await env.FITTRACK_D1.prepare(
              'SELECT id, trainer_id FROM clients WHERE user_id = ?'
            ).bind(existingUser.id).first();

            if (existingClient) {
              // If it's already associated to this trainer, return conflict with id
              if (existingClient.trainer_id === trainerIdNum) {
                return jsonResponse({ error: 'Client with this email already exists', client_id: existingClient.id }, corsHeaders, 409);
              }
              // Otherwise, prevent cross-trainer reuse for now
              return jsonResponse({ error: 'Email already registered to another trainer' }, corsHeaders, 409);
            }

            // Reuse existing client user
            userId = existingUser.id;
          }
        }

        if (!userId) {
          // Create a user account for the client first
          // Generate a temporary password hash for the client user (they'll reset it via email)
          const tempPassword = 'temp_' + Date.now();
          const encoder = new TextEncoder();
          const data = encoder.encode(tempPassword);
          const hashBuffer = await crypto.subtle.digest('SHA-256', data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

          const userResult = await env.FITTRACK_D1.prepare(
            'INSERT INTO users (email, password_hash, user_type, created_at) VALUES (?, ?, ?, strftime("%s", "now"))'
          ).bind(email || `client_${Date.now()}@temp.local`, hashHex, 'client').run();

          userId = userResult.meta.last_row_id;
        }

        // Generate a share token for client portal URLs
        const shareTokenBytes = new Uint8Array(16);
        crypto.getRandomValues(shareTokenBytes);
        const shareToken = Array.from(shareTokenBytes).map(b => b.toString(16).padStart(2,'0')).join('');

        // Now create the client record
        const clientResult = await env.FITTRACK_D1.prepare(
          'INSERT INTO clients (user_id, trainer_id, name, email, phone, share_token, created_at) VALUES (?, ?, ?, ?, ?, ?, strftime("%s", "now"))'
        ).bind(userId, trainerIdNum, name, email, phone, shareToken).run();

        const clientId = clientResult.meta.last_row_id;

        await trackAnalytics(env, 'client_created', req);

        return jsonResponse({ 
          success: true, 
          client: { id: clientId, user_id: userId, name, email, phone }
        }, corsHeaders, 201);
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

  // Analytics Engine supports max 1 index - use eventType as the index
  env.ANALYTICS.writeDataPoint({
    indexes: [eventType],
    doubles: [Date.now()],
    blobs: [userId.substring(0, 100), userAgent.substring(0, 100)]
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
  const { client, trainer, measurements, quests, achievements, milestones, xp, photos } = profile;
  const clientName = client?.name || 'Client';
  const trainerName = trainer?.name || 'Trainer';
  const clientAvatar = client?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(clientName)}&size=200&background=FF4B39&color=fff`;
  const trainerLogo = trainer?.logo_url || '';
  // Imperial conversion functions
  const kgToLbs = (kg) => (kg * 2.20462).toFixed(1);
  const cmToIn = (cm) => (cm / 2.54).toFixed(1);
  // Stats calculations
  const latestMeasurement = measurements?.[0];
  const currentWeightLbs = latestMeasurement?.weight_kg ? kgToLbs(latestMeasurement.weight_kg) : '0.0';
  const currentBodyFat = latestMeasurement?.body_fat_percentage || '0';
  const totalXP = xp?.total_xp || 0;
  const currentLevel = xp?.level || 1;
  const activeQuests = quests?.filter(q => q.status === 'active') || [];
  const completedQuests = xp?.quests_completed || 0;
  const unlockedAchievements = achievements?.length || 0;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${clientName}'s fitness journey with ${trainerName}">
  <meta name="theme-color" content="#1a1d2e">
  <link rel="manifest" href="/manifest.json">
  <link rel="apple-touch-icon" href="/icon-192.png">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <title>${clientName} - FitTrack Pro</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1d2e 0%, #2a2f42 100%);
      color: #e5e7eb;
      min-height: 100vh;
      padding: 0;
      margin: 0;
    }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    /* ...rest of the CSS and HTML from client-portal-template.js... */
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="avatar-container">
        <img src="${clientAvatar}" alt="${clientName}">
      </div>
      <h1>${clientName}</h1>
      ${trainerLogo ? `<div class="trainer-badge"><img src="${trainerLogo}" class="trainer-logo"> Training with ${trainerName}</div>` : `<div class="trainer-badge">Training with ${trainerName}</div>`}
      <div class="xp-badge">⭐ Level ${currentLevel} · ${totalXP} XP</div>
    </div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Current Weight</div>
        <div class="stat-value">${currentWeightLbs} <span style="font-size:1rem;color:#6b7280">lbs</span></div>
      </div>
      <div class="stat-card" style="border-left-color: #FFB82B;">
        <div class="stat-label">Body Fat</div>
        <div class="stat-value" style="color: #FFB82B;">${currentBodyFat}<span style="font-size:1rem;color:#6b7280">%</span></div>
      </div>
      <div class="stat-card" style="border-left-color: #9333EA;">
        <div class="stat-label">Active Quests</div>
        <div class="stat-value" style="color: #9333EA;">${activeQuests.length}</div>
      </div>
      <div class="stat-card" style="border-left-color: #FF4B39;">
        <div class="stat-label">Achievements</div>
        <div class="stat-value" style="color: #FF4B39;">${unlockedAchievements}</div>
      </div>
    </div>
    ${activeQuests.length > 0 ? `
    <div class="section">
      <div class="section-title">🎯 Active Quests</div>
      <div class="quests-grid">
        ${activeQuests.map(q => `
          <div class="quest-card ${q.difficulty}">
            <div class="quest-header">
              <div class="quest-title">${q.name}</div>
              <div class="quest-difficulty ${q.difficulty}">${q.difficulty}</div>
            </div>
            <div class="quest-description">${q.description}</div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${q.progress_percentage}%;"></div>
            </div>
            <div class="progress-text">
              <span>${q.progress_percentage}% Complete</span>
              <span class="quest-xp">+${q.xp_reward} XP</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}
    ${achievements && achievements.length > 0 ? `
    <div class="section">
      <div class="section-title">🏆 Achievements Unlocked</div>
      <div class="achievements-grid">
        ${achievements.map(a => `
          <div class="achievement-card">
            <div class="achievement-icon">${a.icon || '🏅'}</div>
            <div class="achievement-name">${a.name}</div>
            <div class="achievement-xp">+${a.xp_earned} XP</div>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}
    <div class="section">
      <div class="section-title">� Recent Measurements</div>
      ${measurements && measurements.length > 0 ? `
        <div class="measurements-list">
          ${measurements.slice(0, 5).map(m => `
            <div class="measurement-item">
              <div class="measurement-date">${new Date(m.measurement_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              <div class="measurement-grid">
                ${m.weight_kg ? `<div class="measurement-stat"><div class="label">Weight:</div> <div class="value">${kgToLbs(m.weight_kg)} lbs</div></div>` : ''}
                ${m.body_fat_percentage ? `<div class="measurement-stat"><div class="label">Body Fat:</div> <div class="value">${m.body_fat_percentage}%</div></div>` : ''}
                ${m.waist_cm ? `<div class="measurement-stat"><div class="label">Waist:</div> <div class="value">${cmToIn(m.waist_cm)} in</div></div>` : ''}
                ${m.chest_cm ? `<div class="measurement-stat"><div class="label">Chest:</div> <div class="value">${cmToIn(m.chest_cm)} in</div></div>` : ''}
                ${m.arms_cm ? `<div class="measurement-stat"><div class="label">Arms:</div> <div class="value">${cmToIn(m.arms_cm)} in</div></div>` : ''}
                ${m.thighs_cm ? `<div class="measurement-stat"><div class="label">Thighs:</div> <div class="value">${cmToIn(m.thighs_cm)} in</div></div>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="empty-state">
          <div class="empty-state-icon">📏</div>
          <div class="empty-state-text">No measurements yet</div>
          <div class="empty-state-subtext">Your trainer will add measurements as you progress</div>
        </div>
      `}
    </div>
    ${photos && photos.length > 0 ? `
    <div class="section">
      <div class="section-title">📸 Progress Photos</div>
      <div class="photos-grid">
        ${photos.slice(0, 12).map(p => `
          <div class="photo-card">
            <img src="${p.photo_url}" alt="Progress photo ${p.taken_date}">
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}
    ${milestones && milestones.length > 0 ? `
    <div class="section">
      <div class="section-title">🎊 Milestones Reached</div>
      <div class="measurements-list">
        ${milestones.slice(0, 5).map(m => `
          <div class="measurement-item">
            <div class="measurement-date">${new Date(m.achieved_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
            <div style="font-weight:600;color:#e5e7eb;margin-top:5px">${m.name}</div>
            ${m.description ? `<div style="color:#9ca3af;font-size:0.85rem;margin-top:3px">${m.description}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}
  </div>
  <script>
    // PWA Install
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
    });
    // Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
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

function getWelcomeHTML(origin) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FitTrack Pro - Welcome</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #1a1d2e 0%, #2a2f42 100%); color: #e5e7eb; margin: 0; min-height: 100vh; display: grid; place-items: center; }
    .splash-card { background: #2a2f42; padding: 40px 32px 32px 32px; border-radius: 16px; max-width: 420px; width: 96%; box-shadow: 0 8px 24px rgba(0,0,0,.35); text-align: center; }
    h1 { margin: 0 0 18px; font-size: 2.2rem; font-weight: 800; }
    .grad { background: linear-gradient(135deg, #FF4B39 0%, #FFB82B 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .subtitle { color: #9ca3af; margin-bottom: 28px; font-size: 1.1rem; }
    .login-btn { display: block; width: 100%; margin: 16px 0; padding: 16px 0; font-size: 1.1rem; font-weight: 700; border-radius: 10px; border: none; background: linear-gradient(135deg, #FF4B39 0%, #FFB82B 100%); color: #1a1d2e; cursor: pointer; transition: background 0.2s; }
    .login-btn:active { background: linear-gradient(135deg, #FFB82B 0%, #FF4B39 100%); }
    .note { color: #9ca3af; font-size: 0.95rem; margin-top: 18px; }
  </style>
</head>
<body>
  <div class="splash-card">
    <h1><span class="grad">FitTrack Pro</span></h1>
    <div class="subtitle">Welcome! Please select your portal:</div>
    <a href="/login/client"><button class="login-btn">Client Login</button></a>
    <a href="/login/trainer"><button class="login-btn">Trainer Login</button></a>
    <div class="note">Client logins are created by your trainer. You can update your password after your first login.<br>Trainers create their own login.</div>
  </div>
</body>
</html>`;
}

function getTrainerIncompleteHTML() {
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Complete Profile - FitTrack Pro</title><style>body{font-family:system-ui,Segoe UI,Roboto;background:linear-gradient(135deg,#1a1d2e 0%,#2a2f42 100%);color:#e5e7eb;display:grid;place-items:center;min-height:100vh;margin:0}.card{background:#2a2f42;padding:24px;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.35);max-width:560px;width:92%}.grad{background:linear-gradient(135deg,#FF4B39 0%,#FFB82B 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}</style></head><body><div class="card"><h1 class="grad">Almost there</h1><p>Your trainer profile isn't complete yet. Please open the desktop app or web settings and finish your profile.</p><p style="color:#9ca3af;margin-top:8px">Note: Logo is optional.</p></div></body></html>`;
}

function getTrainerPortalHTML(trainer, origin) {
  const logo = trainer.logo_url ? `<img src="${trainer.logo_url}" alt="logo" style="width:40px;height:40px;border-radius:8px;margin-right:10px;object-fit:cover;border:2px solid #FFB82B"/>` : '';
  const trainerId = trainer.id;
  const trainerName = trainer.name || 'Trainer';
  // Generate a branded URL (replace rehchu1 with trainer slug)
  const trainerSlug = (trainerName || 'trainer').replace(/[^a-z0-9]/gi, '').toLowerCase();
  const brandedOrigin = origin.replace('rehchu1', trainerSlug);
  
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Trainer Portal - ${trainer.name || 'Trainer'}</title>
  <link rel="manifest" href="/manifest.json"/>
  <style>
    :root{--bg:#0f1222;--panel:#1f2336;--text:#e5e7eb;--muted:#9ca3af;--brand1:#FF4B39;--brand2:#FFB82B}
    *{box-sizing:border-box}
    body{font-family:system-ui,Segoe UI,Roboto;background:linear-gradient(135deg,#1a1d2e 0%,#2a2f42 100%);color:var(--text);min-height:100vh;margin:0}
    header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:var(--panel);box-shadow:0 2px 10px rgba(0,0,0,.3);position:sticky;top:0;z-index:10}
    .title{font-weight:800;font-size:18px}
    .grad{background:linear-gradient(135deg,var(--brand1) 0%,var(--brand2) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
    .wrap{padding:14px}
    .tabs{display:flex;gap:8px;flex-wrap:wrap}
    .tab{background:transparent;border:1px solid #3b415a;color:var(--text);padding:8px 12px;border-radius:8px;cursor:pointer}
    .tab.active{border-color:var(--brand2);color:var(--brand2)}
    .grid{display:grid;gap:12px}
    @media(min-width:768px){.grid{grid-template-columns:1fr 1fr}}
    .card{background:var(--panel);padding:16px;border-radius:12px;border:1px solid #2f3550}
    input,button{font:inherit}
    input[type=text],input[type=email],input[type=password],input[type=tel]{width:100%;background:#161a2a;color:var(--text);border:1px solid #2f3550;border-radius:8px;padding:10px}
    .btn{background:linear-gradient(135deg,var(--brand1),var(--brand2));border:none;color:#0f1222;padding:10px 14px;border-radius:10px;font-weight:700;cursor:pointer}
    .btn[disabled]{opacity:.6;cursor:not-allowed}
    .list{display:flex;flex-direction:column;gap:8px;max-height:360px;overflow:auto}
    .row{display:flex;align-items:center;justify-content:space-between;background:#191d2e;border:1px solid #2a2f42;border-radius:10px;padding:10px}
    .muted{color:var(--muted)}
    .actions{display:flex;gap:8px}
    .qr{display:block;max-width:280px;width:100%;border-radius:12px;border:1px solid #2f3550}
    .toast{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:#111425;color:var(--text);padding:10px 14px;border:1px solid #2f3550;border-radius:10px;display:none}
    .toast.show{display:block}
  </style>
  </head>
  <body>
    <header>
      <div style="display:flex;align-items:center">${logo}<div><div class="title"><span class="grad">${trainer.name || 'Trainer'}</span></div><div class="muted" style="font-size:12px">${trainer.email || ''}</div></div></div>
      <nav class="tabs">
        <button class="tab active" data-tab="clients">Clients</button>
        <button class="tab" data-tab="qr">QR</button>
        <button class="tab" data-tab="settings">Settings</button>
      </nav>
    </header>
    <div class="wrap">
      <div id="tab-clients" class="grid">
        <div class="card">
          <h3 style="margin:0 0 8px 0">Add Client</h3>
          <div style="display:grid;gap:8px;grid-template-columns:1fr 1fr"><input id="name" type="text" placeholder="Full name"/><input id="email" type="email" placeholder="email@example.com"/></div>
          <div style="margin-top:8px"><input id="phone" type="tel" placeholder="Phone (optional)"/></div>
          <div style="margin-top:10px"><button id="createBtn" class="btn">Create Client</button></div>
          <div id="createMsg" class="muted" style="margin-top:8px"></div>
        </div>
        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin:0 0 8px 0">
            <h3 style="margin:0">My Clients</h3>
            <button id="refreshClients" class="btn" style="padding:6px 10px">Refresh</button>
          </div>
          <div id="clientsCount" class="muted" style="margin-bottom:6px"></div>
          <div id="clients" class="list"></div>
        </div>
      </div>
      <div id="tab-qr" class="grid" style="display:none">
        <div class="card">
          <h3 style="margin:0 0 12px 0">Mobile Portal</h3>
          <img id="qrimg" class="qr" alt="QR Code"/>
          <div style="display:flex;gap:8px;margin-top:10px">
            <input id="portalUrl" type="text" readonly value="${brandedOrigin}/trainer/${trainerId}"/>
            <button id="copyUrl" class="btn">Copy URL</button>
          </div>
          <div class="muted" style="margin-top:6px">Share this QR or URL with clients to access your portal.</div>
        </div>
      </div>
      <div id="tab-settings" class="grid" style="display:none">
        <div class="card">
          <h3 style="margin:0 0 8px 0">Upload Logo (optional)</h3>
          <input id="logoFile" type="file" accept="image/*"/>
          <div style="margin-top:10px"><button id="uploadLogo" class="btn">Upload Logo</button></div>
          <div class="muted" style="margin-top:6px">PNG/JPG up to 5 MB</div>
          <div id="logoMsg" class="muted" style="margin-top:8px"></div>
        </div>
        <div class="card">
          <h3 style="margin:0 0 8px 0">Change Password</h3>
          <div style="display:grid;gap:8px">
            <input id="curPwd" type="password" placeholder="Current password"/>
            <input id="newPwd" type="password" placeholder="New password (min 8)"/>
          </div>
          <div style="margin-top:10px"><button id="changePwd" class="btn">Change Password</button></div>
          <div id="pwdMsg" class="muted" style="margin-top:8px"></div>
        </div>
      </div>
    </div>
    <div id="toast" class="toast"></div>
    <script>
      const origin = ${JSON.stringify(origin)};
      const trainerId = ${JSON.stringify(trainerId)};
      const apiBase = origin + '/api';

      // Tabs
      document.querySelectorAll('.tab').forEach(btn=>{
        btn.addEventListener('click',()=>{
          document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
          btn.classList.add('active');
          const tab = btn.dataset.tab;
          document.getElementById('tab-clients').style.display = tab==='clients'?'grid':'none';
          document.getElementById('tab-qr').style.display = tab==='qr'?'grid':'none';
          document.getElementById('tab-settings').style.display = tab==='settings'?'grid':'none';
          if(tab==='clients') loadClients();
        });
      });

      // Toast helper
      function toast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2000); }

      // Simple HTML escape
      function esc(s){ return String(s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m])); }

      // Load clients
      async function loadClients(){
        try{
          const r = await fetch(apiBase + '/clients?trainerId=' + trainerId + '&_=' + Date.now(), { cache: 'no-store' });
          const data = await r.json().catch(()=>({clients:[]}));
          const list = document.getElementById('clients');
          list.innerHTML = '';
          const arr = Array.isArray(data.clients) ? data.clients : [];
          document.getElementById('clientsCount').textContent = 'Clients: ' + arr.length;
          arr.forEach(c=>{
            const div = document.createElement('div');
            div.className='row';
            const shareUrl = c.share_token ? (brandedOrigin + '/profile/' + c.share_token) : (brandedOrigin + '/client/' + (c.name||'client').replace(/\s+/g,'').toLowerCase());
            div.innerHTML = '<div><div>'+ esc(c.name||'Unnamed') +'</div><div class="muted" style="font-size:12px">'+ esc(c.email||'') +'</div></div>' +
              '<div class="actions"><button class="btn" style="padding:6px 10px" data-id="'+c.id+'">Share</button></div>';
            div.querySelector('button').addEventListener('click', ()=>{
              navigator.clipboard.writeText(shareUrl).then(()=>toast('Share URL copied')); 
            });
            list.appendChild(div);
          });
          if(arr.length === 0){ list.innerHTML = '<div class="muted">No clients yet.</div>'; }
        }catch(e){
          document.getElementById('clients').innerHTML = '<div class="muted">Failed to load clients.</div>';
        }
      }
      loadClients();

  // Manual refresh
  document.getElementById('refreshClients').addEventListener('click', ()=> loadClients());

      // Create client
      document.getElementById('createBtn').addEventListener('click', async ()=>{
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const msg = document.getElementById('createMsg');
        if(!name||!email){ msg.textContent='Name and email required.'; return; }
        try{
          const r = await fetch(apiBase + '/clients', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name,email,phone,trainerId })});
          if(!r.ok){ const t = await r.text(); throw new Error(t||('HTTP '+r.status)); }
          msg.textContent='Client created.'; document.getElementById('name').value=''; document.getElementById('email').value=''; document.getElementById('phone').value='';
          loadClients(); toast('Client created');
          // quick auto-refresh window for a few seconds just in case
          let n=0; const iv = setInterval(()=>{ loadClients(); if(++n>=3) clearInterval(iv); }, 1500);
        }catch(e){ msg.textContent='Create failed: '+(e.message||e); }
      });

      // QR tab setup
      const portal = brandedOrigin + '/trainer/' + trainerId;
      document.getElementById('portalUrl').value = portal;
      document.getElementById('qrimg').src = 'https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=' + encodeURIComponent(portal);
      document.getElementById('copyUrl').addEventListener('click', ()=>{ navigator.clipboard.writeText(portal).then(()=>toast('URL copied')); });

      // Logo upload
      document.getElementById('uploadLogo').addEventListener('click', async ()=>{
        const file = document.getElementById('logoFile').files[0];
        const msg = document.getElementById('logoMsg');
        if(!file){ msg.textContent='Choose a file first.'; return; }
        if(file.size > 5*1024*1024){ msg.textContent='Max 5MB'; return; }
        const fd = new FormData(); fd.append('logo', file);
        try{
          const r = await fetch(apiBase + '/trainers/' + trainerId + '/profile', { method:'PUT', body: fd });
          if(!r.ok){ const t = await r.text(); throw new Error(t||('HTTP '+r.status)); }
          msg.textContent='Logo uploaded.'; toast('Logo updated');
        }catch(e){ msg.textContent='Upload failed: '+(e.message||e); }
      });

      // Change password
      document.getElementById('changePwd').addEventListener('click', async ()=>{
        const cur = document.getElementById('curPwd').value; const np = document.getElementById('newPwd').value; const msg = document.getElementById('pwdMsg');
        if(!cur||!np){ msg.textContent='Enter current and new password.'; return; }
        if(np.length<8){ msg.textContent='New password must be at least 8 characters.'; return; }
        try{
          const r = await fetch(apiBase + '/trainers/' + trainerId + '/password', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ currentPassword: cur, newPassword: np })});
          const ok = r.ok; const body = await r.text();
          if(!ok){ throw new Error(body); }
          msg.textContent='Password changed.'; toast('Password updated');
          document.getElementById('curPwd').value=''; document.getElementById('newPwd').value='';
        }catch(e){ msg.textContent='Change failed: '+(e.message||e); }
      });

      // PWA
      if('serviceWorker' in navigator){ navigator.serviceWorker.register('/sw.js').catch(()=>{}); }
    </script>
  </body>
  </html>`;
}

// Simple password hashing using Web Crypto API
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

