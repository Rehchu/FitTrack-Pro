// Trainer Portal Authentication and Authorization

import { hashPassword, verifyPassword, generateToken, jsonResponse } from '../utils/index.js';

// ============================================================================
// AUTHENTICATION
// ============================================================================

export async function authenticateTrainer(request, env) {
  try {
    // Check for session cookie
    const cookies = parseCookies(request.headers.get('Cookie') || '');
    const sessionToken = cookies.session;

    if (!sessionToken) {
      return null;
    }

    // Get session from KV
    const session = await env.FITTRACK_KV.get(`session:${sessionToken}`);
    if (!session) {
      return null;
    }

    const sessionData = JSON.parse(session);
    
    // Verify session hasn't expired
    if (sessionData.expiresAt < Date.now()) {
      await env.FITTRACK_KV.delete(`session:${sessionToken}`);
      return null;
    }

    // Get trainer from database
    const trainer = await env.FITTRACK_D1.prepare(
      'SELECT id, name, email, logo_url, business_name, created_at FROM trainers WHERE id = ?'
    ).bind(sessionData.trainerId).first();

    return trainer;
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

export async function loginTrainer(request, env) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return jsonResponse({ error: 'Email and password are required' }, 400);
    }

    // Get trainer by email
    const trainer = await env.FITTRACK_D1.prepare(
      'SELECT * FROM trainers WHERE email = ?'
    ).bind(email.toLowerCase()).first();

    if (!trainer) {
      return jsonResponse({ error: 'Invalid email or password' }, 401);
    }

    // Verify password
    const passwordValid = await verifyPassword(password, trainer.password_hash);
    if (!passwordValid) {
      return jsonResponse({ error: 'Invalid email or password' }, 401);
    }

    // Create session
    const sessionToken = generateToken(32);
    const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days

    const sessionData = {
      trainerId: trainer.id,
      email: trainer.email,
      createdAt: Date.now(),
      expiresAt
    };

    // Store session in KV
    await env.FITTRACK_KV.put(
      `session:${sessionToken}`,
      JSON.stringify(sessionData),
      { expirationTtl: 30 * 24 * 60 * 60 } // 30 days
    );

    // Return success with cookie
    return new Response(JSON.stringify({
      success: true,
      trainer: {
        id: trainer.id,
        name: trainer.name,
        email: trainer.email,
        logo_url: trainer.logo_url
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${30 * 24 * 60 * 60}`
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return jsonResponse({ error: 'Login failed' }, 500);
  }
}

export async function logoutTrainer(request, env) {
  try {
    const cookies = parseCookies(request.headers.get('Cookie') || '');
    const sessionToken = cookies.session;

    if (sessionToken) {
      // Delete session from KV
      await env.FITTRACK_KV.delete(`session:${sessionToken}`);
    }

    // Return success with expired cookie
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': 'session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'
      }
    });
  } catch (error) {
    console.error('Logout error:', error);
    return jsonResponse({ error: 'Logout failed' }, 500);
  }
}

export async function registerTrainer(request, env) {
  try {
    const body = await request.json();
    const { name, email, password, businessName } = body;

    if (!name || !email || !password) {
      return jsonResponse({ error: 'Name, email, and password are required' }, 400);
    }

    if (password.length < 8) {
      return jsonResponse({ error: 'Password must be at least 8 characters' }, 400);
    }

    // Check if email already exists
    const existing = await env.FITTRACK_D1.prepare(
      'SELECT id FROM trainers WHERE email = ?'
    ).bind(email.toLowerCase()).first();

    if (existing) {
      return jsonResponse({ error: 'Email already registered' }, 409);
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create trainer
    const stmt = env.FITTRACK_D1.prepare(
      'INSERT INTO trainers (name, email, password_hash, business_name) VALUES (?, ?, ?, ?)'
    ).bind(name, email.toLowerCase(), passwordHash, businessName || name);

    const result = await stmt.run();
    const trainerId = result.meta.last_row_id;

    // Create session
    const sessionToken = generateToken(32);
    const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000);

    const sessionData = {
      trainerId,
      email: email.toLowerCase(),
      createdAt: Date.now(),
      expiresAt
    };

    await env.FITTRACK_KV.put(
      `session:${sessionToken}`,
      JSON.stringify(sessionData),
      { expirationTtl: 30 * 24 * 60 * 60 }
    );

    // Return success
    return new Response(JSON.stringify({
      success: true,
      trainer: {
        id: trainerId,
        name,
        email: email.toLowerCase()
      }
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${30 * 24 * 60 * 60}`
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return jsonResponse({ error: 'Registration failed' }, 500);
  }
}

// ============================================================================
// AUTHORIZATION MIDDLEWARE
// ============================================================================

export async function requireAuth(request, env) {
  const trainer = await authenticateTrainer(request, env);
  
  if (!trainer) {
    return {
      authorized: false,
      response: jsonResponse({ error: 'Unauthorized - Please log in' }, 401)
    };
  }

  return {
    authorized: true,
    trainer
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.split('=');
    if (name && rest.length > 0) {
      cookies[name.trim()] = rest.join('=').trim();
    }
  });

  return cookies;
}

export function getSessionCookie(request) {
  const cookies = parseCookies(request.headers.get('Cookie') || '');
  return cookies.session;
}
