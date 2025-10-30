# Quest, Achievement, and Milestone System 🎯

## Overview

FitTrack Pro features a comprehensive gamification system to keep clients motivated throughout their fitness journey. The system includes **Quests** (goals to complete), **Achievements** (badges earned), and **Milestones** (major accomplishments automatically detected).

---

## 🎯 Quests

Quests are personalized goals created by trainers for their clients. Each quest has specific targets and rewards.

### Quest Types

1. **Weight Quest** - Target weight goal
   - Example: "Reach 75kg"
   - Type: `weight`

2. **Measurement Quest** - Target body measurement
   - Example: "Get waist to 80cm"
   - Type: `measurement`

3. **Workout Quest** - Complete X workouts
   - Example: "Complete 20 workouts this month"
   - Type: `workout`

4. **Meal Quest** - Log meals for X days
   - Example: "Track meals for 30 consecutive days"
   - Type: `meal`

5. **Streak Quest** - Maintain consistency
   - Example: "7-day workout streak"
   - Type: `streak`

### Quest Properties

```typescript
{
  id: number
  title: string              // "Lose 10kg Challenge"
  description: string        // Full description
  quest_type: string         // weight, measurement, workout, meal, streak
  target_value: number       // 75 (target weight in kg)
  current_value: number      // 78 (current progress)
  target_unit: string        // "kg", "cm", "days", "workouts"
  progress_percentage: number // Auto-calculated: (current/target) * 100
  difficulty: string         // easy, medium, hard, epic
  xp_reward: number          // XP points earned on completion
  reward_achievement: string // Achievement name unlocked
  reward_description: string // Achievement description
  deadline: string (ISO)     // Optional deadline
  created_at: string (ISO)
  completed_at: string (ISO) | null
  is_active: boolean
}
```

### Difficulty Levels

| Difficulty | Color | XP Reward | Example |
|------------|-------|-----------|---------|
| **Easy** | 🟢 Green | 50-100 | Lose 2kg in 2 months |
| **Medium** | 🟡 Yellow | 100-200 | Lose 5kg in 1 month |
| **Hard** | 🔴 Red | 200-500 | Lose 10kg in 2 months |
| **Epic** | 🟣 Purple | 500-1000 | Lose 20kg in 3 months |

### Creating a Quest

**Endpoint**: `POST /quests/`

```json
{
  "client_id": 1,
  "title": "Summer Body Challenge",
  "description": "Lose 8kg before summer starts!",
  "quest_type": "weight",
  "target_value": 75.0,
  "target_unit": "kg",
  "reward_achievement": "Summer Ready",
  "reward_description": "You achieved your summer body goal!",
  "deadline_days": 60,
  "difficulty": "hard",
  "xp_reward": 300
}
```

### Updating Quest Progress

**Endpoint**: `PATCH /quests/{quest_id}`

```json
{
  "current_value": 76.5
}
```

When `current_value >= target_value`, the quest automatically:
1. Marks as completed (`completed_at` timestamp)
2. Sets `is_active = false`
3. Awards the achievement (if specified)
4. Creates a milestone celebrating completion

### Getting Client Quests

**Endpoint**: `GET /quests/client/{client_id}?active_only=true`

Returns all quests with progress percentages calculated.

---

## 🏆 Achievements

Achievements are badges earned by clients for completing quests or reaching significant milestones.

### Achievement Categories

- **weight_loss** - Weight-related achievements
- **strength** - Strength training milestones
- **consistency** - Tracking/attendance streaks
- **nutrition** - Meal planning and tracking
- **milestone** - General progress milestones
- **quest** - Quest completion rewards

### Achievement Structure

```typescript
{
  id: number
  name: string              // "First 5kg Lost"
  description: string       // "You've lost your first 5kg!"
  icon: string              // "🏆", "🎯", "💪", "🔥"
  category: string          // weight_loss, strength, etc.
  awarded_at: string (ISO)
}
```

### Default Achievement Icons

| Category | Icon | Example |
|----------|------|---------|
| Weight Loss | 🎯 | "Lost 10kg" |
| Strength | 💪 | "Bench Press PR" |
| Consistency | 🔥 | "30-Day Streak" |
| Nutrition | 🥗 | "30 Days Tracked" |
| Quest Complete | 🏆 | "Quest Master" |
| Milestone | ✨ | "50kg Total Lost" |

### Awarding an Achievement

**Endpoint**: `POST /quests/achievements`

```json
{
  "client_id": 1,
  "name": "Nutrition Champion",
  "description": "Tracked every meal for 30 consecutive days!",
  "icon": "🥗",
  "category": "nutrition"
}
```

---

## 🎖️ Milestones

Milestones are **automatically detected** significant achievements based on client data. The system analyzes progress and creates milestones without trainer intervention.

### Auto-Detected Milestones

#### Weight Loss Milestones
Triggered at: 5kg, 10kg, 15kg, 20kg, 25kg, 30kg total weight lost

```json
{
  "title": "Lost 10kg!",
  "description": "Amazing progress! You've lost 10kg since you started.",
  "milestone_type": "weight_loss",
  "value": 10,
  "unit": "kg",
  "icon": "🎯",
  "celebration_message": "🎉 Incredible achievement! You've lost 10kg!"
}
```

#### Meal Tracking Streaks
Triggered at: 7, 14, 21, 30 consecutive days

```json
{
  "title": "30-Day Meal Tracking Streak!",
  "description": "Consistency is key! You've tracked meals for 30 consecutive days.",
  "milestone_type": "meal_streak",
  "value": 30,
  "unit": "days",
  "icon": "🔥",
  "celebration_message": "🔥 On fire! 30 days of consistent tracking!"
}
```

### Milestone Types

- `weight_loss` - Total weight lost
- `weight_gain` - Total weight gained (for bulking)
- `measurement_change` - Waist, chest, etc. changes
- `meal_streak` - Consecutive meal tracking days
- `workout_streak` - Consecutive workout days
- `body_fat_reduction` - % body fat reduced
- `quest_completion` - Quest completed

### Auto-Check Milestones

**Endpoint**: `POST /quests/auto-check/{client_id}`

Scans client data and creates new milestones automatically. Trainers should call this after:
- Adding new measurements
- Client completes meals
- Progress updates

Returns:
```json
{
  "message": "Auto-check complete. Created 2 new milestones.",
  "milestones": [
    "Lost 10kg!",
    "7-Day Meal Tracking Streak!"
  ]
}
```

---

## 📊 Display on Public Profile

All quests, achievements, and milestones appear on the client's shareable profile page:

### Active Quests Section
- Shows all active quests
- Visual progress bars
- Difficulty color coding
- Reward previews
- Deadline countdowns

### Achievements Section
- Grid of unlocked achievements
- Icon + name + description
- Earned date
- Scrollable if > 10 achievements

### Milestones Section
- Timeline of major accomplishments
- Celebration messages
- Achievement dates
- Auto-detected highlights

---

## 🎨 Visual Design

### Quest Card Colors
```css
Easy:   #1BB55C (Green)
Medium: #FFB82B (Yellow)
Hard:   #FF4B39 (Red)
Epic:   #9C27B0 (Purple)
```

### Achievement Card
```css
Background: linear-gradient(135deg, rgba(255, 184, 43, 0.1), rgba(255, 75, 57, 0.05))
Border: 1px solid rgba(255, 184, 43, 0.3)
```

### Milestone Card
```css
Background: linear-gradient(135deg, rgba(27, 181, 92, 0.1), rgba(0, 188, 212, 0.05))
Border: 1px solid rgba(27, 181, 92, 0.3)
```

---

## 🚀 Workflow Examples

### Example 1: Weight Loss Quest

1. **Trainer creates quest**:
```bash
POST /quests/
{
  "client_id": 5,
  "title": "Beach Body Ready",
  "description": "Reach your goal weight of 72kg!",
  "quest_type": "weight",
  "target_value": 72,
  "current_value": 80,
  "target_unit": "kg",
  "difficulty": "hard",
  "xp_reward": 400,
  "reward_achievement": "Beach Body Achievement",
  "deadline_days": 90
}
```

2. **Client logs progress** (trainer updates):
```bash
PATCH /quests/15
{
  "current_value": 76
}
```

3. **Quest auto-completes** when current_value = 72:
   - ✅ Quest marked complete
   - 🏆 Achievement "Beach Body Achievement" awarded
   - 🎖️ Milestone created: "Quest Complete: Beach Body Ready"

### Example 2: Auto-Detected Milestones

1. **Trainer adds measurement**:
```bash
POST /clients/5/measurements
{
  "weight": 70,
  "waist": 85,
  ...
}
```

2. **System auto-checks**:
```bash
POST /quests/auto-check/5
```

3. **Milestones created automatically**:
   - If total weight lost ≥ 10kg → "Lost 10kg!" milestone
   - If meal streak ≥ 7 days → "7-Day Streak!" milestone

---

## 💡 Best Practices

### For Trainers

1. **Create SMART Quests**
   - Specific: "Lose 5kg" not "Lose weight"
   - Measurable: Include exact target values
   - Achievable: Set realistic difficulty levels
   - Relevant: Align with client goals
   - Time-bound: Set deadlines

2. **Balance Difficulty**
   - New clients: Start with Easy/Medium quests
   - Advanced clients: Mix Medium/Hard/Epic quests
   - Always have 1-2 active quests

3. **Update Progress Regularly**
   - Update quest progress after each measurement
   - Call auto-check after data updates

4. **Use Achievements Strategically**
   - Celebrate small wins (5kg, 10kg, etc.)
   - Recognize consistency (streaks)
   - Reward effort, not just results

### For Clients

1. **Check Profile Regularly**
   - See quest progress
   - Celebrate achievements
   - Track milestones

2. **Share Progress**
   - Use shareable profile link
   - Show friends/family achievements
   - Stay motivated with visual progress

---

## 🔮 Future Enhancements

Planned features:
- **Leaderboards** - Compare with other clients
- **Team Quests** - Group challenges
- **Daily Quests** - Small daily tasks
- **Seasonal Events** - Special limited-time quests
- **Achievement Showcase** - Pin favorite achievements
- **XP Levels** - Level up system with XP
- **Badges Collection** - Collectible badge gallery
- **Quest Chains** - Multi-stage quests

---

## 📱 API Reference Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/quests/` | POST | Create quest |
| `/quests/{id}` | PATCH | Update progress |
| `/quests/{id}` | DELETE | Delete quest |
| `/quests/client/{id}` | GET | Get client quests |
| `/quests/achievements` | POST | Award achievement |
| `/quests/achievements/client/{id}` | GET | Get achievements |
| `/quests/milestones` | POST | Create milestone |
| `/quests/milestones/client/{id}` | GET | Get milestones |
| `/quests/auto-check/{id}` | POST | Auto-detect milestones |
| `/public/profile/{token}` | GET | Get profile (includes quests/achievements/milestones) |

---

**Keep clients motivated! Quests make fitness fun!** 🎯🏆🔥
