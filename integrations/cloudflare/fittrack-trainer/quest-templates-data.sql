-- Load 40 Quest Templates for FitTrack Pro

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
