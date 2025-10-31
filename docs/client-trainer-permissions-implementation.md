# FitTrack Pro - Client/Trainer Permissions & Food Search Implementation

## What Was Implemented

### ✅ Database Schema v3
**File**: `schema-v3-complete.sql`

Complete redesign with permission-based architecture:

**New Tables**:
- `users` - Universal authentication (trainers + clients)
- `workout_assignments` - Trainer assigns workouts to clients
- `exercise_completions` - Client checks off completed exercises
- `client_exercises` - Client-added exercises (not from trainer)
- `sessions` - Combined trainer + client session management

**Updated Tables**:
- `measurements` - Added `created_by`, `age`, `daily_steps`
- `meals` - Added `created_by`, `is_completed`, `completed_at`
- `meal_items` - Added `created_by`, `is_completed`, `completed_at`
- `clients` - Added `user_id`, `age`, `daily_steps_average`
- `trainers` - Linked to `users` table

**Total**: 26 tables with full foreign key relationships

---

### ✅ Unified Food Search API
**Endpoint**: `GET /api/food/search?q={query}&limit={limit}`

**Features**:
- Searches **TWO** food databases in parallel:
  1. **USDA FoodData Central** - 350,000+ foods with complete nutrition
  2. **TheMealDB** - 300+ meals with ingredients and instructions
- Automatic deduplication by food name
- KV caching with 6-hour TTL
- Rate limiting (5 requests/minute per IP)
- Merged results with source attribution

**Response Format**:
```json
{
  "query": "chicken",
  "totalResults": 15,
  "sources": {
    "usda": 10,
    "mealdb": 5
  },
  "foods": [
    {
      "source": "USDA",
      "id": "usda-171477",
      "name": "Chicken, breast, meat only, cooked",
      "brand": null,
      "servingSize": 100,
      "servingUnit": "g",
      "calories": 165,
      "protein": 31,
      "carbs": 0,
      "fat": 3.6,
      "fiber": 0,
      "sodium": 74
    },
    {
      "source": "TheMealDB",
      "id": "mealdb-52940",
      "name": "Chicken Teriyaki",
      "category": "Chicken",
      "area": "Japanese",
      "thumb": "https://www.themealdb.com/images/media/meals/teriyaki-chicken.jpg",
      "instructions": "...",
      "ingredients": [
        {"ingredient": "chicken", "measure": "450g"},
        {"ingredient": "soy sauce", "measure": "3 tbsp"}
      ],
      "calories": null,
      "protein": null,
      "carbs": null,
      "fat": null
    }
  ]
}
```

**Benefits**:
- **Comprehensive**: USDA for nutrition data, MealDB for meal ideas
- **Fast**: Parallel fetching, KV caching reduces API calls
- **Cost-effective**: Both APIs are free, caching minimizes requests
- **User-friendly**: Single search bar for trainers and clients

---

## Permission System Design

### Measurement Permissions

| Field | Trainer Can Update | Client Can Update |
|-------|-------------------|-------------------|
| weight_kg | ✅ Yes | ✅ Yes |
| daily_steps | ✅ Yes | ✅ Yes |
| age | ❌ No | ✅ Yes |
| height_cm | ❌ No | ✅ Yes |
| body_fat_percentage | ❌ No | ✅ Yes |
| chest_cm | ❌ No | ✅ Yes |
| waist_cm | ❌ No | ✅ Yes |
| All other body parts | ❌ No | ✅ Yes |

**Required Fields**: Only `weight_kg`, `age`, `daily_steps` are required. All other measurements optional.

### Meal Plan Permissions

**Trainer**:
- ✅ Create meal plans for clients
- ✅ Add food items to meals
- ❌ Cannot mark items as completed

**Client**:
- ❌ Cannot edit trainer's meal plans
- ✅ Can ADD additional food items to meals
- ✅ Can check off completed food items
- ✅ Completion tracked with `is_completed` and `completed_at`

**Schema**:
```sql
-- meals table
created_by TEXT CHECK(created_by IN ('trainer', 'client'))
is_completed INTEGER DEFAULT 0
completed_at TEXT

-- meal_items table  
created_by TEXT CHECK(created_by IN ('trainer', 'client'))
is_completed INTEGER DEFAULT 0
completed_at TEXT
```

### Workout Plan Permissions

**Trainer**:
- ✅ Assign workout programs to clients via `workout_assignments`
- ✅ Select from 6 pre-made templates or create custom
- ❌ Cannot mark exercises as completed

**Client**:
- ❌ Cannot edit trainer's workout assignments
- ✅ Can ADD their own exercises via `client_exercises` table
- ✅ Can check off completed exercises via `exercise_completions`
- ✅ Completion tracked with sets, reps, weight used

**Schema**:
```sql
-- workout_assignments (trainer creates)
CREATE TABLE workout_assignments (
  client_id INTEGER NOT NULL,
  workout_program_id INTEGER,
  assigned_date TEXT NOT NULL,
  assigned_by_trainer INTEGER NOT NULL
);

-- exercise_completions (client checks off)
CREATE TABLE exercise_completions (
  client_id INTEGER NOT NULL,
  exercise_id INTEGER NOT NULL,
  completed_date TEXT NOT NULL,
  sets_completed INTEGER,
  reps_completed INTEGER,
  weight_used_kg REAL,
  completed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- client_exercises (client adds own)
CREATE TABLE client_exercises (
  client_id INTEGER NOT NULL,
  exercise_name TEXT NOT NULL,
  sets INTEGER,
  reps INTEGER,
  weight_kg REAL,
  exercise_date TEXT NOT NULL
);
```

---

## Trainer Workflow

### 1. Select Client First
Before making any changes, trainer must select a client from dropdown:
```javascript
// sessionStorage stores selected client
sessionStorage.setItem('selectedClientId', clientId);

// All forms disabled until selection made
if (!selectedClientId) {
  disableAllForms();
  showMessage("Please select a client first");
}
```

### 2. Assign Meal Plan
```javascript
POST /api/meals
{
  "client_id": 1,
  "meal_date": "2025-11-01",
  "meal_time": "breakfast",
  "name": "High Protein Breakfast",
  "created_by": "trainer"
}

POST /api/meals/1/items
{
  "food_name": "Chicken Breast",
  "quantity": "200g",
  "calories": 330,
  "protein": 62,
  "carbs": 0,
  "fat": 7.2,
  "created_by": "trainer"
}
```

### 3. Assign Workout Program
```javascript
POST /api/workout-assignments
{
  "client_id": 1,
  "workout_program_id": 1, // Summer Beach Body
  "assigned_date": "2025-11-01",
  "assigned_by_trainer": 1,
  "notes": "Focus on form, not weight"
}
```

### 4. View Client Progress
```javascript
GET /api/meal-items?client_id=1&completed=true
// Returns all completed meal items with timestamps

GET /api/exercise-completions?client_id=1
// Returns all completed exercises with sets/reps/weight
```

---

## Client Workflow

### 1. Login to Client Portal
```javascript
POST /api/auth/client/login
{
  "email": "client@example.com",
  "password": "ClientPass123"
}
// Returns session token for client portal access
```

### 2. View Assigned Meal Plan
```javascript
GET /api/meals?client_id=1
// Shows meals assigned by trainer (created_by='trainer')
// Displays checkboxes for completion
```

### 3. Add Food to Meal
```javascript
POST /api/meals/1/items
{
  "food_name": "Banana",
  "quantity": "1 medium",
  "calories": 105,
  "protein": 1.3,
  "carbs": 27,
  "fat": 0.4,
  "created_by": "client" // Client-added item
}
```

### 4. Check Off Completed Food
```javascript
PATCH /api/meal-items/3/complete
{
  "is_completed": 1
}
// Sets completed_at timestamp, is_completed = 1
```

### 5. View Assigned Workouts
```javascript
GET /api/workout-assignments?client_id=1
// Shows workouts assigned by trainer
```

### 6. Add Own Exercise
```javascript
POST /api/client-exercises
{
  "client_id": 1,
  "exercise_name": "Morning Jog",
  "sets": null,
  "reps": null,
  "exercise_date": "2025-11-01",
  "notes": "3 miles, felt great"
}
```

### 7. Check Off Completed Exercise
```javascript
POST /api/exercise-completions
{
  "client_id": 1,
  "exercise_id": 5,
  "completed_date": "2025-11-01",
  "sets_completed": 3,
  "reps_completed": 12,
  "weight_used_kg": 20,
  "notes": "Felt strong!"
}
```

---

## Trainer View of Client Activity

### Actual Calories Consumed
```javascript
GET /api/meals/1/actual-calories
// Sums calories from ALL meal_items (trainer + client added)
// Shows: 
// - Planned: 2000 cal (trainer's plan)
// - Actual: 2300 cal (includes client's banana)
// - Completed: 1800 cal (only checked-off items)
```

### Actual Workouts Completed
```javascript
GET /api/exercise-completions?client_id=1&date=2025-11-01
// Shows:
// - Assigned exercises from workout_assignments
// - Client-added exercises from client_exercises
// - Completion status for each
// - Sets/reps/weight actually achieved
```

---

## API Endpoints (Pending Implementation)

### Client Authentication
- [ ] `POST /api/auth/client/login` - Client login
- [ ] `GET /client/login` - Client login page HTML
- [ ] `POST /api/auth/client/logout` - Client logout

### Meal Permissions
- [ ] `POST /api/meals` - Create meal (trainer only)
- [ ] `POST /api/meals/:id/items` - Add food (trainer + client)
- [ ] `PATCH /api/meal-items/:id/complete` - Check off food (client only)
- [ ] `GET /api/meals/:id/actual-calories` - Get actual consumed calories

### Workout Permissions
- [ ] `POST /api/workout-assignments` - Assign workout (trainer only)
- [ ] `POST /api/client-exercises` - Add own exercise (client only)
- [ ] `POST /api/exercise-completions` - Check off exercise (client only)
- [ ] `GET /api/exercise-completions` - View completed exercises (both)

### Measurement Permissions
- [ ] `PUT /api/measurements/:id` - Update with permission validation
  - Check `created_by` field
  - Validate trainer can only update `weight_kg`, `daily_steps`
  - Validate client can update all other fields

---

## UI Components (Pending)

### Trainer Portal
- [ ] Client selector dropdown at top
- [ ] Disable all forms until client selected
- [ ] Store `selectedClientId` in sessionStorage
- [ ] Meal planner with unified food search
- [ ] Workout assignment with exercise search
- [ ] Progress dashboard showing:
  - Planned vs Actual calories
  - Assigned vs Completed workouts
  - Client-added items highlighted

### Client Portal
- [ ] Assigned meal plan view (read-only for trainer items)
- [ ] Add food button (searches unified food API)
- [ ] Checkboxes for completed food items
- [ ] Assigned workout view (read-only for trainer exercises)
- [ ] Add exercise button (searches ExerciseDB)
- [ ] Checkboxes for completed exercises
- [ ] Progress tracking (weight, measurements)

---

## Testing Checklist

- [ ] Test unified food search with both APIs
- [ ] Verify trainer can only update weight/steps
- [ ] Verify client can update all other measurements
- [ ] Test trainer creates meal plan
- [ ] Test client adds food to meal
- [ ] Test client checks off completed food
- [ ] Test trainer views actual calories consumed
- [ ] Test trainer assigns workout program
- [ ] Test client adds own exercise
- [ ] Test client checks off completed exercise
- [ ] Test trainer views completed workouts
- [ ] Verify client selector in trainer portal
- [ ] Test forms disabled until client selected

---

## Next Steps

1. **Implement Client Authentication** (todo #3)
   - Client login endpoint
   - Client session management
   - Client portal HTML page

2. **Build Client Portal UI** (todo #4)
   - Meal plan viewer with checkboxes
   - Workout viewer with checkboxes
   - Add food/exercise buttons
   - Progress tracking

3. **Implement Meal Permissions** (todo #5)
   - Meal CRUD with created_by validation
   - Completion checkbox endpoints
   - Actual calories calculation

4. **Implement Workout Permissions** (todo #6)
   - Workout assignment endpoints
   - Exercise completion endpoints
   - Client exercise tracking

5. **Add Client Selector** (todo #7)
   - Trainer portal dropdown
   - Form validation
   - SessionStorage management

6. **Test End-to-End** (todo #9)
   - Full trainer workflow
   - Full client workflow
   - Permission validation

7. **Deploy to Production** (todo #10)
   - Deploy worker
   - Test live endpoints
   - Monitor errors

---

## Files Created/Modified

**Created**:
- `schema-v3-complete.sql` - Complete schema with permissions
- `migration-v3-permissions.sql` - Migration file (not used, schema rebuilt)
- `quest-templates-data.sql` - Quest templates 16-40
- `workout-templates-fixed.sql` - Workout templates (schema mismatch, needs fix)

**Modified**:
- `wrangler.toml` - Added THEMEALDB_API_URL, USDA_API_URL, USDA_API_KEY
- `index.js` - Added `/api/food/search` unified endpoint

**Status**:
- Database: ✅ Schema v3 applied, 26 tables created, quest templates loaded
- API: ✅ Unified food search deployed and working
- Worker: ✅ Deployed version 043fe2ef-7cd3-4019-8cd7-e2de362dbd52
- Todo: 2/10 completed, 8 remaining

---

## Database Summary

**Total Tables**: 26
**Schema Version**: 3
**Quest Templates Loaded**: 25 (IDs 16-40)
**Workout Templates**: Pending (schema mismatch on exercise_order, focus_area columns)

**Key Relationships**:
- `users` → `trainers` (one-to-one)
- `users` → `clients` (one-to-one)
- `trainers` → `clients` (one-to-many)
- `clients` → `measurements` (one-to-many)
- `clients` → `meals` (one-to-many)
- `meals` → `meal_items` (one-to-many)
- `clients` → `workout_assignments` (one-to-many)
- `workout_assignments` → `exercise_completions` (one-to-many)
- `clients` → `client_exercises` (one-to-many)

**Permission Fields**:
- `created_by` - Tracks trainer vs client creation
- `is_completed` - Checkbox state
- `completed_at` - Timestamp of completion
