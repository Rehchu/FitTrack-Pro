-- FitTrack Pro D1 User Schema Extension
-- Adds core user, client, trainer, and measurement tables
-- Deploy with: wrangler d1 execute fittrack-pro-db --file=d1-schema-users.sql --remote

-- ==================== USERS ====================

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,           -- bcrypt hash
  user_type TEXT NOT NULL,               -- 'trainer' or 'client'
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now')),
  last_login INTEGER,
  is_active INTEGER DEFAULT 1
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_type ON users(user_type);

-- ==================== TRAINERS ====================

CREATE TABLE IF NOT EXISTS trainers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,       -- FK to users.id
  business_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  specialties TEXT,                      -- JSON array
  certifications TEXT,                   -- JSON array
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_trainers_user ON trainers(user_id);

-- ==================== CLIENTS ====================

CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,       -- FK to users.id (if client has login)
  trainer_id INTEGER NOT NULL,           -- FK to trainers.id
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  date_of_birth TEXT,                    -- ISO date
  gender TEXT,
  height_cm REAL,
  initial_weight_kg REAL,
  goals TEXT,                            -- JSON array
  medical_notes TEXT,
  share_token TEXT UNIQUE,               -- For public profile URLs
  share_token_expires INTEGER,           -- Unix timestamp
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE CASCADE
);

CREATE INDEX idx_clients_trainer ON clients(trainer_id);
CREATE INDEX idx_clients_user ON clients(user_id);
CREATE INDEX idx_clients_share_token ON clients(share_token);

-- ==================== MEASUREMENTS ====================

CREATE TABLE IF NOT EXISTS measurements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  measurement_date TEXT NOT NULL,        -- ISO date
  weight_kg REAL,
  body_fat_percentage REAL,
  muscle_mass_kg REAL,
  waist_cm REAL,
  chest_cm REAL,
  arms_cm REAL,
  thighs_cm REAL,
  hips_cm REAL,
  neck_cm REAL,
  shoulders_cm REAL,
  photo_front_url TEXT,                  -- R2 URL
  photo_side_url TEXT,                   -- R2 URL
  photo_back_url TEXT,                   -- R2 URL
  notes TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE INDEX idx_measurements_client ON measurements(client_id, measurement_date DESC);
CREATE INDEX idx_measurements_date ON measurements(measurement_date DESC);

-- ==================== WORKOUTS ====================

CREATE TABLE IF NOT EXISTS workouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  trainer_id INTEGER NOT NULL,
  workout_date TEXT NOT NULL,            -- ISO date
  title TEXT NOT NULL,
  description TEXT,
  exercises TEXT NOT NULL,               -- JSON array of exercises
  duration_minutes INTEGER,
  calories_burned INTEGER,
  video_url TEXT,                        -- R2 URL
  thumbnail_url TEXT,                    -- R2 URL
  notes TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE CASCADE
);

CREATE INDEX idx_workouts_client ON workouts(client_id, workout_date DESC);
CREATE INDEX idx_workouts_trainer ON workouts(trainer_id, workout_date DESC);
CREATE INDEX idx_workouts_date ON workouts(workout_date DESC);

-- ==================== INITIAL DATA ====================

-- Insert demo trainer (password: demo123 - bcrypt hash)
INSERT OR IGNORE INTO users (id, email, password_hash, user_type) VALUES 
  (1, 'demo@fittrackpro.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyB2kUEJ.m6u', 'trainer');

INSERT OR IGNORE INTO trainers (user_id, business_name, bio) VALUES
  (1, 'FitTrack Pro Demo', 'Professional fitness trainer helping clients reach their goals');

-- Update schema version
UPDATE schema_version SET version = 2 WHERE version = 1;
INSERT OR IGNORE INTO schema_version (version) VALUES (2);
