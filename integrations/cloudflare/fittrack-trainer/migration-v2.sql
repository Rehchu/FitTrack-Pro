-- Migration: Add workout program support to existing schema

-- Add new columns to quest_templates
ALTER TABLE quest_templates ADD COLUMN is_goal_based INTEGER NOT NULL DEFAULT 0;
ALTER TABLE quest_templates ADD COLUMN has_workout_program INTEGER NOT NULL DEFAULT 0;
ALTER TABLE quest_templates ADD COLUMN duration_weeks INTEGER;

-- Make target_value and target_unit nullable for goal-based quests
-- (SQLite doesn't support ALTER COLUMN, so we need to work with existing structure)

-- Add new quest templates (starting from ID 16)
INSERT OR IGNORE INTO quest_templates (id, name, description, category, difficulty, target_value, target_unit, xp_reward, icon, is_goal_based, has_workout_program, duration_weeks) VALUES
-- EVENT-BASED GOAL QUESTS
(16, 'Summer Beach Body', 'Get beach-ready with custom workout plan', 'event_based', 'hard', 0, 'goal', 800, '🏖️', 1, 1, 12),
(17, 'Wedding Ready', 'Fit into your dream wedding outfit', 'event_based', 'hard', 0, 'goal', 1000, '💒', 1, 1, 16),
(18, 'Vacation Vibes', 'Look your best for your upcoming vacation', 'event_based', 'medium', 0, 'goal', 600, '✈️', 1, 1, 8),
(19, 'Reunion Ready', 'Impress at your class/family reunion', 'event_based', 'medium', 0, 'goal', 500, '🎉', 1, 1, 12),
(20, 'Competition Prep', 'Prepare for fitness/bodybuilding competition', 'event_based', 'epic', 0, 'goal', 1500, '🥇', 1, 1, 20),
(21, 'New Year New You', 'Transform yourself for the new year', 'event_based', 'hard', 0, 'goal', 900, '🎆', 1, 1, 12),
(22, 'Birthday Transformation', 'Best shape of your life for your birthday', 'event_based', 'medium', 0, 'goal', 600, '🎂', 1, 1, 10),
(23, 'Photo Shoot Ready', 'Get camera-ready for professional photos', 'event_based', 'hard', 0, 'goal', 700, '📷', 1, 1, 8),
(24, 'Athletic Event Prep', 'Train for marathon/triathlon/sports event', 'event_based', 'epic', 0, 'goal', 1200, '🏃', 1, 1, 16),
(25, 'Post-Baby Body', 'Reclaim your pre-pregnancy fitness', 'event_based', 'hard', 0, 'goal', 1000, '👶', 1, 1, 20),

-- SPECIALTY PROGRAM QUESTS
(26, '30-Day Shred', 'Intensive 30-day fat loss program', 'custom', 'hard', 30, 'days', 800, '🔥', 0, 1, 4),
(27, '12-Week Transformation', 'Complete body transformation program', 'custom', 'epic', 12, 'weeks', 1500, '⚡', 0, 1, 12),
(28, 'Beginner Fitness Journey', '8-week beginner workout program', 'custom', 'easy', 8, 'weeks', 400, '🌱', 0, 1, 8),
(29, 'Strength Builder', '10-week strength training program', 'custom', 'medium', 10, 'weeks', 600, '💪', 0, 1, 10),
(30, 'Cardio Challenge', '6-week cardiovascular endurance program', 'custom', 'medium', 6, 'weeks', 500, '❤️', 0, 1, 6),

-- BODY PART FOCUS QUESTS
(31, 'Abs of Steel', 'Define your core in 8 weeks', 'custom', 'medium', 8, 'weeks', 500, '💎', 0, 1, 8),
(32, 'Booty Builder', 'Sculpt your glutes in 10 weeks', 'custom', 'medium', 10, 'weeks', 600, '🍑', 0, 1, 10),
(33, 'Arm Sculptor', 'Tone and define arms in 6 weeks', 'custom', 'easy', 6, 'weeks', 400, '💪', 0, 1, 6),
(34, 'Leg Day Warrior', 'Build powerful legs in 12 weeks', 'custom', 'hard', 12, 'weeks', 700, '🦵', 0, 1, 12),

-- LIFESTYLE QUESTS
(35, 'Consistency Champion', 'Work out 3x/week for 12 weeks', 'custom', 'medium', 36, 'workouts', 600, '🎯', 0, 0, 12),
(36, 'Early Bird', 'Complete 20 morning workouts', 'custom', 'easy', 20, 'workouts', 300, '🌅', 0, 0, 0),
(37, 'Hydration Hero', 'Drink 3L water daily for 30 days', 'nutrition', 'easy', 30, 'days', 250, '💧', 0, 0, 0),
(38, 'Sleep Master', '8 hours sleep for 30 consecutive nights', 'custom', 'medium', 30, 'nights', 400, '😴', 0, 0, 0),

-- ADVANCED GOALS
(39, 'Custom Goal Creator', 'Trainer creates fully custom quest', 'custom', 'medium', 0, 'custom', 0, '✨', 1, 1, 0),
(40, 'Ultimate Transformation', 'Lose goal weight + build muscle', 'event_based', 'epic', 0, 'goal', 2000, '🏆', 1, 1, 24);

-- Add new columns to client_quests
ALTER TABLE client_quests ADD COLUMN custom_target_weight_kg REAL;
ALTER TABLE client_quests ADD COLUMN event_date TEXT;
ALTER TABLE client_quests ADD COLUMN notes TEXT;

-- Create new workout program tables
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

-- Update schema version
UPDATE schema_version SET version = 2 WHERE version = 1;
INSERT OR REPLACE INTO schema_version (version) VALUES (2);
