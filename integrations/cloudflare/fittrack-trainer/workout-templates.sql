-- FitTrack Pro - Pre-Made Workout Program Templates
-- These are editable templates trainers can customize for their clients

-- Temporarily disable foreign key checks
PRAGMA foreign_keys = OFF;

-- ============================================================================
-- SUMMER BEACH BODY PROGRAM (12 weeks)
-- ============================================================================
INSERT INTO workout_programs (id, quest_template_id, trainer_id, name, description, duration_weeks, workouts_per_week, difficulty, focus_area, is_template) VALUES
(1, 16, NULL, 'Summer Beach Body Program', 'Get beach-ready with this comprehensive 12-week program focusing on fat loss and muscle definition', 12, 4, 'intermediate', 'full_body', 1);

-- Week 1-4: Foundation Phase
INSERT INTO workout_days (workout_program_id, week_number, day_number, day_name, focus, notes) VALUES
(1, 1, 1, 'Monday - Upper Body', 'Chest, Back, Shoulders', 'Focus on form and controlled movements'),
(1, 1, 2, 'Wednesday - Lower Body', 'Legs, Glutes', 'Go deep on squats, feel the burn'),
(1, 1, 3, 'Friday - Full Body Circuit', 'Total Body Conditioning', 'High intensity, short rest'),
(1, 1, 4, 'Saturday - Core & Cardio', 'Abs, HIIT', '20 min cardio + ab work');

-- Monday - Upper Body Exercises
INSERT INTO exercises (workout_day_id, exercise_order, name, sets, reps, rest_seconds, notes) VALUES
(1, 1, 'Push-ups', 3, '12-15', 60, 'Modify on knees if needed'),
(1, 2, 'Dumbbell Rows', 3, '12 each arm', 60, 'Keep back straight'),
(1, 3, 'Shoulder Press', 3, '10-12', 60, 'Control the weight down'),
(1, 4, 'Bicep Curls', 3, '12-15', 45, 'No swinging'),
(1, 5, 'Tricep Dips', 3, '10-12', 45, 'Use chair or bench'),
(1, 6, 'Plank Hold', 3, '30-45 sec', 30, 'Keep core tight');

-- Wednesday - Lower Body Exercises
INSERT INTO exercises (workout_day_id, exercise_order, name, sets, reps, rest_seconds, notes) VALUES
(2, 1, 'Bodyweight Squats', 3, '15-20', 60, 'Chest up, knees over toes'),
(2, 2, 'Walking Lunges', 3, '12 each leg', 60, 'Step forward with control'),
(2, 3, 'Glute Bridges', 3, '15-20', 45, 'Squeeze at the top'),
(2, 4, 'Calf Raises', 3, '20', 30, 'Full range of motion'),
(2, 5, 'Wall Sit', 3, '30-45 sec', 45, 'Thighs parallel to ground'),
(2, 6, 'Jumping Jacks', 3, '30 reps', 30, 'Cardio finisher');

-- Friday - Full Body Circuit
INSERT INTO exercises (workout_day_id, exercise_order, name, sets, reps, rest_seconds, notes) VALUES
(3, 1, 'Burpees', 3, '10', 30, 'Full body exercise'),
(3, 2, 'Mountain Climbers', 3, '20 total', 30, 'Keep hips low'),
(3, 3, 'Squat Jumps', 3, '12', 30, 'Land softly'),
(3, 4, 'Push-up to T', 3, '10', 30, 'Rotate fully'),
(3, 5, 'High Knees', 3, '30 sec', 30, 'Fast pace'),
(3, 6, 'Plank Jacks', 3, '15', 30, 'Maintain plank form');

-- Saturday - Core & Cardio
INSERT INTO exercises (workout_day_id, exercise_order, name, sets, reps, rest_seconds, notes) VALUES
(4, 1, 'Bicycle Crunches', 4, '20 total', 30, 'Touch elbow to opposite knee'),
(4, 2, 'Russian Twists', 4, '20 total', 30, 'Use weight if available'),
(4, 3, 'Leg Raises', 4, '12-15', 30, 'Lower slowly'),
(4, 4, 'Plank Hold', 4, '45 sec', 30, 'Don''t let hips sag'),
(4, 5, 'HIIT Cardio', 1, '20 min', 0, 'Intervals: 30 sec sprint, 30 sec rest');

-- ============================================================================
-- WEDDING READY PROGRAM (16 weeks)
-- ============================================================================
INSERT INTO workout_programs (id, quest_template_id, trainer_id, name, description, duration_weeks, workouts_per_week, difficulty, focus_area, is_template) VALUES
(2, 17, NULL, 'Wedding Ready Program', 'Look stunning on your special day with this 16-week comprehensive transformation program', 16, 5, 'intermediate', 'full_body', 1);

-- Wedding program follows similar pattern with progression
-- Week 1-4: Foundation, Week 5-8: Build, Week 9-12: Intensify, Week 13-16: Peak
INSERT INTO workout_days (workout_program_id, week_number, day_number, day_name, focus, notes) VALUES
(2, 1, 1, 'Monday - Upper Body Strength', 'Chest, Back, Arms', 'Build lean muscle'),
(2, 1, 2, 'Tuesday - Lower Body Strength', 'Legs, Glutes', 'Tone and shape'),
(2, 1, 3, 'Wednesday - Active Recovery', 'Yoga, Stretching', 'Flexibility and recovery'),
(2, 1, 4, 'Thursday - HIIT & Core', 'Cardio, Abs', 'Fat burning focus'),
(2, 1, 5, 'Friday - Full Body Power', 'Total Body', 'Compound movements');

-- ============================================================================
-- 30-DAY SHRED PROGRAM (4 weeks)
-- ============================================================================
INSERT INTO workout_programs (id, quest_template_id, trainer_id, name, description, duration_weeks, workouts_per_week, difficulty, focus_area, is_template) VALUES
(3, 26, NULL, '30-Day Shred', 'Intense 30-day fat-burning program with progressive overload', 4, 6, 'advanced', 'fat_loss', 1);

INSERT INTO workout_days (workout_program_id, week_number, day_number, day_name, focus, notes) VALUES
(3, 1, 1, 'Day 1 - Full Body Blast', 'Total Body HIIT', 'Go all out'),
(3, 1, 2, 'Day 2 - Lower Body Burn', 'Legs, Glutes', 'Feel the fire'),
(3, 1, 3, 'Day 3 - Upper Body Shred', 'Arms, Chest, Back', 'Maximum effort'),
(3, 1, 4, 'Day 4 - Core Crusher', 'Abs, Obliques', 'Intense core work'),
(3, 1, 5, 'Day 5 - Cardio Inferno', 'HIIT Cardio', 'Push your limits'),
(3, 1, 6, 'Day 6 - Active Recovery', 'Light Yoga, Walk', 'Rest and recover');

-- ============================================================================
-- BEGINNER FITNESS JOURNEY (8 weeks)
-- ============================================================================
INSERT INTO workout_programs (id, quest_template_id, trainer_id, name, description, duration_weeks, workouts_per_week, difficulty, focus_area, is_template) VALUES
(4, 28, NULL, 'Beginner Fitness Journey', 'Perfect for beginners starting their fitness journey, progressive and sustainable', 8, 3, 'beginner', 'full_body', 1);

INSERT INTO workout_days (workout_program_id, week_number, day_number, day_name, focus, notes) VALUES
(4, 1, 1, 'Monday - Introduction to Strength', 'Basic Movements', 'Learn proper form'),
(4, 1, 2, 'Wednesday - Cardio Basics', 'Low Impact Cardio', 'Build endurance'),
(4, 1, 3, 'Friday - Full Body Beginner', 'Total Body', 'Combine what you learned');

-- Monday - Beginner Strength
INSERT INTO exercises (workout_day_id, exercise_order, name, sets, reps, rest_seconds, notes) VALUES
(13, 1, 'Wall Push-ups', 2, '10', 60, 'Start here, progress to floor'),
(13, 2, 'Assisted Squats', 2, '10', 60, 'Hold onto something for support'),
(13, 3, 'Seated Rows (Band)', 2, '10', 60, 'Pull shoulder blades together'),
(13, 4, 'Standing Knee Raises', 2, '10 each', 45, 'Hold onto wall for balance'),
(13, 5, 'Plank on Knees', 2, '20 sec', 45, 'Build up to full plank');

-- ============================================================================
-- ABS OF STEEL PROGRAM (8 weeks)
-- ============================================================================
INSERT INTO workout_programs (id, quest_template_id, trainer_id, name, description, duration_weeks, workouts_per_week, difficulty, focus_area, is_template) VALUES
(5, 31, NULL, 'Abs of Steel', 'Dedicated core program to build defined, strong abs', 8, 4, 'intermediate', 'core', 1);

INSERT INTO workout_days (workout_program_id, week_number, day_number, day_name, focus, notes) VALUES
(5, 1, 1, 'Monday - Upper Abs Focus', 'Upper Rectus Abdominis', 'Crunches and variations'),
(5, 1, 2, 'Wednesday - Lower Abs Focus', 'Lower Rectus Abdominis', 'Leg raises and variations'),
(5, 1, 3, 'Friday - Obliques Focus', 'Side Abs', 'Twists and side bends'),
(5, 1, 4, 'Saturday - Core Stability', 'Deep Core, Transverse', 'Planks and anti-rotation');

-- ============================================================================
-- BOOTY BUILDER PROGRAM (10 weeks)
-- ============================================================================
INSERT INTO workout_programs (id, quest_template_id, trainer_id, name, description, duration_weeks, workouts_per_week, difficulty, focus_area, is_template) VALUES
(6, 32, NULL, 'Booty Builder', 'Comprehensive glute-focused program to build and shape', 10, 4, 'intermediate', 'glutes', 1);

INSERT INTO workout_days (workout_program_id, week_number, day_number, day_name, focus, notes) VALUES
(6, 1, 1, 'Monday - Glute Activation', 'Glute Med, Glute Max', 'Wake up those glutes'),
(6, 1, 2, 'Wednesday - Heavy Glute Day', 'Compound Movements', 'Build size and strength'),
(6, 1, 3, 'Friday - Glute Pump', 'High Rep Burnout', 'Feel the burn'),
(6, 1, 4, 'Saturday - Glute Shaping', 'Isolation Work', 'Sculpt and define');

-- Glute Activation Day
INSERT INTO exercises (workout_day_id, exercise_order, name, sets, reps, rest_seconds, notes) VALUES
(21, 1, 'Glute Bridges', 3, '15-20', 45, 'Squeeze hard at top'),
(21, 2, 'Fire Hydrants', 3, '15 each', 45, 'Keep core tight'),
(21, 3, 'Clamshells', 3, '20 each', 30, 'Use band for resistance'),
(21, 4, 'Donkey Kicks', 3, '15 each', 45, 'Controlled movement'),
(21, 5, 'Banded Walks', 3, '20 steps', 30, 'Keep tension on band');

-- Re-enable foreign key checks
PRAGMA foreign_keys = ON;

-- Note: Trainers can copy these templates and customize for their clients
-- They can adjust: sets, reps, rest periods, exercises, duration, etc.
