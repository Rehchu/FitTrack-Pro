// Trainer Portal API handlers
import { uploadToR2, deleteFromR2 } from '../utils/index.js';

export async function handleAPI(request, env, trainerId) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Client Management APIs
  if (path === '/api/clients' && method === 'GET') {
    return getClients(env, trainerId);
  }
  if (path === '/api/clients' && method === 'POST') {
    return createClient(request, env, trainerId);
  }
  if (path.match(/^\/api\/clients\/\d+$/) && method === 'GET') {
    const clientId = parseInt(path.split('/')[3]);
    return getClient(env, trainerId, clientId);
  }
  if (path.match(/^\/api\/clients\/\d+$/) && method === 'PUT') {
    const clientId = parseInt(path.split('/')[3]);
    return updateClient(request, env, trainerId, clientId);
  }
  if (path.match(/^\/api\/clients\/\d+$/) && method === 'DELETE') {
    const clientId = parseInt(path.split('/')[3]);
    return deleteClient(env, trainerId, clientId);
  }

  // Quest Management APIs
  if (path === '/api/quests/assign' && method === 'POST') {
    return assignQuest(request, env, trainerId);
  }
  if (path.match(/^\/api\/quests\/\d+\/progress$/) && method === 'PUT') {
    const questId = parseInt(path.split('/')[3]);
    return updateQuestProgress(request, env, trainerId, questId);
  }
  if (path === '/api/quests' && method === 'GET') {
    return getQuests(env, trainerId, url.searchParams);
  }

  // Measurement APIs
  if (path === '/api/measurements' && method === 'POST') {
    return addMeasurement(request, env, trainerId);
  }
  if (path === '/api/measurements' && method === 'GET') {
    return getMeasurements(env, trainerId, url.searchParams);
  }

  // Progress Photo APIs
  if (path === '/api/progress-photos' && method === 'POST') {
    return uploadProgressPhoto(request, env, trainerId);
  }
  if (path === '/api/progress-photos' && method === 'GET') {
    return getProgressPhotos(env, trainerId, url.searchParams);
  }

  // Meal Plan APIs
  if (path === '/api/meal-plans' && method === 'POST') {
    return createMealPlan(request, env, trainerId);
  }
  if (path === '/api/meal-plans' && method === 'GET') {
    return getMealPlans(env, trainerId, url.searchParams);
  }

  // Workout Plan APIs
  if (path === '/api/workout-plans' && method === 'POST') {
    return createWorkoutPlan(request, env, trainerId);
  }
  if (path === '/api/workout-plans' && method === 'GET') {
    return getWorkoutPlans(env, trainerId, url.searchParams);
  }

  // Workout Video APIs
  if (path === '/api/workout-videos' && method === 'POST') {
    return uploadWorkoutVideo(request, env, trainerId);
  }
  if (path === '/api/workout-videos' && method === 'GET') {
    return getWorkoutVideos(env, trainerId, url.searchParams);
  }

  // AI APIs
  if (path === '/api/ai/suggest-meal' && method === 'POST') {
    return aiSuggestMeal(request, env);
  }
  if (path === '/api/ai/suggest-workout' && method === 'POST') {
    return aiSuggestWorkout(request, env);
  }

  // Trainer Settings APIs
  if (path.match(/^\/api\/trainers\/\d+\/logo$/) && method === 'POST') {
    return uploadTrainerLogo(request, env, trainerId);
  }
  if (path.match(/^\/api\/trainers\/\d+\/password$/) && method === 'PUT') {
    return changeTrainerPassword(request, env, trainerId);
  }

  // Analytics APIs
  if (path.match(/^\/api\/trainers\/\d+\/stats$/) && method === 'GET') {
    return getTrainerStats(env, trainerId);
  }
  if (path.match(/^\/api\/trainers\/\d+\/analytics$/) && method === 'GET') {
    return getTrainerAnalytics(env, trainerId);
  }

  // Email APIs
  if (path === '/api/email/send' && method === 'POST') {
    return sendEmail(request, env, trainerId);
  }

  return new Response('Not Found', { status: 404 });
}

// ============================================================================
// CLIENT MANAGEMENT APIs
// ============================================================================

async function getClients(env, trainerId) {
  try {
    const stmt = env.FITTRACK_D1.prepare(
      'SELECT id, name, email, phone, notes, share_token, created_at FROM clients WHERE trainer_id = ? ORDER BY created_at DESC'
    ).bind(trainerId);
    const { results } = await stmt.all();
    return jsonResponse({ clients: results || [] });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return jsonResponse({ error: 'Failed to fetch clients' }, 500);
  }
}

async function createClient(request, env, trainerId) {
  try {
    const body = await request.json();
    const { name, email, phone, notes } = body;

    if (!name || !email) {
      return jsonResponse({ error: 'Name and email are required' }, 400);
    }

    // Generate unique share token
    const shareToken = crypto.randomUUID();

    const stmt = env.FITTRACK_D1.prepare(
      'INSERT INTO clients (trainer_id, name, email, phone, notes, share_token) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(trainerId, name, email, phone || null, notes || null, shareToken);
    
    const result = await stmt.run();
    
    return jsonResponse({ 
      success: true, 
      clientId: result.meta.last_row_id,
      shareToken 
    }, 201);
  } catch (error) {
    console.error('Error creating client:', error);
    return jsonResponse({ error: 'Failed to create client' }, 500);
  }
}

async function getClient(env, trainerId, clientId) {
  try {
    const stmt = env.FITTRACK_D1.prepare(
      'SELECT * FROM clients WHERE id = ? AND trainer_id = ?'
    ).bind(clientId, trainerId);
    const result = await stmt.first();
    
    if (!result) {
      return jsonResponse({ error: 'Client not found' }, 404);
    }
    
    return jsonResponse({ client: result });
  } catch (error) {
    console.error('Error fetching client:', error);
    return jsonResponse({ error: 'Failed to fetch client' }, 500);
  }
}

async function updateClient(request, env, trainerId, clientId) {
  try {
    const body = await request.json();
    const { name, email, phone, notes } = body;

    const stmt = env.FITTRACK_D1.prepare(
      'UPDATE clients SET name = ?, email = ?, phone = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND trainer_id = ?'
    ).bind(name, email, phone || null, notes || null, clientId, trainerId);
    
    const result = await stmt.run();
    
    if (result.meta.changes === 0) {
      return jsonResponse({ error: 'Client not found or no changes made' }, 404);
    }
    
    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Error updating client:', error);
    return jsonResponse({ error: 'Failed to update client' }, 500);
  }
}

async function deleteClient(env, trainerId, clientId) {
  try {
    const stmt = env.FITTRACK_D1.prepare(
      'DELETE FROM clients WHERE id = ? AND trainer_id = ?'
    ).bind(clientId, trainerId);
    
    const result = await stmt.run();
    
    if (result.meta.changes === 0) {
      return jsonResponse({ error: 'Client not found' }, 404);
    }
    
    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Error deleting client:', error);
    return jsonResponse({ error: 'Failed to delete client' }, 500);
  }
}

// ============================================================================
// QUEST MANAGEMENT APIs
// ============================================================================

async function assignQuest(request, env, trainerId) {
  try {
    const body = await request.json();
    const { clientId, templateId, deadline, notes } = body;

    if (!clientId || !templateId) {
      return jsonResponse({ error: 'Client ID and template ID are required' }, 400);
    }

    // Verify client belongs to trainer
    const clientCheck = await env.FITTRACK_D1.prepare(
      'SELECT id FROM clients WHERE id = ? AND trainer_id = ?'
    ).bind(clientId, trainerId).first();

    if (!clientCheck) {
      return jsonResponse({ error: 'Client not found or unauthorized' }, 403);
    }

    // Get quest template
    const template = await env.FITTRACK_D1.prepare(
      'SELECT * FROM quest_templates WHERE id = ?'
    ).bind(templateId).first();

    if (!template) {
      return jsonResponse({ error: 'Quest template not found' }, 404);
    }

    // Create quest
    const stmt = env.FITTRACK_D1.prepare(
      `INSERT INTO quests 
       (client_id, template_id, title, description, difficulty, xp_reward, target_value, current_progress, deadline, notes, status, assigned_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'active', ?)`
    ).bind(
      clientId,
      templateId,
      template.title,
      template.description,
      template.difficulty,
      template.xp_reward,
      template.target_value,
      deadline || null,
      notes || null,
      trainerId
    );
    
    const result = await stmt.run();
    
    return jsonResponse({ 
      success: true, 
      questId: result.meta.last_row_id 
    }, 201);
  } catch (error) {
    console.error('Error assigning quest:', error);
    return jsonResponse({ error: 'Failed to assign quest' }, 500);
  }
}

async function updateQuestProgress(request, env, trainerId, questId) {
  try {
    const body = await request.json();
    const { progress } = body;

    if (progress === undefined || progress === null) {
      return jsonResponse({ error: 'Progress value is required' }, 400);
    }

    // Verify quest belongs to trainer's client
    const quest = await env.FITTRACK_D1.prepare(
      `SELECT q.*, c.trainer_id 
       FROM quests q 
       JOIN clients c ON q.client_id = c.id 
       WHERE q.id = ?`
    ).bind(questId).first();

    if (!quest) {
      return jsonResponse({ error: 'Quest not found' }, 404);
    }

    if (quest.trainer_id !== trainerId) {
      return jsonResponse({ error: 'Unauthorized' }, 403);
    }

    // Update progress
    const newProgress = Math.min(progress, quest.target_value);
    const newStatus = newProgress >= quest.target_value ? 'completed' : 'active';
    const completedAt = newStatus === 'completed' ? new Date().toISOString() : null;

    const stmt = env.FITTRACK_D1.prepare(
      'UPDATE quests SET current_progress = ?, status = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(newProgress, newStatus, completedAt, questId);
    
    await stmt.run();

    // If completed, award XP and create achievement
    if (newStatus === 'completed') {
      await awardQuestCompletion(env, quest);
    }
    
    return jsonResponse({ success: true, status: newStatus });
  } catch (error) {
    console.error('Error updating quest progress:', error);
    return jsonResponse({ error: 'Failed to update quest progress' }, 500);
  }
}

async function getQuests(env, trainerId, params) {
  try {
    const clientId = params.get('clientId');
    const status = params.get('status');

    let query = `
      SELECT q.*, c.name as client_name 
      FROM quests q 
      JOIN clients c ON q.client_id = c.id 
      WHERE c.trainer_id = ?
    `;
    const bindings = [trainerId];

    if (clientId) {
      query += ' AND q.client_id = ?';
      bindings.push(clientId);
    }

    if (status) {
      query += ' AND q.status = ?';
      bindings.push(status);
    }

    query += ' ORDER BY q.created_at DESC';

    const stmt = env.FITTRACK_D1.prepare(query).bind(...bindings);
    const { results } = await stmt.all();
    
    return jsonResponse({ quests: results || [] });
  } catch (error) {
    console.error('Error fetching quests:', error);
    return jsonResponse({ error: 'Failed to fetch quests' }, 500);
  }
}

async function awardQuestCompletion(env, quest) {
  try {
    // Award XP
    await env.FITTRACK_D1.prepare(
      `INSERT INTO xp_tracking (client_id, quest_id, xp_earned, earned_at) 
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)`
    ).bind(quest.client_id, quest.id, quest.xp_reward).run();

    // Create achievement
    await env.FITTRACK_D1.prepare(
      `INSERT INTO achievements (client_id, quest_id, title, description, xp_awarded, earned_at) 
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
    ).bind(
      quest.client_id,
      quest.id,
      `Completed: ${quest.title}`,
      quest.description,
      quest.xp_reward
    ).run();

    // Check for milestones
    await checkMilestones(env, quest.client_id);
  } catch (error) {
    console.error('Error awarding quest completion:', error);
  }
}

async function checkMilestones(env, clientId) {
  try {
    // Get total XP
    const xpResult = await env.FITTRACK_D1.prepare(
      'SELECT COALESCE(SUM(xp_earned), 0) as total_xp FROM xp_tracking WHERE client_id = ?'
    ).bind(clientId).first();

    const totalXP = xpResult?.total_xp || 0;

    // Define milestones
    const milestones = [
      { level: 1, xp_required: 100, title: 'Getting Started', badge: '🌱' },
      { level: 2, xp_required: 500, title: 'Consistent Trainer', badge: '💪' },
      { level: 3, xp_required: 1000, title: 'Fitness Enthusiast', badge: '🔥' },
      { level: 4, xp_required: 2500, title: 'Dedicated Athlete', badge: '⭐' },
      { level: 5, xp_required: 5000, title: 'Fitness Champion', badge: '🏆' },
    ];

    for (const milestone of milestones) {
      if (totalXP >= milestone.xp_required) {
        // Check if milestone already awarded
        const existing = await env.FITTRACK_D1.prepare(
          'SELECT id FROM milestones WHERE client_id = ? AND level = ?'
        ).bind(clientId, milestone.level).first();

        if (!existing) {
          await env.FITTRACK_D1.prepare(
            `INSERT INTO milestones (client_id, level, title, xp_required, badge, achieved_at) 
             VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
          ).bind(clientId, milestone.level, milestone.title, milestone.xp_required, milestone.badge).run();
        }
      }
    }
  } catch (error) {
    console.error('Error checking milestones:', error);
  }
}

// ============================================================================
// MEASUREMENT APIs
// ============================================================================

async function addMeasurement(request, env, trainerId) {
  try {
    const body = await request.json();
    const { clientId, measurement_date, weight_kg, body_fat_percentage, waist_cm, chest_cm, arms_cm, thighs_cm } = body;

    if (!clientId || !measurement_date) {
      return jsonResponse({ error: 'Client ID and date are required' }, 400);
    }

    // Verify client belongs to trainer
    const clientCheck = await env.FITTRACK_D1.prepare(
      'SELECT id FROM clients WHERE id = ? AND trainer_id = ?'
    ).bind(clientId, trainerId).first();

    if (!clientCheck) {
      return jsonResponse({ error: 'Client not found or unauthorized' }, 403);
    }

    const stmt = env.FITTRACK_D1.prepare(
      `INSERT INTO measurements 
       (client_id, measurement_date, weight_kg, body_fat_percentage, waist_cm, chest_cm, arms_cm, thighs_cm) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      clientId,
      measurement_date,
      weight_kg || null,
      body_fat_percentage || null,
      waist_cm || null,
      chest_cm || null,
      arms_cm || null,
      thighs_cm || null
    );
    
    const result = await stmt.run();
    
    return jsonResponse({ 
      success: true, 
      measurementId: result.meta.last_row_id 
    }, 201);
  } catch (error) {
    console.error('Error adding measurement:', error);
    return jsonResponse({ error: 'Failed to add measurement' }, 500);
  }
}

async function getMeasurements(env, trainerId, params) {
  try {
    const clientId = params.get('clientId');

    if (!clientId) {
      return jsonResponse({ error: 'Client ID is required' }, 400);
    }

    // Verify client belongs to trainer
    const clientCheck = await env.FITTRACK_D1.prepare(
      'SELECT id FROM clients WHERE id = ? AND trainer_id = ?'
    ).bind(clientId, trainerId).first();

    if (!clientCheck) {
      return jsonResponse({ error: 'Client not found or unauthorized' }, 403);
    }

    const stmt = env.FITTRACK_D1.prepare(
      'SELECT * FROM measurements WHERE client_id = ? ORDER BY measurement_date DESC'
    ).bind(clientId);
    
    const { results } = await stmt.all();
    
    return jsonResponse({ measurements: results || [] });
  } catch (error) {
    console.error('Error fetching measurements:', error);
    return jsonResponse({ error: 'Failed to fetch measurements' }, 500);
  }
}

// ============================================================================
// PROGRESS PHOTO APIs
// ============================================================================

async function uploadProgressPhoto(request, env, trainerId) {
  try {
    const formData = await request.formData();
    const photo = formData.get('photo');
    const clientId = formData.get('clientId');
    const date = formData.get('date');

    if (!photo || !clientId || !date) {
      return jsonResponse({ error: 'Photo, client ID, and date are required' }, 400);
    }

    // Verify client belongs to trainer
    const clientCheck = await env.FITTRACK_D1.prepare(
      'SELECT id FROM clients WHERE id = ? AND trainer_id = ?'
    ).bind(clientId, trainerId).first();

    if (!clientCheck) {
      return jsonResponse({ error: 'Client not found or unauthorized' }, 403);
    }

    // Upload to R2
    const filename = `progress/${clientId}/${Date.now()}_${photo.name}`;
    const photoUrl = await uploadToR2(env.R2_UPLOADS, filename, photo);

    // Create thumbnail
    const thumbnailUrl = photoUrl; // TODO: Implement actual thumbnail generation

    // Save to database
    const stmt = env.FITTRACK_D1.prepare(
      `INSERT INTO progress_photos (client_id, photo_url, thumbnail_url, photo_date) 
       VALUES (?, ?, ?, ?)`
    ).bind(clientId, photoUrl, thumbnailUrl, date);
    
    const result = await stmt.run();
    
    return jsonResponse({ 
      success: true, 
      photoId: result.meta.last_row_id,
      photoUrl,
      thumbnailUrl
    }, 201);
  } catch (error) {
    console.error('Error uploading progress photo:', error);
    return jsonResponse({ error: 'Failed to upload photo' }, 500);
  }
}

async function getProgressPhotos(env, trainerId, params) {
  try {
    const clientId = params.get('clientId');

    if (!clientId) {
      return jsonResponse({ error: 'Client ID is required' }, 400);
    }

    // Verify client belongs to trainer
    const clientCheck = await env.FITTRACK_D1.prepare(
      'SELECT id FROM clients WHERE id = ? AND trainer_id = ?'
    ).bind(clientId, trainerId).first();

    if (!clientCheck) {
      return jsonResponse({ error: 'Client not found or unauthorized' }, 403);
    }

    const stmt = env.FITTRACK_D1.prepare(
      'SELECT * FROM progress_photos WHERE client_id = ? ORDER BY photo_date DESC'
    ).bind(clientId);
    
    const { results } = await stmt.all();
    
    return jsonResponse({ photos: results || [] });
  } catch (error) {
    console.error('Error fetching progress photos:', error);
    return jsonResponse({ error: 'Failed to fetch photos' }, 500);
  }
}

// ============================================================================
// MEAL PLAN APIs
// ============================================================================

async function createMealPlan(request, env, trainerId) {
  try {
    const body = await request.json();
    const { clientId, date, calories, protein, carbs, fats, items } = body;

    if (!clientId || !date) {
      return jsonResponse({ error: 'Client ID and date are required' }, 400);
    }

    // Verify client belongs to trainer
    const clientCheck = await env.FITTRACK_D1.prepare(
      'SELECT id FROM clients WHERE id = ? AND trainer_id = ?'
    ).bind(clientId, trainerId).first();

    if (!clientCheck) {
      return jsonResponse({ error: 'Client not found or unauthorized' }, 403);
    }

    // Store in KV for quick access
    const planKey = `meal:${clientId}:${date}`;
    const planData = {
      clientId,
      date,
      calories: calories || null,
      protein: protein || null,
      carbs: carbs || null,
      fats: fats || null,
      items: items || '',
      createdBy: trainerId,
      createdAt: new Date().toISOString()
    };

    await env.FITTRACK_KV.put(planKey, JSON.stringify(planData));
    
    return jsonResponse({ success: true, plan: planData }, 201);
  } catch (error) {
    console.error('Error creating meal plan:', error);
    return jsonResponse({ error: 'Failed to create meal plan' }, 500);
  }
}

async function getMealPlans(env, trainerId, params) {
  try {
    const clientId = params.get('clientId');

    if (!clientId) {
      return jsonResponse({ error: 'Client ID is required' }, 400);
    }

    // Verify client belongs to trainer
    const clientCheck = await env.FITTRACK_D1.prepare(
      'SELECT id FROM clients WHERE id = ? AND trainer_id = ?'
    ).bind(clientId, trainerId).first();

    if (!clientCheck) {
      return jsonResponse({ error: 'Client not found or unauthorized' }, 403);
    }

    // List all meal plans from KV (prefix scan)
    const list = await env.FITTRACK_KV.list({ prefix: `meal:${clientId}:` });
    const plans = [];

    for (const key of list.keys) {
      const data = await env.FITTRACK_KV.get(key.name);
      if (data) {
        plans.push(JSON.parse(data));
      }
    }

    // Sort by date descending
    plans.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return jsonResponse({ plans });
  } catch (error) {
    console.error('Error fetching meal plans:', error);
    return jsonResponse({ error: 'Failed to fetch meal plans' }, 500);
  }
}

// ============================================================================
// WORKOUT PLAN APIs
// ============================================================================

async function createWorkoutPlan(request, env, trainerId) {
  try {
    const body = await request.json();
    const { clientId, name, exercises } = body;

    if (!clientId || !name || !exercises) {
      return jsonResponse({ error: 'Client ID, name, and exercises are required' }, 400);
    }

    // Verify client belongs to trainer
    const clientCheck = await env.FITTRACK_D1.prepare(
      'SELECT id FROM clients WHERE id = ? AND trainer_id = ?'
    ).bind(clientId, trainerId).first();

    if (!clientCheck) {
      return jsonResponse({ error: 'Client not found or unauthorized' }, 403);
    }

    // Store in KV
    const planId = crypto.randomUUID();
    const planKey = `workout:${clientId}:${planId}`;
    const planData = {
      id: planId,
      clientId,
      name,
      exercises,
      createdBy: trainerId,
      createdAt: new Date().toISOString()
    };

    await env.FITTRACK_KV.put(planKey, JSON.stringify(planData));
    
    return jsonResponse({ success: true, plan: planData }, 201);
  } catch (error) {
    console.error('Error creating workout plan:', error);
    return jsonResponse({ error: 'Failed to create workout plan' }, 500);
  }
}

async function getWorkoutPlans(env, trainerId, params) {
  try {
    const clientId = params.get('clientId');

    if (!clientId) {
      return jsonResponse({ error: 'Client ID is required' }, 400);
    }

    // Verify client belongs to trainer
    const clientCheck = await env.FITTRACK_D1.prepare(
      'SELECT id FROM clients WHERE id = ? AND trainer_id = ?'
    ).bind(clientId, trainerId).first();

    if (!clientCheck) {
      return jsonResponse({ error: 'Client not found or unauthorized' }, 403);
    }

    // List all workout plans from KV
    const list = await env.FITTRACK_KV.list({ prefix: `workout:${clientId}:` });
    const plans = [];

    for (const key of list.keys) {
      const data = await env.FITTRACK_KV.get(key.name);
      if (data) {
        plans.push(JSON.parse(data));
      }
    }

    plans.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return jsonResponse({ plans });
  } catch (error) {
    console.error('Error fetching workout plans:', error);
    return jsonResponse({ error: 'Failed to fetch workout plans' }, 500);
  }
}

// ============================================================================
// WORKOUT VIDEO APIs
// ============================================================================

async function uploadWorkoutVideo(request, env, trainerId) {
  try {
    const formData = await request.formData();
    const video = formData.get('video');
    const title = formData.get('title');
    const difficulty = formData.get('difficulty');
    const category = formData.get('category');
    const description = formData.get('description');

    if (!video || !title) {
      return jsonResponse({ error: 'Video and title are required' }, 400);
    }

    // Upload to R2
    const filename = `videos/${trainerId}/${Date.now()}_${video.name}`;
    const videoUrl = await uploadToR2(env.R2_UPLOADS, filename, video);

    // Store metadata in KV
    const videoId = crypto.randomUUID();
    const videoKey = `video:${videoId}`;
    const videoData = {
      id: videoId,
      title,
      url: videoUrl,
      difficulty: difficulty || null,
      category: category || null,
      description: description || null,
      trainerId,
      createdAt: new Date().toISOString()
    };

    await env.FITTRACK_KV.put(videoKey, JSON.stringify(videoData));
    
    return jsonResponse({ success: true, video: videoData }, 201);
  } catch (error) {
    console.error('Error uploading workout video:', error);
    return jsonResponse({ error: 'Failed to upload video' }, 500);
  }
}

async function getWorkoutVideos(env, trainerId, params) {
  try {
    // List all videos from this trainer
    const list = await env.FITTRACK_KV.list({ prefix: 'video:' });
    const videos = [];

    for (const key of list.keys) {
      const data = await env.FITTRACK_KV.get(key.name);
      if (data) {
        const video = JSON.parse(data);
        if (video.trainerId === trainerId) {
          videos.push(video);
        }
      }
    }

    videos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return jsonResponse({ videos });
  } catch (error) {
    console.error('Error fetching workout videos:', error);
    return jsonResponse({ error: 'Failed to fetch videos' }, 500);
  }
}

// ============================================================================
// AI APIs
// ============================================================================

async function aiSuggestMeal(request, env) {
  try {
    const body = await request.json();
    const { goals, restrictions, calories } = body;

    if (!env.AI) {
      return jsonResponse({ error: 'AI service not available' }, 503);
    }

    const prompt = `Generate a daily meal plan with the following requirements:
- Goals: ${goals || 'general health'}
- Dietary Restrictions: ${restrictions || 'none'}
- Target Calories: ${calories || '2000'} calories

Provide a complete meal plan with breakfast, lunch, dinner, and snacks. Include calorie counts and macros for each meal.`;

    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [{ role: 'user', content: prompt }]
    });

    return jsonResponse({ 
      meals: response.response || 'No meal suggestions generated',
      prompt 
    });
  } catch (error) {
    console.error('Error generating AI meal suggestions:', error);
    return jsonResponse({ error: 'Failed to generate meal suggestions' }, 500);
  }
}

async function aiSuggestWorkout(request, env) {
  try {
    const body = await request.json();
    const { goals, experience, equipment } = body;

    if (!env.AI) {
      return jsonResponse({ error: 'AI service not available' }, 503);
    }

    const prompt = `Generate a workout plan with the following requirements:
- Fitness Goals: ${goals || 'general fitness'}
- Experience Level: ${experience || 'beginner'}
- Available Equipment: ${equipment || 'bodyweight only'}

Provide a complete workout with exercises, sets, reps, and rest periods.`;

    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [{ role: 'user', content: prompt }]
    });

    return jsonResponse({ 
      workout: response.response || 'No workout suggestions generated',
      prompt 
    });
  } catch (error) {
    console.error('Error generating AI workout suggestions:', error);
    return jsonResponse({ error: 'Failed to generate workout suggestions' }, 500);
  }
}

// ============================================================================
// TRAINER SETTINGS APIs
// ============================================================================

async function uploadTrainerLogo(request, env, trainerId) {
  try {
    const formData = await request.formData();
    const logo = formData.get('logo');

    if (!logo) {
      return jsonResponse({ error: 'Logo file is required' }, 400);
    }

    // Upload to R2
    const filename = `logos/${trainerId}/${Date.now()}_${logo.name}`;
    const logoUrl = await uploadToR2(env.R2_UPLOADS, filename, logo);

    // Update trainer record
    const stmt = env.FITTRACK_D1.prepare(
      'UPDATE trainers SET logo_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(logoUrl, trainerId);
    
    await stmt.run();
    
    return jsonResponse({ success: true, logoUrl });
  } catch (error) {
    console.error('Error uploading logo:', error);
    return jsonResponse({ error: 'Failed to upload logo' }, 500);
  }
}

async function changeTrainerPassword(request, env, trainerId) {
  try {
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return jsonResponse({ error: 'Current and new password are required' }, 400);
    }

    if (newPassword.length < 8) {
      return jsonResponse({ error: 'New password must be at least 8 characters' }, 400);
    }

    // Get current password hash
    const trainer = await env.FITTRACK_D1.prepare(
      'SELECT password_hash FROM trainers WHERE id = ?'
    ).bind(trainerId).first();

    if (!trainer) {
      return jsonResponse({ error: 'Trainer not found' }, 404);
    }

    // Verify current password (simplified - use bcrypt in production)
    // TODO: Implement proper password verification with bcrypt
    
    // Hash new password (simplified - use bcrypt in production)
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    const stmt = env.FITTRACK_D1.prepare(
      'UPDATE trainers SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(newPasswordHash, trainerId);
    
    await stmt.run();
    
    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Error changing password:', error);
    return jsonResponse({ error: 'Failed to change password' }, 500);
  }
}

// ============================================================================
// ANALYTICS APIs
// ============================================================================

async function getTrainerStats(env, trainerId) {
  try {
    // Get total clients
    const clientsResult = await env.FITTRACK_D1.prepare(
      'SELECT COUNT(*) as count FROM clients WHERE trainer_id = ?'
    ).bind(trainerId).first();

    // Get active quests
    const activeQuestsResult = await env.FITTRACK_D1.prepare(
      `SELECT COUNT(*) as count FROM quests q 
       JOIN clients c ON q.client_id = c.id 
       WHERE c.trainer_id = ? AND q.status = 'active'`
    ).bind(trainerId).first();

    // Get total achievements
    const achievementsResult = await env.FITTRACK_D1.prepare(
      `SELECT COUNT(*) as count FROM achievements a 
       JOIN clients c ON a.client_id = c.id 
       WHERE c.trainer_id = ?`
    ).bind(trainerId).first();

    // Get total measurements
    const measurementsResult = await env.FITTRACK_D1.prepare(
      `SELECT COUNT(*) as count FROM measurements m 
       JOIN clients c ON m.client_id = c.id 
       WHERE c.trainer_id = ?`
    ).bind(trainerId).first();

    return jsonResponse({
      total_clients: clientsResult?.count || 0,
      active_quests: activeQuestsResult?.count || 0,
      total_achievements: achievementsResult?.count || 0,
      total_measurements: measurementsResult?.count || 0
    });
  } catch (error) {
    console.error('Error fetching trainer stats:', error);
    return jsonResponse({ error: 'Failed to fetch stats' }, 500);
  }
}

async function getTrainerAnalytics(env, trainerId) {
  try {
    // Get total clients
    const clientsResult = await env.FITTRACK_D1.prepare(
      'SELECT COUNT(*) as count FROM clients WHERE trainer_id = ?'
    ).bind(trainerId).first();

    // Get active quests
    const activeQuestsResult = await env.FITTRACK_D1.prepare(
      `SELECT COUNT(*) as count FROM quests q 
       JOIN clients c ON q.client_id = c.id 
       WHERE c.trainer_id = ? AND q.status = 'active'`
    ).bind(trainerId).first();

    // Get completed quests
    const completedQuestsResult = await env.FITTRACK_D1.prepare(
      `SELECT COUNT(*) as count FROM quests q 
       JOIN clients c ON q.client_id = c.id 
       WHERE c.trainer_id = ? AND q.status = 'completed'`
    ).bind(trainerId).first();

    // Get average quest progress
    const avgProgressResult = await env.FITTRACK_D1.prepare(
      `SELECT AVG(CAST(current_progress AS REAL) / CAST(target_value AS REAL) * 100) as avg_progress 
       FROM quests q 
       JOIN clients c ON q.client_id = c.id 
       WHERE c.trainer_id = ? AND q.status = 'active'`
    ).bind(trainerId).first();

    return jsonResponse({
      total_clients: clientsResult?.count || 0,
      active_quests: activeQuestsResult?.count || 0,
      completed_quests: completedQuestsResult?.count || 0,
      avg_progress: Math.round(avgProgressResult?.avg_progress || 0)
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return jsonResponse({ error: 'Failed to fetch analytics' }, 500);
  }
}

// ============================================================================
// EMAIL APIs
// ============================================================================

async function sendEmail(request, env, trainerId) {
  try {
    const body = await request.json();
    const { to, subject, htmlContent, textContent } = body;

    if (!to || !subject || (!htmlContent && !textContent)) {
      return jsonResponse({ error: 'To, subject, and content are required' }, 400);
    }

    // TODO: Implement email sending with Resend, SendGrid, or Mailgun
    // For now, just log and return success
    console.log('Email would be sent:', { to, subject, from: trainerId });

    return jsonResponse({ 
      success: true, 
      message: 'Email sending not yet implemented',
      preview: { to, subject }
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return jsonResponse({ error: 'Failed to send email' }, 500);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

async function hashPassword(password) {
  // Simplified hash - use bcrypt or argon2 in production
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
