// FitTrack Pro - Trainer Portal Worker
import { renderTrainerPortal } from './ui/portal.js';
import { handleAPI } from './api/index.js';
import { authenticateTrainer, loginTrainer, logoutTrainer, registerTrainer } from './auth/index.js';
import { handleCORS, htmlResponse } from './utils/index.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    const corsResponse = handleCORS(request);
    if (corsResponse) return corsResponse;

    // ========================================================================
    // PUBLIC AUTH ROUTES (No authentication required)
    // ========================================================================

    // Login page
    if (path === '/login' && request.method === 'GET') {
      return htmlResponse(getLoginHTML());
    }

    // Register page
    if (path === '/register' && request.method === 'GET') {
      return htmlResponse(getRegisterHTML());
    }

    // Login API
    if (path === '/api/auth/login' && request.method === 'POST') {
      return loginTrainer(request, env);
    }

    // Register API
    if (path === '/api/auth/register' && request.method === 'POST') {
      return registerTrainer(request, env);
    }

    // Logout API
    if (path === '/api/auth/logout' && request.method === 'POST') {
      return logoutTrainer(request, env);
    }

    // ========================================================================
    // PROTECTED ROUTES (Authentication required)
    // ========================================================================

    // Authenticate trainer
    const trainer = await authenticateTrainer(request, env);

    // Redirect to login if not authenticated
    if (!trainer && !path.startsWith('/api/')) {
      return Response.redirect(new URL('/login', request.url).toString(), 302);
    }

    // Trainer Portal Home
    if (path === '/' || path === '/portal' || path === '/dashboard') {
      if (!trainer) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      const html = renderTrainerPortal(trainer);
      return htmlResponse(html);
    }

    // API Routes
    if (path.startsWith('/api/')) {
      if (!trainer) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return handleAPI(request, env, trainer.id);
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
          'Content-Type': object.httpMetadata.contentType || 'application/octet-stream',
          'Cache-Control': 'public, max-age=31536000'
        }
      });
    }

    // Default: 404
    return new Response('Not Found', { status: 404 });
  }
};

// ============================================================================
// LOGIN PAGE HTML
// ============================================================================

function getLoginHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trainer Login - FitTrack Pro</title>
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
    <p class="subtitle">Trainer Portal Login</p>
    
    <form id="login-form">
      <input type="email" id="email" placeholder="Email" required autocomplete="email" />
      <input type="password" id="password" placeholder="Password" required autocomplete="current-password" />
      <button type="submit" class="btn" id="submit-btn">Log In</button>
      <div id="message"></div>
    </form>

    <div class="link">
      Don't have an account? <a href="/register">Register here</a>
    </div>
  </div>

  <script>
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const btn = document.getElementById('submit-btn');
      const msg = document.getElementById('message');
      
      btn.disabled = true;
      btn.textContent = 'Logging in...';
      msg.textContent = '';
      msg.className = '';
      
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          msg.textContent = 'Login successful! Redirecting...';
          msg.className = 'success';
          setTimeout(() => {
            window.location.href = '/portal';
          }, 500);
        } else {
          msg.textContent = data.error || 'Login failed';
          msg.className = 'error';
          btn.disabled = false;
          btn.textContent = 'Log In';
        }
      } catch (error) {
        msg.textContent = 'Login failed. Please try again.';
        msg.className = 'error';
        btn.disabled = false;
        btn.textContent = 'Log In';
      }
    });
  </script>
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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, businessName, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          msg.textContent = 'Account created! Redirecting...';
          msg.className = 'success';
          setTimeout(() => {
            window.location.href = '/portal';
          }, 500);
        } else {
          msg.textContent = data.error || 'Registration failed';
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

