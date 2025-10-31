-- FitTrack Pro - Migration v3: Client/Trainer Permissions & Meal/Workout Tracking
-- This migration adds permission-based fields and completion tracking

-- ============================================================================
-- STEP 1: Add users table for unified authentication (trainers + clients)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  user_type TEXT NOT NULL CHECK(user_type IN ('trainer', 'client')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_type ON users(user_type);

-- ============================================================================
-- STEP 2: Update trainers table to link to users
-- ============================================================================
-- Add user_id column to trainers (will be populated in migration)
ALTER TABLE trainers ADD COLUMN user_id INTEGER REFERENCES users(id);

-- ============================================================================
-- STEP 3: Update clients table to link to users
-- ============================================================================
-- Add user_id column to clients
ALTER TABLE clients ADD COLUMN user_id INTEGER REFERENCES users(id);

-- Add age and daily_steps fields
ALTER TABLE clients ADD COLUMN age INTEGER;
ALTER TABLE clients ADD COLUMN daily_steps_average INTEGER DEFAULT 0;

-- ============================================================================
-- STEP 4: Update measurements table with permissions
-- ============================================================================
-- Add created_by to track who entered the measurement
ALTER TABLE measurements ADD COLUMN created_by TEXT CHECK(created_by IN ('trainer', 'client'));

-- Add age and daily_steps fields
ALTER TABLE measurements ADD COLUMN age INTEGER;
ALTER TABLE measurements ADD COLUMN daily_steps INTEGER;

-- Make most measurements optional (only height, weight, age, steps required)
-- Note: SQLite doesn't support ALTER COLUMN, so these are comments for documentation
-- REQUIRED: weight_kg, age, daily_steps (for new measurements)
-- OPTIONAL: All other body measurements

-- ============================================================================
-- STEP 5: Update meals table with completion tracking
-- ============================================================================
-- Add created_by to track trainer vs client entries
ALTER TABLE meals ADD COLUMN created_by TEXT CHECK(created_by IN ('trainer', 'client'));

-- Add completion tracking
ALTER TABLE meals ADD COLUMN is_completed INTEGER DEFAULT 0;
ALTER TABLE meals ADD COLUMN completed_at TEXT;

-- ============================================================================
-- STEP 6: Update meal_items table with completion tracking
-- ============================================================================
-- Add created_by to track who added this food item
ALTER TABLE meal_items ADD COLUMN created_by TEXT CHECK(created_by IN ('trainer', 'client'));

-- Add completion tracking for individual food items
ALTER TABLE meal_items ADD COLUMN is_completed INTEGER DEFAULT 0;
ALTER TABLE meal_items ADD COLUMN completed_at TEXT;

-- ============================================================================
-- STEP 7: Add workout_assignments table for trainer-assigned workouts
-- ============================================================================
CREATE TABLE IF NOT EXISTS workout_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  workout_program_id INTEGER,
  workout_day_id INTEGER,
  assigned_date TEXT NOT NULL,
  assigned_by_trainer INTEGER NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (workout_program_id) REFERENCES workout_programs(id),
  FOREIGN KEY (workout_day_id) REFERENCES workout_days(id)
);

CREATE INDEX IF NOT EXISTS idx_workout_assignments_client ON workout_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_workout_assignments_date ON workout_assignments(assigned_date);

-- ============================================================================
-- STEP 8: Add exercise_completions table for checkbox tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS exercise_completions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  workout_assignment_id INTEGER,
  exercise_id INTEGER NOT NULL,
  completed_date TEXT NOT NULL,
  sets_completed INTEGER,
  reps_completed INTEGER,
  weight_used_kg REAL,
  notes TEXT,
  completed_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (workout_assignment_id) REFERENCES workout_assignments(id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id)
);

CREATE INDEX IF NOT EXISTS idx_exercise_completions_client ON exercise_completions(client_id);
CREATE INDEX IF NOT EXISTS idx_exercise_completions_assignment ON exercise_completions(workout_assignment_id);
CREATE INDEX IF NOT EXISTS idx_exercise_completions_date ON exercise_completions(completed_date);

-- ============================================================================
-- STEP 9: Add client_exercises table for client-added exercises
-- ============================================================================
CREATE TABLE IF NOT EXISTS client_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  exercise_name TEXT NOT NULL,
  sets INTEGER,
  reps INTEGER,
  weight_kg REAL,
  exercise_date TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_client_exercises_client ON client_exercises(client_id);
CREATE INDEX IF NOT EXISTS idx_client_exercises_date ON client_exercises(exercise_date);

-- ============================================================================
-- STEP 10: Add sessions table for both trainer and client sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  user_type TEXT NOT NULL CHECK(user_type IN ('trainer', 'client')),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ============================================================================
-- STEP 11: Update schema_version
-- ============================================================================
INSERT OR REPLACE INTO schema_version (version, applied_at) VALUES (3, datetime('now'));
