-- FitTrack Pro - D1 Database Schema
-- Complete schema for trainer portal with all core features

-- ============================================================================
-- TRAINERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS trainers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  business_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_trainers_email ON trainers(email);

-- ============================================================================
-- CLIENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trainer_id INTEGER NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  date_of_birth TEXT,
  gender TEXT CHECK(gender IN ('male', 'female', 'other')),
  height_cm REAL,
  initial_weight_kg REAL,
  goal_weight_kg REAL,
  goal_description TEXT,
  notes TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_clients_trainer ON clients(trainer_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_active ON clients(is_active);

-- ============================================================================
-- MEASUREMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS measurements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  measurement_date TEXT NOT NULL,
  weight_kg REAL,
  body_fat_percentage REAL,
  chest_cm REAL,
  waist_cm REAL,
  hips_cm REAL,
  biceps_left_cm REAL,
  biceps_right_cm REAL,
  thigh_left_cm REAL,
  thigh_right_cm REAL,
  calf_left_cm REAL,
  calf_right_cm REAL,
  shoulders_cm REAL,
  forearm_left_cm REAL,
  forearm_right_cm REAL,
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
-- MEALS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  meal_date TEXT NOT NULL,
  meal_time TEXT NOT NULL CHECK(meal_time IN ('breakfast', 'lunch', 'dinner', 'snack')),
  name TEXT NOT NULL,
  description TEXT,
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
-- MEAL ITEMS TABLE (for multi-food meals)
-- ============================================================================
CREATE TABLE IF NOT EXISTS meal_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meal_id INTEGER NOT NULL,
  food_name TEXT NOT NULL,
  quantity TEXT NOT NULL,
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

-- Pre-populate with expanded quest templates (40+ templates)
INSERT OR IGNORE INTO quest_templates (id, name, description, category, difficulty, target_value, target_unit, xp_reward, icon, is_goal_based, has_workout_program, duration_weeks) VALUES
-- Weight Loss Quests
(1, 'First Steps', 'Lose your first 2kg', 'weight_loss', 'easy', 2, 'kg', 100, '🎯', 0, 0, NULL),
(2, 'Getting Serious', 'Lose 5kg total', 'weight_loss', 'medium', 5, 'kg', 250, '💪', 0, 0, NULL),
(3, 'Major Milestone', 'Lose 10kg total', 'weight_loss', 'hard', 10, 'kg', 500, '🏆', 0, 0, NULL),
(4, 'Epic Achievement', 'Lose 20kg total', 'weight_loss', 'epic', 20, 'kg', 1000, '👑', 0, 0, NULL),

-- Body Composition Quests
(5, 'Body Recomp Beginner', 'Reduce body fat by 2%', 'body_composition', 'easy', 2, '%', 150, '📉', 0, 0, NULL),
(6, 'Body Recomp Pro', 'Reduce body fat by 5%', 'body_composition', 'medium', 5, '%', 300, '🔥', 0, 0, NULL),
(7, 'Shredded', 'Reduce body fat by 10%', 'body_composition', 'hard', 10, '%', 600, '⚡', 0, 0, NULL),

-- Measurement Quests
(8, 'Waist Warrior', 'Reduce waist by 5cm', 'measurements', 'easy', 5, 'cm', 100, '📏', 0, 0, NULL),
(9, 'Waist Destroyer', 'Reduce waist by 10cm', 'measurements', 'medium', 10, 'cm', 250, '🎯', 0, 0, NULL),
(10, 'Slim Waist Champion', 'Reduce waist by 15cm', 'measurements', 'hard', 15, 'cm', 500, '👑', 0, 0, NULL),

-- Nutrition Quests
(11, 'Nutrition Newbie', 'Log meals for 7 days', 'nutrition', 'easy', 7, 'days', 100, '🍎', 0, 0, NULL),
(12, 'Nutrition Ninja', 'Log meals for 30 days', 'nutrition', 'medium', 30, 'days', 300, '🥗', 0, 0, NULL),
(13, 'Nutrition Master', 'Log meals for 90 days', 'nutrition', 'hard', 90, 'days', 750, '🏅', 0, 0, NULL),

-- Progress Tracking Quests
(14, 'Progress Tracker', 'Upload 10 progress photos', 'progress', 'easy', 10, 'photos', 150, '📸', 0, 0, NULL),
(15, 'Transformation King', 'Upload 30 progress photos', 'progress', 'medium', 30, 'photos', 400, '👑', 0, 0, NULL),

-- EVENT-BASED GOAL QUESTS (NEW!)
(16, 'Summer Beach Body', 'Get beach-ready with custom workout plan', 'event_based', 'hard', NULL, 'goal', 800, '🏖️', 1, 1, 12),
(17, 'Wedding Ready', 'Fit into your dream wedding outfit', 'event_based', 'hard', NULL, 'goal', 1000, '💒', 1, 1, 16),
(18, 'Vacation Vibes', 'Look your best for your upcoming vacation', 'event_based', 'medium', NULL, 'goal', 600, '✈️', 1, 1, 8),
(19, 'Reunion Ready', 'Impress at your class/family reunion', 'event_based', 'medium', NULL, 'goal', 500, '🎉', 1, 1, 12),
(20, 'Competition Prep', 'Prepare for fitness/bodybuilding competition', 'event_based', 'epic', NULL, 'goal', 1500, '🥇', 1, 1, 20),
(21, 'New Year New You', 'Transform yourself for the new year', 'event_based', 'hard', NULL, 'goal', 900, '🎆', 1, 1, 12),
(22, 'Birthday Transformation', 'Best shape of your life for your birthday', 'event_based', 'medium', NULL, 'goal', 600, '🎂', 1, 1, 10),
(23, 'Photo Shoot Ready', 'Get camera-ready for professional photos', 'event_based', 'hard', NULL, 'goal', 700, '📷', 1, 1, 8),
(24, 'Athletic Event Prep', 'Train for marathon/triathlon/sports event', 'event_based', 'epic', NULL, 'goal', 1200, '🏃', 1, 1, 16),
(25, 'Post-Baby Body', 'Reclaim your pre-pregnancy fitness', 'event_based', 'hard', NULL, 'goal', 1000, '👶', 1, 1, 20),

-- SPECIALTY PROGRAM QUESTS (NEW!)
(26, '30-Day Shred', 'Intensive 30-day fat loss program', 'custom', 'hard', 30, 'days', 800, '🔥', 0, 1, 4),
(27, '12-Week Transformation', 'Complete body transformation program', 'custom', 'epic', 12, 'weeks', 1500, '⚡', 0, 1, 12),
(28, 'Beginner Fitness Journey', '8-week beginner workout program', 'custom', 'easy', 8, 'weeks', 400, '🌱', 0, 1, 8),
(29, 'Strength Builder', '10-week strength training program', 'custom', 'medium', 10, 'weeks', 600, '💪', 0, 1, 10),
(30, 'Cardio Challenge', '6-week cardiovascular endurance program', 'custom', 'medium', 6, 'weeks', 500, '❤️', 0, 1, 6),

-- BODY PART FOCUS QUESTS (NEW!)
(31, 'Abs of Steel', 'Define your core in 8 weeks', 'custom', 'medium', 8, 'weeks', 500, '💎', 0, 1, 8),
(32, 'Booty Builder', 'Sculpt your glutes in 10 weeks', 'custom', 'medium', 10, 'weeks', 600, '🍑', 0, 1, 10),
(33, 'Arm Sculptor', 'Tone and define arms in 6 weeks', 'custom', 'easy', 6, 'weeks', 400, '💪', 0, 1, 6),
(34, 'Leg Day Warrior', 'Build powerful legs in 12 weeks', 'custom', 'hard', 12, 'weeks', 700, '🦵', 0, 1, 12),

-- LIFESTYLE QUESTS (NEW!)
(35, 'Consistency Champion', 'Work out 3x/week for 12 weeks', 'custom', 'medium', 36, 'workouts', 600, '🎯', 0, 0, 12),
(36, 'Early Bird', 'Complete 20 morning workouts', 'custom', 'easy', 20, 'workouts', 300, '🌅', 0, 0, NULL),
(37, 'Hydration Hero', 'Drink 3L water daily for 30 days', 'nutrition', 'easy', 30, 'days', 250, '💧', 0, 0, NULL),
(38, 'Sleep Master', '8 hours sleep for 30 consecutive nights', 'custom', 'medium', 30, 'nights', 400, '😴', 0, 0, NULL),

-- ADVANCED GOALS (NEW!)
(39, 'Custom Goal Creator', 'Trainer creates fully custom quest', 'custom', 'medium', NULL, 'custom', 0, '✨', 1, 1, NULL),
(40, 'Ultimate Transformation', 'Lose goal weight + build muscle', 'event_based', 'epic', NULL, 'goal', 2000, '🏆', 1, 1, 24);

CREATE INDEX IF NOT EXISTS idx_quest_templates_category ON quest_templates(category);
CREATE INDEX IF NOT EXISTS idx_quest_templates_difficulty ON quest_templates(difficulty);
CREATE INDEX IF NOT EXISTS idx_quest_templates_goal_based ON quest_templates(is_goal_based);
CREATE INDEX IF NOT EXISTS idx_quest_templates_workout ON quest_templates(has_workout_program);

-- ============================================================================
-- CLIENT QUESTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS client_quests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  quest_template_id INTEGER NOT NULL,
  assigned_by_trainer_id INTEGER NOT NULL,
  current_progress REAL NOT NULL DEFAULT 0,
  target_value REAL NOT NULL,
  custom_target_weight_kg REAL,
  event_date TEXT,
  is_completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  deadline TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (quest_template_id) REFERENCES quest_templates(id),
  FOREIGN KEY (assigned_by_trainer_id) REFERENCES trainers(id)
);

CREATE INDEX IF NOT EXISTS idx_client_quests_client ON client_quests(client_id);
CREATE INDEX IF NOT EXISTS idx_client_quests_completed ON client_quests(is_completed);

-- ============================================================================
-- WORKOUT PROGRAMS TABLE (NEW!)
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
  focus_area TEXT,
  is_template INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (quest_template_id) REFERENCES quest_templates(id),
  FOREIGN KEY (trainer_id) REFERENCES trainers(id)
);

CREATE INDEX IF NOT EXISTS idx_workout_programs_quest ON workout_programs(quest_template_id);
CREATE INDEX IF NOT EXISTS idx_workout_programs_trainer ON workout_programs(trainer_id);
CREATE INDEX IF NOT EXISTS idx_workout_programs_template ON workout_programs(is_template);

-- ============================================================================
-- WORKOUT DAYS TABLE (NEW!)
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
CREATE INDEX IF NOT EXISTS idx_workout_days_week ON workout_days(week_number);

-- ============================================================================
-- EXERCISES TABLE (NEW!)
-- ============================================================================
CREATE TABLE IF NOT EXISTS exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_day_id INTEGER NOT NULL,
  exercise_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  sets INTEGER NOT NULL,
  reps TEXT NOT NULL,
  rest_seconds INTEGER,
  notes TEXT,
  video_url TEXT,
  FOREIGN KEY (workout_day_id) REFERENCES workout_days(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_exercises_workout_day ON exercises(workout_day_id);
CREATE INDEX IF NOT EXISTS idx_exercises_order ON exercises(exercise_order);

-- ============================================================================
-- CLIENT WORKOUT ASSIGNMENTS TABLE (NEW!)
-- ============================================================================
CREATE TABLE IF NOT EXISTS client_workout_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  workout_program_id INTEGER NOT NULL,
  client_quest_id INTEGER,
  assigned_by_trainer_id INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  current_week INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (workout_program_id) REFERENCES workout_programs(id),
  FOREIGN KEY (client_quest_id) REFERENCES client_quests(id),
  FOREIGN KEY (assigned_by_trainer_id) REFERENCES trainers(id)
);

CREATE INDEX IF NOT EXISTS idx_client_workout_client ON client_workout_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_workout_program ON client_workout_assignments(workout_program_id);
CREATE INDEX IF NOT EXISTS idx_client_workout_active ON client_workout_assignments(is_active);

-- ============================================================================
-- WORKOUT COMPLETIONS TABLE (NEW!)
-- ============================================================================
CREATE TABLE IF NOT EXISTS workout_completions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  workout_day_id INTEGER NOT NULL,
  completed_date TEXT NOT NULL,
  duration_minutes INTEGER,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (workout_day_id) REFERENCES workout_days(id)
);

CREATE INDEX IF NOT EXISTS idx_workout_completions_client ON workout_completions(client_id);
CREATE INDEX IF NOT EXISTS idx_workout_completions_date ON workout_completions(completed_date);

-- ============================================================================
-- ACHIEVEMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  icon TEXT,
  awarded_at TEXT NOT NULL DEFAULT (datetime('now')),
  awarded_by_trainer_id INTEGER,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (awarded_by_trainer_id) REFERENCES trainers(id)
);

CREATE INDEX IF NOT EXISTS idx_achievements_client ON achievements(client_id);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category);

-- ============================================================================
-- MILESTONES TABLE (auto-detected)
-- ============================================================================
CREATE TABLE IF NOT EXISTS milestones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  milestone_type TEXT NOT NULL,
  value REAL NOT NULL,
  detected_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_milestones_client ON milestones(client_id);
CREATE INDEX IF NOT EXISTS idx_milestones_type ON milestones(milestone_type);

-- ============================================================================
-- MESSAGES TABLE (for real-time chat)
-- ============================================================================
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_type TEXT NOT NULL CHECK(sender_type IN ('trainer', 'client')),
  sender_id INTEGER NOT NULL,
  recipient_type TEXT NOT NULL CHECK(recipient_type IN ('trainer', 'client')),
  recipient_id INTEGER NOT NULL,
  message_text TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_type, recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_type, sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

-- ============================================================================
-- SHARE TOKENS TABLE (for public profile sharing)
-- ============================================================================
CREATE TABLE IF NOT EXISTS share_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_share_tokens_token ON share_tokens(token);
CREATE INDEX IF NOT EXISTS idx_share_tokens_client ON share_tokens(client_id);

-- ============================================================================
-- SESSIONS TABLE (for JWT session management)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trainer_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_trainer ON sessions(trainer_id);

-- ============================================================================
-- SETTINGS TABLE (trainer customization)
-- ============================================================================
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trainer_id INTEGER NOT NULL UNIQUE,
  business_name TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#00ff41',
  secondary_color TEXT DEFAULT '#b026ff',
  custom_domain TEXT,
  FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE CASCADE
);

-- ============================================================================
-- SCHEMA VERSION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR REPLACE INTO schema_version (version) VALUES (1);
