// Enhanced Client Portal HTML Generator with Quests, Achievements, and Imperial Units
// This will replace getProfileHTML in worker-enhanced.js

function getEnhancedClientPortalHTML(profile) {
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
  
  // Difficulty colors
  const difficultyColors = {
    easy: '#1BB55C',
    medium: '#FFB82B',
    hard: '#FF4B39',
    epic: '#9333EA'
  };
  
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
        
        /* Header */
        .header {
            text-align: center;
            padding: 30px 0;
            border-bottom: 3px solid #FF4B39;
            margin-bottom: 30px;
        }
        .avatar-container {
            width: 100px;
            height: 100px;
            margin: 0 auto 15px;
            border-radius: 50%;
            overflow: hidden;
            border: 4px solid #FFB82B;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        }
        .avatar-container img { width: 100%; height: 100%; object-fit: cover; }
        .header h1 {
            font-size: 2rem;
            background: linear-gradient(135deg, #FF4B39 0%, #FFB82B 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 8px;
        }
        .trainer-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: #2a2f42;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 0.85rem;
            color: #9ca3af;
        }
        .trainer-logo { width: 20px; height: 20px; border-radius: 50%; object-fit: cover; }
        
        /* XP Level Badge */
        .xp-badge {
            display: inline-block;
            background: linear-gradient(135deg, #9333EA 0%, #C026D3 100%);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            margin: 10px 0;
            box-shadow: 0 2px 8px rgba(147, 51, 234, 0.3);
        }
        
        /* Stats Grid */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 30px 0;
        }
        .stat-card {
            background: #2a2f42;
            padding: 20px;
            border-radius: 12px;
            border-left: 4px solid #1BB55C;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            transition: transform 0.2s;
        }
        .stat-card:hover { transform: translateY(-2px); }
        .stat-label {
            font-size: 0.75rem;
            color: #9ca3af;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 6px;
        }
        .stat-value {
            font-size: 1.75rem;
            font-weight: bold;
            color: #1BB55C;
        }
        
        /* Section */
        .section {
            background: #2a2f42;
            padding: 25px;
            border-radius: 12px;
            margin: 20px 0;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        }
        .section-title {
            font-size: 1.3rem;
            margin-bottom: 20px;
            color: #FFB82B;
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 600;
        }
        
        /* Quests */
        .quests-grid {
            display: grid;
            gap: 15px;
        }
        .quest-card {
            background: #1a1d2e;
            padding: 20px;
            border-radius: 10px;
            border-left: 4px solid #1BB55C;
            position: relative;
        }
        .quest-card.medium { border-left-color: #FFB82B; }
        .quest-card.hard { border-left-color: #FF4B39; }
        .quest-card.epic { border-left-color: #9333EA; }
        .quest-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 12px;
        }
        .quest-title {
            font-size: 1.1rem;
            font-weight: 600;
            color: #e5e7eb;
        }
        .quest-difficulty {
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
        }
        .quest-difficulty.easy { background: #1BB55C; color: white; }
        .quest-difficulty.medium { background: #FFB82B; color: #1a1d2e; }
        .quest-difficulty.hard { background: #FF4B39; color: white; }
        .quest-difficulty.epic { background: #9333EA; color: white; }
        .quest-description {
            color: #9ca3af;
            font-size: 0.9rem;
            margin-bottom: 15px;
            line-height: 1.4;
        }
        .progress-bar {
            background: #374151;
            border-radius: 10px;
            height: 12px;
            overflow: hidden;
            margin-bottom: 8px;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #1BB55C 0%, #10B981 100%);
            transition: width 0.3s ease;
        }
        .progress-text {
            font-size: 0.85rem;
            color: #9ca3af;
            display: flex;
            justify-content: space-between;
        }
        .quest-xp {
            color: #FFB82B;
            font-weight: 600;
        }
        
        /* Achievements */
        .achievements-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 15px;
        }
        .achievement-card {
            background: #1a1d2e;
            padding: 15px;
            border-radius: 10px;
            text-align: center;
            border: 2px solid #374151;
            transition: all 0.2s;
        }
        .achievement-card:hover {
            border-color: #FFB82B;
            transform: scale(1.05);
        }
        .achievement-icon {
            font-size: 2.5rem;
            margin-bottom: 8px;
        }
        .achievement-name {
            font-size: 0.85rem;
            font-weight: 600;
            color: #e5e7eb;
            margin-bottom: 4px;
        }
        .achievement-xp {
            font-size: 0.75rem;
            color: #FFB82B;
        }
        
        /* Measurements */
        .measurements-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .measurement-item {
            background: #1a1d2e;
            padding: 15px;
            border-radius: 8px;
            border-left: 3px solid #1BB55C;
        }
        .measurement-date {
            font-size: 0.8rem;
            color: #9ca3af;
            margin-bottom: 8px;
        }
        .measurement-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 10px;
        }
        .measurement-stat {
            font-size: 0.85rem;
        }
        .measurement-stat .label {
            color: #9ca3af;
            font-size: 0.75rem;
        }
        .measurement-stat .value {
            color: #e5e7eb;
            font-weight: 600;
        }
        
        /* Progress Photos */
        .photos-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 15px;
        }
        .photo-card {
            aspect-ratio: 3/4;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            cursor: pointer;
            transition: transform 0.2s;
        }
        .photo-card:hover { transform: scale(1.05); }
        .photo-card img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        /* Empty State */
        .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: #6b7280;
        }
        .empty-state-icon {
            font-size: 3rem;
            margin-bottom: 15px;
            opacity: 0.5;
        }
        .empty-state-text {
            font-size: 1.1rem;
            margin-bottom: 8px;
        }
        .empty-state-subtext {
            font-size: 0.9rem;
            color: #9ca3af;
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            .container { padding: 15px; }
            .header h1 { font-size: 1.6rem; }
            .stats-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
            .section { padding: 20px; }
            .achievements-grid { grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); }
        }
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
        
        <!-- Stats Overview -->
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
        
        <!-- Active Quests -->
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
        
        <!-- Achievements -->
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
        
        <!-- Recent Measurements -->
        <div class="section">
            <div class="section-title">📊 Recent Measurements</div>
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
        
        <!-- Progress Photos -->
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
        
        <!-- Milestones -->
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
