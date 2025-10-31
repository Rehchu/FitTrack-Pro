// FitTrack Pro - Trainer Portal Worker (Bundled)
// This is a single-file version combining all modules for Cloudflare Workers

// ============================================================================
// MAIN WORKER EXPORT
// ============================================================================

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';

      // Debug logs kept minimal to avoid noisy output; remove during production if needed.
      // console.log('Method:', request.method, 'Path:', path);

      // Ensure database schema exists (idempotent)
        try {
          await ensureSchema(env);
          console.log('Schema ensured successfully');
        } catch (schemaError) {
          console.error('Schema error (continuing anyway):', schemaError.message);
        }

      // Ensure database schema exists (idempotent)
      try {
        await ensureSchema(env);
        // console.log('Schema ensured successfully');
      } catch (schemaError) {
        console.error('Schema error (continuing anyway):', schemaError.message);
      }

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        }
      });
    }

    // ========================================================================
    // PUBLIC AUTH ROUTES (No authentication required)
    // ========================================================================


    // Login page (serve for various login routes including typos)
    const isLoginPath = (path === '/login' || 
         path === '/trainer/login' || 
         path === '/login/trainer' || 
         path === '/rainer/login' || 
         path.includes('/login'));
    console.log('Path:', path, 'isLoginPath:', isLoginPath, 'method:', request.method);
    
    // Cost guard: Optional per-IP rate limit for auth endpoints to prevent abuse/brute-force.
    if (isLoginPath || path.startsWith('/api/auth/')) {
      const limit = getEnvInt(env.RL_AUTH_PER_MINUTE, 8); // default 8/min per IP
      if (limit > 0) {
        const rl = await rateLimit(env, 'auth', clientIp, limit, 60);
        if (rl.limited) {
          return rateLimitedResponse(rl);
        }
      }
    }
    
    if (isLoginPath && request.method === 'GET') {
      console.log('Serving login page for path:', path);
      return new Response(getLoginHTML(), {
        headers: { 
          'Content-Type': 'text/html; charset=UTF-8'
        }
      });
    }

    // Cyberpunk sample UI window (for design preview)
    if (path === '/ui-demo' && request.method === 'GET') {
      return new Response(getDemoHTML(), {
        headers: { 'Content-Type': 'text/html; charset=UTF-8' }
      });
    }

    // Client login page
    if ((path === '/client/login' || path === '/client') && request.method === 'GET') {
      return new Response(getLoginHTML('client'), {
        headers: { 'Content-Type': 'text/html; charset=UTF-8' }
      });
    }

    // Register page
    if (path === '/register' && request.method === 'GET') {
      return new Response(getRegisterHTML(), {
        headers: { 'Content-Type': 'text/html; charset=UTF-8' }
      });
    }

    // Login API
    if (path === '/api/auth/login' && request.method === 'POST') {
      return await handleLogin(request, env, true);
    }

    // Register API
    if (path === '/api/auth/register' && request.method === 'POST') {
      return await handleRegister(request, env);
    }

    // Logout API
    if (path === '/api/auth/logout' && request.method === 'POST') {
      return await handleLogout(request, env);
    }

    // ========================================================================
    // PROTECTED ROUTES (Authentication required)
    // ========================================================================

    // Authenticate trainer
    const trainer = await authenticateTrainer(request, env);

    if (!trainer && !path.startsWith('/api/') && !path.startsWith('/uploads/')) {
      // If not authenticated, always show login page for login-related paths or home
      if (path === '/' || path.includes('/login')) {
        return new Response(getLoginHTML(), {
          headers: { 'Content-Type': 'text/html; charset=UTF-8' }
        });
      }
      // For any other path, redirect to /login
      return Response.redirect(new URL('/login', request.url).toString(), 302);
    }
    // Redirect to login if not authenticated
    if (!trainer && !path.startsWith('/api/') && !path.startsWith('/uploads/')) {
      // If not authenticated and already on a login page, always serve login page (never redirect)
      const loginPaths = ['/login', '/trainer/login', '/login/trainer', '/rainer/login'];
      if (loginPaths.includes(path) || path === '/' || path.includes('/login')) {
        return new Response(getLoginHTML(), {
          headers: {
            'Content-Type': 'text/html; charset=UTF-8',
            'X-Debug-Path': path,
            'X-Debug-Auth': 'unauthenticated',
            'X-Debug-Login-Logic': 'served-login-page-no-redirect'
          }
        });
      }
      // For any other path, redirect to /login (but never from /login itself)
      return Response.redirect(new URL('/login', request.url).toString(), 302);
    }

    // Trainer Portal Home
    if (path === '/' || path === '/portal' || path === '/dashboard') {
      if (!trainer) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
      }
      const html = renderTrainerPortal(trainer);
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=UTF-8' }
      });
    }

    // API Routes
    if (path.startsWith('/api/')) {
      if (!trainer) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
      }
        return await handleAPI(request, env, trainer.id, path);
    }

    // R2 File Serving (uploads)
    if (path.startsWith('/uploads/')) {
      const filename = path.substring(9); // Remove '/uploads/' prefix
      const object = await env.R2_UPLOADS.get(filename);
      
      if (!object) {
        return new Response('File not found', { status: 404 });
      }

      return new Response(object.body, {
        headers: {
          'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
          'Cache-Control': 'public, max-age=31536000'
        }
      });
    }

    // Default: 404
    console.log('Returning 404 for path:', path);
    return jsonResponse({ error: 'Not found' }, 404);
    } catch (error) {
      console.error('Worker error:', error);
        return jsonResponse({ 
          error: 'Internal error: ' + error.message,
          stack: error.stack,
          path: request ? new URL(request.url).pathname : 'unknown'
        }, 500);
    }
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Create required tables if they don't exist
async function ensureSchema(env) {
  try {
    // Enable foreign keys and create tables
    await env.FITTRACK_D1.exec(`
      PRAGMA foreign_keys = ON;
      -- Base users table expected to already exist in production
      -- Create minimal tables if missing (fallback only)
      CREATE TABLE IF NOT EXISTS trainers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT,
        business_name TEXT,
        email TEXT,
        password_hash TEXT,
        logo_url TEXT,
        profile_completed INTEGER DEFAULT 0,
        created_at TEXT,
        updated_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        trainer_id INTEGER NOT NULL,
        name TEXT,
        email TEXT,
        password_hash TEXT,
        gender TEXT,
        created_at TEXT,
        updated_at TEXT,
        FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_clients_trainer_id ON clients(trainer_id);
      CREATE INDEX IF NOT EXISTS idx_trainers_email ON trainers(email);
      CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);

      -- Measurements (wide schema to support all metrics)
      CREATE TABLE IF NOT EXISTS measurements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        measurement_date TEXT NOT NULL,
        weight_kg REAL,
        body_fat_pct REAL,
        height_cm REAL,
        neck_cm REAL,
        chest_cm REAL,
        waist_cm REAL,
        hips_cm REAL,
        bicep_cm REAL,
        thigh_cm REAL,
        calf_cm REAL,
        resting_hr INTEGER,
        bp_systolic INTEGER,
        bp_diastolic INTEGER,
        steps INTEGER,
        notes TEXT,
        created_at TEXT DEFAULT (strftime('%s','now')),
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_measurements_client_date ON measurements(client_id, measurement_date DESC);

      -- Quests, Achievements, Milestones (if not present)
      CREATE TABLE IF NOT EXISTS quests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trainer_id INTEGER NOT NULL,
        client_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        quest_type TEXT,
        target_value REAL,
        current_value REAL,
        target_unit TEXT,
        difficulty TEXT,
        xp_reward INTEGER,
        reward_achievement TEXT,
        reward_description TEXT,
        deadline TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (strftime('%s','now')),
        completed_at TEXT,
        FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE CASCADE,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_quests_client ON quests(client_id, is_active);

      CREATE TABLE IF NOT EXISTS achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        category TEXT,
        awarded_at TEXT DEFAULT (strftime('%s','now')),
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_achievements_client ON achievements(client_id, awarded_at DESC);

      CREATE TABLE IF NOT EXISTS milestones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        milestone_type TEXT,
        value REAL,
        unit TEXT,
        icon TEXT,
        created_at TEXT DEFAULT (strftime('%s','now')),
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_milestones_client ON milestones(client_id, created_at DESC);

      -- Fitness questionnaire
      CREATE TABLE IF NOT EXISTS fitness_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trainer_id INTEGER NOT NULL,
        question_text TEXT NOT NULL,
        field_key TEXT,
        type TEXT DEFAULT 'text', -- text, number, choice, boolean
        options_json TEXT, -- JSON array for choices
        order_index INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (strftime('%s','now')),
        FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_fq_trainer ON fitness_questions(trainer_id, active);

      CREATE TABLE IF NOT EXISTS client_questionnaire (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        question_id INTEGER NOT NULL,
        answer_text TEXT,
        answered_at TEXT DEFAULT (strftime('%s','now')),
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES fitness_questions(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_cq_client ON client_questionnaire(client_id, answered_at DESC);

      CREATE TABLE IF NOT EXISTS client_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER UNIQUE NOT NULL,
        summary_json TEXT, -- generated profile summary
        updated_at TEXT DEFAULT (strftime('%s','now')),
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      );

      -- Workouts (master exercise library + workout sessions)
      CREATE TABLE IF NOT EXISTS exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        category TEXT,
        equipment TEXT,
        difficulty TEXT DEFAULT 'intermediate',
        primary_muscles TEXT,
        secondary_muscles TEXT,
        instructions TEXT,
        video_url TEXT,
        thumbnail_url TEXT,
        created_at TEXT DEFAULT (strftime('%s','now'))
      );
      CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises(name);

      CREATE TABLE IF NOT EXISTS workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        trainer_id INTEGER NOT NULL,
        title TEXT,
        description TEXT,
        scheduled_at TEXT,
        completed_at TEXT,
        duration_minutes INTEGER,
        notes TEXT,
        created_at TEXT DEFAULT (strftime('%s','now')),
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
        FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_workouts_client ON workouts(client_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS setgroups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_id INTEGER NOT NULL,
        exercise_id INTEGER NOT NULL,
        order_index INTEGER DEFAULT 0,
        rest_seconds INTEGER,
        notes TEXT,
        created_at TEXT DEFAULT (strftime('%s','now')),
        FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
        FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_setgroups_workout ON setgroups(workout_id, order_index);

      CREATE TABLE IF NOT EXISTS workout_sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setgroup_id INTEGER NOT NULL,
        set_number INTEGER,
        reps INTEGER,
        weight REAL,
        duration_seconds INTEGER,
        distance_meters REAL,
        rpe INTEGER,
        completed INTEGER DEFAULT 0,
        notes TEXT,
        created_at TEXT DEFAULT (strftime('%s','now')),
        FOREIGN KEY (setgroup_id) REFERENCES setgroups(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_sets_setgroup ON workout_sets(setgroup_id, set_number);

      -- Nutrition
      CREATE TABLE IF NOT EXISTS meal_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trainer_id INTEGER NOT NULL,
        client_id INTEGER,
        name TEXT NOT NULL,
        description TEXT,
        meals_json TEXT,
        created_at TEXT DEFAULT (strftime('%s','now')),
        FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE CASCADE,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_meal_plans_trainer ON meal_plans(trainer_id, created_at DESC);

      -- Progress photos
      CREATE TABLE IF NOT EXISTS progress_photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        photo_url TEXT NOT NULL,
        thumbnail_url TEXT,
        note TEXT,
        taken_at TEXT,
        created_at TEXT DEFAULT (strftime('%s','now')),
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_photos_client ON progress_photos(client_id, taken_at DESC);
    `);

    // Backfill/alter legacy schemas to ensure required columns exist
    const trainersInfo = await env.FITTRACK_D1.prepare('PRAGMA table_info(trainers)').all();
    const trainerCols = new Set((trainersInfo.results || []).map(c => c.name));
    const ensureTrainerCol = async (name, type) => {
      if (!trainerCols.has(name)) {
        await env.FITTRACK_D1.exec(`ALTER TABLE trainers ADD COLUMN ${name} ${type};`);
      }
    };
    await ensureTrainerCol('name', 'TEXT');
    await ensureTrainerCol('business_name', 'TEXT');
    await ensureTrainerCol('email', 'TEXT');
    await ensureTrainerCol('password_hash', 'TEXT');
    await ensureTrainerCol('created_at', 'TEXT');
    await env.FITTRACK_D1.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_trainers_email ON trainers(email);');

    const clientsInfo = await env.FITTRACK_D1.prepare('PRAGMA table_info(clients)').all();
    const clientCols = new Set((clientsInfo.results || []).map(c => c.name));
    const ensureClientCol = async (name, type) => {
      if (!clientCols.has(name)) {
        await env.FITTRACK_D1.exec(`ALTER TABLE clients ADD COLUMN ${name} ${type};`);
      }
    };
    await ensureClientCol('name', 'TEXT');
    await ensureClientCol('email', 'TEXT');
    await ensureClientCol('password_hash', 'TEXT');
    await ensureClientCol('created_at', 'TEXT');
    await env.FITTRACK_D1.exec('CREATE INDEX IF NOT EXISTS idx_clients_trainer_id ON clients(trainer_id);');
    await env.FITTRACK_D1.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_email ON clients(email);');

    // Ensure measurement columns exist in legacy DB
    const measInfo = await env.FITTRACK_D1.prepare('PRAGMA table_info(measurements)').all();
    const measCols = new Set((measInfo.results || []).map(c => c.name));
    console.log('Existing measurement columns:', Array.from(measCols));
    
    const measurementCols = [
      ['client_id','INTEGER'],['measurement_date','TEXT'],['weight_kg','REAL'],['body_fat_pct','REAL'],['height_cm','REAL'],
      ['neck_cm','REAL'],['chest_cm','REAL'],['waist_cm','REAL'],['hips_cm','REAL'],['bicep_cm','REAL'],
      ['thigh_cm','REAL'],['calf_cm','REAL'],['resting_hr','INTEGER'],['bp_systolic','INTEGER'],['bp_diastolic','INTEGER'],
      ['steps','INTEGER'],['notes','TEXT'],['created_at','TEXT']
    ];
    
    // Collect missing columns and add them in a batch
    const stmts = [];
    for (const [name, type] of measurementCols) {
      if (!measCols.has(name)) {
        console.log(`Will add missing column: ${name} ${type}`);
        stmts.push(env.FITTRACK_D1.prepare(`ALTER TABLE measurements ADD COLUMN ${name} ${type}`));
      }
    }
    
    if (stmts.length > 0) {
      console.log(`Adding ${stmts.length} missing columns to measurements table...`);
      try {
        await env.FITTRACK_D1.batch(stmts);
        console.log('Successfully added missing columns');
      } catch (err) {
        console.error('Failed to add columns:', err);
      }
    }
    
    // Add nutrition columns to meal_plans
    const mealInfo = await env.FITTRACK_D1.prepare('PRAGMA table_info(meal_plans)').all();
    const mealCols = new Set((mealInfo.results || []).map(c => c.name));
    
    const nutritionCols = [
      ['total_calories', 'INTEGER'],
      ['total_protein', 'REAL'],
      ['total_carbs', 'REAL'],
      ['total_fat', 'REAL']
    ];
    
    for (const [name, type] of nutritionCols) {
      if (!mealCols.has(name)) {
        try {
          await env.FITTRACK_D1.exec(`ALTER TABLE meal_plans ADD COLUMN ${name} ${type}`);
          console.log(`Added ${name} to meal_plans`);
        } catch (e) { console.error(`Error adding ${name}:`, e); }
      }
    }
    
    // Add exercise details columns to workouts
    const workoutInfo = await env.FITTRACK_D1.prepare('PRAGMA table_info(workouts)').all();
    const workoutCols = new Set((workoutInfo.results || []).map(c => c.name));
    
    const workoutDetailCols = [
      ['exercises_json', 'TEXT'],
      ['workout_type', 'TEXT']
    ];
    
    for (const [name, type] of workoutDetailCols) {
      if (!workoutCols.has(name)) {
        try {
          await env.FITTRACK_D1.exec(`ALTER TABLE workouts ADD COLUMN ${name} ${type}`);
          console.log(`Added ${name} to workouts`);
        } catch (e) { console.error(`Error adding ${name}:`, e); }
      }
    }
    
    await env.FITTRACK_D1.exec('CREATE INDEX IF NOT EXISTS idx_measurements_client_date ON measurements(client_id, measurement_date DESC);');
  } catch (e) {
    // Log but don't block requests; specific operations will surface errors
    console.error('Schema initialization error:', e);
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// ============================
// COST GUARD HELPERS
// ============================
function getEnvInt(val, fallback) {
  const n = parseInt(val, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

async function rateLimit(env, bucket, key, limit, windowSec) {
  const now = Math.floor(Date.now() / 1000);
  const win = Math.floor(now / windowSec);
  const kvKey = `rl:${bucket}:${key}:${win}`;
  const reset = (win + 1) * windowSec - now;
  try {
    const existing = await env.FITTRACK_KV.get(kvKey, { type: 'text' });
    const count = existing ? parseInt(existing, 10) || 0 : 0;
    if (count >= limit) {
      return { limited: true, remaining: 0, reset };
    }
    // Increment (not atomic, but good enough for coarse limits)
    await env.FITTRACK_KV.put(kvKey, String(count + 1), { expirationTtl: reset + 5 });
    return { limited: false, remaining: Math.max(0, limit - (count + 1)), reset };
  } catch (e) {
    // On KV error, fail-open (no limit) to preserve availability
    return { limited: false, remaining: limit, reset };
  }
}

function rateLimitedResponse(rl) {
  const r = jsonResponse({ error: 'Too Many Requests' }, 429);
  r.headers.set('Retry-After', String(Math.max(1, rl.reset)));
  r.headers.set('X-RateLimit-Remaining', String(rl.remaining));
  return r;
}

// ============================================================================
// UI DEMO (Cyberpunk-inspired theme)
// ============================================================================
function getDemoHTML() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>FitTrack Pro - UI Demo</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #000000;
      --panel: #0d0d0d;
      --panel-dark: #0a0a0a;
      --text: #e0e0e0;
      --heading: #ffffff;
      --green: #00ff41;
      --green-alt: #39ff14;
      --purple: #b026ff;
      --purple-alt: #9d4edd;
      --border: #1a1a1a;
      --glow-green: 0 0 12px rgba(0,255,65,0.5), 0 0 28px rgba(0,255,65,0.3);
      --glow-purple: 0 0 12px rgba(176,38,255,0.5), 0 0 28px rgba(176,38,255,0.3);
      --shadow: 0 10px 30px rgba(0,0,0,0.8);
    }
    * { box-sizing: border-box; }
    html, body { height: 100%; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: grid;
      grid-template-rows: 56px 1fr;
    }
    /* Title bar */
    .titlebar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      background: #000000;
      border-bottom: 2px solid var(--green);
      box-shadow: 0 0 20px rgba(0,255,65,0.3);
    }
    .titlebar .app-name { color: var(--heading); font-weight: 800; letter-spacing: 0.4px; text-shadow: 0 0 10px rgba(0,255,65,0.5); }
    .titlebar .actions { display: flex; gap: 8px; }
    .icon-btn { background: #1a1a1a; border: 1px solid var(--border); color: var(--text); padding: 8px 10px; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
    .icon-btn:hover { background: var(--green); border-color: var(--green); box-shadow: var(--glow-green); color: #000; font-weight: 600; }
    .icon-btn:active { background: var(--purple); border-color: var(--purple); color: #fff; box-shadow: var(--glow-purple); }

    /* Layout */
    .layout { display: grid; grid-template-columns: 240px 1fr; height: 100%; }
    .sidebar {
      background: #000000;
      border-right: 2px solid var(--green);
      box-shadow: 2px 0 20px rgba(0,255,65,0.2);
      padding: 16px 12px;
    }
    .menu { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
    .menu-item { padding: 10px 12px; border-radius: 10px; display: flex; align-items: center; gap: 10px; cursor: pointer; color: var(--text); border: 1px solid transparent; transition: all 0.2s; }
    .menu-item:hover { background: #1a1a1a; border-color: var(--green); box-shadow: var(--glow-green); color: var(--heading); }
    .menu-item.active { background: var(--purple); color: #ffffff; box-shadow: var(--glow-purple); border-color: var(--purple); font-weight: 600; }

    .content {
      background: #000000;
      padding: 20px;
      overflow: auto;
    }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
    .card { background: #1a1a1a; border: 2px solid var(--border); border-radius: 14px; padding: 18px; box-shadow: var(--shadow); transition: all 0.3s; }
    .card:hover { border-color: var(--green); box-shadow: var(--glow-green), var(--shadow); }
    .card h3 { color: var(--heading); margin: 0 0 8px; font-weight: 700; }
    .muted { color: #bdbdbd; font-size: 0.95rem; }

    /* Controls */
    .toolbar { display: flex; gap: 12px; align-items: center; margin: 18px 0; }
    .btn { background: #2a2a2a; color: var(--text); border: 2px solid var(--green); padding: 10px 14px; border-radius: 10px; font-weight: 600; cursor: pointer; transition: all .2s ease; box-shadow: 0 0 10px rgba(0,255,65,0.2); }
    .btn:hover { background: var(--green); color: #000000; border-color: var(--green); box-shadow: 0 0 25px rgba(0,255,65,0.6), 0 0 40px rgba(0,255,65,0.3); transform: translateY(-2px); }
    .btn:active, .btn.selected { background: var(--purple); color: #ffffff; border-color: var(--purple); box-shadow: 0 0 25px rgba(176,38,255,0.6), 0 0 40px rgba(176,38,255,0.3); transform: translateY(0); }
    .btn-outline { background: transparent; border: 2px solid var(--green); color: var(--green); box-shadow: 0 0 10px rgba(0,255,65,0.2); }
    .btn-outline:hover { background: rgba(0,255,65,0.15); color: var(--green); border-color: var(--green-alt); box-shadow: 0 0 20px rgba(0,255,65,0.5); }

    .input {
      background: #000000; color: var(--text); border: 2px solid var(--border); padding: 10px 12px; border-radius: 10px; min-width: 260px;
      caret-color: var(--purple);
      transition: all 0.2s;
    }
    .input:focus { outline: none; border-color: var(--green); box-shadow: 0 0 0 3px rgba(0,255,65,0.25), 0 0 20px rgba(0,255,65,0.5); }

    .panel { background: var(--panel-dark); border: 1px solid var(--border); border-radius: 14px; padding: 16px; }
    .panel h2 { color: var(--heading); margin: 0 0 12px; font-size: 1.1rem; letter-spacing: .3px; }

    .footer { margin-top: 16px; color: #9e9e9e; font-size: 0.85rem; }

    @media (max-width: 900px) {
      .layout { grid-template-columns: 1fr; }
      .sidebar { display: none; }
    }
  </style>
</head>
<body>
  <div class="titlebar">
    <div class="app-name">FitTrack Pro</div>
    <div class="actions">
      <button class="icon-btn" onclick="toggleActive()">Toggle Active</button>
      <a class="icon-btn" href="/login">Go to Login</a>
    </div>
  </div>
  <div class="layout">
    <aside class="sidebar">
      <ul class="menu">
        <li class="menu-item active">🏠 Dashboard</li>
        <li class="menu-item">👥 Clients</li>
        <li class="menu-item">📏 Measurements</li>
        <li class="menu-item">🍎 Nutrition</li>
        <li class="menu-item">💪 Workouts</li>
        <li class="menu-item">⚙️ Settings</li>
      </ul>
    </aside>
    <main class="content">
      <div class="toolbar">
        <input class="input" placeholder="Type and press Enter" />
        <button class="btn">Primary</button>
        <button class="btn btn-outline">Outline</button>
        <button class="btn selected">Selected</button>
      </div>

      <div class="cards">
        <div class="card">
          <h3>Overview</h3>
          <div class="muted">High-contrast neon theme with green and purple accents. Buttons glow on hover, and inputs have a green focus ring with a purple caret.</div>
        </div>
        <div class="card">
          <h3>Status</h3>
          <div class="panel">
            <h2>System</h2>
            <div class="muted">All services nominal. Cloudflare in front. Rate limits and caching enabled.</div>
          </div>
          <div class="footer">Cyberpunk UI • v1</div>
        </div>
        <div class="card">
          <h3>Shortcuts</h3>
          <div class="toolbar"><button class="btn">New Client</button><button class="btn">Add Workout</button></div>
        </div>
      </div>
    </main>
  </div>
  <script>
    function toggleActive() {
      const first = document.querySelector('.menu .menu-item');
      if (first) first.classList.toggle('active');
    }
  </script>
</body>
</html>`;
}

// ============================================================================
// CONVERSION HELPERS
// ============================================================================
function lbsToKg(lbs) {
  if (lbs == null || isNaN(lbs)) return null;
  return lbs * 0.45359237;
}
function inchesToCm(inches) {
  if (inches == null || isNaN(inches)) return null;
  return inches * 2.54;
}

// ============================================================================
// QUEST UTILS
// ============================================================================
function computeQuestProgress(q) {
  const cur = q.current_value != null ? Number(q.current_value) : 0;
  const tgt = q.target_value != null ? Number(q.target_value) : null;
  if (tgt == null || tgt === 0) return 0;
  let p = (cur / tgt) * 100;
  if (q.quest_type === 'weight' && tgt < cur) {
    // For weight loss target, if target is lower than current weight, invert
    p = ((Number(q.start_value || cur) - cur) / (Number(q.start_value || cur) - tgt)) * 100;
  }
  return Math.max(0, Math.min(100, p));
}

async function autoCheckMilestones(env, clientId) {
  const created = [];
  // Compute total weight lost based on first vs latest measurement
  const rows = await env.FITTRACK_D1.prepare('SELECT weight_kg, measurement_date FROM measurements WHERE client_id = ? AND weight_kg IS NOT NULL ORDER BY measurement_date ASC').bind(clientId).all();
  const list = rows.results || [];
  if (list.length >= 2) {
    const start = list[0].weight_kg;
    const latest = list[list.length - 1].weight_kg;
    const lost = start - latest; // kg
    const milestones = [5,10,15,20,25,30];
    for (const kg of milestones) {
      if (lost >= kg) {
        await env.FITTRACK_D1.prepare('INSERT INTO milestones (client_id, title, description, milestone_type, value, unit, icon) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .bind(clientId, `Lost ${kg}kg!`, `Amazing progress! You've lost ${kg}kg since you started.`, 'weight_loss', kg, 'kg', '🎯').run();
        created.push(`Lost ${kg}kg!`);
      }
    }
  }
  return created;
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateToken() {
  return crypto.randomUUID();
}

// ============================================================================
// AUTHENTICATION FUNCTIONS
// ============================================================================

async function authenticateTrainer(request, env) {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;

  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => c.trim().split('='))
  );
  
  const sessionToken = cookies.session_token;
  if (!sessionToken) return null;

  try {
    const session = await env.FITTRACK_KV.get(`session:${sessionToken}`);
    if (!session) return null;

    const sessionData = JSON.parse(session);
    
    // Check if session expired
    if (new Date(sessionData.expires_at) < new Date()) {
      await env.FITTRACK_KV.delete(`session:${sessionToken}`);
      return null;
    }

    // Get trainer + email from users
    const trainer = await env.FITTRACK_D1.prepare(
      `SELECT t.id, u.email, t.business_name, t.logo_url, t.profile_completed,
              t.created_at, t.updated_at
       FROM trainers t
       JOIN users u ON u.id = t.user_id
       WHERE t.id = ?`
    ).bind(sessionData.trainer_id).first();

    return trainer;
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

// If formPost is true, treat as classic form POST and redirect on success
async function handleLogin(request, env, formPost = false) {
  try {
    let email, password;
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      email = body.email;
      password = body.password;
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const form = await request.formData();
      email = form.get('email');
      password = form.get('password');
    }
    if (!email || !password) {
      if (formPost) {
        return new Response('Missing email or password', { status: 400 });
      }
      return jsonResponse({ error: 'Email and password are required' }, 400);
    }

    // Find user by email (trainer)
    const user = await env.FITTRACK_D1.prepare(
      "SELECT id, email, password_hash FROM users WHERE email = ? AND user_type = 'trainer'"
    ).bind(email.toLowerCase()).first();

    if (!user) {
      return jsonResponse({ error: 'Invalid email or password' }, 401);
    }

    // Verify password
    const passwordHash = await hashPassword(password);
    if (passwordHash !== user.password_hash) {
      return jsonResponse({ error: 'Invalid email or password' }, 401);
    }

    // Get or create trainer profile linked to user
    let trainer = await env.FITTRACK_D1.prepare(
      'SELECT id, business_name FROM trainers WHERE user_id = ?'
    ).bind(user.id).first();
    if (!trainer) {
      await env.FITTRACK_D1.prepare(
        'INSERT INTO trainers (user_id, business_name) VALUES (?, ?)'
      ).bind(user.id, null).run();
      trainer = await env.FITTRACK_D1.prepare(
        'SELECT id, business_name FROM trainers WHERE user_id = ?'
      ).bind(user.id).first();
    }

    // Create session
    const sessionToken = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    const sessionData = {
      trainer_id: trainer.id,
      email: user.email,
      expires_at: expiresAt.toISOString()
    };

    await env.FITTRACK_KV.put(
      `session:${sessionToken}`,
      JSON.stringify(sessionData),
      { expirationTtl: 60 * 60 * 24 * 30 } // 30 days in seconds
    );

    // Return success with session cookie
    if (formPost) {
      // Classic form POST: set cookie and redirect
      const resp = Response.redirect('/portal', 302);
      resp.headers.set('Set-Cookie', `session_token=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`);
      return resp;
    } else {
      const response = jsonResponse({
        success: true,
        trainer: {
          id: trainer.id,
          email: user.email,
          business_name: trainer.business_name || ''
        }
      });
      response.headers.set(
        'Set-Cookie',
        `session_token=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`
      );
      return response;
    }
  } catch (error) {
    console.error('Login error:', error);
    return jsonResponse({ error: 'Login failed' }, 500);
  }
}

async function handleRegister(request, env) {
  try {
    const { name, businessName, email, password } = await request.json();

    if (!name || !email || !password) {
      return jsonResponse({ error: 'Name, email, and password are required' }, 400);
    }

    if (password.length < 8) {
      return jsonResponse({ error: 'Password must be at least 8 characters' }, 400);
    }

    // Check if email already exists (users)
    const existing = await env.FITTRACK_D1.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email.toLowerCase()).first();

    if (existing) {
      return jsonResponse({ error: 'Email already registered' }, 409);
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const userStmt = env.FITTRACK_D1.prepare(
      "INSERT INTO users (email, password_hash, user_type) VALUES (?, ?, 'trainer')"
    ).bind(email.toLowerCase(), passwordHash);
    await userStmt.run();

    const user = await env.FITTRACK_D1.prepare(
      "SELECT id, email FROM users WHERE email = ? AND user_type = 'trainer'"
    ).bind(email.toLowerCase()).first();

    // Create trainer profile
    await env.FITTRACK_D1.prepare(
      'INSERT INTO trainers (user_id, business_name) VALUES (?, ?)'
    ).bind(user.id, businessName || null).run();

    const trainer = await env.FITTRACK_D1.prepare(
      'SELECT id, business_name FROM trainers WHERE user_id = ?'
    ).bind(user.id).first();

    // Create session
    const sessionToken = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    const sessionData = {
      trainer_id: trainer.id,
      email: user.email,
      expires_at: expiresAt.toISOString()
    };

    await env.FITTRACK_KV.put(
      `session:${sessionToken}`,
      JSON.stringify(sessionData),
      { expirationTtl: 60 * 60 * 24 * 30 } // 30 days in seconds
    );

    // Return success with session cookie
    const response = jsonResponse({
      success: true,
      trainer: {
        id: trainer.id,
        email: user.email,
        business_name: trainer.business_name || ''
      }
    });

    response.headers.set(
      'Set-Cookie',
      `session_token=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`
    );

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return jsonResponse({ error: 'Registration failed' }, 500);
  }
}

async function handleLogout(request, env) {
  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => c.trim().split('='))
    );
    
    const sessionToken = cookies.session_token;
    if (sessionToken) {
      await env.FITTRACK_KV.delete(`session:${sessionToken}`);
    }
  }

  const response = jsonResponse({ success: true });
  response.headers.set(
    'Set-Cookie',
    'session_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
  );
  
  return response;
}

// ============================================================================
// API HANDLER (Placeholder - will expand later)
// ============================================================================

async function handleAPI(request, env, trainerId, path) {
  const url = new URL(request.url);
  const method = request.method;

  // ========================================================================
  // USDA Nutrition (direct from worker)
  // ========================================================================
  if (path === '/api/usda/search' && method === 'GET') {
    const q = url.searchParams.get('q');
    const pageSize = parseInt(url.searchParams.get('page_size') || '20', 10);
    const pageNumber = parseInt(url.searchParams.get('page_number') || '1', 10);
    if (!q) return jsonResponse({ error: 'Missing query parameter q' }, 400);
    try {
      // Cost guard: per-IP rate limit for USDA to avoid excessive external API calls
      const usdaLimit = getEnvInt(env.RL_USDA_PER_MINUTE, 5); // default 5/min per IP
      if (usdaLimit > 0) {
        const rl = await rateLimit(env, 'usda', clientIp, usdaLimit, 60);
        if (rl.limited) return rateLimitedResponse(rl);
      }

      // KV cache for USDA results to reduce repeated external calls
      const cacheKey = `cache:usda:q=${q}:ps=${pageSize}:pn=${pageNumber}`;
      const cached = await env.FITTRACK_KV.get(cacheKey);
      if (cached) {
        const resp = jsonResponse(JSON.parse(cached));
        resp.headers.set('X-Cache', 'HIT');
        return resp;
      }
      
      const apiKey = env.USDA_API_KEY || 'DEMO_KEY';
      const usdaUrl = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(q)}&pageSize=${pageSize}&pageNumber=${pageNumber}&api_key=${encodeURIComponent(apiKey)}`;
      const resp = await fetch(usdaUrl, { headers: { 'accept': 'application/json' } });
      if (!resp.ok) {
        const text = await resp.text();
        return jsonResponse({ error: 'USDA API error', detail: text }, 502);
      }
      const data = await resp.json();
      const foods = (data.foods || []).map(food => {
        const nutrients = {};
        (food.foodNutrients || []).forEach(n => {
          const name = (n.nutrientName || '').toLowerCase();
          const value = n.value || 0;
          if (name.includes('energy') || name.includes('calori')) nutrients.calories = value;
          else if (name.includes('protein')) nutrients.protein = value;
          else if (name.includes('carbohydrate')) nutrients.carbs = value;
          else if (name.includes('total lipid') || (name.includes('fat') && !name.includes('fatty'))) nutrients.fat = value;
          else if (name.includes('fiber')) nutrients.fiber = value;
          else if (name.includes('sodium')) nutrients.sodium = value;
        });
        return {
          fdcId: food.fdcId,
          description: food.description,
          brandOwner: food.brandOwner,
          servingSize: food.servingSize,
          servingSizeUnit: food.servingSizeUnit || 'g',
          calories: nutrients.calories || 0,
          protein: nutrients.protein || 0,
          carbs: nutrients.carbs || 0,
          fat: nutrients.fat || 0,
          fiber: nutrients.fiber || 0,
          sodium: nutrients.sodium || 0,
        };
      });
      const payload = { query: q, totalHits: data.totalHits || 0, currentPage: pageNumber, totalPages: data.totalPages || 0, foods };
      // Cache for 6 hours to control cost
      await env.FITTRACK_KV.put(cacheKey, JSON.stringify(payload), { expirationTtl: 21600 });
      const out = jsonResponse(payload);
      out.headers.set('X-Cache', 'MISS');
      return out;
    } catch (e) {
      console.error('USDA search error', e);
      return jsonResponse({ error: 'Failed to search USDA' }, 500);
    }
  }

  // ========================================================================
  // CLIENT MANAGEMENT
  // ========================================================================
  
  // Analytics summary
  if (path === '/api/analytics/summary' && method === 'GET') {
    const summary = await getAnalyticsSummary(env, trainerId);
    return jsonResponse(summary);
  }

  // Get all clients for this trainer
  if (path === '/api/clients' && method === 'GET') {
    try {
      const clients = await env.FITTRACK_D1.prepare(
        'SELECT id, name, email, created_at FROM clients WHERE trainer_id = ? ORDER BY created_at DESC'
      ).bind(trainerId).all();

      return jsonResponse({ clients: clients.results || [] });
    } catch (error) {
      console.error('Error fetching clients:', error);
      return jsonResponse({ error: 'Failed to fetch clients' }, 500);
    }
  }

  // Add new client (creates a user and links to clients)
  if (path === '/api/clients' && method === 'POST') {
    try {
      const { name, email, password } = await request.json();

      if (!name || !email || !password) {
        return jsonResponse({ error: 'Name, email, and password are required' }, 400);
      }

      if (password.length < 8) {
        return jsonResponse({ error: 'Password must be at least 8 characters' }, 400);
      }

      // Check if email already exists on users
      const existing = await env.FITTRACK_D1.prepare(
        'SELECT id FROM users WHERE email = ?'
      ).bind(email.toLowerCase()).first();

      if (existing) {
        return jsonResponse({ error: 'Email already registered' }, 409);
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user for client
      await env.FITTRACK_D1.prepare(
        "INSERT INTO users (email, password_hash, user_type) VALUES (?, ?, 'client')"
      ).bind(email.toLowerCase(), passwordHash).run();

      const user = await env.FITTRACK_D1.prepare(
        "SELECT id FROM users WHERE email = ? AND user_type = 'client'"
      ).bind(email.toLowerCase()).first();

      // Insert client row linked to trainer and user
      await env.FITTRACK_D1.prepare(
        'INSERT INTO clients (user_id, trainer_id, name, email) VALUES (?, ?, ?, ?)'
      ).bind(user.id, trainerId, name, email.toLowerCase()).run();

      return jsonResponse({ success: true, message: 'Client added successfully' });
    } catch (error) {
      console.error('Error adding client:', error);
      return jsonResponse({ error: 'Failed to add client' }, 500);
    }
  }

  // ========================================================================
  // MEASUREMENTS (full set)
  // ========================================================================
  if (path === '/api/measurements' && method === 'GET') {
    const clientId = url.searchParams.get('clientId');
    if (!clientId) return jsonResponse({ error: 'clientId is required' }, 400);
    const owns = await env.FITTRACK_D1.prepare('SELECT id FROM clients WHERE id = ? AND trainer_id = ?').bind(clientId, trainerId).first();
    if (!owns) return jsonResponse({ error: 'Not found' }, 404);
    const res = await env.FITTRACK_D1.prepare(
      `SELECT measurement_date, weight_kg, body_fat_pct, height_cm, neck_cm, chest_cm, waist_cm, hips_cm,
              bicep_cm, thigh_cm, calf_cm, resting_hr, bp_systolic, bp_diastolic, steps, notes
       FROM measurements WHERE client_id = ? ORDER BY measurement_date DESC, id DESC LIMIT 100`
    ).bind(clientId).all();
    const measurements = (res.results || []).map(m => ({
      measurement_date: m.measurement_date,
      weight_lbs: m.weight_kg != null ? m.weight_kg / 0.45359237 : null,
      body_fat_pct: m.body_fat_pct ?? null,
      height_in: m.height_cm != null ? m.height_cm / 2.54 : null,
      neck_in: m.neck_cm != null ? m.neck_cm / 2.54 : null,
      chest_in: m.chest_cm != null ? m.chest_cm / 2.54 : null,
      waist_in: m.waist_cm != null ? m.waist_cm / 2.54 : null,
      hips_in: m.hips_cm != null ? m.hips_cm / 2.54 : null,
      bicep_in: m.bicep_cm != null ? m.bicep_cm / 2.54 : null,
      thigh_in: m.thigh_cm != null ? m.thigh_cm / 2.54 : null,
      calf_in: m.calf_cm != null ? m.calf_cm / 2.54 : null,
      resting_hr: m.resting_hr ?? null,
      bp_systolic: m.bp_systolic ?? null,
      bp_diastolic: m.bp_diastolic ?? null,
      steps: m.steps ?? null,
      notes: m.notes ?? null
    }));
    return jsonResponse({ measurements });
  }

  // ========================================================================
  // SETTINGS
  // ========================================================================
  if (path === '/api/settings/profile' && method === 'PUT') {
    try {
      const { business_name } = await request.json();
      await env.FITTRACK_D1.prepare('UPDATE trainers SET business_name = ?, updated_at = strftime("%s","now") WHERE id = ?').bind(business_name || null, trainerId).run();
      return jsonResponse({ success: true });
    } catch (e) {
      console.error('Update settings error:', e);
      return jsonResponse({ error: 'Failed to save settings' }, 500);
    }
  }

  if (path === '/api/measurements' && method === 'POST') {
    try {
      const body = await request.json();
      const {
        clientId, measurement_date,
        weight_lbs, body_fat_pct,
        height_in, neck_in, chest_in, waist_in, hips_in, bicep_in, thigh_in, calf_in,
        resting_hr, bp_systolic, bp_diastolic, steps, notes
      } = body;
      
      console.log('Received measurement data:', body);
      
      if (!clientId) return jsonResponse({ error: 'clientId is required' }, 400);
      if (!weight_lbs || isNaN(parseFloat(weight_lbs))) {
        return jsonResponse({ error: 'Weight is required and must be a valid number' }, 400);
      }
      const owns = await env.FITTRACK_D1.prepare('SELECT id FROM clients WHERE id = ? AND trainer_id = ?').bind(clientId, trainerId).first();
      if (!owns) return jsonResponse({ error: 'Client not found' }, 404);

      const weight_kg = lbsToKg(parseFloat(weight_lbs));
      const height_cm = height_in && !isNaN(parseFloat(height_in)) ? inchesToCm(parseFloat(height_in)) : null;
      const neck_cm = neck_in && !isNaN(parseFloat(neck_in)) ? inchesToCm(parseFloat(neck_in)) : null;
      const chest_cm = chest_in && !isNaN(parseFloat(chest_in)) ? inchesToCm(parseFloat(chest_in)) : null;
      const waist_cm = waist_in && !isNaN(parseFloat(waist_in)) ? inchesToCm(parseFloat(waist_in)) : null;
      const hips_cm = hips_in && !isNaN(parseFloat(hips_in)) ? inchesToCm(parseFloat(hips_in)) : null;
      const bicep_cm = bicep_in && !isNaN(parseFloat(bicep_in)) ? inchesToCm(parseFloat(bicep_in)) : null;
      const thigh_cm = thigh_in && !isNaN(parseFloat(thigh_in)) ? inchesToCm(parseFloat(thigh_in)) : null;
      const calf_cm = calf_in && !isNaN(parseFloat(calf_in)) ? inchesToCm(parseFloat(calf_in)) : null;

      await env.FITTRACK_D1.prepare(
        `INSERT INTO measurements (
           client_id, measurement_date, weight_kg, body_fat_pct, height_cm, neck_cm, chest_cm, waist_cm, hips_cm,
           bicep_cm, thigh_cm, calf_cm, resting_hr, bp_systolic, bp_diastolic, steps, notes
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        clientId,
        measurement_date || new Date().toISOString().slice(0,10),
        weight_kg, 
        body_fat_pct && !isNaN(parseFloat(body_fat_pct)) ? parseFloat(body_fat_pct) : null,
        height_cm, neck_cm, chest_cm, waist_cm, hips_cm,
        bicep_cm, thigh_cm, calf_cm,
        resting_hr && !isNaN(parseInt(resting_hr)) ? parseInt(resting_hr) : null,
        bp_systolic && !isNaN(parseInt(bp_systolic)) ? parseInt(bp_systolic) : null,
        bp_diastolic && !isNaN(parseInt(bp_diastolic)) ? parseInt(bp_diastolic) : null,
        steps && !isNaN(parseInt(steps)) ? parseInt(steps) : null,
        notes ?? null
      ).run();
      return jsonResponse({ success: true });
    } catch (e) {
      console.error('Add measurement error:', e);
      console.error('Error stack:', e.stack);
      return jsonResponse({ error: 'Failed to save measurement: ' + e.message }, 500);
    }
  }

  // ========================================================================
  // FITNESS QUESTIONNAIRE
  // ========================================================================
  if (path === '/api/fitness/questions' && method === 'GET') {
    const rows = await env.FITTRACK_D1.prepare(
      'SELECT id, question_text, field_key, type, options_json, order_index, active FROM fitness_questions WHERE trainer_id = ? AND active = 1 ORDER BY order_index, id'
    ).bind(trainerId).all();
    return jsonResponse({ questions: rows.results || [] });
  }
  if (path === '/api/fitness/questions' && method === 'POST') {
    const { question_text, field_key, type, options, order_index, active } = await request.json();
    if (!question_text) return jsonResponse({ error: 'question_text required' }, 400);
    await env.FITTRACK_D1.prepare(
      'INSERT INTO fitness_questions (trainer_id, question_text, field_key, type, options_json, order_index, active) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(trainerId, question_text, field_key || null, type || 'text', options ? JSON.stringify(options) : null, order_index ?? 0, active ?? 1).run();
    return jsonResponse({ success: true });
  }
  if (path.startsWith('/api/fitness/questions/') && method === 'DELETE') {
    const qid = path.split('/')[4];
    await env.FITTRACK_D1.prepare('DELETE FROM fitness_questions WHERE id = ? AND trainer_id = ?').bind(qid, trainerId).run();
    return jsonResponse({ success: true });
  }
  if (path === '/api/fitness/answers' && method === 'POST') {
    const { clientId, answers } = await request.json();
    if (!clientId || !Array.isArray(answers)) return jsonResponse({ error: 'clientId and answers[] required' }, 400);
    const owns = await env.FITTRACK_D1.prepare('SELECT id FROM clients WHERE id = ? AND trainer_id = ?').bind(clientId, trainerId).first();
    if (!owns) return jsonResponse({ error: 'Not found' }, 404);
    const stmt = env.FITTRACK_D1.prepare('INSERT INTO client_questionnaire (client_id, question_id, answer_text) VALUES (?, ?, ?)');
    for (const a of answers) {
      if (!a || a.question_id == null) continue;
      await stmt.bind(clientId, a.question_id, String(a.answer ?? '')).run();
    }
    // Build simple profile summary
    const summary = { updated_at: new Date().toISOString(), total_answers: answers.length };
    await env.FITTRACK_D1.prepare('INSERT INTO client_profiles (client_id, summary_json, updated_at) VALUES (?, ?, strftime("%s","now")) ON CONFLICT(client_id) DO UPDATE SET summary_json = excluded.summary_json, updated_at = excluded.updated_at').bind(clientId, JSON.stringify(summary)).run();
    return jsonResponse({ success: true, profile: summary });
  }
  if (path === '/api/fitness/profile' && method === 'GET') {
    const clientId = url.searchParams.get('clientId');
    if (!clientId) return jsonResponse({ error: 'clientId is required' }, 400);
    const prof = await env.FITTRACK_D1.prepare('SELECT summary_json FROM client_profiles WHERE client_id = ?').bind(clientId).first();
    return jsonResponse({ profile: prof?.summary_json ? JSON.parse(prof.summary_json) : null });
  }

  // ========================================================================
  // QUESTS (basic)
  // ========================================================================
  if (path === '/api/quests' && method === 'GET') {
    const clientId = url.searchParams.get('clientId');
    if (!clientId) return jsonResponse({ error: 'clientId is required' }, 400);
    const owns = await env.FITTRACK_D1.prepare('SELECT id FROM clients WHERE id = ? AND trainer_id = ?').bind(clientId, trainerId).first();
    if (!owns) return jsonResponse({ error: 'Not found' }, 404);
    const rows = await env.FITTRACK_D1.prepare('SELECT * FROM quests WHERE client_id = ? AND trainer_id = ? ORDER BY is_active DESC, created_at DESC').bind(clientId, trainerId).all();
    const quests = (rows.results || []).map(q => ({ ...q, progress_percentage: computeQuestProgress(q) }));
    return jsonResponse({ quests });
  }
  if (path === '/api/quests' && method === 'POST') {
    const { client_id, title, description, quest_type, target_value, target_unit, difficulty, xp_reward, reward_achievement, reward_description, deadline_days } = await request.json();
    if (!client_id || !title) return jsonResponse({ error: 'client_id and title required' }, 400);
    const owns = await env.FITTRACK_D1.prepare('SELECT id FROM clients WHERE id = ? AND trainer_id = ?').bind(client_id, trainerId).first();
    if (!owns) return jsonResponse({ error: 'Not found' }, 404);
    const deadline = (deadline_days && !isNaN(deadline_days)) ? new Date(Date.now() + Number(deadline_days)*86400000).toISOString() : null;
    await env.FITTRACK_D1.prepare(
      'INSERT INTO quests (trainer_id, client_id, title, description, quest_type, target_value, current_value, target_unit, difficulty, xp_reward, reward_achievement, reward_description, deadline, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)'
    ).bind(trainerId, client_id, title, description || null, quest_type || null, target_value ?? null, null, target_unit || null, difficulty || 'medium', xp_reward ?? 0, reward_achievement || null, reward_description || null, deadline).run();
    return jsonResponse({ success: true });
  }
  if (path.startsWith('/api/quests/') && method === 'PATCH') {
    const qid = path.split('/')[3];
    const { current_value, is_active } = await request.json();
    const q = await env.FITTRACK_D1.prepare('SELECT * FROM quests WHERE id = ? AND trainer_id = ?').bind(qid, trainerId).first();
    if (!q) return jsonResponse({ error: 'Quest not found' }, 404);
    let completed_at = q.completed_at;
    let active = is_active ?? q.is_active;
    let cur = current_value ?? q.current_value;
    if (cur != null && q.target_value != null && Number(cur) >= Number(q.target_value)) {
      completed_at = new Date().toISOString();
      active = 0;
      // award achievement if specified
      if (q.reward_achievement) {
        await env.FITTRACK_D1.prepare('INSERT INTO achievements (client_id, name, description, icon, category) VALUES (?, ?, ?, ?, ?)')
          .bind(q.client_id, q.reward_achievement, q.reward_description || null, '🏆', 'quest').run();
      }
      // add milestone
      await env.FITTRACK_D1.prepare('INSERT INTO milestones (client_id, title, description, milestone_type, value, unit, icon) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(q.client_id, `Quest Complete: ${q.title}`, q.description || null, 'quest_completion', q.target_value, q.target_unit, '✨').run();
    }
    await env.FITTRACK_D1.prepare('UPDATE quests SET current_value = ?, is_active = ?, completed_at = ? WHERE id = ?')
      .bind(cur ?? null, active, completed_at ?? null, qid).run();
    return jsonResponse({ success: true });
  }
  if (path.startsWith('/api/quests/') && method === 'DELETE') {
    const qid = path.split('/')[3];
    await env.FITTRACK_D1.prepare('DELETE FROM quests WHERE id = ? AND trainer_id = ?').bind(qid, trainerId).run();
    return jsonResponse({ success: true });
  }
  if (path === '/api/quests/auto-check' && method === 'POST') {
    const { clientId } = await request.json();
    if (!clientId) return jsonResponse({ error: 'clientId required' }, 400);
    const owns = await env.FITTRACK_D1.prepare('SELECT id FROM clients WHERE id = ? AND trainer_id = ?').bind(clientId, trainerId).first();
    if (!owns) return jsonResponse({ error: 'Not found' }, 404);
    const ms = await autoCheckMilestones(env, clientId);
    return jsonResponse({ message: `Auto-check complete. Created ${ms.length} new milestones.`, milestones: ms });
  }

  // Get client details
  if (path.startsWith('/api/clients/') && method === 'GET') {
    try {
      const clientId = path.split('/')[3];
      
      const client = await env.FITTRACK_D1.prepare(
        'SELECT id, name, email, created_at FROM clients WHERE id = ? AND trainer_id = ?'
      ).bind(clientId, trainerId).first();

      if (!client) {
        return jsonResponse({ error: 'Client not found' }, 404);
      }

      return jsonResponse({ client });
    } catch (error) {
      console.error('Error fetching client:', error);
      return jsonResponse({ error: 'Failed to fetch client' }, 500);
    }
  }

  // ========================================================================
  // WORKOUTS
  // ========================================================================
  // List exercises
  if (path === '/api/exercises' && method === 'GET') {
    const category = url.searchParams.get('category');
    const search = url.searchParams.get('search');
    let query = 'SELECT * FROM exercises WHERE 1=1';
    const binds = [];
    if (category) { query += ' AND category = ?'; binds.push(category); }
    if (search) { query += ' AND name LIKE ?'; binds.push('%' + search + '%'); }
    query += ' ORDER BY name LIMIT 100';
    const res = await env.FITTRACK_D1.prepare(query).bind(...binds).all();
    return jsonResponse({ exercises: res.results || [] });
  }
  // Create exercise
  if (path === '/api/exercises' && method === 'POST') {
    const { name, description, category, equipment, difficulty, primary_muscles, secondary_muscles, instructions, video_url, thumbnail_url } = await request.json();
    if (!name) return jsonResponse({ error: 'name required' }, 400);
    const dup = await env.FITTRACK_D1.prepare('SELECT id FROM exercises WHERE name = ?').bind(name).first();
    if (dup) return jsonResponse({ error: 'Exercise already exists' }, 409);
    await env.FITTRACK_D1.prepare('INSERT INTO exercises (name, description, category, equipment, difficulty, primary_muscles, secondary_muscles, instructions, video_url, thumbnail_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(name, description || null, category || null, equipment || null, difficulty || 'intermediate', primary_muscles || null, secondary_muscles || null, instructions || null, video_url || null, thumbnail_url || null).run();
    return jsonResponse({ success: true });
  }
  // Update exercise
  if (path.startsWith('/api/exercises/') && method === 'PUT') {
    const eid = path.split('/')[3];
    const { name, description, category, equipment, difficulty, primary_muscles, secondary_muscles, instructions, video_url, thumbnail_url } = await request.json();
    await env.FITTRACK_D1.prepare('UPDATE exercises SET name = ?, description = ?, category = ?, equipment = ?, difficulty = ?, primary_muscles = ?, secondary_muscles = ?, instructions = ?, video_url = ?, thumbnail_url = ? WHERE id = ?').bind(name, description || null, category || null, equipment || null, difficulty || 'intermediate', primary_muscles || null, secondary_muscles || null, instructions || null, video_url || null, thumbnail_url || null, eid).run();
    return jsonResponse({ success: true });
  }
  // Delete exercise
  if (path.startsWith('/api/exercises/') && method === 'DELETE') {
    const eid = path.split('/')[3];
    const used = await env.FITTRACK_D1.prepare('SELECT id FROM setgroups WHERE exercise_id = ? LIMIT 1').bind(eid).first();
    if (used) return jsonResponse({ error: 'Exercise is used in workouts' }, 400);
    await env.FITTRACK_D1.prepare('DELETE FROM exercises WHERE id = ?').bind(eid).run();
    return jsonResponse({ success: true });
  }

  // List workouts
  if (path === '/api/workouts' && method === 'GET') {
    const clientId = url.searchParams.get('clientId');
    let query = 'SELECT * FROM workouts WHERE trainer_id = ?';
    const binds = [trainerId];
    if (clientId) { query += ' AND client_id = ?'; binds.push(clientId); }
    query += ' ORDER BY created_at DESC LIMIT 100';
    const res = await env.FITTRACK_D1.prepare(query).bind(...binds).all();
    return jsonResponse({ workouts: res.results || [] });
  }
  // Create workout with nested setgroups/sets
  if (path === '/api/workouts' && method === 'POST') {
     const { client_id, title, description, scheduled_at, setgroups, exercises_json, workout_type, duration_minutes } = await request.json();
    if (!client_id || !title) return jsonResponse({ error: 'client_id and title required' }, 400);
    const owns = await env.FITTRACK_D1.prepare('SELECT id FROM clients WHERE id = ? AND trainer_id = ?').bind(client_id, trainerId).first();
    if (!owns) return jsonResponse({ error: 'Client not found' }, 404);
     const r = await env.FITTRACK_D1.prepare('INSERT INTO workouts (client_id, trainer_id, title, description, scheduled_at, exercises_json, workout_type, duration_minutes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(client_id, trainerId, title, description || null, scheduled_at || null, exercises_json || null, workout_type || null, duration_minutes || null).run();
    const wid = r.meta && r.meta.last_row_id ? r.meta.last_row_id : null;
    if (!wid) return jsonResponse({ error: 'Failed to create workout' }, 500);
    if (setgroups && Array.isArray(setgroups)) {
      for (const sg of setgroups) {
        const sgr = await env.FITTRACK_D1.prepare('INSERT INTO setgroups (workout_id, exercise_id, order_index, rest_seconds, notes) VALUES (?, ?, ?, ?, ?)').bind(wid, sg.exercise_id, sg.order_index ?? 0, sg.rest_seconds ?? null, sg.notes || null).run();
        const sgid = sgr.meta && sgr.meta.last_row_id ? sgr.meta.last_row_id : null;
        if (sgid && sg.sets && Array.isArray(sg.sets)) {
          for (const s of sg.sets) {
            await env.FITTRACK_D1.prepare('INSERT INTO workout_sets (setgroup_id, set_number, reps, weight, duration_seconds, distance_meters, rpe, completed, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(sgid, s.set_number ?? 1, s.reps ?? null, s.weight ?? null, s.duration_seconds ?? null, s.distance_meters ?? null, s.rpe ?? null, s.completed ?? 0, s.notes || null).run();
          }
        }
      }
    }
    return jsonResponse({ success: true, workout_id: wid });
  }
  // Get workout details
  if (path.startsWith('/api/workouts/') && !path.includes('/complete') && method === 'GET') {
    const wid = path.split('/')[3];
    const w = await env.FITTRACK_D1.prepare('SELECT * FROM workouts WHERE id = ? AND trainer_id = ?').bind(wid, trainerId).first();
    if (!w) return jsonResponse({ error: 'Workout not found' }, 404);
    const sgs = await env.FITTRACK_D1.prepare('SELECT sg.*, e.name as exercise_name FROM setgroups sg JOIN exercises e ON e.id = sg.exercise_id WHERE sg.workout_id = ? ORDER BY sg.order_index').bind(wid).all();
    for (const sg of (sgs.results || [])) {
      const sets = await env.FITTRACK_D1.prepare('SELECT * FROM workout_sets WHERE setgroup_id = ? ORDER BY set_number').bind(sg.id).all();
      sg.sets = sets.results || [];
    }
    w.setgroups = sgs.results || [];
    return jsonResponse({ workout: w });
  }
  // Complete workout
  if (path.startsWith('/api/workouts/') && path.endsWith('/complete') && method === 'POST') {
    const wid = path.split('/')[3];
    const { duration_minutes } = await request.json();
    await env.FITTRACK_D1.prepare('UPDATE workouts SET completed_at = strftime("%s","now"), duration_minutes = ? WHERE id = ? AND trainer_id = ?').bind(duration_minutes ?? null, wid, trainerId).run();
    return jsonResponse({ success: true });
  }
  // Delete workout
  if (path.startsWith('/api/workouts/') && method === 'DELETE') {
    const wid = path.split('/')[3];
    await env.FITTRACK_D1.prepare('DELETE FROM workouts WHERE id = ? AND trainer_id = ?').bind(wid, trainerId).run();
    return jsonResponse({ success: true });
  }

  // ========================================================================
  // NUTRITION
  // ========================================================================
  if (path === '/api/meal-plans' && method === 'GET') {
    const clientId = url.searchParams.get('clientId');
    let query = 'SELECT * FROM meal_plans WHERE trainer_id = ?';
    const binds = [trainerId];
    if (clientId) { query += ' AND client_id = ?'; binds.push(clientId); }
    query += ' ORDER BY created_at DESC LIMIT 100';
    const res = await env.FITTRACK_D1.prepare(query).bind(...binds).all();
    return jsonResponse({ meal_plans: res.results || [] });
  }
  if (path === '/api/meal-plans' && method === 'POST') {
      const { client_id, name, description, meals, total_calories, total_protein, total_carbs, total_fat } = await request.json();
    if (!name) return jsonResponse({ error: 'name required' }, 400);
    const mealsJson = meals ? JSON.stringify(meals) : null;
    
      await env.FITTRACK_D1.prepare(
        'INSERT INTO meal_plans (trainer_id, client_id, name, description, meals_json, total_calories, total_protein, total_carbs, total_fat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        trainerId, 
        client_id ?? null, 
        name, 
        description || null, 
        mealsJson,
        total_calories || null,
        total_protein || null,
        total_carbs || null,
        total_fat || null
      ).run();
    
    return jsonResponse({ success: true });
  }
  if (path.startsWith('/api/meal-plans/') && method === 'DELETE') {
    const mid = path.split('/')[3];
    await env.FITTRACK_D1.prepare('DELETE FROM meal_plans WHERE id = ? AND trainer_id = ?').bind(mid, trainerId).run();
    return jsonResponse({ success: true });
  }

  // ========================================================================
  // PHOTOS
  // ========================================================================
  if (path === '/api/photos' && method === 'GET') {
    const clientId = url.searchParams.get('clientId');
    if (!clientId) return jsonResponse({ error: 'clientId required' }, 400);
    const owns = await env.FITTRACK_D1.prepare('SELECT id FROM clients WHERE id = ? AND trainer_id = ?').bind(clientId, trainerId).first();
    if (!owns) return jsonResponse({ error: 'Not found' }, 404);
    const res = await env.FITTRACK_D1.prepare('SELECT id, photo_url, thumbnail_url, note, taken_at, created_at FROM progress_photos WHERE client_id = ? ORDER BY taken_at DESC, created_at DESC LIMIT 100').bind(clientId).all();
    return jsonResponse({ photos: res.results || [] });
  }
  if (path === '/api/photos' && method === 'POST') {
    const { clientId, photo_url, thumbnail_url, note, taken_at } = await request.json();
    if (!clientId || !photo_url) return jsonResponse({ error: 'clientId and photo_url required' }, 400);
    const owns = await env.FITTRACK_D1.prepare('SELECT id FROM clients WHERE id = ? AND trainer_id = ?').bind(clientId, trainerId).first();
    if (!owns) return jsonResponse({ error: 'Not found' }, 404);
    await env.FITTRACK_D1.prepare('INSERT INTO progress_photos (client_id, photo_url, thumbnail_url, note, taken_at) VALUES (?, ?, ?, ?, ?)').bind(clientId, photo_url, thumbnail_url || null, note || null, taken_at || new Date().toISOString()).run();
    return jsonResponse({ success: true });
  }
  if (path === '/api/photos/upload' && method === 'POST') {
    try {
      const form = await request.formData();
      const file = form.get('file');
      const clientId = form.get('clientId');
      const note = form.get('note');
      if (!file || !clientId) return jsonResponse({ error: 'file and clientId required' }, 400);
      // Enforce upload size limit to avoid R2 overage
      const maxMb = getEnvInt(env.MAX_UPLOAD_MB, 5);
      const maxBytes = maxMb * 1024 * 1024;
      if (typeof file.size === 'number' && file.size > maxBytes) {
        const r = jsonResponse({ error: `File too large. Max ${maxMb} MB` }, 413);
        r.headers.set('Retry-After', '60');
        return r;
      }
      const owns = await env.FITTRACK_D1.prepare('SELECT id FROM clients WHERE id = ? AND trainer_id = ?').bind(clientId, trainerId).first();
      if (!owns) return jsonResponse({ error: 'Not found' }, 404);
      const filename = `photos/${clientId}/${Date.now()}_${file.name}`;
      await env.R2_UPLOADS.put(filename, file.stream(), { httpMetadata: { contentType: file.type } });
      const photo_url = `/uploads/${filename}`;
      await env.FITTRACK_D1.prepare('INSERT INTO progress_photos (client_id, photo_url, note) VALUES (?, ?, ?)').bind(clientId, photo_url, note || null).run();
      return jsonResponse({ success: true, photo_url });
    } catch(e) {
      console.error('Photo upload error:', e);
      return jsonResponse({ error: 'Upload failed' }, 500);
    }
  }

  // Default 404
  return jsonResponse({ error: 'Endpoint not found' }, 404);
}

// ============================================================================
// ANALYTICS SUMMARY
// ============================================================================
async function getAnalyticsSummary(env, trainerId) {
  try {
    const clients = await env.FITTRACK_D1.prepare(
      'SELECT COUNT(*) as c FROM clients WHERE trainer_id = ?'
    ).bind(trainerId).first();

    const quests = await env.FITTRACK_D1.prepare(
      'SELECT COUNT(*) as c FROM quests WHERE trainer_id = ? AND is_active = 1'
    ).bind(trainerId).first();

    const completedQuests = await env.FITTRACK_D1.prepare(
      'SELECT COUNT(*) as c FROM quests WHERE trainer_id = ? AND completed_at IS NOT NULL'
    ).bind(trainerId).first();

    const measurements = await env.FITTRACK_D1.prepare(
      'SELECT COUNT(*) as c FROM measurements WHERE client_id IN (SELECT id FROM clients WHERE trainer_id = ?)'
    ).bind(trainerId).first();

    const mealPlansTable = await env.FITTRACK_D1.prepare(
      "SELECT name FROM sqlite_schema WHERE type='table' AND name='meal_plans'"
    ).first();
    let mealPlans = { c: 0 };
    if (mealPlansTable) {
      mealPlans = await env.FITTRACK_D1.prepare(
        'SELECT COUNT(*) as c FROM meal_plans WHERE trainer_id = ?'
      ).bind(trainerId).first();
    }

    return {
      clients: clients?.c || 0,
      quests: quests?.c || 0,
      completed_quests: completedQuests?.c || 0,
      measurements: measurements?.c || 0,
      meal_plans: mealPlans?.c || 0
    };
  } catch (e) {
    console.error('Analytics summary error:', e);
    return { clients: 0, quests: 0, completed_quests: 0, measurements: 0, meal_plans: 0 };
  }
}

// ============================================================================
// UI RENDERING
// ============================================================================

function renderTrainerPortal(trainer) {
  const trainerId = trainer?.id || 1;
  const trainerName = trainer?.name || 'Trainer';
  const trainerEmail = trainer?.email || '';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trainer Portal - ${trainerName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
  <style>
    :root {
      --bg: #000000;
      --panel: #0d0d0d;
      --panel-dark: #0a0a0a;
      --text: #e0e0e0;
      --heading: #ffffff;
      --muted: #9e9e9e;
      --green: #00ff41;
      --green-alt: #39ff14;
      --purple: #b026ff;
      --purple-alt: #9d4edd;
      --success: #00ff41;
      --error: #ff4444;
      --border: #1a1a1a;
      --glow-green: 0 0 12px rgba(0,255,65,0.5), 0 0 28px rgba(0,255,65,0.3);
      --glow-purple: 0 0 12px rgba(176,38,255,0.5), 0 0 28px rgba(176,38,255,0.3);
      --shadow: 0 10px 30px rgba(0,0,0,0.8);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      background: #000000;
      border-bottom: 2px solid var(--green);
      box-shadow: 0 0 20px rgba(0,255,65,0.3);
      position: sticky;
      top: 0;
      z-index: 100;
      flex-wrap: wrap;
      gap: 10px;
    }
    .header-left { display: flex; align-items: center; gap: 10px; }
    .title { font-weight: 800; font-size: 1.2rem; color: var(--heading); text-shadow: 0 0 10px rgba(0,255,65,0.5); letter-spacing: 0.4px; }
    .grad { color: var(--green); }
    .subtitle { font-size: 0.85rem; color: var(--muted); }
    .tabs {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      padding: 16px 20px;
      background: var(--panel-dark);
      border-bottom: 2px solid var(--border);
    }
    .tab {
      background: transparent;
      border: 2px solid transparent;
      color: var(--muted);
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }
    .tab:hover { 
      background: #1a1a1a; 
      color: var(--heading); 
      border-color: var(--green); 
      box-shadow: var(--glow-green);
    }
    .tab.active {
      background: var(--purple);
      color: #ffffff;
      border-color: var(--purple);
    .content { display: none; }
    .content.active { display: block; }
    .card {
      background: var(--panel);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 20px;
      border: 2px solid var(--border);
      box-shadow: var(--shadow);
    }
    .card h2 {
      font-size: 1.5rem;
      margin-bottom: 16px;
      color: var(--heading);
      text-shadow: 0 0 10px rgba(0,255,65,0.3);
    }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
    .stat-card {
      background: var(--panel-dark);
      border-radius: 12px;
      padding: 20px;
      border: 2px solid var(--border);
      transition: all 0.3s;
    }
    .stat-card:hover {
      border-color: var(--green);
      box-shadow: var(--glow-green), var(--shadow);
    }
    .stat-value {
      font-size: 2.5rem;
      font-weight: 800;
      color: var(--green);
      text-shadow: 0 0 15px rgba(0,255,65,0.4);
    }
    .stat-label { color: var(--muted); margin-top: 4px; }
    input, select, textarea {
      width: 100%;
      background: #000000;
      color: var(--text);
      border: 2px solid var(--border);
      border-radius: 8px;
      padding: 10px;
      font-size: 1rem;
      margin-bottom: 12px;
      caret-color: var(--purple);
      transition: all 0.2s;
    }
    input:focus, select:focus, textarea:focus { 
      outline: none; 
      border-color: var(--green); 
      box-shadow: 0 0 0 3px rgba(0,255,65,0.25), 0 0 20px rgba(0,255,65,0.5);
    }
    .btn {
      background: #2a2a2a;
      border: 2px solid var(--green);
      color: var(--heading);
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.25s;
      font-size: 0.95rem;
      box-shadow: 0 0 10px rgba(0,255,65,0.2);
    }
    .btn:hover { 
      background: var(--green);
      color: #000000;
      box-shadow: 0 0 25px rgba(0,255,65,0.6), 0 0 40px rgba(0,255,65,0.3);
      transform: translateY(-2px);
    }
    .btn:active {
      background: var(--purple);
      color: #ffffff;
      border-color: var(--purple);
      box-shadow: 0 0 25px rgba(176,38,255,0.6), 0 0 40px rgba(176,38,255,0.3);
      transform: translateY(0);
    }
    .btn-secondary {
      background: var(--panel-dark);
      color: var(--text);
      border: 2px solid var(--border);
      box-shadow: none;
    }
    .btn-secondary:hover {
      background: #1a1a1a;
      border-color: var(--green);
      color: var(--heading);
      box-shadow: var(--glow-green);
    }
    .btn-danger {
      background: #2a0a0a;
      border-color: var(--error);
      color: var(--error);
      box-shadow: 0 0 10px rgba(255,68,68,0.2);
    }
    .btn-danger:hover {
      background: var(--error);
      color: #ffffff;
      box-shadow: 0 0 25px rgba(255,68,68,0.6);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    th {
      background: var(--panel-dark);
      font-weight: 700;
      color: var(--brand2);
    }
    tr:hover { background: var(--panel-dark); }
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.7);
      z-index: 1000;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .modal.active { display: flex; }
    .modal-content {
      background: var(--panel);
      border-radius: 16px;
      padding: 30px;
      max-width: 600px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      border: 1px solid var(--border);
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .close-btn {
      background: none;
      border: none;
      color: var(--muted);
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
    }
    .close-btn:hover { color: var(--text); }
    .toast {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: var(--success);
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      display: none;
      z-index: 2000;
    }
    .toast.show { display: block; animation: slideIn 0.3s; }
    @keyframes slideIn {
      from { transform: translateX(400px); }
      to { transform: translateX(0); }
    }
    .form-group { margin-bottom: 16px; }
    .form-label {
      display: block;
      color: var(--muted);
      margin-bottom: 6px;
      font-size: 0.9rem;
      font-weight: 600;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .badge-active { background: var(--success); color: white; }
    .badge-inactive { background: var(--muted); color: var(--bg); }
    @media (max-width: 768px) {
      .grid { grid-template-columns: 1fr; }
      .tabs { overflow-x: auto; flex-wrap: nowrap; }
      header { flex-direction: column; align-items: flex-start; }
    }
  </style>
</head>
<body>
  <header>
    <div class="header-left">
      <div>
        <div class="title"><span class="grad">FitTrack Pro</span></div>
        <div class="subtitle">Trainer Portal - ${trainerName}</div>
      </div>
    </div>
    <button class="btn btn-secondary" onclick="logout()">Log Out</button>
  </header>

  <div class="tabs">
    <button class="tab active" onclick="showTab('dashboard')">📊 Dashboard</button>
    <button class="tab" onclick="showTab('clients')">👥 Clients</button>
    <button class="tab" onclick="showTab('quests')">🎯 Quests</button>
    <button class="tab" onclick="showTab('measurements')">📏 Measurements</button>
    <button class="tab" onclick="showTab('nutrition')">🍎 Nutrition</button>
    <button class="tab" onclick="showTab('workouts')">💪 Workouts</button>
    <button class="tab" onclick="showTab('analytics')">📈 Analytics</button>
    <button class="tab" onclick="showTab('settings')">⚙️ Settings</button>
  </div>

  <!-- Global Client Selector -->
  <div class="container" style="padding: 12px 24px; background: var(--bg-secondary); border-bottom: 1px solid var(--border);">
    <div style="display: flex; align-items: center; gap: 12px;">
      <label style="font-weight: 600; color: var(--text);">Current Client:</label>
      <select id="global-client" onchange="onGlobalClientChange()" style="flex: 1; max-width: 400px; padding: 8px 12px; background: var(--bg); color: var(--text); border: 1px solid var(--border); border-radius: 6px;">
        <option value="">Select a client to get started...</option>
      </select>
      <span id="client-indicator" style="color: var(--muted); font-size: 0.9rem;"></span>
    </div>
  </div>

  <div class="container">
    <!-- Dashboard Tab -->
    <div id="dashboard" class="content active">
      <div class="grid">
        <div class="stat-card">
          <div class="stat-value" id="stat-clients">0</div>
          <div class="stat-label">Active Clients</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" id="stat-quests">0</div>
          <div class="stat-label">Active Quests</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" id="stat-plans">0</div>
          <div class="stat-label">Meal Plans</div>
        </div>
      </div>
      
      <div class="card">
        <h2>Recent Activity</h2>
        <div id="recent-activity">
          <p style="color: var(--muted);">Loading activity...</p>
        </div>
      </div>
    </div>

    <!-- Clients Tab -->
    <div id="clients" class="content">
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="margin: 0;">Client Management</h2>
          <button class="btn" onclick="openAddClientModal()">+ Add Client</button>
        </div>
        <table id="clients-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="clients-list">
            <tr><td colspan="5" style="text-align: center; color: var(--muted);">Loading clients...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Quests Tab -->
    <div id="quests" class="content">
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="margin: 0;">Quest System</h2>
          <button class="btn" onclick="openAssignQuestModal()">🎯 Assign Quest</button>
        </div>
        <div style="margin-bottom: 16px;">
          <label class="form-label">Select Client:</label>
          <select id="quests-client" onchange="loadQuests()" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #374151; background: #1f2937; color: white;">
            <option value="">Select a client...</option>
          </select>
        </div>
        <div style="margin-bottom: 12px; text-align:right;">
          <button class="btn" onclick="runAutoCheck()">✅ Run Auto-Check</button>
        </div>
        
        <!-- Quest Assignment Section -->
        <div style="margin-bottom: 24px; padding: 16px; background: #2f3550; border-radius: 8px;">
          <h3 style="margin-top: 0;">Quick Quest Assignment</h3>
          <div style="display: grid; gap: 12px;">
            <div>
              <label class="form-label">Select Quest Template:</label>
              <select id="quest-template" onchange="fillQuestTemplate()" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #374151; background: #1f2937; color: white;">
                <option value="">Custom Quest...</option>
                <option value="weight_loss_10">Weight Loss - 10 lbs</option>
                <option value="weight_loss_20">Weight Loss - 20 lbs</option>
                <option value="muscle_gain">Muscle Gain - 5 lbs</option>
                <option value="strength_squat">Strength - Squat 200 lbs</option>
                <option value="strength_bench">Strength - Bench Press 150 lbs</option>
                <option value="cardio_30">Cardio - 30 min daily</option>
                <option value="steps_10k">Daily Steps - 10,000</option>
                <option value="water_8">Water Intake - 8 glasses/day</option>
                <option value="protein">Protein Goal - 150g/day</option>
              </select>
            </div>
            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 12px;">
              <div>
                <label class="form-label">Quest Title:</label>
                <input type="text" id="quest-title-quick" placeholder="e.g., Lose 10 lbs" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #374151; background: #1f2937; color: white;">
              </div>
              <div>
                <label class="form-label">Target Value:</label>
                <input type="number" id="quest-target-quick" placeholder="10" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #374151; background: #1f2937; color: white;">
              </div>
              <div>
                <label class="form-label">Unit:</label>
                <input type="text" id="quest-unit-quick" placeholder="lbs" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #374151; background: #1f2937; color: white;">
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
              <div>
                <label class="form-label">Difficulty:</label>
                <select id="quest-difficulty-quick" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #374151; background: #1f2937; color: white;">
                  <option value="easy">Easy</option>
                  <option value="medium" selected>Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label class="form-label">XP Reward:</label>
                <input type="number" id="quest-xp-quick" value="100" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #374151; background: #1f2937; color: white;">
              </div>
              <div>
                <label class="form-label">Type:</label>
                <select id="quest-type-quick" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #374151; background: #1f2937; color: white;">
                  <option value="weight_loss">Weight Loss</option>
                  <option value="strength">Strength</option>
                  <option value="endurance">Endurance</option>
                  <option value="nutrition">Nutrition</option>
                </select>
              </div>
            </div>
            <button class="btn" onclick="assignQuestQuick()" style="margin-top: 8px;">🎯 Assign Quest</button>
          </div>
        </div>
        
        <h3>Active Quests</h3>
        <div id="quests-list">
          <p style="color: var(--muted);">Select a client to view quests</p>
        </div>
      </div>
    </div>

    <!-- Measurements Tab -->
    <div id="measurements" class="content">
      <div class="card">
        <h2>Client Measurements</h2>
        <select id="measurement-client" onchange="loadMeasurements()">
          <option value="">Select a client...</option>
        </select>
        <div class="grid" style="margin-top: 12px;">
          <div class="card">
            <h3 style="margin-bottom:10px;">Add Measurement (Imperial)</h3>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
              <div class="form-group"><label class="form-label">Weight (lbs) *</label><input type="number" id="m-weight-lbs" placeholder="180" step="0.1" required /></div>
              <div class="form-group"><label class="form-label">Body Fat %</label><input type="number" id="m-body-fat" placeholder="20" step="0.1" /></div>
              <div class="form-group"><label class="form-label">Height Feet</label><input type="number" id="m-height-ft" placeholder="5" min="0" max="8" /></div>
              <div class="form-group"><label class="form-label">Height Inches</label><input type="number" id="m-height-in" placeholder="10" min="0" max="11" step="0.1" /></div>
              <div class="form-group"><label class="form-label">Neck (in)</label><input type="number" id="m-neck-in" placeholder="15" step="0.1" /></div>
              <div class="form-group"><label class="form-label">Chest (in)</label><input type="number" id="m-chest-in" placeholder="40" step="0.1" /></div>
              <div class="form-group"><label class="form-label">Waist (in)</label><input type="number" id="m-waist-in" placeholder="34" step="0.1" /></div>
              <div class="form-group"><label class="form-label">Hips (in)</label><input type="number" id="m-hips-in" placeholder="38" step="0.1" /></div>
              <div class="form-group"><label class="form-label">Bicep (in)</label><input type="number" id="m-bicep-in" placeholder="14" step="0.1" /></div>
              <div class="form-group"><label class="form-label">Thigh (in)</label><input type="number" id="m-thigh-in" placeholder="22" step="0.1" /></div>
              <div class="form-group"><label class="form-label">Calf (in)</label><input type="number" id="m-calf-in" placeholder="15" step="0.1" /></div>
              <div class="form-group"><label class="form-label">Resting HR</label><input type="number" id="m-hr" placeholder="70" /></div>
              <div class="form-group"><label class="form-label">BP Systolic</label><input type="number" id="m-bp-sys" placeholder="120" /></div>
              <div class="form-group"><label class="form-label">BP Diastolic</label><input type="number" id="m-bp-dia" placeholder="80" /></div>
              <div class="form-group"><label class="form-label">Daily Steps</label><input type="number" id="m-steps" placeholder="10000" /></div>
            </div>
            <div class="form-group"><label class="form-label">Notes</label><textarea id="m-notes" placeholder="Optional notes..." rows="2"></textarea></div>
            <button class="btn" onclick="addMeasurement()">Save Measurement</button>
          </div>
          <div class="card">
            <h3 style="margin-bottom:10px;">Recent Measurements</h3>
            <div id="measurements-list" style="margin-top: 10px;">
              <p style="color: var(--muted);">Select a client to view measurements</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Nutrition Tab -->
    <div id="nutrition" class="content">
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="margin: 0;">Meal Plans</h2>
          <button class="btn" onclick="openCreateMealPlanModal()">+ Create Meal Plan</button>
        </div>
        <div style="margin-bottom: 16px;">
          <label class="form-label">Select Client (optional - leave blank for all):</label>
          <select id="nutrition-client" onchange="loadMealPlans()" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #374151; background: #1f2937; color: white;">
            <option value="">All clients</option>
          </select>
        </div>
        
        <!-- Search and Filter -->
        <div style="margin-bottom: 16px; display: flex; gap: 12px;">
          <input type="text" id="meal-search" placeholder="Search meal plans by name or description..." onkeyup="filterMealPlans()" style="flex: 1; padding: 8px; border-radius: 4px; border: 1px solid #374151; background: #1f2937; color: white;">
          <select id="meal-filter-calories" onchange="filterMealPlans()" style="padding: 8px; border-radius: 4px; border: 1px solid #374151; background: #1f2937; color: white;">
            <option value="">All Calories</option>
            <option value="low">Low (<1500 cal)</option>
            <option value="medium">Medium (1500-2500 cal)</option>
            <option value="high">High (>2500 cal)</option>
          </select>
        </div>

        <!-- USDA Food Search & Builder -->
        <div class="card" style="background:#2a2f42; margin-bottom:16px;">
          <h3 style="margin-bottom:10px;">USDA Food Search</h3>
          <div style="display:flex; gap:8px; margin-bottom:8px;">
            <input id="usda-food-search" type="text" placeholder="e.g., chicken breast, brown rice" style="flex:1;" />
            <button class="btn" onclick="usdaSearch()">Search</button>
          </div>
          <div style="display:grid; grid-template-columns: 2fr 1fr; gap:16px;">
            <div>
              <div id="usda-results" style="max-height:240px; overflow:auto; border:1px solid var(--border); border-radius:8px; padding:8px;">
                <div class="muted">Search results will appear here.</div>
              </div>
            </div>
            <div>
              <h4 style="margin:6px 0;">Selected Items</h4>
              <div id="usda-selected" style="max-height:160px; overflow:auto; border:1px solid var(--border); border-radius:8px; padding:8px;"></div>
              <div id="usda-totals" style="margin-top:8px; color:var(--muted);"></div>
              <button class="btn" style="margin-top:10px; width:100%;" onclick="saveSelectionAsMealPlan()">Save as Meal Plan</button>
            </div>
          </div>
        </div>
        
        <div id="meal-plans-list">
          <p style="color: var(--muted);">Loading meal plans...</p>
        </div>
      </div>
    </div>

    <!-- Workouts Tab -->
    <div id="workouts" class="content">
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="margin: 0;">Workout Plans</h2>
          <button class="btn" onclick="openCreateWorkoutModal()">+ Create Workout</button>
        </div>
        <div style="margin-bottom: 16px;">
          <label class="form-label">Select Client (optional - leave blank for all):</label>
          <select id="workouts-client" onchange="loadWorkouts()" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #374151; background: #1f2937; color: white;">
            <option value="">All clients</option>
          </select>
        </div>
        
        <!-- Search and Filter -->
        <div style="margin-bottom: 16px; display: flex; gap: 12px;">
          <input type="text" id="workout-search" placeholder="Search workouts by title or exercises..." onkeyup="filterWorkouts()" style="flex: 1; padding: 8px; border-radius: 4px; border: 1px solid #374151; background: #1f2937; color: white;">
          <select id="workout-filter-type" onchange="filterWorkouts()" style="padding: 8px; border-radius: 4px; border: 1px solid #374151; background: #1f2937; color: white;">
            <option value="">All Types</option>
            <option value="strength">Strength</option>
            <option value="cardio">Cardio</option>
            <option value="hiit">HIIT</option>
            <option value="flexibility">Flexibility</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>
        
        <div id="workout-plans-list">
          <p style="color: var(--muted);">Loading workout plans...</p>
        </div>
      </div>
    </div>

    <!-- Analytics Tab -->
    <div id="analytics" class="content">
      <div class="card">
        <h2>Performance Analytics</h2>
        <div id="analytics-summary" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-top:20px;">
          <div style="background:#2f3550; padding:20px; border-radius:8px; text-align:center;">
            <div style="font-size:2rem; font-weight:bold; color:var(--brand1);" id="stat-total-clients">-</div>
            <div style="color:var(--muted); margin-top:8px;">Total Clients</div>
          </div>
          <div style="background:#2f3550; padding:20px; border-radius:8px; text-align:center;">
            <div style="font-size:2rem; font-weight:bold; color:var(--brand2);" id="stat-active-quests">-</div>
            <div style="color:var(--muted); margin-top:8px;">Active Quests</div>
          </div>
          <div style="background:#2f3550; padding:20px; border-radius:8px; text-align:center;">
            <div style="font-size:2rem; font-weight:bold; color:#4ade80;" id="stat-completed-quests">-</div>
            <div style="color:var(--muted); margin-top:8px;">Completed Quests</div>
          </div>
          <div style="background:#2f3550; padding:20px; border-radius:8px; text-align:center;">
            <div style="font-size:2rem; font-weight:bold; color:#fbbf24;" id="stat-total-measurements">-</div>
            <div style="color:var(--muted); margin-top:8px;">Total Measurements</div>
          </div>
        </div>
        <div style="margin-top:30px;">
          <h3>Recent Activity</h3>
          <div id="recent-activity" style="margin-top:16px;">
            <p style="color:var(--muted);">Loading activity...</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Settings Tab -->
    <div id="settings" class="content">
      <div class="card">
        <h2>Profile Settings</h2>
        <div class="form-group">
          <label class="form-label">Name</label>
          <input type="text" id="settings-name" value="${trainerName}" />
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" id="settings-email" value="${trainerEmail}" readonly />
        </div>
        <div class="form-group">
          <label class="form-label">Business Name</label>
          <input type="text" id="settings-business" value="${trainer.business_name || ''}" />
        </div>
        <button class="btn" onclick="saveSettings()">Save Changes</button>
      </div>
    </div>
  </div>

  <!-- Add Client Modal -->
  <div id="add-client-modal" class="modal">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Add New Client</h2>
        <button class="close-btn" onclick="closeModal('add-client-modal')">&times;</button>
      </div>
      <div class="form-group">
        <label class="form-label">Name</label>
        <input type="text" id="new-client-name" placeholder="Client's full name" />
      </div>
      <div class="form-group">
        <label class="form-label">Email</label>
        <input type="email" id="new-client-email" placeholder="client@example.com" />
      </div>
      <div class="form-group">
        <label class="form-label">Temporary Password</label>
        <input type="password" id="new-client-password" placeholder="Min 8 characters" />
      </div>
      <button class="btn" onclick="addClient()" style="width: 100%; margin-top: 10px;">Add Client</button>
    </div>
  </div>

  <!-- Toast Notification -->
  <div id="toast" class="toast"></div>

  <!-- Client Profile Modal -->
  <div id="client-profile-modal" class="modal">
    <div class="modal-content" style="max-width: 900px;">
      <div class="modal-header">
        <h2>Client Profile</h2>
        <button class="close-btn" onclick="closeModal('client-profile-modal')">&times;</button>
      </div>
      <div id="client-profile-content">
        <div class="grid">
          <div class="card" style="text-align:center;">
            <div id="avatarContainer" style="width: 100%; display:flex; justify-content:center;">
              <div id="lottieAvatar" style="width: 260px; height: 260px; border-radius: 50%; border: 6px solid #2f3550; box-shadow: 0 0 20px rgba(0,0,0,0.4);"></div>
            </div>
            <div id="avatarChips" style="margin-top: 10px; color: var(--muted);"></div>
          </div>
          <div class="card">
            <h3>Latest Measurements</h3>
            <div id="client-latest-measurements" style="margin-top:10px; color: var(--muted);"></div>
          </div>
        </div>
        <div class="card">
          <h3>Quests & Milestones</h3>
          <div id="client-quests" style="margin-top:10px; color: var(--muted);"></div>
        </div>
      </div>
    </div>
  </div>

  <script>
    const trainerId = ${trainerId};
    let usdaSelected = [];

    // Tab Navigation
    function showTab(tabName) {
      document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.getElementById(tabName).classList.add('active');
      event.target.classList.add('active');
      
      // Sync global selector with tab dropdowns
      const globalSel = document.getElementById('global-client');
      const globalClientId = globalSel ? globalSel.value : '';
      
      // Load data when switching tabs
      if (tabName === 'clients') loadClients();
      if (tabName === 'measurements') {
        populateMeasurementClients();
        if (globalClientId) {
          setTimeout(function() {
            const measurementSel = document.getElementById('measurement-client');
            if (measurementSel) {
              measurementSel.value = globalClientId;
              loadMeasurements();
            }
          }, 100);
        }
      }
      if (tabName === 'quests') {
        populateMeasurementClients();
        if (globalClientId) {
          setTimeout(function() {
            const questsSel = document.getElementById('quests-client');
            if (questsSel) {
              questsSel.value = globalClientId;
              loadQuests();
            }
          }, 100);
        } else {
          loadQuests();
        }
      }
      if (tabName === 'nutrition') {
        populateMeasurementClients();
        if (globalClientId) {
          setTimeout(function() {
            const nutritionSel = document.getElementById('nutrition-client');
            if (nutritionSel) {
              nutritionSel.value = globalClientId;
              loadMealPlans();
            }
          }, 100);
        } else {
          loadMealPlans();
        }
      }
      if (tabName === 'workouts') {
        populateMeasurementClients();
        if (globalClientId) {
          setTimeout(function() {
            const workoutsSel = document.getElementById('workouts-client');
            if (workoutsSel) {
              workoutsSel.value = globalClientId;
              loadWorkouts();
            }
          }, 100);
        } else {
          loadWorkouts();
        }
      }
      if (tabName === 'analytics') loadAnalytics();
    }

    // Logout
    async function logout() {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    }

    // Toast notifications
    function showToast(message) {
      const toast = document.getElementById('toast');
      toast.textContent = message;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // Populate client dropdowns for all tabs
    async function populateMeasurementClients() {
      console.log('populateMeasurementClients called');
      try {
        const r = await fetch('/api/clients');
        let d = {};
        try { d = await r.json(); } catch (e) { d = {}; }
        console.log('Clients response:', d);
        const hasClients = r.ok && d.clients && Array.isArray(d.clients) && d.clients.length > 0;
        const options = hasClients ? d.clients.map(function(c){ return '<option value="'+c.id+'">'+c.name+' ('+(c.email||'no-email')+')</option>'; }).join('') : '';

        // Populate global client selector
        const globalSel = document.getElementById('global-client');
        if (globalSel) {
          const currentValue = globalSel.value;
          globalSel.innerHTML = '<option value="">'+(hasClients ? 'Select a client to get started...' : 'No clients found')+'</option>' + options;
          if (currentValue) globalSel.value = currentValue;
          globalSel.disabled = !hasClients;
        }

        // Populate all tab-specific client dropdowns
        const measurementSel = document.getElementById('measurement-client');
        if (measurementSel) {
          measurementSel.innerHTML = '<option value="">'+(hasClients ? 'Select a client...' : 'No clients found')+'</option>' + options;
          measurementSel.disabled = !hasClients;
        }
        const questsSel = document.getElementById('quests-client');
        if (questsSel) {
          questsSel.innerHTML = '<option value="">'+(hasClients ? 'Select a client...' : 'No clients found')+'</option>' + options;
          questsSel.disabled = !hasClients;
        }
        const nutritionSel = document.getElementById('nutrition-client');
        if (nutritionSel) {
          nutritionSel.innerHTML = '<option value="">'+(hasClients ? 'All clients' : 'No clients found')+'</option>' + options;
          nutritionSel.disabled = !hasClients;
        }
        const workoutsSel = document.getElementById('workouts-client');
        if (workoutsSel) {
          workoutsSel.innerHTML = '<option value="">'+(hasClients ? 'All clients' : 'No clients found')+'</option>' + options;
          workoutsSel.disabled = !hasClients;
        }

        // Disable tabs if no clients
        const tabEls = document.querySelectorAll('.tab');
        tabEls.forEach(tab => { tab.disabled = !hasClients; });

        // Show a message if no clients
        if (!hasClients) {
          showToast('No clients found. Add a client to get started.');
        }
      } catch (e) {
        console.error('Error in populateMeasurementClients:', e);
        showToast('Error loading clients');
      }
    }

    // Handle global client selection change
    function onGlobalClientChange() {
      const globalSel = document.getElementById('global-client');
      const clientId = globalSel.value;
      const indicator = document.getElementById('client-indicator');
      
      if (clientId) {
        const clientName = globalSel.options[globalSel.selectedIndex].text;
        indicator.textContent = '✓ Client selected';
        indicator.style.color = 'var(--success)';
        
        // Sync all tab dropdowns with global selection
        const measurementSel = document.getElementById('measurement-client');
        if (measurementSel) measurementSel.value = clientId;
        
        const questsSel = document.getElementById('quests-client');
        if (questsSel) questsSel.value = clientId;
        
        const nutritionSel = document.getElementById('nutrition-client');
        if (nutritionSel) nutritionSel.value = clientId;
        
        const workoutsSel = document.getElementById('workouts-client');
        if (workoutsSel) workoutsSel.value = clientId;
        
        // Reload current tab data
        const activeTab = document.querySelector('.tab.active');
        if (activeTab) {
          const tabText = activeTab.textContent.toLowerCase();
          if (tabText.includes('quest')) loadQuests();
          else if (tabText.includes('measurement')) loadMeasurements();
          else if (tabText.includes('nutrition')) loadMealPlans();
          else if (tabText.includes('workout')) loadWorkouts();
        }
      } else {
        indicator.textContent = '';
      }
    }

    // Measurements
    async function loadMeasurements() {
      const clientId = document.getElementById('measurement-client').value;
      const container = document.getElementById('measurements-list');
      if (!clientId) {
        container.innerHTML = '<p style="color: var(--muted);">Select a client to view measurements</p>';
        return;
      }
      container.innerHTML = '<p style="color: var(--muted);">Loading...</p>';
      try {
        const r = await fetch('/api/measurements?clientId=' + clientId);
        const d = await r.json();
        if (r.ok) {
          if (!d.measurements || d.measurements.length === 0) {
            container.innerHTML = '<p style="color: var(--muted);">No measurements yet.</p>';
          } else {
            var rows = d.measurements.map(function(m){
              var wl = (m.weight_lbs!=null && !isNaN(m.weight_lbs) && m.weight_lbs.toFixed) ? m.weight_lbs.toFixed(1) : (m.weight_lbs!=null ? Number(m.weight_lbs).toFixed(1) : '-');
              var wi = (m.waist_in!=null && !isNaN(m.waist_in) && m.waist_in.toFixed) ? m.waist_in.toFixed(1) : (m.waist_in!=null ? Number(m.waist_in).toFixed(1) : '-');
              return '<tr><td>'+ new Date(m.measurement_date).toLocaleDateString() +'</td><td>'+ wl +'</td><td>'+ wi +'</td></tr>';
            }).join('');
            container.innerHTML = '<table><thead><tr><th>Date</th><th>Weight (lbs)</th><th>Waist (in)</th></tr></thead><tbody>'+ rows +'</tbody></table>';
          }
        } else {
          container.innerHTML = '<p style="color: var(--brand1);">'+(d.error || 'Failed to load measurements')+'</p>';
        }
      } catch (e) {
        container.innerHTML = '<p style="color: var(--brand1);">Failed to load measurements</p>';
      }
    }

    async function addMeasurement() {
      const clientId = document.getElementById('measurement-client').value;
      if (!clientId) { showToast('Select a client first'); return; }
      
      const weight = parseFloat(document.getElementById('m-weight-lbs').value);
      if (!weight || isNaN(weight)) {
        showToast('Weight is required');
        return;
      }
      
      // Calculate total height in inches from feet and inches
      const heightFt = parseFloat(document.getElementById('m-height-ft').value) || 0;
      const heightIn = parseFloat(document.getElementById('m-height-in').value) || 0;
      const totalHeightIn = (heightFt * 12) + heightIn;
      
      const payload = {
        clientId,
        weight_lbs: weight,
        body_fat_pct: parseFloat(document.getElementById('m-body-fat').value)||null,
        height_in: totalHeightIn > 0 ? totalHeightIn : null,
        neck_in: parseFloat(document.getElementById('m-neck-in').value)||null,
        chest_in: parseFloat(document.getElementById('m-chest-in').value)||null,
        waist_in: parseFloat(document.getElementById('m-waist-in').value)||null,
        hips_in: parseFloat(document.getElementById('m-hips-in').value)||null,
        bicep_in: parseFloat(document.getElementById('m-bicep-in').value)||null,
        thigh_in: parseFloat(document.getElementById('m-thigh-in').value)||null,
        calf_in: parseFloat(document.getElementById('m-calf-in').value)||null,
        resting_hr: parseInt(document.getElementById('m-hr').value)||null,
        bp_systolic: parseInt(document.getElementById('m-bp-sys').value)||null,
        bp_diastolic: parseInt(document.getElementById('m-bp-dia').value)||null,
        steps: parseInt(document.getElementById('m-steps').value)||null,
        notes: document.getElementById('m-notes').value||null,
        measurement_date: new Date().toISOString().slice(0,10)
      };
      try {
        const r = await fetch('/api/measurements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const d = await r.json();
        if (r.ok) { 
          showToast('Measurement saved');
          // Clear the form
          document.getElementById('m-weight-lbs').value = '';
          document.getElementById('m-body-fat').value = '';
          document.getElementById('m-height-ft').value = '';
          document.getElementById('m-height-in').value = '';
          document.getElementById('m-neck-in').value = '';
          document.getElementById('m-chest-in').value = '';
          document.getElementById('m-waist-in').value = '';
          document.getElementById('m-hips-in').value = '';
          document.getElementById('m-bicep-in').value = '';
          document.getElementById('m-thigh-in').value = '';
          document.getElementById('m-calf-in').value = '';
          document.getElementById('m-hr').value = '';
          document.getElementById('m-bp-sys').value = '';
          document.getElementById('m-bp-dia').value = '';
          document.getElementById('m-steps').value = '';
          document.getElementById('m-notes').value = '';
          loadMeasurements();
        }
        else { showToast(d.error || 'Failed to save measurement'); }
      } catch (e) { showToast('Failed to save measurement'); }
    }

    // Modal functions
    function openAddClientModal() {
      document.getElementById('add-client-modal').classList.add('active');
    }

    function closeModal(modalId) {
      document.getElementById(modalId).classList.remove('active');
    }

    async function openAssignQuestModal() {
      const sel = document.getElementById('quests-client');
      if (!sel || !sel.value) { showToast('Please select a client first'); return; }
      const clientId = sel.value;
      const title = prompt('Quest Title (e.g., "Lose 10 lbs"):');
      if (!title) return;
      const targetValue = parseFloat(prompt('Target Value (number):'));
      if (!targetValue) return;
      const targetUnit = prompt('Target Unit (e.g., "lbs", "kg", "reps"):') || 'units';
      const difficulty = prompt('Difficulty (easy/medium/hard):') || 'medium';
      const xpReward = parseInt(prompt('XP Reward:')) || 100;
      const questType = prompt('Quest Type (weight_loss/strength/endurance/nutrition):') || 'weight_loss';
      try {
        const r = await fetch('/api/quests', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({client_id: clientId, title, quest_type: questType, target_value: targetValue, target_unit: targetUnit, difficulty, xp_reward: xpReward})
        });
        if (r.ok) { showToast('Quest assigned!'); loadQuests(); }
        else { showToast('Failed to assign quest'); }
      } catch(e) { showToast('Error assigning quest'); }
    }

    async function openCreateMealPlanModal() {
      const sel = document.getElementById('nutrition-client');
      const clientId = sel && sel.value ? sel.value : null;
      const name = prompt('Meal Plan Name:');
      if (!name) return;
      const description = prompt('Description (optional):') || '';
      const mealsJson = prompt('Meals JSON (or leave empty for basic template):') || '{"breakfast":{"name":"Breakfast","calories":400},"lunch":{"name":"Lunch","calories":600},"dinner":{"name":"Dinner","calories":700}}';
        const totalCalories = prompt('Total Calories (optional):') || null;
        const totalProtein = prompt('Total Protein in grams (optional):') || null;
        const totalCarbs = prompt('Total Carbs in grams (optional):') || null;
        const totalFat = prompt('Total Fat in grams (optional):') || null;
      try {
        let mealsObj;
        try { mealsObj = JSON.parse(mealsJson); } catch(e) { showToast('Invalid JSON format'); return; }
        const r = await fetch('/api/meal-plans', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
            body: JSON.stringify({
              client_id: clientId,
              name,
              description,
              meals: mealsObj,
              total_calories: totalCalories ? parseFloat(totalCalories) : null,
              total_protein: totalProtein ? parseFloat(totalProtein) : null,
              total_carbs: totalCarbs ? parseFloat(totalCarbs) : null,
              total_fat: totalFat ? parseFloat(totalFat) : null
            })
        });
        if (r.ok) { showToast('Meal plan created!'); loadMealPlans(); }
        else { showToast('Failed to create meal plan'); }
      } catch(e) { showToast('Error creating meal plan'); }
    }

    async function openCreateWorkoutModal() {
      const sel = document.getElementById('workouts-client');
      const clientId = sel && sel.value ? sel.value : null;
      const title = prompt('Workout Title:');
      if (!title) return;
      const scheduledAt = prompt('Scheduled Date (YYYY-MM-DD or leave empty):') || null;
        const workoutType = prompt('Workout Type (strength/cardio/hiit/flexibility/hybrid):') || null;
        const durationMinutes = prompt('Duration in minutes (optional):') || null;
        const exercisesJson = prompt('Exercises JSON (optional, e.g., [{"name":"Squat","reps":10,"sets":3}]):') || null;
      try {
          let exercisesObj = null;
          if (exercisesJson) {
            try { exercisesObj = JSON.parse(exercisesJson); }
            catch(e) { showToast('Invalid exercises JSON format'); return; }
          }
        const r = await fetch('/api/workouts', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
            body: JSON.stringify({
              client_id: clientId,
              title,
              scheduled_at: scheduledAt,
              workout_type: workoutType,
              duration_minutes: durationMinutes ? parseInt(durationMinutes) : null,
              exercises_json: exercisesObj ? JSON.stringify(exercisesObj) : null
            })
        });
        if (r.ok) { showToast('Workout created!'); loadWorkouts(); }
        else { showToast('Failed to create workout'); }
      } catch(e) { showToast('Error creating workout'); }
    }

    // USDA Integration - Frontend
    async function usdaSearch() {
      const q = document.getElementById('usda-food-search').value.trim();
      const resultsEl = document.getElementById('usda-results');
      if (!q) { resultsEl.innerHTML = '<div class="muted">Enter a search term.</div>'; return; }
      resultsEl.innerHTML = '<div class="muted">Searching...</div>';
      try {
        const r = await fetch('/api/usda/search?q=' + encodeURIComponent(q) + '&page_size=10');
        const d = await r.json();
        if (!r.ok) { resultsEl.innerHTML = '<div class="muted">' + (d.error || 'Search failed') + '</div>'; return; }
        renderUsdaResults(d.foods || []);
      } catch(e) {
        resultsEl.innerHTML = '<div class="muted">Search error.</div>';
      }
    }

    function renderUsdaResults(foods) {
      const resultsEl = document.getElementById('usda-results');
      if (!foods.length) { resultsEl.innerHTML = '<div class="muted">No results found.</div>'; return; }
      resultsEl.innerHTML = foods.map(function(f){
        return '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding:6px 0;">'
          + '<div>'
          +   '<div style="font-weight:600;">' + (f.description || '') + '</div>'
          +   '<div class="muted" style="font-size:0.85rem;">' + (Math.round(f.calories||0)) + ' cal · P ' + (Math.round(f.protein||0)) + 'g · C ' + (Math.round(f.carbs||0)) + 'g · F ' + (Math.round(f.fat||0)) + 'g</div>'
          + '</div>'
          + '<button class="btn" style="padding:6px 10px;" onclick=\'addUsdaItem(' + JSON.stringify(JSON.stringify(f)) + ')\'>Add</button>'
        + '</div>';
      }).join('');
    }

    function addUsdaItem(serialized) {
      // serialized is JSON-stringified twice to safely embed in HTML
      const f = JSON.parse(serialized);
      usdaSelected.push(f);
      renderUsdaSelected();
    }

    function removeUsdaItem(index) {
      usdaSelected.splice(index, 1);
      renderUsdaSelected();
    }

    function renderUsdaSelected() {
      const selEl = document.getElementById('usda-selected');
      if (!usdaSelected.length) { selEl.innerHTML = '<div class="muted">No items selected.</div>'; document.getElementById('usda-totals').innerHTML = ''; return; }
      selEl.innerHTML = usdaSelected.map(function(f, i){
        return '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding:6px 0;">'
          + '<div style="font-size:0.9rem;">' + (f.description || '') + '</div>'
          + '<button class="btn-secondary" style="padding:4px 8px;" onclick="removeUsdaItem(' + i + ')">Remove</button>'
        + '</div>';
      }).join('');
      updateUsdaTotals();
    }

    function updateUsdaTotals() {
      const totals = usdaSelected.reduce((acc, f) => {
        acc.calories += f.calories || 0; acc.protein += f.protein || 0; acc.carbs += f.carbs || 0; acc.fat += f.fat || 0; return acc;
      }, { calories:0, protein:0, carbs:0, fat:0 });
      document.getElementById('usda-totals').innerHTML = '<div>Total: <strong>' + Math.round(totals.calories) + '</strong> cal · P ' + Math.round(totals.protein) + 'g · C ' + Math.round(totals.carbs) + 'g · F ' + Math.round(totals.fat) + 'g</div>';
    }

    async function saveSelectionAsMealPlan() {
      if (!usdaSelected.length) { showToast('Select some foods first'); return; }
      const sel = document.getElementById('nutrition-client');
      const clientId = sel && sel.value ? sel.value : null;
      const name = prompt('Meal Plan Name:');
      if (!name) return;
      const description = 'Generated from USDA selections';
      // Build a simple meals object
      const meals = { items: usdaSelected.map(f => ({ name: f.description, calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat, raw: f })) };
      const totals = usdaSelected.reduce((acc, f) => {
        acc.calories += f.calories || 0; acc.protein += f.protein || 0; acc.carbs += f.carbs || 0; acc.fat += f.fat || 0; return acc;
      }, { calories:0, protein:0, carbs:0, fat:0 });
      try {
        const r = await fetch('/api/meal-plans', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: clientId ? parseInt(clientId) : null,
            name,
            description,
            meals,
            total_calories: Math.round(totals.calories),
            total_protein: Math.round(totals.protein),
            total_carbs: Math.round(totals.carbs),
            total_fat: Math.round(totals.fat)
          })
        });
        if (r.ok) { showToast('Meal plan saved'); loadMealPlans(); }
        else { const d = await r.json().catch(()=>({})); showToast(d.error || 'Failed to save meal plan'); }
      } catch (e) { showToast('Error saving meal plan'); }
    }

    // Quest template filling
    function fillQuestTemplate() {
      const template = document.getElementById('quest-template').value;
      const templates = {
        weight_loss_10: { title: 'Lose 10 lbs', target: 10, unit: 'lbs', difficulty: 'medium', xp: 150, type: 'weight_loss' },
        weight_loss_20: { title: 'Lose 20 lbs', target: 20, unit: 'lbs', difficulty: 'hard', xp: 300, type: 'weight_loss' },
        muscle_gain: { title: 'Gain 5 lbs muscle', target: 5, unit: 'lbs', difficulty: 'medium', xp: 200, type: 'strength' },
        strength_squat: { title: 'Squat 200 lbs', target: 200, unit: 'lbs', difficulty: 'hard', xp: 250, type: 'strength' },
        strength_bench: { title: 'Bench Press 150 lbs', target: 150, unit: 'lbs', difficulty: 'medium', xp: 200, type: 'strength' },
        cardio_30: { title: '30 min cardio daily', target: 30, unit: 'days', difficulty: 'medium', xp: 150, type: 'endurance' },
        steps_10k: { title: '10,000 steps daily', target: 30, unit: 'days', difficulty: 'easy', xp: 100, type: 'endurance' },
        water_8: { title: '8 glasses water daily', target: 30, unit: 'days', difficulty: 'easy', xp: 100, type: 'nutrition' },
        protein: { title: '150g protein daily', target: 30, unit: 'days', difficulty: 'medium', xp: 150, type: 'nutrition' }
      };
      
      if (template && templates[template]) {
        const t = templates[template];
        document.getElementById('quest-title-quick').value = t.title;
        document.getElementById('quest-target-quick').value = t.target;
        document.getElementById('quest-unit-quick').value = t.unit;
        document.getElementById('quest-difficulty-quick').value = t.difficulty;
        document.getElementById('quest-xp-quick').value = t.xp;
        document.getElementById('quest-type-quick').value = t.type;
      }
    }

    // Run backend auto-check for quests/milestones
    async function runAutoCheck() {
      const sel = document.getElementById('quests-client');
      const clientId = sel && sel.value ? sel.value : null;
      if (!clientId) { showToast('Select a client first'); return; }
      let base = localStorage.getItem('backend_base');
      if (!base) {
        base = prompt('Enter backend base URL (e.g., http://127.0.0.1:8000)');
        if (!base) return;
        localStorage.setItem('backend_base', base);
      }
      try {
        const r = await fetch(base.replace(/\/$/, '') + '/quests/auto-check/' + clientId, { method: 'POST' });
        const d = await r.json();
        if (r.ok) {
          const count = (d && d.milestones && d.milestones.length) ? d.milestones.length : 0;
          showToast('Auto-check done. Milestones: ' + count);
          // Optionally re-load quests list if present
          if (typeof loadQuests === 'function') loadQuests();
        } else {
          showToast(d.detail || d.error || 'Auto-check failed');
        }
      } catch (e) {
        showToast('Auto-check error');
      }
    }

    async function assignQuestQuick() {
      const sel = document.getElementById('quests-client');
      if (!sel || !sel.value) { showToast('Please select a client first'); return; }
      const clientId = sel.value;
      
      const title = document.getElementById('quest-title-quick').value;
      const targetValue = parseFloat(document.getElementById('quest-target-quick').value);
      const targetUnit = document.getElementById('quest-unit-quick').value;
      const difficulty = document.getElementById('quest-difficulty-quick').value;
      const xpReward = parseInt(document.getElementById('quest-xp-quick').value);
      const questType = document.getElementById('quest-type-quick').value;
      
      if (!title || !targetValue || !targetUnit) {
        showToast('Please fill in all required fields');
        return;
      }
      
      try {
        const r = await fetch('/api/quests', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({client_id: clientId, title, quest_type: questType, target_value: targetValue, target_unit: targetUnit, difficulty, xp_reward: xpReward})
        });
        if (r.ok) { 
          showToast('Quest assigned!'); 
          loadQuests();
          // Clear form
          document.getElementById('quest-template').value = '';
          document.getElementById('quest-title-quick').value = '';
          document.getElementById('quest-target-quick').value = '';
          document.getElementById('quest-unit-quick').value = '';
        }
        else { showToast('Failed to assign quest'); }
      } catch(e) { showToast('Error assigning quest'); }
    }

    // Meal plan filtering
    let allMealPlans = [];
    
    function filterMealPlans() {
      const search = document.getElementById('meal-search').value.toLowerCase();
      const calorieFilter = document.getElementById('meal-filter-calories').value;
      
      let filtered = allMealPlans.filter(m => {
        const matchSearch = !search || m.name.toLowerCase().includes(search) || (m.description && m.description.toLowerCase().includes(search));
        
        let matchCalories = true;
        if (calorieFilter && m.total_calories) {
          const cal = m.total_calories;
          if (calorieFilter === 'low') matchCalories = cal < 1500;
          else if (calorieFilter === 'medium') matchCalories = cal >= 1500 && cal <= 2500;
          else if (calorieFilter === 'high') matchCalories = cal > 2500;
        }
        
        return matchSearch && matchCalories;
      });
      
      displayMealPlans(filtered);
    }
    
    function displayMealPlans(plans) {
      const container = document.getElementById('meal-plans-list');
      if (plans.length === 0) {
        container.innerHTML = '<p style="color: var(--muted);">No meal plans found.</p>';
        return;
      }
      
      container.innerHTML = '<table><thead><tr><th>Name</th><th>Client</th><th>Calories</th><th>Protein</th><th>Carbs</th><th>Fat</th><th>Created</th><th>Actions</th></tr></thead><tbody>' +
        plans.map(function(m){
          return '<tr><td>'+m.name+'</td><td>'+(m.client_id||'All')+'</td>' +
            '<td>'+(m.total_calories||'-')+'</td>' +
            '<td>'+(m.total_protein||'-')+'g</td>' +
            '<td>'+(m.total_carbs||'-')+'g</td>' +
            '<td>'+(m.total_fat||'-')+'g</td>' +
            '<td>'+new Date(m.created_at*1000).toLocaleDateString()+'</td>' +
            '<td><button class="btn-secondary btn" style="padding:4px 8px; font-size:0.8rem;">View</button></td></tr>';
        }).join('') + '</tbody></table>';
    }

    // Workout filtering
    let allWorkouts = [];
    
    function filterWorkouts() {
      const search = document.getElementById('workout-search').value.toLowerCase();
      const typeFilter = document.getElementById('workout-filter-type').value;
      
      let filtered = allWorkouts.filter(w => {
        const matchSearch = !search || w.title.toLowerCase().includes(search) || (w.exercises && JSON.stringify(w.exercises).toLowerCase().includes(search));
        const matchType = !typeFilter || (w.workout_type && w.workout_type === typeFilter);
        return matchSearch && matchType;
      });
      
      displayWorkouts(filtered);
    }
    
    function displayWorkouts(workouts) {
      const container = document.getElementById('workout-plans-list');
      if (workouts.length === 0) {
        container.innerHTML = '<p style="color: var(--muted);">No workouts found.</p>';
        return;
      }
      
      container.innerHTML = '<table><thead><tr><th>Title</th><th>Client</th><th>Type</th><th>Exercises</th><th>Duration</th><th>Scheduled</th><th>Actions</th></tr></thead><tbody>' +
        workouts.map(function(w){
          const exerciseCount = w.exercises ? (Array.isArray(w.exercises) ? w.exercises.length : Object.keys(w.exercises).length) : 0;
          return '<tr><td>'+w.title+'</td><td>'+(w.client_id||'All')+'</td>' +
            '<td>'+(w.workout_type||'-')+'</td>' +
            '<td>'+exerciseCount+' exercises</td>' +
            '<td>'+(w.duration_minutes||'-')+' min</td>' +
            '<td>'+(w.scheduled_at ? new Date(w.scheduled_at).toLocaleDateString() : '-')+'</td>' +
            '<td><button class="btn-secondary btn" style="padding:4px 8px; font-size:0.8rem;">View</button></td></tr>';
        }).join('') + '</tbody></table>';
    }

    // API Functions
    async function openClientProfile(id) {
      const modal = document.getElementById('client-profile-modal');
      modal.classList.add('active');
      document.getElementById('client-latest-measurements').innerHTML = 'Loading...';
      document.getElementById('client-quests').innerHTML = 'Loading...';
      try {
        const mr = await fetch('/api/measurements?clientId=' + id);
        const md = await mr.json();
        let latest = md.measurements && md.measurements[0] ? md.measurements[0] : null;
        if (latest) {
          document.getElementById('client-latest-measurements').innerHTML = (
            '<div>Date: ' + new Date(latest.measurement_date).toLocaleDateString() + '</div>' +
            '<div>Weight: ' + (latest.weight_lbs!=null ? Number(latest.weight_lbs).toFixed(1) : '-') + ' lbs</div>' +
            '<div>Waist: ' + (latest.waist_in!=null ? Number(latest.waist_in).toFixed(1) : '-') + ' in</div>' +
            '<div>Body Fat: ' + ((latest.body_fat_pct!=null) ? latest.body_fat_pct : '-') + '%</div>'
          );
        } else {
          document.getElementById('client-latest-measurements').innerHTML = 'No measurements yet.';
        }
        const qr = await fetch('/api/quests?clientId=' + id);
        const qd = await qr.json();
        if (qr.ok && qd.quests && qd.quests.length) {
          document.getElementById('client-quests').innerHTML = qd.quests.map(function(q){
            var p = Math.round(q.progress_percentage || 0);
            return '<div style="margin-bottom:10px;">' +
              '<div style="display:flex; justify-content:space-between;"><strong>' + q.title + '</strong><span>' + p + '%</span></div>' +
              '<div style="height:8px; background: #2f3550; border-radius: 6px; overflow:hidden;">' +
                '<div style="width:' + p + '%; height:8px; background: linear-gradient(135deg, var(--brand1), var(--brand2));"></div>' +
              '</div>' +
            '</div>';
          }).join('');
        } else {
          document.getElementById('client-quests').innerHTML = 'No quests yet.';
        }
        renderAvatar(latest);
      } catch(e) {
        document.getElementById('client-latest-measurements').innerHTML = 'Failed to load.';
        document.getElementById('client-quests').innerHTML = 'Failed to load.';
      }
    }

    function renderAvatar(latest) {
      const container = document.getElementById('lottieAvatar');
      container.innerHTML = '';
      const gender = 'male';
      const animUrl = gender === 'female' ? 'https://assets8.lottiefiles.com/packages/lf20_1G7QW2.json' : 'https://assets1.lottiefiles.com/private_files/lf30_oqpbtola.json';
      const scoreObj = calculateProgressScore(latest);
      container.style.borderColor = scoreObj.borderColor;
  container.style.boxShadow = '0 0 20px ' + scoreObj.glow;
  container.style.transform = 'scale(' + scoreObj.scale + ')';
      // eslint-disable-next-line no-undef
      lottie.loadAnimation({ container, renderer: 'svg', loop: true, autoplay: true, path: animUrl });
  document.getElementById('avatarChips').innerHTML = '<span class="badge" style="background:' + scoreObj.borderColor + '; color:#0f1222;">' + Math.round(scoreObj.score) + '/100</span>';
    }

    function calculateProgressScore(latest) {
      let score = 0;
      if (!latest) return { score: 0, borderColor: '#FF4B39', glow: 'rgba(255,75,57,0.3)', scale: 0.95 };
      if (latest.body_fat_pct != null) score += Math.max(0, 20 - (latest.body_fat_pct - 20)) * 0.5;
      if (latest.waist_in != null) score += Math.max(0, 40 - latest.waist_in) * 0.5;
      if (latest.steps != null) score += Math.min(15, latest.steps / 1000);
      score = Math.max(0, Math.min(100, score));
      let borderColor = '#FF4B39', glow='rgba(255,75,57,0.3)', scale=0.95;
      if (score >= 70) { borderColor = '#1BB55C'; glow='rgba(27,181,92,0.5)'; scale=1.1; }
      else if (score >= 55) { borderColor = '#00BCD4'; glow='rgba(0,188,212,0.4)'; scale=1.05; }
      else if (score >= 40) { borderColor = '#FFB82B'; glow='rgba(255,184,43,0.35)'; scale=1.0; }
      return { score, borderColor, glow, scale };
    }
    async function loadClients() {
      try {
        const response = await fetch('/api/clients');
        const data = await response.json();
        
        if (response.ok && data.clients) {
          const tbody = document.getElementById('clients-list');
          if (data.clients.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--muted);">No clients yet. Add your first client!</td></tr>';
          } else {
            tbody.innerHTML = data.clients.map(client => \`
              <tr>
                <td>\${client.name}</td>
                <td>\${client.email}</td>
                <td><span class="badge badge-active">Active</span></td>
                <td>\${new Date(client.created_at).toLocaleDateString()}</td>
                <td>
                  <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.85rem;" onclick="openClientProfile(\${client.id})">View</button>
                </td>
              </tr>
            \`).join('');
          }
          
          // Update dashboard stat
          document.getElementById('stat-clients').textContent = data.clients.length;
        }
      } catch (error) {
        console.error('Error loading clients:', error);
      }
    }

    async function addClient() {
      const name = document.getElementById('new-client-name').value;
      const email = document.getElementById('new-client-email').value;
      const password = document.getElementById('new-client-password').value;

      if (!name || !email || !password) {
        showToast('Please fill in all fields');
        return;
      }

      if (password.length < 8) {
        showToast('Password must be at least 8 characters');
        return;
      }

      try {
        const response = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (response.ok) {
          showToast('Client added successfully!');
          closeModal('add-client-modal');
          loadClients();
          populateMeasurementClients(); // Refresh dropdown
          document.getElementById('new-client-name').value = '';
          document.getElementById('new-client-email').value = '';
          document.getElementById('new-client-password').value = '';
        } else {
          showToast(data.error || 'Failed to add client');
        }
      } catch (error) {
        showToast('Error adding client');
      }
    }

    async function loadQuests() {
      const container = document.getElementById('quests-list');
      container.innerHTML = '<p style="color: var(--muted);">Loading...</p>';
      try {
        const sel = document.getElementById('quests-client');
        if (!sel || !sel.value) { 
          container.innerHTML = '<p style="color: var(--muted);">Select a client to view quests.</p>'; 
          return; 
        }
        const cid = sel.value;
        const r = await fetch('/api/quests?clientId=' + cid);
        const d = await r.json();
        if (r.ok && d.quests && d.quests.length) {
          container.innerHTML = '<div>' + d.quests.map(function(q){
            const p = Math.round(q.progress_percentage || 0);
            const diff = (q.difficulty||'medium').toUpperCase();
            return '<div class="card" style="margin-bottom:12px;"><strong>'+q.title+'</strong> <span class="badge">' + diff + '</span><div>Target: '+q.target_value+' '+q.target_unit+'</div><div style="height:10px; background:#2f3550; border-radius:6px; margin-top:6px;"><div style="width:'+p+'%; height:10px; background: linear-gradient(135deg, var(--brand1), var(--brand2)); border-radius:6px;"></div></div></div>';
          }).join('') + '</div>';
        } else {
          container.innerHTML = '<p style="color: var(--muted);">No quests yet. Assign quests using the button above.</p>';
        }
      } catch(e) { container.innerHTML = '<p style="color:var(--brand1);">Failed to load quests</p>'; }
    }

    async function loadMealPlans() {
      const container = document.getElementById('meal-plans-list');
      container.innerHTML = '<p style="color: var(--muted);">Loading...</p>';
      try {
        const sel = document.getElementById('nutrition-client');
        const clientId = sel && sel.value ? sel.value : '';
        const url = clientId ? '/api/meal-plans?clientId=' + clientId : '/api/meal-plans';
        const r = await fetch(url);
        const d = await r.json();
        if (r.ok && d.meal_plans && d.meal_plans.length) {
          allMealPlans = d.meal_plans;
          displayMealPlans(allMealPlans);
        } else {
          allMealPlans = [];
          container.innerHTML = '<p style="color: var(--muted);">No meal plans yet. Create your first plan!</p>';
        }
      } catch(e) { 
        allMealPlans = [];
        container.innerHTML = '<p style="color:var(--brand1);">Failed to load meal plans</p>'; 
      }
    }

    async function loadWorkouts() {
      const container = document.getElementById('workout-plans-list');
      container.innerHTML = '<p style="color: var(--muted);">Loading...</p>';
      try {
        const sel = document.getElementById('workouts-client');
        const clientId = sel && sel.value ? sel.value : '';
        const url = clientId ? '/api/workouts?clientId=' + clientId : '/api/workouts';
        const r = await fetch(url);
        const d = await r.json();
        if (r.ok && d.workouts && d.workouts.length) {
          allWorkouts = d.workouts;
          displayWorkouts(allWorkouts);
        } else {
          allWorkouts = [];
          container.innerHTML = '<p style="color: var(--muted);">No workouts yet. Create your first workout plan!</p>';
        }
      } catch(e) { 
        allWorkouts = [];
        container.innerHTML = '<p style="color:var(--brand1);">Failed to load workouts</p>'; 
      }
    }

    async function loadAnalytics() {
      try {
        const r = await fetch('/api/analytics/summary');
        const s = await r.json();
        if (r.ok) {
          document.getElementById('stat-total-clients').textContent = s.clients ?? 0;
          document.getElementById('stat-active-quests').textContent = s.quests ?? 0;
          document.getElementById('stat-completed-quests').textContent = s.completed_quests ?? 0;
          document.getElementById('stat-total-measurements').textContent = s.measurements ?? 0;
        }
        // Load recent activity
        const activityContainer = document.getElementById('recent-activity');
        const activities = [];
        
        // Fetch recent measurements
        const mr = await fetch('/api/measurements?limit=5');
        const md = await mr.json();
        if (mr.ok && md.measurements) {
          md.measurements.forEach(m => {
            activities.push({
              time: new Date(m.measurement_date),
              text: 'New measurement recorded for Client #' + m.client_id,
              type: 'measurement'
            });
          });
        }
        
        // Fetch recent quests
        const qr = await fetch('/api/quests?limit=5');
        const qd = await qr.json();
        if (qr.ok && qd.quests) {
          qd.quests.forEach(q => {
            if (q.completed_at) {
              activities.push({
                time: new Date(q.completed_at),
                text: 'Quest completed: ' + q.title,
                type: 'quest'
              });
            }
          });
        }
        
        // Sort by time and render
        activities.sort((a, b) => b.time - a.time);
        if (activities.length > 0) {
          activityContainer.innerHTML = activities.slice(0, 10).map(a => {
            const icon = a.type === 'measurement' ? '📊' : a.type === 'quest' ? '🏆' : '📝';
            return '<div style="padding:12px; background:#2f3550; margin-bottom:8px; border-radius:6px; display:flex; gap:12px; align-items:center;">' +
              '<span style="font-size:1.5rem;">' + icon + '</span>' +
              '<div style="flex:1;"><div>' + a.text + '</div><div style="color:var(--muted); font-size:0.85rem; margin-top:4px;">' + a.time.toLocaleString() + '</div></div>' +
            '</div>';
          }).join('');
        } else {
          activityContainer.innerHTML = '<p style="color:var(--muted);">No recent activity</p>';
        }
      } catch(e) { 
        document.getElementById('recent-activity').innerHTML = '<p style="color:var(--brand1);">Failed to load analytics</p>';
      }
    }

    async function saveSettings() {
      try {
        const business_name = document.getElementById('settings-business').value;
        const r = await fetch('/api/settings/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ business_name }) });
        const d = await r.json();
        if (r.ok) showToast('Settings saved!'); else showToast(d.error || 'Failed to save settings');
      } catch (e) {
        showToast('Failed to save settings');
      }
    }

    // Load initial data
    loadClients();
    populateMeasurementClients();
    // Load analytics summary for dashboard stats
    (async () => {
      try {
        const r = await fetch('/api/analytics/summary');
        const s = await r.json();
        if (r.ok) {
          document.getElementById('stat-clients').textContent = s.clients ?? 0;
          document.getElementById('stat-quests').textContent = s.quests ?? 0;
          document.getElementById('stat-plans').textContent = s.meal_plans ?? 0;
        }
      } catch (e) { /* ignore */ }
    })();
  </script>
</body>
</html>`;
}

// ============================================================================
// LOGIN PAGE HTML
// ============================================================================

function getLoginHTML(portalType = 'trainer') {
  const title = portalType === 'client' ? 'Client Portal' : 'Trainer Portal';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} Login - FitTrack Pro</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #000000;
      --panel: #0d0d0d;
      --text: #e0e0e0;
      --heading: #ffffff;
      --green: #00ff41;
      --green-alt: #39ff14;
      --purple: #b026ff;
      --purple-alt: #9d4edd;
      --border: #1a1a1a;
      --glow-green: 0 0 12px rgba(0,255,65,0.5), 0 0 28px rgba(0,255,65,0.3);
      --glow-purple: 0 0 12px rgba(176,38,255,0.5), 0 0 28px rgba(176,38,255,0.3);
      --shadow: 0 10px 30px rgba(0,0,0,0.8);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      max-width: 420px;
      width: 100%;
      background: var(--panel);
      padding: 40px;
      border-radius: 16px;
      border: 2px solid var(--green);
      box-shadow: var(--glow-green), var(--shadow);
    }
    h1 {
      font-size: 2.2rem;
      color: var(--heading);
      margin-bottom: 8px;
      text-align: center;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-shadow: 0 0 20px rgba(0,255,65,0.5);
    }
    .subtitle { 
      color: var(--text); 
      text-align: center; 
      margin-bottom: 30px; 
      font-size: 0.95rem;
    }
    .portal-badge {
      display: inline-block;
      background: var(--purple);
      color: #ffffff;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      margin-bottom: 12px;
      box-shadow: var(--glow-purple);
    }
    input {
      width: 100%;
      background: #000000;
      color: var(--text);
      border: 2px solid var(--border);
      border-radius: 10px;
      padding: 14px;
      font-size: 1rem;
      margin-bottom: 16px;
      caret-color: var(--purple);
      transition: all 0.2s;
    }
    input:focus { 
      outline: none; 
      border-color: var(--green); 
      box-shadow: 0 0 0 3px rgba(0,255,65,0.25), 0 0 20px rgba(0,255,65,0.5);
    }
    .btn {
      width: 100%;
      background: #2a2a2a;
      border: 2px solid var(--green);
      color: var(--heading);
      padding: 14px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.25s;
      box-shadow: 0 0 10px rgba(0,255,65,0.2);
    }
    .btn:hover { 
      background: var(--green);
      color: #000000;
      box-shadow: 0 0 25px rgba(0,255,65,0.6), 0 0 40px rgba(0,255,65,0.3);
      transform: translateY(-2px);
    }
    .btn:active {
      background: var(--purple);
      color: #ffffff;
      border-color: var(--purple);
      box-shadow: 0 0 25px rgba(176,38,255,0.6), 0 0 40px rgba(176,38,255,0.3);
      transform: translateY(0);
    }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .error { 
      color: #ff4444; 
      margin-top: 10px; 
      font-size: 0.9rem; 
      text-align: center;
      padding: 10px;
      background: rgba(255,68,68,0.1);
      border-radius: 8px;
      border: 1px solid rgba(255,68,68,0.3);
    }
    .success { 
      color: var(--green); 
      margin-top: 10px; 
      font-size: 0.9rem; 
      text-align: center;
      padding: 10px;
      background: rgba(0,255,65,0.1);
      border-radius: 8px;
      border: 1px solid rgba(0,255,65,0.3);
    }
    .link { 
      text-align: center; 
      margin-top: 20px;
      color: var(--text);
    }
    .link a { 
      color: var(--green); 
      text-decoration: none;
      font-weight: 600;
      transition: all 0.2s;
    }
    .link a:hover { 
      color: var(--green-alt);
      text-shadow: 0 0 10px rgba(0,255,65,0.5);
    }
  </style>
</head>
<body>
  <div class="container">
    <div style="text-align: center;">
      <span class="portal-badge">${title}</span>
    </div>
    <h1>FitTrack Pro</h1>
    <p class="subtitle">Welcome back</p>
    
    <form id="login-form" method="POST" action="/api/auth/login">
      <input type="hidden" name="portal_type" value="${portalType}" />
      <input type="email" name="email" id="email" placeholder="Email" required autocomplete="email" />
      <input type="password" name="password" id="password" placeholder="Password" required autocomplete="current-password" />
      <button type="submit" class="btn" id="submit-btn">Log In</button>
      <div id="message"></div>
    </form>

    ${portalType === 'trainer' ? `
    <div class="link">
      Don't have an account? <a href="/register">Register here</a>
    </div>
    ` : `
    <div class="link">
      First time logging in? <a href="/reset-password">Reset your password</a>
    </div>
    `}
  </div>

  <!-- No JS needed: classic form POST for maximum compatibility -->
</body>
</html>`;
}

// ============================================================================
// REGISTER PAGE HTML
// ============================================================================

function getRegisterHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trainer Registration - FitTrack Pro</title>
  <style>
    :root {
      --bg: #0f1222;
      --panel: #1f2336;
      --text: #e5e7eb;
      --muted: #9ca3af;
      --brand1: #FF4B39;
      --brand2: #FFB82B;
      --border: #2f3550;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1d2e 0%, #2a2f42 100%);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      max-width: 400px;
      width: 100%;
      background: var(--panel);
      padding: 40px;
      border-radius: 16px;
      border: 1px solid var(--border);
      box-shadow: 0 4px 24px rgba(0,0,0,.4);
    }
    h1 {
      font-size: 2rem;
      background: linear-gradient(135deg, var(--brand1), var(--brand2));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 10px;
      text-align: center;
    }
    .subtitle { color: var(--muted); text-align: center; margin-bottom: 30px; }
    input {
      width: 100%;
      background: var(--bg);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px;
      font-size: 1rem;
      margin-bottom: 16px;
    }
    input:focus { outline: none; border-color: var(--brand2); }
    .btn {
      width: 100%;
      background: linear-gradient(135deg, var(--brand1), var(--brand2));
      border: none;
      color: #0f1222;
      padding: 14px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 1rem;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .btn:hover { opacity: 0.9; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .error { color: var(--brand1); margin-top: 10px; font-size: 0.9rem; }
    .success { color: var(--brand2); margin-top: 10px; font-size: 0.9rem; }
    .link { text-align: center; margin-top: 20px; }
    .link a { color: var(--brand2); text-decoration: none; }
    .link a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>FitTrack Pro</h1>
    <p class="subtitle">Trainer Registration</p>
    
    <form id="register-form">
      <input type="text" id="name" placeholder="Full Name" required autocomplete="name" />
      <input type="text" id="businessName" placeholder="Business Name (optional)" autocomplete="organization" />
      <input type="email" id="email" placeholder="Email" required autocomplete="email" />
      <input type="password" id="password" placeholder="Password (min 8 characters)" required autocomplete="new-password" />
      <button type="submit" class="btn" id="submit-btn">Create Account</button>
      <div id="message"></div>
    </form>

    <div class="link">
      Already have an account? <a href="/login">Log in here</a>
    </div>
  </div>

  <script>
    document.getElementById('register-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('name').value;
      const businessName = document.getElementById('businessName').value;
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const btn = document.getElementById('submit-btn');
      const msg = document.getElementById('message');
      
      if (password.length < 8) {
        msg.textContent = 'Password must be at least 8 characters';
        msg.className = 'error';
        return;
      }
      
      btn.disabled = true;
      btn.textContent = 'Creating account...';
      msg.textContent = '';
      msg.className = '';
      
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, businessName, email, password })
        });

        let data = {};
        try { data = await response.json(); } catch (e) { data = {}; }

        if (response.ok) {
          msg.textContent = 'Account created! Redirecting...';
          msg.className = 'success';
          setTimeout(() => {
            window.location.href = '/portal';
          }, 300);
        } else {
          msg.textContent = (data && data.error) ? data.error : 'Registration failed';
          msg.className = 'error';
          btn.disabled = false;
          btn.textContent = 'Create Account';
        }
      } catch (error) {
        msg.textContent = 'Registration failed. Please try again.';
        msg.className = 'error';
        btn.disabled = false;
        btn.textContent = 'Create Account';
      }
    });
  </script>
</body>
</html>`;
}
