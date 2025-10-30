# FitTrack Pro - Cloudflare Features Quick Reference

## 🚀 Quick Start

```bash
# 1. Navigate to Cloudflare directory
cd "e:\FitTrack Pro 1.1\integrations\cloudflare"

# 2. Run deployment script
.\deploy.ps1

# 3. Test deployment
curl https://fittrack-pro-desktop.rehchu1.workers.dev/health
```

---

## 🔐 Secrets to Configure

### Required Secrets

```bash
# Generate strong secrets
openssl rand -base64 32    # For JWT_SECRET
openssl rand -hex 32       # For ENCRYPTION_KEY
openssl rand -hex 24       # For WEBHOOK_SECRET

# Set secrets via wrangler
wrangler secret put JWT_SECRET
# Paste: <your-jwt-secret>

wrangler secret put ENCRYPTION_KEY
# Paste: <your-encryption-key>

wrangler secret put WEBHOOK_SECRET
# Paste: <your-webhook-secret>

wrangler secret put USDA_API_KEY
# Paste: uH2TDQWthtdFvLn6Bz4wXe2VLBBGwA3SbeHPnGkJ

wrangler secret put EXERCISEDB_API_KEY
# Paste: 01a44cbd89msh864c4e87aba2d22p10f83cjsn2bea18eb05ec
```

### Optional Secrets

```bash
wrangler secret put OPENAI_API_KEY
# Paste: sk-... (from platform.openai.com)

wrangler secret put SMTP_PASSWORD
# Paste: <gmail-app-password>
```

---

## 🤖 Workers AI Usage

### 1. Meal Suggestions

**Endpoint**: `POST /api/ai/suggest-meal`

```javascript
// Request
fetch('https://fittrack-pro-desktop.rehchu1.workers.dev/api/ai/suggest-meal', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-User-ID': '123'
  },
  body: JSON.stringify({
    goals: 'weight loss',
    restrictions: 'vegetarian',
    calories: 2000
  })
});

// Response
{
  "meals": [
    {
      "name": "Quinoa Buddha Bowl",
      "ingredients": "quinoa, chickpeas, vegetables",
      "calories": 450,
      "protein": 18,
      "carbs": 60,
      "fat": 12
    },
    // ... more meals
  ]
}
```

### 2. Workout Plans

**Endpoint**: `POST /api/ai/suggest-workout`

```javascript
fetch('https://fittrack-pro-desktop.rehchu1.workers.dev/api/ai/suggest-workout', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-User-ID': '123'
  },
  body: JSON.stringify({
    fitnessLevel: 'intermediate',
    goals: 'muscle gain',
    equipment: 'dumbbells, barbell',
    duration: 45
  })
});

// Response
{
  "workout": [
    {
      "name": "Barbell Bench Press",
      "sets": 4,
      "reps": 8,
      "rest_seconds": 90
    },
    // ... more exercises
  ]
}
```

### 3. Progress Insights

**Endpoint**: `POST /api/ai/progress-insights`

```javascript
fetch('https://fittrack-pro-desktop.rehchu1.workers.dev/api/ai/progress-insights', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    measurements: [
      { date: '2025-10-01', weight: 85, waist: 90 },
      { date: '2025-10-29', weight: 82, waist: 87 }
    ],
    goals: 'lose 5kg, reduce waist by 5cm'
  })
});

// Response
{
  "insights": "Great progress! You've lost 3kg in 4 weeks..."
}
```

### Rate Limiting

- **10,000 neurons/day** = ~100 requests per user per day
- Implemented automatically in worker
- Error when limit reached: `{"error": "Daily limit reached for ai_requests (100)"}`

---

## 🔍 Semantic Search (Vectorize)

### Search Exercises

**Endpoint**: `GET /api/exercises/semantic?q={query}&limit={n}`

```javascript
// Search by description
fetch('https://fittrack-pro-desktop.rehchu1.workers.dev/api/exercises/semantic?q=chest+and+triceps+workout&limit=10')

// Response
{
  "exercises": [
    {
      "id": "exercise_123",
      "name": "Bench Press",
      "category": "strength",
      "difficulty": "intermediate",
      "equipment": "barbell",
      "target_muscles": "chest, triceps",
      "similarity": 0.92  // Relevance score
    },
    // ... more exercises
  ]
}
```

### Index Exercises (Admin Only)

**Endpoint**: `POST /api/admin/index-exercises`

```javascript
fetch('https://fittrack-pro-desktop.rehchu1.workers.dev/api/admin/index-exercises', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <admin-token>'
  },
  body: JSON.stringify({
    exercises: [
      {
        id: 1,
        name: "Push-up",
        description: "Classic bodyweight chest exercise",
        target_muscles: "chest, triceps, shoulders",
        category: "strength",
        difficulty: "beginner",
        equipment: "bodyweight"
      },
      // ... more exercises
    ]
  })
});

// Response
{
  "success": true,
  "indexed": 1000
}
```

---

## 💬 Real-time Chat (Durable Objects)

### WebSocket Connection

```javascript
// Connect to chat room
const roomId = 'trainer_123_client_456';
const ws = new WebSocket(
  `wss://fittrack-pro-desktop.rehchu1.workers.dev/chat/${roomId}?userId=123&userName=John`
);

ws.onopen = () => {
  console.log('Connected to chat');
};

// Receive messages
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'history':
      // Initial message history
      console.log('Messages:', data.messages);
      break;
    
    case 'message':
      // New message
      console.log(`${data.userName}: ${data.content}`);
      break;
    
    case 'typing':
      // Typing indicator
      console.log(`${data.userName} is typing...`);
      break;
    
    case 'user_joined':
      console.log(`${data.userName} joined`);
      break;
    
    case 'user_left':
      console.log(`${data.userName} left`);
      break;
  }
};

// Send message
ws.send(JSON.stringify({
  type: 'message',
  content: 'Hello!'
}));

// Send typing indicator
ws.send(JSON.stringify({
  type: 'typing',
  isTyping: true
}));

// Mark as read
ws.send(JSON.stringify({
  type: 'read_receipt',
  timestamp: Date.now()
}));
```

### REST API (Fallback)

```javascript
// Get message history
fetch('https://fittrack-pro-desktop.rehchu1.workers.dev/chat/trainer_123_client_456/messages')

// Send message via POST
fetch('https://fittrack-pro-desktop.rehchu1.workers.dev/chat/trainer_123_client_456/messages', {
  method: 'POST',
  body: JSON.stringify({
    userId: '123',
    userName: 'John',
    content: 'Hello via REST'
  })
});

// Get room status
fetch('https://fittrack-pro-desktop.rehchu1.workers.dev/chat/trainer_123_client_456/status')
```

---

## 📊 Analytics

### Track Custom Events

```javascript
// Automatically tracked:
// - api_request
// - profile_view
// - ai_meal_suggestion
// - ai_workout_suggestion
// - semantic_search
// - etc.

// Get analytics for trainer
fetch('https://fittrack-pro-desktop.rehchu1.workers.dev/api/analytics/dashboard?trainerId=123')

// Response
{
  "period": "last_7_days",
  "total_events": 1234,
  "events_by_type": [
    { "event_type": "api_request", "count": 800 },
    { "event_type": "profile_view", "count": 250 },
    { "event_type": "ai_meal_suggestion", "count": 100 },
    // ...
  ]
}
```

### Query D1 Analytics

```bash
# Top 10 most active trainers
wrangler d1 execute fittrack-pro-db --command="
  SELECT 
    trainer_id,
    COUNT(*) as total_requests
  FROM analytics_events
  WHERE timestamp > strftime('%s', 'now', '-7 days')
  GROUP BY trainer_id
  ORDER BY total_requests DESC
  LIMIT 10
"

# AI usage by model
wrangler d1 execute fittrack-pro-db --command="
  SELECT 
    model,
    COUNT(*) as requests,
    SUM(total_tokens) as total_tokens
  FROM ai_requests
  WHERE timestamp > strftime('%s', 'now', '-30 days')
  GROUP BY model
"

# Most viewed profiles
wrangler d1 execute fittrack-pro-db --command="
  SELECT * FROM profile_view_stats LIMIT 20
"
```

---

## 🗄️ D1 Database

### Direct Queries

```bash
# List all tables
wrangler d1 execute fittrack-pro-db --command="
  SELECT name FROM sqlite_master WHERE type='table'
"

# Get analytics summary
wrangler d1 execute fittrack-pro-db --command="
  SELECT * FROM daily_requests_by_trainer 
  WHERE date = DATE('now') 
  LIMIT 10
"

# Check AI usage today
wrangler d1 execute fittrack-pro-db --command="
  SELECT user_id, COUNT(*) as requests, SUM(total_tokens) as tokens
  FROM ai_requests
  WHERE DATE(timestamp, 'unixepoch') = DATE('now')
  GROUP BY user_id
"

# View cached profiles
wrangler d1 execute fittrack-pro-db --command="
  SELECT cache_key, client_id, updated_at 
  FROM profile_cache 
  WHERE expires_at > strftime('%s', 'now')
"
```

### Cleanup (Run Daily)

```bash
wrangler d1 execute fittrack-pro-db --command="
  DELETE FROM edge_sessions WHERE expires_at < strftime('%s', 'now');
  DELETE FROM profile_cache WHERE expires_at < strftime('%s', 'now');
  DELETE FROM api_cache WHERE expires_at < strftime('%s', 'now');
  VACUUM;
"
```

---

## 🔑 KV Operations

### Debug KV Cache

```bash
# List all keys
wrangler kv:key list --namespace-id=d31f5b43bd964ce78d87d9dd5878cc25

# Get specific key
wrangler kv:key get "profile:abc123" --namespace-id=d31f5b43bd964ce78d87d9dd5878cc25

# Put key
wrangler kv:key put "test-key" "test-value" --namespace-id=d31f5b43bd964ce78d87d9dd5878cc25

# Delete key
wrangler kv:key delete "test-key" --namespace-id=d31f5b43bd964ce78d87d9dd5878cc25
```

---

## 🧪 Testing

### Local Development

```bash
# Start local worker
wrangler dev

# Worker runs at http://localhost:8787
# Test endpoints:
curl http://localhost:8787/health
curl -X POST http://localhost:8787/api/ai/suggest-meal -d '{"goals":"weight loss"}'
```

### Live Logs

```bash
# View real-time logs
wrangler tail

# Filter logs
wrangler tail --format=pretty | grep "ai_request"
```

### Load Testing

```bash
# Test rate limits
for i in {1..150}; do
  curl -X POST https://fittrack-pro-desktop.rehchu1.workers.dev/api/ai/suggest-meal \
    -H "Content-Type: application/json" \
    -H "X-User-ID: test-user" \
    -d '{"goals":"test"}' &
done
```

---

## 📈 Monitoring

### Cloudflare Dashboard

1. Go to: https://dash.cloudflare.com
2. Workers & Pages → `fittrack-pro-desktop`
3. Tabs:
   - **Metrics**: Request count, CPU time, errors
   - **Logs**: Real-time request logs
   - **Analytics Engine**: Custom events
   - **Settings**: Environment variables, triggers

### Key Metrics to Monitor

- **Requests/day**: Stay under 100,000
- **CPU time**: Keep under 10ms per request
- **AI neurons/day**: Stay under 10,000
- **D1 reads**: Stay under 5M/day
- **D1 writes**: Stay under 100K/day

### Alerts

Set up email alerts in Cloudflare Dashboard:
- Request failures > 5%
- CPU time > 8ms average
- Error rate > 1%

---

## 🐛 Troubleshooting

### Common Issues

**1. "Service unavailable" errors**
```bash
# Check if backend is running
curl http://127.0.0.1:8000/health

# Check Worker logs
wrangler tail
```

**2. "Daily limit reached"**
```bash
# Check rate limits in D1
wrangler d1 execute fittrack-pro-db --command="SELECT * FROM rate_limits"

# Reset limit manually
wrangler d1 execute fittrack-pro-db --command="
  DELETE FROM rate_limits WHERE limit_key LIKE 'ai_requests:%'
"
```

**3. "Vectorize not found"**
```bash
# Recreate index
wrangler vectorize create fittrack-exercises --dimensions=384 --metric=cosine

# Re-index exercises
curl -X POST https://fittrack-pro-desktop.rehchu1.workers.dev/api/admin/index-exercises \
  -d @exercises.json
```

**4. Chat WebSocket won't connect**
```bash
# Test with wscat
npm install -g wscat
wscat -c "wss://fittrack-pro-desktop.rehchu1.workers.dev/chat/test-room?userId=1&userName=Test"
```

---

## 💡 Best Practices

### 1. Cache Aggressively
```javascript
// Use D1 for frequently accessed data
// Use KV for session data
// Use edge cache for static assets
```

### 2. Batch AI Requests
```javascript
// Generate multiple meal plans at once
const meals = await Promise.all([
  generateMealPlan('breakfast'),
  generateMealPlan('lunch'),
  generateMealPlan('dinner')
]);
```

### 3. Monitor Usage
```bash
# Daily usage check script
wrangler d1 execute fittrack-pro-db --command="
  SELECT 
    SUM(CASE WHEN event_type LIKE 'ai_%' THEN 1 ELSE 0 END) as ai_requests,
    COUNT(*) as total_requests
  FROM analytics_events
  WHERE DATE(timestamp, 'unixepoch') = DATE('now')
"
```

### 4. Optimize Queries
```javascript
// Use indexes for fast lookups
// Cache expensive queries in KV
// Limit result sets
```

---

## 🚀 Next Steps

1. **Deploy**: Run `.\deploy.ps1`
2. **Configure Secrets**: Set all required secrets
3. **Test AI Features**: Try meal/workout suggestions
4. **Index Exercises**: Populate Vectorize
5. **Monitor**: Watch analytics dashboard
6. **Optimize**: Adjust caching based on usage

---

## 📚 Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [D1 Documentation](https://developers.cloudflare.com/d1/)
- [Workers AI Models](https://developers.cloudflare.com/workers-ai/models/)
- [Vectorize Guide](https://developers.cloudflare.com/vectorize/)
- [Durable Objects](https://developers.cloudflare.com/durable-objects/)

---

## 🎯 Feature Summary

| Feature | Status | Free Tier Limit | Usage |
|---------|--------|----------------|-------|
| Workers | ✅ Active | 100K requests/day | API proxy, caching |
| KV | ✅ Active | 100K reads/day | Session cache |
| D1 | ✅ Active | 5M reads/day | Analytics, profiles |
| Workers AI | ✅ Active | 10K neurons/day | Meal/workout suggestions |
| Vectorize | ✅ Active | Unlimited | Exercise search |
| Durable Objects | ✅ Active | 100K requests/day | Real-time chat |
| Analytics Engine | ✅ Active | 200K events/day | Usage tracking |
| Hyperdrive | ⏳ Optional | 100K queries/day | Not needed (using SQLite) |

**Total Cost: $0/month** 🎉
