// Trainer Portal UI rendering
export function renderTrainerPortal(trainer, data = {}) {
  const logo = trainer?.logo_url ? `<img src="${trainer.logo_url}" alt="logo" style="width:40px;height:40px;border-radius:8px;margin-right:10px;object-fit:cover;border:2px solid #FFB82B"/>` : '';
  const trainerId = trainer?.id || 1;
  const trainerName = trainer?.name || 'Trainer';
  const trainerEmail = trainer?.email || '';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trainer Portal - ${trainerName}</title>
  <link rel="manifest" href="/manifest.json">
  <style>
    :root {
      --bg: #0f1222;
      --panel: #1f2336;
      --panel-dark: #161a2a;
      --text: #e5e7eb;
      --muted: #9ca3af;
      --brand1: #FF4B39;
      --brand2: #FFB82B;
      --success: #1BB55C;
      --border: #2f3550;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #1a1d2e 0%, #2a2f42 100%);
      color: var(--text);
      min-height: 100vh;
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      background: var(--panel);
      box-shadow: 0 2px 10px rgba(0,0,0,.3);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .header-left { display: flex; align-items: center; gap: 10px; }
    .title { font-weight: 800; font-size: 1.2rem; }
    .grad { background: linear-gradient(135deg, var(--brand1) 0%, var(--brand2) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .subtitle { font-size: 0.85rem; color: var(--muted); }
    .tabs { display: flex; gap: 8px; flex-wrap: wrap; }
    .tab {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text);
      padding: 8px 14px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.95rem;
      font-weight: 600;
      transition: all 0.2s;
    }
    .tab:hover { border-color: var(--brand2); }
    .tab.active { border-color: var(--brand2); color: var(--brand2); background: rgba(255, 184, 43, 0.1); }
    .wrap { padding: 20px; max-width: 1400px; margin: 0 auto; }
    .grid { display: grid; gap: 16px; }
    @media (min-width: 768px) { .grid.cols-2 { grid-template-columns: 1fr 1fr; } }
    @media (min-width: 1024px) { .grid.cols-3 { grid-template-columns: 1fr 1fr 1fr; } }
    .card {
      background: var(--panel);
      padding: 20px;
      border-radius: 12px;
      border: 1px solid var(--border);
      box-shadow: 0 2px 8px rgba(0,0,0,.2);
    }
    .card h3 { margin: 0 0 12px; font-size: 1.1rem; color: var(--brand2); }
    .card h4 { margin: 12px 0 8px; font-size: 0.95rem; color: var(--text); }
    input[type=text], input[type=email], input[type=password], input[type=tel], input[type=number], input[type=date], textarea, select {
      width: 100%;
      background: var(--panel-dark);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px 12px;
      font: inherit;
      margin: 4px 0;
    }
    textarea { min-height: 80px; resize: vertical; }
    .btn {
      background: linear-gradient(135deg, var(--brand1), var(--brand2));
      border: none;
      color: #0f1222;
      padding: 10px 16px;
      border-radius: 10px;
      font-weight: 700;
      cursor: pointer;
      font-size: 0.95rem;
      transition: opacity 0.2s;
    }
    .btn:hover { opacity: 0.9; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary {
      background: var(--panel-dark);
      color: var(--text);
      border: 1px solid var(--border);
    }
    .list { display: flex; flex-direction: column; gap: 10px; max-height: 400px; overflow-y: auto; }
    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--panel-dark);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px;
      transition: border-color 0.2s;
    }
    .row:hover { border-color: var(--brand2); }
    .row-left { flex: 1; }
    .row-right { display: flex; gap: 8px; align-items: center; }
    .muted { color: var(--muted); font-size: 0.9rem; }
    .small { font-size: 0.85rem; }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
      background: rgba(27, 181, 92, 0.2);
      color: var(--success);
    }
    .badge.easy { background: rgba(27, 181, 92, 0.2); color: #1BB55C; }
    .badge.medium { background: rgba(255, 184, 43, 0.2); color: #FFB82B; }
    .badge.hard { background: rgba(255, 75, 57, 0.2); color: #FF4B39; }
    .badge.epic { background: rgba(147, 51, 234, 0.2); color: #9333EA; }
    .toast {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: var(--panel);
      color: var(--text);
      padding: 12px 18px;
      border: 1px solid var(--border);
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,.4);
      display: none;
      z-index: 1000;
    }
    .toast.show { display: block; animation: slideIn 0.3s; }
    @keyframes slideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .stat-card {
      background: var(--panel-dark);
      padding: 16px;
      border-radius: 10px;
      border-left: 4px solid var(--brand2);
      text-align: center;
    }
    .stat-value { font-size: 1.8rem; font-weight: 800; color: var(--brand2); }
    .stat-label { font-size: 0.85rem; color: var(--muted); margin-top: 4px; }
    .empty-state { text-align: center; padding: 40px 20px; color: var(--muted); }
    .empty-state-icon { font-size: 3rem; margin-bottom: 12px; opacity: 0.5; }
    .form-row { display: grid; gap: 12px; grid-template-columns: 1fr 1fr; }
    @media (max-width: 640px) { .form-row { grid-template-columns: 1fr; } }
    .hidden { display: none !important; }
  </style>
</head>
<body>
  <header>
    <div class="header-left">
      ${logo}
      <div>
        <div class="title"><span class="grad">${trainerName}</span></div>
        <div class="subtitle">${trainerEmail}</div>
      </div>
    </div>
    <nav class="tabs">
      <button class="tab active" data-tab="dashboard">📊 Dashboard</button>
      <button class="tab" data-tab="clients">👥 Clients</button>
      <button class="tab" data-tab="quests">🎯 Quests</button>
      <button class="tab" data-tab="measurements">📏 Measurements</button>
      <button class="tab" data-tab="nutrition">🍎 Nutrition</button>
      <button class="tab" data-tab="workouts">💪 Workouts</button>
      <button class="tab" data-tab="analytics">📈 Analytics</button>
      <button class="tab" data-tab="settings">⚙️ Settings</button>
    </nav>
  </header>

  <div class="wrap">
    <!-- Dashboard Tab -->
    <div id="tab-dashboard" class="tab-content">
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-value" id="stat-clients">0</div>
          <div class="stat-label">Total Clients</div>
        </div>
        <div class="stat-card" style="border-left-color: var(--success);">
          <div class="stat-value" style="color: var(--success);" id="stat-quests">0</div>
          <div class="stat-label">Active Quests</div>
        </div>
        <div class="stat-card" style="border-left-color: var(--brand1);">
          <div class="stat-value" style="color: var(--brand1);" id="stat-achievements">0</div>
          <div class="stat-label">Achievements</div>
        </div>
        <div class="stat-card" style="border-left-color: #9333EA;">
          <div class="stat-value" style="color: #9333EA;" id="stat-measurements">0</div>
          <div class="stat-label">Measurements</div>
        </div>
      </div>

      <div class="grid cols-2">
        <div class="card">
          <h3>📋 Recent Activity</h3>
          <div id="recent-activity" class="list">
            <div class="empty-state">
              <div class="empty-state-icon">📋</div>
              <div>No recent activity</div>
            </div>
          </div>
        </div>
        <div class="card">
          <h3>📢 Quick Actions</h3>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <button class="btn" onclick="switchTab('clients')">➕ Add New Client</button>
            <button class="btn" onclick="switchTab('quests')">🎯 Assign Quest</button>
            <button class="btn" onclick="switchTab('measurements')">📏 Add Measurement</button>
            <button class="btn" onclick="switchTab('nutrition')">🍎 Create Meal Plan</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Clients Tab -->
    <div id="tab-clients" class="tab-content hidden">
      <div class="grid cols-2">
        <div class="card">
          <h3>➕ Add New Client</h3>
          <div class="form-row">
            <input type="text" id="client-name" placeholder="Full Name *" />
            <input type="email" id="client-email" placeholder="Email *" />
          </div>
          <input type="tel" id="client-phone" placeholder="Phone (optional)" />
          <textarea id="client-notes" placeholder="Notes (optional)"></textarea>
          <button class="btn" id="create-client-btn" style="margin-top: 10px;">Create Client</button>
          <div id="create-client-msg" class="muted small" style="margin-top: 8px;"></div>
        </div>

        <div class="card">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
            <h3 style="margin: 0;">👥 My Clients</h3>
            <button class="btn btn-secondary" id="refresh-clients-btn" style="padding: 6px 12px;">🔄 Refresh</button>
          </div>
          <div id="clients-count" class="muted small" style="margin-bottom: 10px;"></div>
          <div id="clients-list" class="list"></div>
        </div>
      </div>
    </div>

    <!-- Quests Tab -->
    <div id="tab-quests" class="tab-content hidden">
      <div class="grid cols-2">
        <div class="card">
          <h3>🎯 Assign Quest to Client</h3>
          <select id="quest-client">
            <option value="">Select Client...</option>
          </select>
          <select id="quest-template">
            <option value="">Select Quest Template...</option>
            <option value="1" data-difficulty="easy">First Workout - Easy - 50 XP</option>
            <option value="2" data-difficulty="medium">5 Workouts - Medium - 150 XP</option>
            <option value="3" data-difficulty="hard">Lose 5 lbs - Hard - 300 XP</option>
            <option value="4" data-difficulty="epic">30-Day Streak - Epic - 500 XP</option>
          </select>
          <input type="date" id="quest-deadline" placeholder="Deadline (optional)" />
          <textarea id="quest-notes" placeholder="Custom notes or instructions (optional)"></textarea>
          <button class="btn" id="assign-quest-btn" style="margin-top: 10px;">Assign Quest</button>
          <div id="assign-quest-msg" class="muted small" style="margin-top: 8px;"></div>
        </div>

        <div class="card">
          <h3>📊 Active Quests Overview</h3>
          <div id="quests-list" class="list"></div>
        </div>
      </div>
    </div>

    <!-- Measurements Tab -->
    <div id="tab-measurements" class="tab-content hidden">
      <div class="grid cols-2">
        <div class="card">
          <h3>📏 Add Measurement (Imperial Units)</h3>
          <select id="measurement-client">
            <option value="">Select Client...</option>
          </select>
          <input type="date" id="measurement-date" />
          <h4>Body Stats</h4>
          <div class="form-row">
            <input type="number" id="measurement-weight" placeholder="Weight (lbs)" step="0.1" />
            <input type="number" id="measurement-bodyfat" placeholder="Body Fat (%)" step="0.1" />
          </div>
          <h4>Body Measurements (inches)</h4>
          <div class="form-row">
            <input type="number" id="measurement-waist" placeholder="Waist (in)" step="0.1" />
            <input type="number" id="measurement-chest" placeholder="Chest (in)" step="0.1" />
          </div>
          <div class="form-row">
            <input type="number" id="measurement-arms" placeholder="Arms (in)" step="0.1" />
            <input type="number" id="measurement-thighs" placeholder="Thighs (in)" step="0.1" />
          </div>
          <button class="btn" id="add-measurement-btn" style="margin-top: 10px;">Add Measurement</button>
          <div id="add-measurement-msg" class="muted small" style="margin-top: 8px;"></div>
        </div>

        <div class="card">
          <h3>📸 Upload Progress Photo</h3>
          <select id="photo-client">
            <option value="">Select Client...</option>
          </select>
          <input type="file" id="photo-file" accept="image/*" />
          <input type="date" id="photo-date" />
          <button class="btn" id="upload-photo-btn" style="margin-top: 10px;">Upload Photo</button>
          <div id="upload-photo-msg" class="muted small" style="margin-top: 8px;"></div>
        </div>
      </div>
    </div>

    <!-- Nutrition Tab -->
    <div id="tab-nutrition" class="tab-content hidden">
      <div class="grid cols-2">
        <div class="card">
          <h3>🍎 Create Meal Plan</h3>
          <select id="meal-client">
            <option value="">Select Client...</option>
          </select>
          <input type="date" id="meal-date" />
          <h4>Daily Targets</h4>
          <div class="form-row">
            <input type="number" id="meal-calories" placeholder="Calories" />
            <input type="number" id="meal-protein" placeholder="Protein (g)" />
          </div>
          <div class="form-row">
            <input type="number" id="meal-carbs" placeholder="Carbs (g)" />
            <input type="number" id="meal-fats" placeholder="Fats (g)" />
          </div>
          <h4>Meal Items (one per line)</h4>
          <textarea id="meal-items" placeholder="e.g., Breakfast: Oatmeal with berries - 300 cal&#10;Lunch: Grilled chicken salad - 450 cal" rows="6"></textarea>
          <button class="btn" id="create-meal-btn" style="margin-top: 10px;">Create Meal Plan</button>
          <div id="create-meal-msg" class="muted small" style="margin-top: 8px;"></div>
        </div>

        <div class="card">
          <h3>🤖 AI Meal Suggestions</h3>
          <select id="ai-meal-client">
            <option value="">Select Client...</option>
          </select>
          <input type="text" id="ai-meal-goals" placeholder="Goals (e.g., weight loss, muscle gain)" />
          <input type="text" id="ai-meal-restrictions" placeholder="Restrictions (e.g., vegetarian, gluten-free)" />
          <input type="number" id="ai-meal-calories" placeholder="Target Calories" />
          <button class="btn" id="ai-meal-btn" style="margin-top: 10px;">🤖 Generate with AI</button>
          <div id="ai-meal-result" class="muted small" style="margin-top: 12px; max-height: 300px; overflow-y: auto;"></div>
        </div>
      </div>
    </div>

    <!-- Workouts Tab -->
    <div id="tab-workouts" class="tab-content hidden">
      <div class="grid cols-2">
        <div class="card">
          <h3>💪 Upload Workout Video</h3>
          <input type="text" id="video-title" placeholder="Video Title *" />
          <input type="file" id="video-file" accept="video/*" />
          <select id="video-difficulty">
            <option value="">Difficulty...</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          <select id="video-category">
            <option value="">Category...</option>
            <option value="strength">Strength</option>
            <option value="cardio">Cardio</option>
            <option value="flexibility">Flexibility</option>
            <option value="hiit">HIIT</option>
          </select>
          <textarea id="video-description" placeholder="Description (optional)"></textarea>
          <button class="btn" id="upload-video-btn" style="margin-top: 10px;">Upload Video</button>
          <div id="upload-video-msg" class="muted small" style="margin-top: 8px;"></div>
        </div>

        <div class="card">
          <h3>📋 Create Workout Plan</h3>
          <select id="workout-client">
            <option value="">Select Client...</option>
          </select>
          <input type="text" id="workout-name" placeholder="Workout Plan Name *" />
          <textarea id="workout-exercises" placeholder="Exercises (one per line)&#10;e.g., Squats 3x12&#10;Push-ups 3x15" rows="8"></textarea>
          <button class="btn" id="create-workout-btn" style="margin-top: 10px;">Create Workout</button>
          <div id="create-workout-msg" class="muted small" style="margin-top: 8px;"></div>
        </div>
      </div>
    </div>

    <!-- Analytics Tab -->
    <div id="tab-analytics" class="tab-content hidden">
      <div class="card">
        <h3>📈 Analytics Dashboard</h3>
        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-value" id="analytics-total-clients">0</div>
            <div class="stat-label">Total Clients</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" id="analytics-active-quests">0</div>
            <div class="stat-label">Active Quests</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" id="analytics-completed-quests">0</div>
            <div class="stat-label">Completed Quests</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" id="analytics-avg-progress">0%</div>
            <div class="stat-label">Avg Quest Progress</div>
          </div>
        </div>
        <div class="muted" style="text-align: center; padding: 40px 20px;">
          <div style="font-size: 2rem; margin-bottom: 12px;">📊</div>
          <div>Advanced analytics coming soon: engagement metrics, compliance tracking, AI-powered insights, and more.</div>
        </div>
      </div>
    </div>

    <!-- Settings Tab -->
    <div id="tab-settings" class="tab-content hidden">
      <div class="grid cols-2">
        <div class="card">
          <h3>🎨 Branding</h3>
          <input type="text" id="settings-business-name" placeholder="Business Name" value="${trainerName}" />
          <h4>Upload Logo</h4>
          <input type="file" id="settings-logo-file" accept="image/*" />
          <button class="btn" id="upload-logo-btn" style="margin-top: 10px;">Upload Logo</button>
          <div id="upload-logo-msg" class="muted small" style="margin-top: 8px;"></div>
          <div class="muted small" style="margin-top: 12px;">PNG/JPG up to 5 MB. Optimal size: 200x200px.</div>
        </div>

        <div class="card">
          <h3>🔒 Change Password</h3>
          <input type="password" id="settings-current-password" placeholder="Current Password" />
          <input type="password" id="settings-new-password" placeholder="New Password (min 8 chars)" />
          <button class="btn" id="change-password-btn" style="margin-top: 10px;">Change Password</button>
          <div id="change-password-msg" class="muted small" style="margin-top: 8px;"></div>
        </div>

        <div class="card">
          <h3>📱 Share Your Portal</h3>
          <div class="form-row">
            <input type="text" id="portal-url" readonly value="https://fittrack-trainer.workers.dev/trainer/${trainerId}" style="flex: 1;" />
            <button class="btn" id="copy-portal-url-btn" style="padding: 10px 16px;">📋 Copy</button>
          </div>
          <div class="muted small" style="margin-top: 8px;">Share this URL with clients to give them access to your portal.</div>
          <h4 style="margin-top: 16px;">QR Code</h4>
          <img id="qr-code-img" src="https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=https://fittrack-trainer.workers.dev/trainer/${trainerId}" alt="QR Code" style="max-width: 280px; border-radius: 12px; border: 1px solid var(--border);" />
        </div>

        <div class="card">
          <h3>📧 Email Notifications</h3>
          <div class="muted">Email notification settings and integrations coming soon.</div>
        </div>
      </div>
    </div>
  </div>

  <div id="toast" class="toast"></div>

  <script>
    const trainerId = ${trainerId};
    const apiBase = '/api';

    // Tab Switching
    function switchTab(tabName) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
      document.querySelector(\`.tab[data-tab="\${tabName}"]\`)?.classList.add('active');
      document.getElementById(\`tab-\${tabName}\`)?.classList.remove('hidden');

      // Load data for specific tabs
      if (tabName === 'clients') loadClients();
      if (tabName === 'dashboard') loadDashboardStats();
      if (tabName === 'analytics') loadAnalytics();
    }

    document.querySelectorAll('.tab').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Toast Helper
    function toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 3000);
    }

    // HTML Escape
    function esc(s) {
      return String(s || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]));
    }

    // Load Clients
    async function loadClients() {
      try {
        const r = await fetch(\`\${apiBase}/clients?trainerId=\${trainerId}&_=\${Date.now()}\`, { cache: 'no-store' });
        const data = await r.json().catch(() => ({clients: []}));
        const clients = Array.isArray(data.clients) ? data.clients : [];
        
        document.getElementById('clients-count').textContent = \`Clients: \${clients.length}\`;
        const list = document.getElementById('clients-list');
        list.innerHTML = '';

        if (clients.length === 0) {
          list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👥</div><div>No clients yet. Add your first client above!</div></div>';
          return;
        }

        clients.forEach(c => {
          const div = document.createElement('div');
          div.className = 'row';
          const shareUrl = c.share_token ? \`/profile/\${c.share_token}\` : \`/client/\${(c.name || 'client').replace(/\\s+/g, '').toLowerCase()}\`;
          div.innerHTML = \`
            <div class="row-left">
              <div style="font-weight: 600;">\${esc(c.name || 'Unnamed')}</div>
              <div class="muted small">\${esc(c.email || '')}</div>
            </div>
            <div class="row-right">
              <button class="btn btn-secondary" style="padding: 6px 12px;" onclick="copyShareUrl('\${shareUrl}')">📋 Share</button>
              <button class="btn" style="padding: 6px 12px;" onclick="viewClient(\${c.id})">👁️ View</button>
            </div>
          \`;
          list.appendChild(div);
        });

        // Populate client dropdowns
        populateClientDropdowns(clients);
      } catch (e) {
        document.getElementById('clients-list').innerHTML = '<div class="muted">Failed to load clients.</div>';
      }
    }

    function populateClientDropdowns(clients) {
      const dropdowns = ['quest-client', 'measurement-client', 'photo-client', 'meal-client', 'ai-meal-client', 'workout-client'];
      dropdowns.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        select.innerHTML = '<option value="">Select Client...</option>';
        clients.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.id;
          opt.textContent = c.name || c.email || 'Unnamed';
          select.appendChild(opt);
        });
      });
    }

    function copyShareUrl(url) {
      navigator.clipboard.writeText(window.location.origin + url).then(() => toast('Share URL copied to clipboard!'));
    }

    function viewClient(clientId) {
      // TODO: Navigate to client detail page or open modal
      toast(\`Viewing client \${clientId} (detail page coming soon)\`);
    }

    // Create Client
    document.getElementById('create-client-btn').addEventListener('click', async () => {
      const name = document.getElementById('client-name').value.trim();
      const email = document.getElementById('client-email').value.trim();
      const phone = document.getElementById('client-phone').value.trim();
      const notes = document.getElementById('client-notes').value.trim();
      const msg = document.getElementById('create-client-msg');

      if (!name || !email) {
        msg.textContent = 'Name and email are required.';
        return;
      }

      try {
        const r = await fetch(\`\${apiBase}/clients\`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ name, email, phone, notes, trainerId })
        });
        if (!r.ok) {
          const t = await r.text();
          throw new Error(t || \`HTTP \${r.status}\`);
        }
        msg.textContent = 'Client created successfully!';
        document.getElementById('client-name').value = '';
        document.getElementById('client-email').value = '';
        document.getElementById('client-phone').value = '';
        document.getElementById('client-notes').value = '';
        toast('Client created!');
        loadClients();
      } catch (e) {
        msg.textContent = 'Failed to create client: ' + (e.message || e);
      }
    });

    // Refresh Clients
    document.getElementById('refresh-clients-btn').addEventListener('click', loadClients);

    // Assign Quest
    document.getElementById('assign-quest-btn').addEventListener('click', async () => {
      const clientId = document.getElementById('quest-client').value;
      const templateId = document.getElementById('quest-template').value;
      const deadline = document.getElementById('quest-deadline').value;
      const notes = document.getElementById('quest-notes').value.trim();
      const msg = document.getElementById('assign-quest-msg');

      if (!clientId || !templateId) {
        msg.textContent = 'Please select a client and quest template.';
        return;
      }

      try {
        const r = await fetch(\`\${apiBase}/quests/assign\`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ clientId, templateId, deadline, notes, trainerId })
        });
        if (!r.ok) {
          const t = await r.text();
          throw new Error(t || \`HTTP \${r.status}\`);
        }
        msg.textContent = 'Quest assigned successfully!';
        document.getElementById('quest-template').value = '';
        document.getElementById('quest-deadline').value = '';
        document.getElementById('quest-notes').value = '';
        toast('Quest assigned!');
      } catch (e) {
        msg.textContent = 'Failed to assign quest: ' + (e.message || e);
      }
    });

    // Add Measurement
    document.getElementById('add-measurement-btn').addEventListener('click', async () => {
      const clientId = document.getElementById('measurement-client').value;
      const date = document.getElementById('measurement-date').value;
      const weightLbs = document.getElementById('measurement-weight').value;
      const bodyFat = document.getElementById('measurement-bodyfat').value;
      const waistIn = document.getElementById('measurement-waist').value;
      const chestIn = document.getElementById('measurement-chest').value;
      const armsIn = document.getElementById('measurement-arms').value;
      const thighsIn = document.getElementById('measurement-thighs').value;
      const msg = document.getElementById('add-measurement-msg');

      if (!clientId || !date) {
        msg.textContent = 'Please select a client and date.';
        return;
      }

      // Convert imperial to metric for D1 storage
      const weightKg = weightLbs ? (parseFloat(weightLbs) / 2.20462).toFixed(2) : null;
      const waistCm = waistIn ? (parseFloat(waistIn) * 2.54).toFixed(2) : null;
      const chestCm = chestIn ? (parseFloat(chestIn) * 2.54).toFixed(2) : null;
      const armsCm = armsIn ? (parseFloat(armsIn) * 2.54).toFixed(2) : null;
      const thighsCm = thighsIn ? (parseFloat(thighsIn) * 2.54).toFixed(2) : null;

      try {
        const r = await fetch(\`\${apiBase}/measurements\`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            clientId,
            measurement_date: date,
            weight_kg: weightKg,
            body_fat_percentage: bodyFat || null,
            waist_cm: waistCm,
            chest_cm: chestCm,
            arms_cm: armsCm,
            thighs_cm: thighsCm
          })
        });
        if (!r.ok) {
          const t = await r.text();
          throw new Error(t || \`HTTP \${r.status}\`);
        }
        msg.textContent = 'Measurement added successfully!';
        document.getElementById('measurement-weight').value = '';
        document.getElementById('measurement-bodyfat').value = '';
        document.getElementById('measurement-waist').value = '';
        document.getElementById('measurement-chest').value = '';
        document.getElementById('measurement-arms').value = '';
        document.getElementById('measurement-thighs').value = '';
        toast('Measurement added!');
      } catch (e) {
        msg.textContent = 'Failed to add measurement: ' + (e.message || e);
      }
    });

    // Upload Progress Photo
    document.getElementById('upload-photo-btn').addEventListener('click', async () => {
      const clientId = document.getElementById('photo-client').value;
      const file = document.getElementById('photo-file').files[0];
      const date = document.getElementById('photo-date').value;
      const msg = document.getElementById('upload-photo-msg');

      if (!clientId || !file || !date) {
        msg.textContent = 'Please select a client, photo, and date.';
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        msg.textContent = 'File size must be less than 10 MB.';
        return;
      }

      try {
        const fd = new FormData();
        fd.append('photo', file);
        fd.append('clientId', clientId);
        fd.append('date', date);

        const r = await fetch(\`\${apiBase}/progress-photos\`, {
          method: 'POST',
          body: fd
        });
        if (!r.ok) {
          const t = await r.text();
          throw new Error(t || \`HTTP \${r.status}\`);
        }
        msg.textContent = 'Photo uploaded successfully!';
        document.getElementById('photo-file').value = '';
        toast('Photo uploaded!');
      } catch (e) {
        msg.textContent = 'Failed to upload photo: ' + (e.message || e);
      }
    });

    // Create Meal Plan
    document.getElementById('create-meal-btn').addEventListener('click', async () => {
      const clientId = document.getElementById('meal-client').value;
      const date = document.getElementById('meal-date').value;
      const calories = document.getElementById('meal-calories').value;
      const protein = document.getElementById('meal-protein').value;
      const carbs = document.getElementById('meal-carbs').value;
      const fats = document.getElementById('meal-fats').value;
      const items = document.getElementById('meal-items').value.trim();
      const msg = document.getElementById('create-meal-msg');

      if (!clientId || !date) {
        msg.textContent = 'Please select a client and date.';
        return;
      }

      try {
        const r = await fetch(\`\${apiBase}/meal-plans\`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            clientId,
            date,
            calories: calories || null,
            protein: protein || null,
            carbs: carbs || null,
            fats: fats || null,
            items,
            trainerId
          })
        });
        if (!r.ok) {
          const t = await r.text();
          throw new Error(t || \`HTTP \${r.status}\`);
        }
        msg.textContent = 'Meal plan created successfully!';
        document.getElementById('meal-items').value = '';
        toast('Meal plan created!');
      } catch (e) {
        msg.textContent = 'Failed to create meal plan: ' + (e.message || e);
      }
    });

    // AI Meal Suggestions
    document.getElementById('ai-meal-btn').addEventListener('click', async () => {
      const clientId = document.getElementById('ai-meal-client').value;
      const goals = document.getElementById('ai-meal-goals').value.trim();
      const restrictions = document.getElementById('ai-meal-restrictions').value.trim();
      const calories = document.getElementById('ai-meal-calories').value;
      const result = document.getElementById('ai-meal-result');

      if (!clientId) {
        result.textContent = 'Please select a client.';
        return;
      }

      result.textContent = 'Generating AI meal suggestions...';

      try {
        const r = await fetch(\`\${apiBase}/ai/suggest-meal\`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ goals, restrictions, calories })
        });
        if (!r.ok) {
          const t = await r.text();
          throw new Error(t || \`HTTP \${r.status}\`);
        }
        const data = await r.json();
        result.innerHTML = \`<div style="background: var(--panel-dark); padding: 12px; border-radius: 8px; white-space: pre-wrap;">\${esc(data.meals || data.suggestion || 'No suggestions returned.')}</div>\`;
        toast('AI meal suggestions generated!');
      } catch (e) {
        result.textContent = 'Failed to generate meal suggestions: ' + (e.message || e);
      }
    });

    // Upload Video
    document.getElementById('upload-video-btn').addEventListener('click', async () => {
      const title = document.getElementById('video-title').value.trim();
      const file = document.getElementById('video-file').files[0];
      const difficulty = document.getElementById('video-difficulty').value;
      const category = document.getElementById('video-category').value;
      const description = document.getElementById('video-description').value.trim();
      const msg = document.getElementById('upload-video-msg');

      if (!title || !file) {
        msg.textContent = 'Title and video file are required.';
        return;
      }

      if (file.size > 100 * 1024 * 1024) {
        msg.textContent = 'File size must be less than 100 MB.';
        return;
      }

      try {
        const fd = new FormData();
        fd.append('video', file);
        fd.append('title', title);
        fd.append('difficulty', difficulty);
        fd.append('category', category);
        fd.append('description', description);
        fd.append('trainerId', trainerId);

        const r = await fetch(\`\${apiBase}/workout-videos\`, {
          method: 'POST',
          body: fd
        });
        if (!r.ok) {
          const t = await r.text();
          throw new Error(t || \`HTTP \${r.status}\`);
        }
        msg.textContent = 'Video uploaded successfully!';
        document.getElementById('video-title').value = '';
        document.getElementById('video-file').value = '';
        document.getElementById('video-description').value = '';
        toast('Video uploaded!');
      } catch (e) {
        msg.textContent = 'Failed to upload video: ' + (e.message || e);
      }
    });

    // Create Workout Plan
    document.getElementById('create-workout-btn').addEventListener('click', async () => {
      const clientId = document.getElementById('workout-client').value;
      const name = document.getElementById('workout-name').value.trim();
      const exercises = document.getElementById('workout-exercises').value.trim();
      const msg = document.getElementById('create-workout-msg');

      if (!clientId || !name || !exercises) {
        msg.textContent = 'Please select a client, enter a name, and add exercises.';
        return;
      }

      try {
        const r = await fetch(\`\${apiBase}/workout-plans\`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ clientId, name, exercises, trainerId })
        });
        if (!r.ok) {
          const t = await r.text();
          throw new Error(t || \`HTTP \${r.status}\`);
        }
        msg.textContent = 'Workout plan created successfully!';
        document.getElementById('workout-name').value = '';
        document.getElementById('workout-exercises').value = '';
        toast('Workout plan created!');
      } catch (e) {
        msg.textContent = 'Failed to create workout plan: ' + (e.message || e);
      }
    });

    // Upload Logo
    document.getElementById('upload-logo-btn').addEventListener('click', async () => {
      const file = document.getElementById('settings-logo-file').files[0];
      const msg = document.getElementById('upload-logo-msg');

      if (!file) {
        msg.textContent = 'Please select a file.';
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        msg.textContent = 'File size must be less than 5 MB.';
        return;
      }

      try {
        const fd = new FormData();
        fd.append('logo', file);

        const r = await fetch(\`\${apiBase}/trainers/\${trainerId}/logo\`, {
          method: 'POST',
          body: fd
        });
        if (!r.ok) {
          const t = await r.text();
          throw new Error(t || \`HTTP \${r.status}\`);
        }
        msg.textContent = 'Logo uploaded successfully!';
        toast('Logo updated!');
      } catch (e) {
        msg.textContent = 'Failed to upload logo: ' + (e.message || e);
      }
    });

    // Change Password
    document.getElementById('change-password-btn').addEventListener('click', async () => {
      const current = document.getElementById('settings-current-password').value;
      const newPwd = document.getElementById('settings-new-password').value;
      const msg = document.getElementById('change-password-msg');

      if (!current || !newPwd) {
        msg.textContent = 'Please enter current and new password.';
        return;
      }

      if (newPwd.length < 8) {
        msg.textContent = 'New password must be at least 8 characters.';
        return;
      }

      try {
        const r = await fetch(\`\${apiBase}/trainers/\${trainerId}/password\`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ currentPassword: current, newPassword: newPwd })
        });
        if (!r.ok) {
          const t = await r.text();
          throw new Error(t || \`HTTP \${r.status}\`);
        }
        msg.textContent = 'Password changed successfully!';
        document.getElementById('settings-current-password').value = '';
        document.getElementById('settings-new-password').value = '';
        toast('Password updated!');
      } catch (e) {
        msg.textContent = 'Failed to change password: ' + (e.message || e);
      }
    });

    // Copy Portal URL
    document.getElementById('copy-portal-url-btn').addEventListener('click', () => {
      const url = document.getElementById('portal-url').value;
      navigator.clipboard.writeText(url).then(() => toast('Portal URL copied to clipboard!'));
    });

    // Load Dashboard Stats
    async function loadDashboardStats() {
      try {
        const r = await fetch(\`\${apiBase}/trainers/\${trainerId}/stats\`);
        const data = await r.json().catch(() => ({}));
        document.getElementById('stat-clients').textContent = data.total_clients || 0;
        document.getElementById('stat-quests').textContent = data.active_quests || 0;
        document.getElementById('stat-achievements').textContent = data.total_achievements || 0;
        document.getElementById('stat-measurements').textContent = data.total_measurements || 0;
      } catch (e) {
        console.error('Failed to load dashboard stats:', e);
      }
    }

    // Load Analytics
    async function loadAnalytics() {
      try {
        const r = await fetch(\`\${apiBase}/trainers/\${trainerId}/analytics\`);
        const data = await r.json().catch(() => ({}));
        document.getElementById('analytics-total-clients').textContent = data.total_clients || 0;
        document.getElementById('analytics-active-quests').textContent = data.active_quests || 0;
        document.getElementById('analytics-completed-quests').textContent = data.completed_quests || 0;
        document.getElementById('analytics-avg-progress').textContent = (data.avg_progress || 0) + '%';
      } catch (e) {
        console.error('Failed to load analytics:', e);
      }
    }

    // Initialize: set today's date for date inputs
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('measurement-date').value = today;
    document.getElementById('photo-date').value = today;
    document.getElementById('meal-date').value = today;

    // Load initial data
    loadDashboardStats();
    loadClients();
  </script>
</body>
</html>`;
}
