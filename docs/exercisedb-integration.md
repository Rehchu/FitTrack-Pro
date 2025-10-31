# ExerciseDB Integration - FitTrack Pro

## Overview
FitTrack Pro integrates with **TWO** RapidAPI ExerciseDB services to provide trainers access to 1300+ exercises with animated GIFs, detailed instructions, and muscle targeting information.

## API Credentials
- **API Key**: `01a44cbd89msh864c4e87aba2d22p10f83cjsn2bea18eb05ec`
- **Primary Host**: `exercisedb.p.rapidapi.com`
- **Secondary Host**: `exercise-db-fitness-workout-gym.p.rapidapi.com`

## Available Endpoints

### 1. Search Exercises
**Endpoint**: `GET /api/exercises/search`

**Query Parameters**:
- `name` - Search by exercise name (e.g., "push-up", "squat")
- `target` - Filter by target muscle (e.g., "biceps", "chest", "glutes")
- `equipment` - Filter by equipment (e.g., "dumbbell", "barbell", "bodyweight")
- `limit` - Maximum results (default: 20, max: 100)

**Example Requests**:
```bash
# Search by name
GET /api/exercises/search?name=push&limit=10

# Search by target muscle
GET /api/exercises/search?target=biceps&limit=20

# Search by equipment
GET /api/exercises/search?equipment=dumbbell&limit=15
```

**Response**:
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
      "Curl the weights while contracting biceps",
      "Continue until dumbbells are at shoulder level",
      "Slowly lower back to starting position"
    ]
  }
]
```

### 2. Get Exercise by ID
**Endpoint**: `GET /api/exercises/{exerciseId}`

**Example**:
```bash
GET /api/exercises/0001
```

### 3. Get Target Muscle List
**Endpoint**: `GET /api/exercises/targets`

**Returns**: Array of all available muscle targets
```json
[
  "abductors",
  "abs",
  "adductors",
  "biceps",
  "calves",
  "cardiovascular system",
  "delts",
  "forearms",
  "glutes",
  "hamstrings",
  "lats",
  "levator scapulae",
  "pectorals",
  "quads",
  "serratus anterior",
  "spine",
  "traps",
  "triceps",
  "upper back"
]
```

### 4. Get Equipment List
**Endpoint**: `GET /api/exercises/equipment`

**Returns**: Array of all available equipment types
```json
[
  "assisted",
  "band",
  "barbell",
  "body weight",
  "bosu ball",
  "cable",
  "dumbbell",
  "elliptical machine",
  "ez barbell",
  "hammer",
  "kettlebell",
  "leverage machine",
  "medicine ball",
  "olympic barbell",
  "resistance band",
  "roller",
  "rope",
  "skierg machine",
  "sled machine",
  "smith machine",
  "stability ball",
  "stationary bike",
  "stepmill machine",
  "tire",
  "trap bar",
  "upper body ergometer",
  "weighted",
  "wheel roller"
]
```

### 5. Advanced Search (Secondary Database)
**Endpoint**: `GET /api/exercises/search/advanced`

**Query Parameters**:
- `bodyPart` - Filter by body part
- `equipment` - Filter by equipment type
- `limit` - Maximum results (default: 20)

**Example**:
```bash
GET /api/exercises/search/advanced?bodyPart=chest&limit=15
```

## Caching Strategy

All exercise data is cached in Cloudflare KV to minimize API calls and stay within rate limits:

- **Exercise searches**: 24 hours TTL
- **Individual exercises**: 24 hours TTL
- **Target/Equipment lists**: 7 days TTL

**Cache Headers**:
- `X-Cache: HIT` - Data served from cache
- `X-Cache: MISS` - Data fetched from API

## Usage in Workout Programs

### Trainer Workflow

1. **Browse Exercise Library**
   ```javascript
   // Get all chest exercises
   fetch('/api/exercises/search?target=pectorals&limit=50')
   ```

2. **Filter by Equipment**
   ```javascript
   // Get dumbbell exercises only
   fetch('/api/exercises/search?equipment=dumbbell&limit=30')
   ```

3. **Add to Workout Program**
   ```javascript
   // Add exercise to workout day
   POST /api/workout-days/{dayId}/exercises
   {
     "name": "Dumbbell Bench Press",
     "sets": 3,
     "reps": "10-12",
     "rest_seconds": 60,
     "notes": "Focus on controlled negative",
     "video_url": "https://v2.exercisedb.io/image/abc123"
   }
   ```

4. **Replace Template Exercise**
   ```javascript
   // Update existing exercise
   PUT /api/exercises/{exerciseId}
   {
     "name": "Incline Dumbbell Press",
     // ... other fields
   }
   ```

### Building Custom Programs

Trainers can create entirely custom workout programs:

```javascript
// 1. Create program
POST /api/workout-programs
{
  "name": "Custom Chest & Triceps",
  "duration_weeks": 8,
  "workouts_per_week": 2,
  "difficulty": "intermediate"
}

// 2. Add workout day
POST /api/workout-days
{
  "workout_program_id": 1,
  "week_number": 1,
  "day_number": 1,
  "day_name": "Chest & Triceps Power"
}

// 3. Search and add exercises from ExerciseDB
const chestExercises = await fetch('/api/exercises/search?target=pectorals&limit=5');
const tricepsExercises = await fetch('/api/exercises/search?target=triceps&limit=3');

// 4. Add each exercise to the workout day
chestExercises.forEach(exercise => {
  POST /api/workout-days/1/exercises
  {
    "name": exercise.name,
    "sets": 3,
    "reps": "8-12",
    "rest_seconds": 90,
    "video_url": exercise.gifUrl
  }
});
```

## Popular Exercise Targets

### Upper Body
- **Chest**: `pectorals`
- **Back**: `lats`, `upper back`
- **Shoulders**: `delts`
- **Arms**: `biceps`, `triceps`, `forearms`

### Lower Body
- **Legs**: `quads`, `hamstrings`, `calves`
- **Glutes**: `glutes`
- **Hip**: `abductors`, `adductors`

### Core
- **Abs**: `abs`
- **Obliques**: `abs` (includes obliques)
- **Lower Back**: `spine`

## Equipment Categories

### Free Weights
- `dumbbell` - Most versatile
- `barbell` - Heavy compounds
- `ez barbell` - Curls and triceps
- `kettlebell` - Functional training

### Machines
- `cable` - Constant tension
- `smith machine` - Guided barbell
- `leverage machine` - Plate-loaded

### Bodyweight
- `body weight` - No equipment needed
- `assisted` - Assisted bodyweight (e.g., assisted pull-ups)

### Specialized
- `band` / `resistance band` - Portable resistance
- `medicine ball` - Core and power
- `stability ball` - Balance training
- `bosu ball` - Unstable surface training

## Best Practices

### For Trainers

1. **Start with Templates**
   - Use pre-made programs as a starting point
   - Customize exercises based on client's equipment

2. **Match Client's Equipment**
   ```javascript
   // Client has only dumbbells
   fetch('/api/exercises/search?equipment=dumbbell&target=chest')
   ```

3. **Progressive Overload**
   - Increase sets/reps/weight over weeks
   - Keep exercise library consistent for tracking

4. **Video References**
   - Use `gifUrl` from API for exercise demos
   - Show clients proper form via animated GIFs

5. **Exercise Substitutions**
   - Search by same target muscle
   - Offer alternatives based on available equipment

### For Developers

1. **Cache Aggressively**
   - Exercise data rarely changes
   - Reduce API calls to stay within limits

2. **Batch Requests**
   - Load full exercise lists (100 limit)
   - Cache locally in browser/app

3. **Fallback Gracefully**
   - Cache muscle targets and equipment lists
   - Don't fail if API is down

4. **Monitor Usage**
   - Track X-Cache headers
   - Alert if cache miss rate is high

## Rate Limits

**RapidAPI Free Tier**:
- 500 requests/month
- 5 requests/second

**Mitigation Strategy**:
- Aggressive KV caching (24h - 7 days)
- Pre-load common searches
- Batch operations
- Client-side caching in UI

**Monitoring**:
- Check cache hit rate daily
- Alert if approaching limit
- Upgrade plan if needed

## Example UI Implementation

### Exercise Search Component
```javascript
function ExerciseSearch() {
  const [target, setTarget] = useState('');
  const [equipment, setEquipment] = useState('');
  const [exercises, setExercises] = useState([]);
  
  const search = async () => {
    const params = new URLSearchParams();
    if (target) params.append('target', target);
    if (equipment) params.append('equipment', equipment);
    params.append('limit', '50');
    
    const res = await fetch(`/api/exercises/search?${params}`);
    const data = await res.json();
    setExercises(data);
  };
  
  return (
    <div>
      <select value={target} onChange={e => setTarget(e.target.value)}>
        <option value="">All Muscles</option>
        <option value="biceps">Biceps</option>
        <option value="triceps">Triceps</option>
        <option value="chest">Chest</option>
        {/* ... more options ... */}
      </select>
      
      <select value={equipment} onChange={e => setEquipment(e.target.value)}>
        <option value="">All Equipment</option>
        <option value="dumbbell">Dumbbell</option>
        <option value="barbell">Barbell</option>
        <option value="body weight">Bodyweight</option>
        {/* ... more options ... */}
      </select>
      
      <button onClick={search}>Search</button>
      
      <div className="exercise-grid">
        {exercises.map(ex => (
          <ExerciseCard 
            key={ex.id}
            exercise={ex}
            onAdd={() => addToWorkout(ex)}
          />
        ))}
      </div>
    </div>
  );
}
```

## Troubleshooting

### API Key Invalid
**Error**: `403 Forbidden`
**Solution**: Verify API key in wrangler.toml matches RapidAPI account

### Rate Limit Exceeded
**Error**: `429 Too Many Requests`
**Solution**: Check cache configuration, increase TTL

### Empty Results
**Error**: `[]` returned
**Solution**: Check spelling of target/equipment parameters (use `/api/exercises/targets` and `/api/exercises/equipment` to get valid values)

### Slow Responses
**Issue**: API calls taking >2 seconds
**Solution**: Ensure KV caching is enabled, check cache hit rate

## Future Enhancements

1. **Favorite Exercises**
   - Save trainer's frequently used exercises
   - Quick-add from favorites

2. **Custom Exercise Library**
   - Allow trainers to add custom exercises
   - Upload custom GIFs/videos

3. **Exercise Analytics**
   - Track most-used exercises
   - Popular exercises by muscle group

4. **AI Recommendations**
   - Suggest exercises based on program goals
   - Auto-complete workout programs

5. **Progressive Difficulty**
   - Automatically suggest progression
   - Harder variations of same movement

## Support

For API issues or questions:
- RapidAPI Dashboard: https://rapidapi.com/
- ExerciseDB Documentation: https://rapidapi.com/justin-WFnsXH_t6/api/exercisedb
- FitTrack Pro Support: Contact your team lead
