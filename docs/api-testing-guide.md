# FitTrack Pro API Testing Guide

Complete guide for testing all implemented API endpoints in the Cloudflare Worker.

## Base URL
- **Production**: `https://fittrack-trainer.rehchu1.workers.dev`
- **Local Testing**: Use wrangler dev mode

## Authentication System ✅ IMPLEMENTED

### 1. Register New Trainer
```bash
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Trainer",
  "businessName": "FitPro Coaching",
  "email": "john@fitpro.com",
  "password": "SecurePass123"
}
```

**Expected Response** (200):
```json
{
  "success": true,
  "trainer": {
    "id": 1,
    "email": "john@fitpro.com",
    "business_name": "FitPro Coaching"
  }
}
```

**Sets Cookie**: `session_token` (30 days TTL)

**Error Cases**:
- Missing fields → 400: "Name, email, and password are required"
- Weak password (<8 chars) → 400: "Password must be at least 8 characters"
- Duplicate email → 409: "Email already registered"

---

### 2. Login as Trainer
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@fitpro.com",
  "password": "SecurePass123"
}
```

**Expected Response** (200):
```json
{
  "success": true,
  "trainer": {
    "id": 1,
    "email": "john@fitpro.com",
    "business_name": "FitPro Coaching"
  }
}
```

**Sets Cookie**: `session_token` (30 days TTL)

**Error Cases**:
- Missing credentials → 400: "Email and password are required"
- Wrong email/password → 401: "Invalid email or password"

---

### 3. Logout
```bash
POST /api/auth/logout
Cookie: session_token=<your-token>
```

**Expected Response** (200):
```json
{
  "success": true
}
```

**Clears Cookie**: `session_token`

---

## Client Management ✅ IMPLEMENTED

### 4. List All Clients
```bash
GET /api/clients
Cookie: session_token=<your-token>
```

**Expected Response** (200):
```json
{
  "clients": [
    {
      "id": 1,
      "name": "Jane Doe",
      "email": "jane@example.com",
      "created_at": "2025-01-10T10:00:00Z"
    }
  ]
}
```

---

### 5. Add New Client
```bash
POST /api/clients
Cookie: session_token=<your-token>
Content-Type: application/json

{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "ClientPass123"
}
```

**Expected Response** (200):
```json
{
  "success": true,
  "message": "Client added successfully"
}
```

**What Happens**:
1. Creates a `user` record with `user_type = 'client'`
2. Hashes password with SHA-256
3. Creates a `client` record linked to trainer
4. Email stored in lowercase

**Error Cases**:
- Missing fields → 400: "Name, email, and password are required"
- Weak password → 400: "Password must be at least 8 characters"
- Duplicate email → 409: "Email already registered"

---

### 6. Get Client Details
```bash
GET /api/clients/{clientId}
Cookie: session_token=<your-token>
```

**Expected Response** (200):
```json
{
  "client": {
    "id": 1,
    "name": "Jane Doe",
    "email": "jane@example.com",
    "created_at": "2025-01-10T10:00:00Z"
  }
}
```

**Error Cases**:
- Client not found → 404: "Client not found"
- Not owned by trainer → 404: "Client not found"

---

## Measurements Tracking ✅ IMPLEMENTED

### 7. Add Measurement
```bash
POST /api/measurements
Cookie: session_token=<your-token>
Content-Type: application/json

{
  "clientId": 1,
  "measurement_date": "2025-01-10",
  "weight_lbs": 165.5,
  "body_fat_pct": 18.5,
  "height_in": 68,
  "neck_in": 14.5,
  "chest_in": 39,
  "waist_in": 32,
  "hips_in": 38,
  "bicep_in": 13.5,
  "thigh_in": 22,
  "calf_in": 15,
  "resting_hr": 65,
  "bp_systolic": 120,
  "bp_diastolic": 80,
  "steps": 10000,
  "notes": "Feeling strong!"
}
```

**Expected Response** (200):
```json
{
  "success": true
}
```

**Unit Conversions**:
- All measurements stored in metric (kg, cm)
- Automatically converts: lbs→kg, inches→cm
- Conversions: 1 lb = 0.45359237 kg, 1 inch = 2.54 cm

**Error Cases**:
- Missing clientId → 400: "clientId is required"
- Invalid weight → 400: "Weight is required and must be a valid number"
- Client not owned → 404: "Client not found"

---

### 8. Get Client Measurements
```bash
GET /api/measurements?clientId=1
Cookie: session_token=<your-token>
```

**Expected Response** (200):
```json
{
  "measurements": [
    {
      "measurement_date": "2025-01-10",
      "weight_lbs": 165.5,
      "body_fat_pct": 18.5,
      "height_in": 68,
      "neck_in": 14.5,
      "chest_in": 39,
      "waist_in": 32,
      "hips_in": 38,
      "bicep_in": 13.5,
      "thigh_in": 22,
      "calf_in": 15,
      "resting_hr": 65,
      "bp_systolic": 120,
      "bp_diastolic": 80,
      "steps": 10000,
      "notes": "Feeling strong!"
    }
  ]
}
```

**Notes**:
- Returns last 100 measurements
- Sorted by date DESC
- Automatically converts metric back to imperial for display

---

## Quest System ✅ IMPLEMENTED

### 9. List Quest Templates
```bash
GET /api/quests/templates
Cookie: session_token=<your-token>
```

**Expected Response** (200):
```json
{
  "templates": [
    {
      "id": 1,
      "name": "Weight Loss Champion",
      "description": "Lose 10kg through dedication",
      "category": "weight_loss",
      "difficulty": "medium",
      "is_goal_based": 1,
      "has_workout_program": 1,
      "duration_weeks": 12
    }
  ]
}
```

**Categories**:
- `weight_loss` - General weight loss quests
- `body_composition` - Body fat, muscle gain
- `measurements` - Waist, chest, biceps tracking
- `nutrition` - Meal tracking consistency
- `progress` - Photos, measurement logging
- `event_based` - Wedding, beach body, vacation
- `custom` - Trainer-created quests

---

### 10. Assign Quest to Client
```bash
POST /api/quests
Cookie: session_token=<your-token>
Content-Type: application/json

{
  "client_id": 1,
  "title": "Summer Beach Body",
  "description": "Get ready for summer vacation",
  "quest_type": "weight_loss",
  "target_value": 20,
  "target_unit": "lbs",
  "difficulty": "hard",
  "xp_reward": 500,
  "reward_achievement": "Beach Ready",
  "reward_description": "Completed summer transformation",
  "deadline_days": 90
}
```

**Expected Response** (200):
```json
{
  "success": true
}
```

**Quest Difficulties**:
- `easy` - Small goals, 1-2 weeks
- `medium` - Moderate goals, 4-8 weeks
- `hard` - Major goals, 8-12 weeks
- `epic` - Transformational, 12+ weeks

---

### 11. Update Quest Progress
```bash
PATCH /api/quests/{questId}
Cookie: session_token=<your-token>
Content-Type: application/json

{
  "current_value": 15,
  "is_active": 1
}
```

**Expected Response** (200):
```json
{
  "success": true
}
```

**Auto-Completion**:
- If `current_value >= target_value`:
  - Sets `completed_at` timestamp
  - Deactivates quest (`is_active = 0`)
  - Awards achievement if `reward_achievement` specified
  - Creates completion milestone

---

### 12. Auto-Check Milestones
```bash
POST /api/quests/auto-check
Cookie: session_token=<your-token>
Content-Type: application/json

{
  "clientId": 1
}
```

**Expected Response** (200):
```json
{
  "message": "Auto-check complete. Created 3 new milestones.",
  "milestones": [
    {
      "title": "Weight Loss Milestone: 5kg",
      "description": "Lost 5kg since starting",
      "milestone_type": "weight_loss",
      "value": 5,
      "unit": "kg",
      "icon": "🎯"
    }
  ]
}
```

**Detected Milestones**:
- Weight loss: 2, 5, 10, 15, 20, 25, 30, 40, 50 kg
- Body fat: 2%, 3%, 5%, 7%, 10% reduction
- Waist: 3, 5, 10, 15, 20 cm reduction
- Meal streaks: 3, 7, 14, 21, 30, 60, 90, 100 days
- Progress photos: 5, 10, 20, 30, 50 photos
- Measurements: 5, 10, 20, 30, 50, 100 entries

---

## Workout Programs ✅ TEMPLATES LOADED

### 13. List Workout Programs
```bash
GET /api/workout-programs
Cookie: session_token=<your-token>
```

**Expected Response** (200):
```json
{
  "programs": [
    {
      "id": 1,
      "name": "Summer Beach Body",
      "duration_weeks": 12,
      "workouts_per_week": 4,
      "difficulty": "intermediate",
      "is_template": 1
    }
  ]
}
```

**Pre-Made Templates**:
1. Summer Beach Body (12 weeks, 4x/week)
2. Wedding Ready (16 weeks, 5x/week)
3. 30-Day Shred (4 weeks, 6x/week)
4. Beginner Fitness Journey (8 weeks, 3x/week)
5. Abs of Steel (8 weeks, 4x/week)
6. Booty Builder (10 weeks, 4x/week)

---

### 14. Get Workout Program Details
```bash
GET /api/workout-programs/{programId}
Cookie: session_token=<your-token>
```

**Expected Response** (200):
```json
{
  "program": {
    "id": 1,
    "name": "Summer Beach Body",
    "duration_weeks": 12,
    "workouts_per_week": 4,
    "difficulty": "intermediate",
    "workout_days": [
      {
        "id": 1,
        "week_number": 1,
        "day_number": 1,
        "day_name": "Upper Body Power",
        "focus": "Chest, Shoulders, Triceps",
        "exercises": [
          {
            "id": 1,
            "name": "Barbell Bench Press",
            "sets": 4,
            "reps": "8-10",
            "rest_seconds": 90,
            "notes": "Focus on controlled negative"
          }
        ]
      }
    ]
  }
}
```

---

## ExerciseDB Integration ✅ IMPLEMENTED

### 15. Search Exercises
```bash
GET /api/exercises/search?name=push&limit=20
Cookie: session_token=<your-token>

GET /api/exercises/search?target=biceps&limit=10

GET /api/exercises/search?equipment=dumbbell&limit=15
```

**Expected Response** (200):
```json
[
  {
    "bodyPart": "upper arms",
    "equipment": "dumbbell",
    "gifUrl": "https://v2.exercisedb.io/image/abc123",
    "id": "0001",
    "name": "dumbbell curl",
    "target": "biceps",
    "secondaryMuscles": ["forearms"],
    "instructions": [
      "Stand up straight with a dumbbell in each hand",
      "Curl the weights while contracting biceps"
    ]
  }
]
```

**Cache Headers**:
- `X-Cache: HIT` - Served from KV cache
- `X-Cache: MISS` - Fetched from API

**Cache TTL**: 24 hours for exercises

---

### 16. Get Exercise by ID
```bash
GET /api/exercises/0001
Cookie: session_token=<your-token>
```

---

### 17. List Target Muscles
```bash
GET /api/exercises/targets
Cookie: session_token=<your-token>
```

**Expected Response** (200):
```json
[
  "abductors", "abs", "adductors", "biceps", "calves",
  "cardiovascular system", "delts", "forearms", "glutes",
  "hamstrings", "lats", "levator scapulae", "pectorals",
  "quads", "serratus anterior", "spine", "traps", "triceps", "upper back"
]
```

**Cache TTL**: 7 days

---

### 18. List Equipment Types
```bash
GET /api/exercises/equipment
Cookie: session_token=<your-token>
```

**Expected Response** (200):
```json
[
  "assisted", "band", "barbell", "body weight", "bosu ball",
  "cable", "dumbbell", "elliptical machine", "ez barbell",
  "hammer", "kettlebell", "leverage machine", "medicine ball",
  "olympic barbell", "resistance band", "roller", "rope",
  "stability ball", "stationary bike", "trap bar", "weighted"
]
```

---

### 19. Advanced Exercise Search
```bash
GET /api/exercises/search/advanced?bodyPart=chest&limit=15
Cookie: session_token=<your-token>
```

Uses secondary ExerciseDB API for alternative search.

---

## USDA Nutrition API ✅ IMPLEMENTED

### 20. Search Foods
```bash
GET /api/usda/search?query=chicken%20breast&limit=10
Cookie: session_token=<your-token>
```

**Expected Response** (200):
```json
{
  "foods": [
    {
      "fdcId": 171477,
      "description": "Chicken, breast, meat only, cooked, roasted",
      "dataType": "SR Legacy",
      "brandOwner": null,
      "nutrients": [
        {
          "nutrientName": "Protein",
          "value": 31.02,
          "unitName": "G"
        },
        {
          "nutrientName": "Energy",
          "value": 165,
          "unitName": "KCAL"
        }
      ]
    }
  ],
  "totalHits": 42,
  "currentPage": 1
}
```

**Rate Limiting**: 5 requests/minute per IP
**Cache TTL**: 6 hours

---

## Settings ✅ IMPLEMENTED

### 21. Update Trainer Profile
```bash
PUT /api/settings/profile
Cookie: session_token=<your-token>
Content-Type: application/json

{
  "business_name": "Elite Fitness Coaching"
}
```

**Expected Response** (200):
```json
{
  "success": true
}
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```
**Cause**: No session cookie or expired session

---

### 403 Forbidden
```json
{
  "error": "Rate limit exceeded",
  "limit": 8,
  "window": 60,
  "retryAfter": 45
}
```
**Cause**: Too many requests to rate-limited endpoint

---

### 404 Not Found
```json
{
  "error": "Not found"
}
```
**Cause**: Invalid route or resource doesn't exist

---

### 409 Conflict
```json
{
  "error": "Email already registered"
}
```
**Cause**: Duplicate unique constraint violation

---

### 500 Internal Server Error
```json
{
  "error": "Internal error: <message>",
  "stack": "Error: ...",
  "path": "/api/clients"
}
```
**Cause**: Database error, API failure, or unexpected exception

---

## Testing Workflow

### 1. Register & Login
```bash
# Register
curl -X POST https://fittrack-trainer.rehchu1.workers.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Trainer","businessName":"Test Gym","email":"test@example.com","password":"Pass1234"}' \
  -c cookies.txt

# Login (saves session cookie)
curl -X POST https://fittrack-trainer.rehchu1.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Pass1234"}' \
  -c cookies.txt
```

### 2. Create Client
```bash
curl -X POST https://fittrack-trainer.rehchu1.workers.dev/api/clients \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name":"Test Client","email":"client@example.com","password":"Client123"}'
```

### 3. Add Measurement
```bash
curl -X POST https://fittrack-trainer.rehchu1.workers.dev/api/measurements \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"clientId":1,"measurement_date":"2025-01-10","weight_lbs":165,"body_fat_pct":18}'
```

### 4. Search Exercises
```bash
curl -X GET "https://fittrack-trainer.rehchu1.workers.dev/api/exercises/search?target=biceps&limit=5" \
  -b cookies.txt
```

### 5. Create Quest
```bash
curl -X POST https://fittrack-trainer.rehchu1.workers.dev/api/quests \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"client_id":1,"title":"Weight Loss Quest","quest_type":"weight_loss","target_value":20,"target_unit":"lbs","difficulty":"medium","xp_reward":300,"deadline_days":90}'
```

---

## Next Steps

### Not Yet Implemented (TODO):
- [ ] PUT /api/clients/:id (update client)
- [ ] DELETE /api/clients/:id (delete client)
- [ ] POST /api/workout-programs (create custom program)
- [ ] PUT /api/workout-programs/:id (edit program)
- [ ] POST /api/workout-programs/:id/assign (assign to client)
- [ ] GET /api/achievements?clientId=1 (list achievements)
- [ ] POST /api/achievements (manual award)
- [ ] GET /api/milestones?clientId=1 (list milestones)
- [ ] R2 file upload endpoints (progress photos, videos)
- [ ] WebSocket messaging endpoints
- [ ] AI-powered meal/workout suggestions

### Ready to Implement:
1. **Client Update/Delete** - Simple CRUD completion
2. **Workout Program Editor** - UI for customizing templates
3. **File Upload System** - R2 integration for photos/videos
4. **AI Features** - Meal suggestions, workout recommendations
5. **Real-Time Messaging** - Durable Objects for chat

---

## Postman Collection

Import this JSON into Postman for easy testing:

```json
{
  "info": {
    "name": "FitTrack Pro API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Authentication",
      "item": [
        {
          "name": "Register",
          "request": {
            "method": "POST",
            "header": [{"key": "Content-Type", "value": "application/json"}],
            "url": "{{baseUrl}}/api/auth/register",
            "body": {
              "mode": "raw",
              "raw": "{\"name\":\"Test Trainer\",\"businessName\":\"Test Gym\",\"email\":\"test@example.com\",\"password\":\"Pass1234\"}"
            }
          }
        },
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "header": [{"key": "Content-Type", "value": "application/json"}],
            "url": "{{baseUrl}}/api/auth/login",
            "body": {
              "mode": "raw",
              "raw": "{\"email\":\"test@example.com\",\"password\":\"Pass1234\"}"
            }
          }
        }
      ]
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "https://fittrack-trainer.rehchu1.workers.dev"
    }
  ]
}
```

---

## Security Notes

1. **Password Security**: SHA-256 hashing (consider bcrypt for production)
2. **Session Management**: 30-day sessions in KV with auto-expiration
3. **Rate Limiting**: 8/min for auth, 5/min for USDA
4. **CORS**: Enabled for all origins (tighten for production)
5. **SQL Injection**: Prevented via D1 prepared statements
6. **XSS Protection**: JSON responses only, no user HTML rendering

---

## Database Schema Reference

See `schema.sql` for complete table definitions:
- `users` - Universal auth table (trainers + clients)
- `trainers` - Trainer profiles
- `clients` - Client profiles linked to trainers
- `measurements` - Body tracking data
- `quest_templates` - 40 pre-made quests
- `client_quests` - Assigned quests
- `workout_programs` - 6 pre-made programs
- `workout_days` - Daily workout structure
- `exercises` - Exercise library
- `achievements` - Unlockable rewards
- `milestones` - Auto-detected progress markers

Total: 17 tables, 359 pre-loaded rows, schema version 2
