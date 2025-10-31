-- FitTrack Pro - Complete D1 Database Schema v3
-- Includes client/trainer permissions, meal/workout tracking with checkboxes

PRAGMA foreign_keys = ON;

-- ============================================================================
-- USERS TABLE (Universal Authentication)
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
-- TRAINERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS trainers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  business_name TEXT,
  logo_url TEXT,
  profile_completed INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_trainers_user ON trainers(user_id);

-- ============================================================================
-- CLIENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE,
  trainer_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  date_of_birth TEXT,
  age INTEGER,
  gender TEXT CHECK(gender IN ('male', 'female', 'other')),
  height_cm REAL,
  initial_weight_kg REAL,
  goal_weight_kg REAL,
  daily_steps_average INTEGER DEFAULT 0,
  goal_description TEXT,
  notes TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_clients_trainer ON clients(trainer_id);
CREATE INDEX IF NOT EXISTS idx_clients_user ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);

-- ============================================================================
-- MEASUREMENTS TABLE (with permissions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS measurements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  measurement_date TEXT NOT NULL,
  created_by TEXT CHECK(created_by IN ('trainer', 'client')),
  -- REQUIRED fields (can be updated by specified user)
  weight_kg REAL,              -- Trainer + Client can update
  age INTEGER,                 -- Client can update
  daily_steps INTEGER,         -- Trainer + Client can update
  -- OPTIONAL fields (Client can update)
  height_cm REAL,             -- Client can update
  body_fat_percentage REAL,   -- Client can update
  chest_cm REAL,              -- Client can update
  waist_cm REAL,              -- Client can update
  hips_cm REAL,               -- Client can update
  biceps_left_cm REAL,        -- Client can update
  biceps_right_cm REAL,       -- Client can update
  thigh_left_cm REAL,         -- Client can update
  thigh_right_cm REAL,        -- Client can update
  calf_left_cm REAL,          -- Client can update
  calf_right_cm REAL,         -- Client can update
  shoulders_cm REAL,          -- Client can update
  forearm_left_cm REAL,       -- Client can update
  forearm_right_cm REAL,      -- Client can update
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_measurements_client ON measurements(client_id);
CREATE INDEX IF NOT EXISTS idx_measurements_date ON measurements(measurement_date);

-- ============================================================================
-- PROGRESS PHOTOS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS progress_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  photo_url TEXT NOT NULL,
  thumbnail_url TEXT,
  photo_date TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_photos_client ON progress_photos(client_id);
CREATE INDEX IF NOT EXISTS idx_photos_date ON progress_photos(photo_date);

-- ============================================================================
-- MEALS TABLE (with completion tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  meal_date TEXT NOT NULL,
  meal_time TEXT NOT NULL CHECK(meal_time IN ('breakfast', 'lunch', 'dinner', 'snack')),
  name TEXT NOT NULL,
  description TEXT,
  created_by TEXT CHECK(created_by IN ('trainer', 'client')),
  is_completed INTEGER DEFAULT 0,
  completed_at TEXT,
  calories REAL,
  protein_g REAL,
  carbs_g REAL,
  fat_g REAL,
  fiber_g REAL,
  sodium_mg REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_meals_client ON meals(client_id);
CREATE INDEX IF NOT EXISTS idx_meals_date ON meals(meal_date);

-- ============================================================================
-- MEAL ITEMS TABLE (with completion tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS meal_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meal_id INTEGER NOT NULL,
  food_name TEXT NOT NULL,
  quantity TEXT NOT NULL,
  created_by TEXT CHECK(created_by IN ('trainer', 'client')),
  is_completed INTEGER DEFAULT 0,
  completed_at TEXT,
  calories REAL,
  protein_g REAL,
  carbs_g REAL,
  fat_g REAL,
  FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_meal_items_meal ON meal_items(meal_id);

-- ============================================================================
-- QUEST TEMPLATES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS quest_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('weight_loss', 'body_composition', 'measurements', 'nutrition', 'progress', 'event_based', 'custom')),
  difficulty TEXT NOT NULL CHECK(difficulty IN ('easy', 'medium', 'hard', 'epic')),
  target_value REAL,
  target_unit TEXT,
  xp_reward INTEGER NOT NULL,
  icon TEXT,
  is_goal_based INTEGER NOT NULL DEFAULT 0,
  has_workout_program INTEGER NOT NULL DEFAULT 0,
  duration_weeks INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Pre-populate quest templates (40 templates loaded separately)

-- ============================================================================
-- CLIENT QUESTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS client_quests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  quest_template_id INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  difficulty TEXT,
  target_value REAL,
  current_value REAL DEFAULT 0,
  target_unit TEXT,
  custom_target_weight_kg REAL,
  event_date TEXT,
  notes TEXT,
  xp_reward INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (quest_template_id) REFERENCES quest_templates(id)
);

CREATE INDEX IF NOT EXISTS idx_client_quests_client ON client_quests(client_id);
CREATE INDEX IF NOT EXISTS idx_client_quests_active ON client_quests(is_active);

-- ============================================================================
-- WORKOUT PROGRAMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS workout_programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quest_template_id INTEGER,
  trainer_id INTEGER,
  name TEXT NOT NULL,
  description TEXT,
  duration_weeks INTEGER NOT NULL,
  workouts_per_week INTEGER NOT NULL,
  difficulty TEXT CHECK(difficulty IN ('beginner', 'intermediate', 'advanced')),
  is_template INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (quest_template_id) REFERENCES quest_templates(id),
  FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_workout_programs_trainer ON workout_programs(trainer_id);
CREATE INDEX IF NOT EXISTS idx_workout_programs_template ON workout_programs(is_template);

-- ============================================================================
-- WORKOUT DAYS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS workout_days (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_program_id INTEGER NOT NULL,
  week_number INTEGER NOT NULL,
  day_number INTEGER NOT NULL,
  day_name TEXT NOT NULL,
  focus TEXT,
  notes TEXT,
  FOREIGN KEY (workout_program_id) REFERENCES workout_programs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_workout_days_program ON workout_days(workout_program_id);

-- ============================================================================
-- EXERCISES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_day_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  sets INTEGER NOT NULL,
  reps TEXT NOT NULL,
  rest_seconds INTEGER,
  notes TEXT,
  video_url TEXT,
  FOREIGN KEY (workout_day_id) REFERENCES workout_days(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_exercises_workout_day ON exercises(workout_day_id);

-- ============================================================================
-- WORKOUT ASSIGNMENTS TABLE (Trainer assigns workouts to clients)
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
  FOREIGN KEY (workout_day_id) REFERENCES workout_days(id),
  FOREIGN KEY (assigned_by_trainer) REFERENCES trainers(id)
);

CREATE INDEX IF NOT EXISTS idx_workout_assignments_client ON workout_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_workout_assignments_date ON workout_assignments(assigned_date);

-- ============================================================================
-- EXERCISE COMPLETIONS TABLE (Client checks off completed exercises)
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
-- CLIENT EXERCISES TABLE (Client-added exercises)
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
-- CLIENT WORKOUT ASSIGNMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS client_workout_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  workout_program_id INTEGER NOT NULL,
  assigned_date TEXT NOT NULL,
  completed_date TEXT,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (workout_program_id) REFERENCES workout_programs(id)
);

CREATE INDEX IF NOT EXISTS idx_client_workout_assignments_client ON client_workout_assignments(client_id);

-- ============================================================================
-- WORKOUT COMPLETIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS workout_completions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  workout_day_id INTEGER NOT NULL,
  completion_date TEXT NOT NULL,
  notes TEXT,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (workout_day_id) REFERENCES workout_days(id)
);

CREATE INDEX IF NOT EXISTS idx_workout_completions_client ON workout_completions(client_id);

-- ============================================================================
-- ACHIEVEMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT,
  earned_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_achievements_client ON achievements(client_id);

-- ============================================================================
-- MILESTONES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS milestones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  milestone_type TEXT,
  value REAL,
  unit TEXT,
  icon TEXT,
  achieved_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_milestones_client ON milestones(client_id);

-- ============================================================================
-- MESSAGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trainer_id INTEGER NOT NULL,
  client_id INTEGER NOT NULL,
  sender_type TEXT NOT NULL CHECK(sender_type IN ('trainer', 'client')),
  message TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_trainer ON messages(trainer_id);
CREATE INDEX IF NOT EXISTS idx_messages_client ON messages(client_id);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(is_read);

-- ============================================================================
-- SHARE TOKENS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS share_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_share_tokens_token ON share_tokens(token);
CREATE INDEX IF NOT EXISTS idx_share_tokens_client ON share_tokens(client_id);

-- ============================================================================
-- SESSIONS TABLE (Combined trainer + client sessions)
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
-- SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trainer_id INTEGER NOT NULL UNIQUE,
  business_name TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#FF4B39',
  secondary_color TEXT DEFAULT '#FFB82B',
  accent_color TEXT DEFAULT '#1BB55C',
  FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE CASCADE
);

-- ============================================================================
-- SCHEMA VERSION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

INSERT OR REPLACE INTO schema_version (version, applied_at) VALUES (3, datetime('now'));
