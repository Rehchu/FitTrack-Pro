# Workout Tracking System Documentation

## Overview

FitTrack Pro v1.2 includes a comprehensive workout tracking system based on the proven Pure Training architecture. The system enables trainers to create detailed workout programs, track client progress, and analyze performance metrics.

## Architecture

The system follows a hierarchical data model:

```
Exercise (Master Exercise Library)
    ↓
Workout (Workout Session/Instance)
    ↓
Setgroup (Exercise within Workout + Order)
    ↓
WorkoutSet (Individual Set with Reps/Weight/RPE)
```

### Key Concepts

**Exercise**: Master exercise library entry (e.g., "Barbell Bench Press")
- Stored once, reused across all workouts
- Contains exercise metadata (category, equipment, muscles, instructions)

**Workout**: A single workout session for a client
- Contains metadata (title, scheduled date, duration, completion status)
- Can have multiple exercises (setgroups)

**Setgroup**: An exercise within a specific workout
- Links workout to exercise
- Contains workout-specific data (order, notes, rest time)
- Groups all sets for that exercise

**WorkoutSet**: Individual set within a setgroup
- Contains performance data (reps, weight, duration, RPE)
- Tracks completion status

## Database Models

### Exercise Model

```python
Exercise:
    id: int
    name: str (unique)
    description: str (optional)
    category: str (e.g., "strength", "cardio", "flexibility")
    equipment: str (e.g., "barbell", "dumbbell", "bodyweight")
    difficulty: str (default "intermediate")
    primary_muscles: JSON list (e.g., ["chest", "triceps"])
    secondary_muscles: JSON list
    instructions: text
    video_url: str (optional)
    thumbnail_url: str (optional)
    created_at: datetime
    
    # Relationships
    setgroups: List[Setgroup]
```

### Workout Model

```python
Workout:
    id: int
    client_id: int
    trainer_id: int
    title: str
    description: str (optional)
    scheduled_at: datetime (optional)
    completed_at: datetime (optional)
    duration_minutes: int (optional)
    notes: text (optional)
    timestamp: datetime
    created_at: datetime
    
    # Relationships
    client: Client
    trainer: Trainer
    setgroups: List[Setgroup] (cascade delete, ordered by order_index)
    
    # Computed Properties
    @property completed: bool (True if completed_at is set)
    @property total_volume: float (sum of setgroup volumes)
```

### Setgroup Model

```python
Setgroup:
    id: int
    workout_id: int
    exercise_id: int
    order_index: int (for sequencing exercises in workout)
    notes: text (optional)
    rest_seconds: int (optional)
    created_at: datetime
    
    # Relationships
    workout: Workout
    exercise: Exercise
    sets: List[WorkoutSet] (cascade delete, ordered by set_number)
    
    # Computed Properties
    @property total_volume: float (sum of set volumes)
```

### WorkoutSet Model

```python
WorkoutSet:
    id: int
    setgroup_id: int
    set_number: int
    reps: int (optional)
    weight: float (kg, optional)
    duration_seconds: int (optional, for cardio/timed exercises)
    distance_meters: float (optional, for cardio)
    rpe: int (1-10, Rate of Perceived Exertion, optional)
    completed: bool (default False)
    notes: text (optional)
    created_at: datetime
    
    # Relationships
    setgroup: Setgroup
    
    # Computed Properties
    @property volume: float (reps × weight, or 0)
```

## API Endpoints

### Exercise Management (`/workouts/exercises`)

#### GET `/workouts/exercises`

List all exercises with optional filters

**Query Parameters**:
- `category` (optional): Filter by category
- `equipment` (optional): Filter by equipment
- `difficulty` (optional): Filter by difficulty
- `search` (optional): Search by name (case-insensitive)

**Response**:
```json
[
  {
    "id": 1,
    "name": "Barbell Bench Press",
    "category": "strength",
    "equipment": "barbell",
    "difficulty": "intermediate",
    "primary_muscles": ["chest", "triceps"],
    "secondary_muscles": ["shoulders"],
    "instructions": "...",
    "video_url": "https://...",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

#### POST `/workouts/exercises`

Create new exercise (with duplicate name check)

**Request Body**:
```json
{
  "name": "Barbell Bench Press",
  "category": "strength",
  "equipment": "barbell",
  "difficulty": "intermediate",
  "primary_muscles": ["chest", "triceps"],
  "secondary_muscles": ["shoulders"],
  "instructions": "Lie on bench, lower bar to chest, press up",
  "video_url": "https://example.com/video.mp4"
}
```

**Response**: 201 Created with exercise object

#### GET `/workouts/exercises/{id}`

Get single exercise by ID

**Response**: Exercise object or 404

#### PUT `/workouts/exercises/{id}`

Update exercise (partial updates supported)

**Request Body**: Any exercise fields to update

**Response**: Updated exercise object

#### DELETE `/workouts/exercises/{id}`

Delete exercise (only if not used in any workouts)

**Response**: 
- 204 No Content (success)
- 400 Bad Request (if exercise is used in workouts)

### Workout Management (`/workouts`)

#### GET `/workouts/`

List workouts with filters and pagination

**Query Parameters**:
- `client_id` (optional): Filter by client
- `trainer_id` (optional): Filter by trainer
- `completed` (optional): Filter by completion status (true/false)
- `skip` (optional): Pagination offset (default 0)
- `limit` (optional): Pagination limit (default 50)

**Response**:
```json
[
  {
    "id": 1,
    "client_id": 123,
    "trainer_id": 456,
    "title": "Upper Body Strength",
    "scheduled_at": "2024-01-15T10:00:00Z",
    "completed": true,
    "completed_at": "2024-01-15T11:30:00Z",
    "duration_minutes": 90,
    "total_volume": 5420.5,
    "exercise_count": 5,
    "created_at": "2024-01-10T00:00:00Z"
  }
]
```

#### POST `/workouts/`

Create workout with nested setgroups and sets (single transaction)

**Request Body**:
```json
{
  "client_id": 123,
  "title": "Upper Body Strength",
  "description": "Focus on compound movements",
  "scheduled_at": "2024-01-15T10:00:00Z",
  "setgroups": [
    {
      "exercise_id": 1,
      "order_index": 0,
      "rest_seconds": 180,
      "notes": "Focus on form",
      "sets": [
        {
          "set_number": 1,
          "reps": 10,
          "weight": 60.0,
          "rpe": 7
        },
        {
          "set_number": 2,
          "reps": 8,
          "weight": 65.0,
          "rpe": 8
        }
      ]
    }
  ]
}
```

**Response**: 201 Created with full workout object (including nested setgroups and sets)

#### GET `/workouts/{id}`

Get workout with all setgroups and sets

**Response**: Full workout object with nested data

#### PUT `/workouts/{id}`

Update workout metadata (partial updates)

**Request Body**: Any workout fields to update (title, description, scheduled_at, duration_minutes, notes)

**Response**: Updated workout object

#### DELETE `/workouts/{id}`

Delete workout (cascades to setgroups and sets)

**Response**: 204 No Content

#### POST `/workouts/{id}/complete`

Mark workout as completed

**Request Body**:
```json
{
  "duration_minutes": 90  // Optional
}
```

**Response**: Updated workout with completed_at timestamp

### Setgroup Operations

#### POST `/workouts/{workout_id}/setgroups`

Add exercise to existing workout

**Request Body**:
```json
{
  "exercise_id": 2,
  "order_index": 1,
  "rest_seconds": 120,
  "notes": "Slow eccentric phase",
  "sets": [
    {
      "set_number": 1,
      "reps": 12,
      "weight": 20.0
    }
  ]
}
```

**Response**: 201 Created with setgroup object

**Note**: Returns 400 if exercise already exists in workout

#### PUT `/workouts/setgroups/{id}`

Update setgroup metadata

**Request Body**:
```json
{
  "order_index": 2,
  "rest_seconds": 90,
  "notes": "Updated notes"
}
```

**Response**: Updated setgroup object

#### DELETE `/workouts/setgroups/{id}`

Delete setgroup (cascades to sets)

**Response**: 204 No Content

### Set Operations

#### POST `/workouts/setgroups/{setgroup_id}/sets`

Add set to setgroup

**Request Body**:
```json
{
  "set_number": 3,
  "reps": 6,
  "weight": 70.0,
  "rpe": 9,
  "completed": true
}
```

**Response**: 201 Created with set object

#### PUT `/workouts/sets/{id}`

Update individual set

**Request Body**: Any set fields to update

**Response**: Updated set object

#### DELETE `/workouts/sets/{id}`

Delete individual set

**Response**: 204 No Content

### Progress Tracking

#### GET `/workouts/clients/{client_id}/exercise-progress/{exercise_id}`

Get exercise-specific progress history

**Response**:
```json
{
  "exercise_id": 1,
  "exercise_name": "Barbell Bench Press",
  "category": "strength",
  "first_workout": "2024-01-01",
  "last_workout": "2024-02-01",
  "total_workouts": 8,
  "current_max_weight": 75.0,
  "starting_max_weight": 60.0,
  "weight_improvement": 15.0,
  "current_volume": 1800.0,
  "starting_volume": 1200.0,
  "volume_improvement": 600.0,
  "history": [
    {
      "date": "2024-01-01",
      "workout_id": 10,
      "max_weight": 60.0,
      "total_volume": 1200.0,
      "total_reps": 24,
      "best_set_reps": 10
    },
    {
      "date": "2024-01-05",
      "workout_id": 15,
      "max_weight": 65.0,
      "total_volume": 1450.0,
      "total_reps": 22,
      "best_set_reps": 9
    }
  ]
}
```

#### GET `/workouts/clients/{client_id}/stats`

Get comprehensive client workout statistics

**Response**:
```json
{
  "total_workouts": 24,
  "completed_workouts": 20,
  "total_exercises": 120,
  "unique_exercises": 15,
  "total_volume": 45000.0,
  "total_reps": 2400,
  "total_duration_minutes": 1800,
  "favorite_exercise": "Barbell Bench Press",
  "strongest_exercise": "Deadlift",
  "most_improved_exercise": "Pull-ups",
  "avg_workouts_per_week": 3.5,
  "current_streak_days": 14,
  "longest_streak_days": 21
}
```

## Usage Examples

### Frontend Integration

```typescript
// Create workout with exercises
const createWorkout = async (clientId: number) => {
  const workout = {
    client_id: clientId,
    title: "Leg Day",
    scheduled_at: "2024-01-20T09:00:00Z",
    setgroups: [
      {
        exercise_id: 5, // Squats
        order_index: 0,
        rest_seconds: 180,
        sets: [
          { set_number: 1, reps: 10, weight: 100 },
          { set_number: 2, reps: 8, weight: 110 },
          { set_number: 3, reps: 6, weight: 120 }
        ]
      },
      {
        exercise_id: 8, // Leg Press
        order_index: 1,
        rest_seconds: 120,
        sets: [
          { set_number: 1, reps: 12, weight: 150 },
          { set_number: 2, reps: 10, weight: 160 }
        ]
      }
    ]
  };

  const response = await fetch('/api/workouts/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(workout)
  });

  return response.json();
};

// Get client progress for specific exercise
const getExerciseProgress = async (clientId: number, exerciseId: number) => {
  const response = await fetch(
    `/api/workouts/clients/${clientId}/exercise-progress/${exerciseId}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  return response.json();
};

// Mark workout complete
const completeWorkout = async (workoutId: number, duration: number) => {
  const response = await fetch(`/api/workouts/${workoutId}/complete`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ duration_minutes: duration })
  });
  return response.json();
};
```

## Best Practices

### Workout Creation

1. **Create exercises first** - Populate exercise library before creating workouts
2. **Use nested creation** - Create workout with setgroups and sets in single API call
3. **Set order_index** - Properly sequence exercises in workout
4. **Include rest times** - Specify rest_seconds for better client guidance

### Progress Tracking

1. **Track RPE** - Use Rate of Perceived Exertion (1-10) for intensity tracking
2. **Mark sets completed** - Update completed flag as client performs sets
3. **Record actual weights** - Log weight used, even if different from planned
4. **Add notes** - Include form feedback, adjustments, client feedback

### Data Integrity

1. **Don't delete exercises** - Archive instead if used in historical workouts
2. **Verify client ownership** - Always check trainer has access to client
3. **Handle duplicates** - System prevents duplicate exercises in same workout
4. **Cascade deletes** - Deleting workout removes all setgroups and sets

### Performance

1. **Use pagination** - Limit workout queries with skip/limit
2. **Filter by client** - Query specific client workouts instead of all
3. **Limit progress history** - Request reasonable date ranges
4. **Cache statistics** - Client stats are expensive to calculate

## Troubleshooting

### Common Errors

**400: Exercise already in workout**
- Each exercise can only appear once per workout
- Remove existing setgroup before adding again

**404: Exercise not found**
- Verify exercise_id exists in Exercise table
- Check exercise wasn't deleted

**403: Access denied**
- Verify trainer owns the client
- Check authentication token is valid

**Cascade delete issues**
- SQLAlchemy handles cascades automatically
- Ensure relationships are properly configured

## Future Enhancements

- [ ] Exercise video uploads
- [ ] Auto-progression (increase weight automatically)
- [ ] Workout templates and programs
- [ ] Rest timer integration
- [ ] Exercise substitutions
- [ ] Volume load tracking over time
- [ ] Strength standards comparison
- [ ] Exercise form analysis with AI
- [ ] Workout difficulty scoring
- [ ] Estimated 1RM calculations
