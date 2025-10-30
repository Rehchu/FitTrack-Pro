-- Quest and Achievement System Schema for D1
-- Run this after the main d1-schema.sql

-- Quest Templates (Pre-built quests trainers can assign)
CREATE TABLE IF NOT EXISTS quest_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL, -- weight_loss, body_composition, measurements, nutrition, progress
    difficulty TEXT NOT NULL, -- easy, medium, hard, epic
    target_type TEXT NOT NULL, -- weight_loss_kg, body_fat_reduction, waist_reduction_cm, meal_streak, photo_count, measurement_count
    target_value REAL NOT NULL,
    xp_reward INTEGER NOT NULL,
    icon TEXT, -- emoji or icon name
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Active Quests (Assigned to clients)
CREATE TABLE IF NOT EXISTS quests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    trainer_id INTEGER NOT NULL,
    template_id INTEGER,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_value REAL NOT NULL,
    current_progress REAL DEFAULT 0,
    progress_percentage INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active', -- active, completed, failed, cancelled
    xp_reward INTEGER NOT NULL,
    deadline TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES quest_templates(id) ON DELETE SET NULL
);

-- Achievements (Unlocked by clients)
CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    trainer_id INTEGER,
    type TEXT NOT NULL, -- quest_completion, milestone, manual
    category TEXT, -- weight_loss, strength, consistency, nutrition, progress
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT, -- emoji or icon name
    xp_earned INTEGER DEFAULT 0,
    earned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    quest_id INTEGER, -- if earned from quest completion
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE SET NULL,
    FOREIGN KEY (quest_id) REFERENCES quests(id) ON DELETE SET NULL
);

-- Milestones (Auto-detected progress markers)
CREATE TABLE IF NOT EXISTS milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    type TEXT NOT NULL, -- weight_loss, body_fat_reduction, waist_reduction, meal_streak, photo_count, measurement_count
    name TEXT NOT NULL,
    description TEXT,
    value REAL NOT NULL, -- the milestone value (e.g., 5kg lost, 10% body fat reduction)
    achieved_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- XP Tracking (Client experience points and levels)
CREATE TABLE IF NOT EXISTS xp_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL UNIQUE,
    total_xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    xp_to_next_level INTEGER DEFAULT 100,
    quests_completed INTEGER DEFAULT 0,
    achievements_unlocked INTEGER DEFAULT 0,
    milestones_reached INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Progress Photos (R2-backed photo storage)
CREATE TABLE IF NOT EXISTS progress_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    trainer_id INTEGER,
    photo_url TEXT NOT NULL, -- R2 public URL
    r2_key TEXT NOT NULL, -- R2 object key
    caption TEXT,
    taken_date DATE NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE SET NULL
);

-- Workout Logs (Client workout history)
CREATE TABLE IF NOT EXISTS workout_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    workout_date DATE NOT NULL,
    exercise_name TEXT NOT NULL,
    sets INTEGER,
    reps INTEGER,
    weight_lbs REAL, -- stored in imperial
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Insert 14 Pre-Built Quest Templates
INSERT INTO quest_templates (name, description, category, difficulty, target_type, target_value, xp_reward, icon) VALUES
-- Weight Loss Quests
('First Steps', 'Lose your first 2kg and start your transformation journey', 'weight_loss', 'easy', 'weight_loss_kg', 2, 50, '🎯'),
('Getting Serious', 'Lose 5kg and prove your commitment', 'weight_loss', 'medium', 'weight_loss_kg', 5, 150, '💪'),
('Major Milestone', 'Achieve 10kg of weight loss', 'weight_loss', 'hard', 'weight_loss_kg', 10, 300, '🏆'),
('Ultimate Transformation', 'Reach the epic goal of 20kg lost', 'weight_loss', 'epic', 'weight_loss_kg', 20, 500, '👑'),

-- Body Composition Quests
('Lean Progress', 'Reduce body fat by 2%', 'body_composition', 'easy', 'body_fat_reduction', 2, 75, '📉'),
('Shredding', 'Cut body fat by 5%', 'body_composition', 'medium', 'body_fat_reduction', 5, 200, '🔥'),
('Ultra Lean', 'Achieve 10% body fat reduction', 'body_composition', 'hard', 'body_fat_reduction', 10, 400, '⚡'),

-- Measurement Quests
('Waist Watcher', 'Reduce waist by 5cm', 'measurements', 'easy', 'waist_reduction_cm', 5, 60, '📏'),
('Core Transformation', 'Lose 10cm from your waist', 'measurements', 'medium', 'waist_reduction_cm', 10, 180, '🎖️'),

-- Nutrition Quests
('Meal Logger', 'Log meals for 7 consecutive days', 'nutrition', 'easy', 'meal_streak', 7, 80, '🍎'),
('Nutrition Master', 'Maintain a 30-day meal logging streak', 'nutrition', 'hard', 'meal_streak', 30, 350, '🥇'),

-- Progress Tracking Quests
('Photo Diary', 'Upload 5 progress photos', 'progress', 'easy', 'photo_count', 5, 40, '📸'),
('Consistency King', 'Complete 10 body measurements', 'progress', 'medium', 'measurement_count', 10, 120, '📊'),
('Data Driven', 'Track 30 body measurements', 'progress', 'hard', 'measurement_count', 30, 280, '📈');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quests_client ON quests(client_id);
CREATE INDEX IF NOT EXISTS idx_quests_status ON quests(status);
CREATE INDEX IF NOT EXISTS idx_achievements_client ON achievements(client_id);
CREATE INDEX IF NOT EXISTS idx_milestones_client ON milestones(client_id);
CREATE INDEX IF NOT EXISTS idx_progress_photos_client ON progress_photos(client_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_client ON workout_logs(client_id);
