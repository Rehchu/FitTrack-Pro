# Dynamic Fitness Avatar System

## Overview

FitTrack Pro features an innovative **Dynamic Avatar System** that visualizes client fitness progress in real-time. The avatar's appearance automatically adapts based on multiple fitness metrics, providing an instant visual representation of progress.

## How It Works

### 📊 Fitness Score Calculation (0-100)

The system analyzes multiple data points to calculate a comprehensive **Fitness Progress Score**:

#### 1. **Weight Change** (up to ±20 points)

- **Lost weight**: +2 points per kg lost
- **Gained weight**: -2 points per kg gained
- Example: Lost 5kg = +10 points

#### 2. **Body Fat Reduction** (up to +20 points)

- **Body fat decreased**: +3 points per % reduced
- Example: Lost 3% body fat = +9 points

#### 3. **Waist Measurement** (up to +15 points)

- **Waist reduced**: +1.5 points per cm lost
- Example: Lost 6cm waist = +9 points

#### 4. **Meal Tracking Consistency** (up to +15 points)

- Based on 30-day meal logging
- **Perfect tracking (30/30 days)**: +15 points
- **Partial tracking (15/30 days)**: +7.5 points

### 🎨 Visual Adaptations

The avatar dynamically changes based on the calculated fitness score:

#### **Avatar Size**

- Range: **140px - 220px**
- Formula: `140 + (score × 0.8)`
- Higher scores = Larger, more prominent avatar

#### **Border Color**

- **Score 70-100** (Excellent): 🟢 Green (#1BB55C)
- **Score 55-69** (Good): 🔵 Cyan (#00BCD4)
- **Score 40-54** (Neutral): 🟡 Yellow (#FFB82B)
- **Score 0-39** (Needs Work): 🔴 Red (#FF4B39)

#### **Glow Intensity**

- Range: **0.2 - 0.8** opacity
- Higher scores create stronger, more vibrant glow effects

#### **Scale Animation**

- Range: **0.85x - 1.15x**
- Better progress makes avatar appear more "confident"

#### **Pulse Animation**

- **Activated**: When score ≥ 70 (Excellent progress)
- Creates breathing/pulsing effect to celebrate achievement

### 🏅 Progress Badge

A circular badge displays the exact fitness score (0-100) in the bottom-right corner:

- **Color matches border color** (reflects progress level)
- **Bold white number** for high visibility
- **3D shadow effect** for depth

### 📈 Progress Chips

Visual chips show specific achievements:

- **Weight Change**: "−5.2 kg" (green if lost, red if gained)
- **Body Fat Change**: "−3.1% body fat" (green if reduced)
- **Fitness Score**: "78/100" (color-coded)

## Body Shape Detection

The system also analyzes BMI to determine body shape classification:

```text
BMI < 18.5    → Slim
BMI 18.5-25   → Fit ✅
BMI 25-30     → Bulky
BMI > 30      → Heavy
```

*Note: Currently calculated but not yet affecting avatar animation style.*

## Gender-Specific Animations

Avatars use different Lottie animations based on client gender:

- **Female**: `female-avatar.json` - Feminine character animation
- **Male**: `male-avatar.json` - Masculine character animation

## Example Scenarios

### 🌟 **Excellent Progress** (Score: 85)

```text
Client lost 8kg
Reduced body fat by 4%
Lost 10cm off waist
Logged 28/30 meals

Result:
✅ Large avatar (208px)
✅ Green border with strong glow
✅ Pulsing animation
✅ Scale: 1.10x
✅ Badge shows "85" in green
```

### 📊 **Average Progress** (Score: 50)

```text
Client lost 2kg
No body fat data
Waist unchanged
Logged 12/30 meals

Result:
📍 Medium avatar (180px)
📍 Yellow border with moderate glow
📍 No pulse animation
📍 Scale: 1.0x
📍 Badge shows "50" in yellow
```

### ⚠️ **Needs Improvement** (Score: 35)

```text
Client gained 2kg
Body fat increased 1%
Waist increased 3cm
Logged 5/30 meals

Result:
⚠️ Small avatar (168px)
⚠️ Red border with low glow
⚠️ No pulse animation
⚠️ Scale: 0.90x
⚠️ Badge shows "35" in red
```

## Technical Implementation

### Component: `FitnessAvatar.tsx`

Reusable component that accepts:

- `gender`: 'male' | 'female'
- `progressScore`: number (0-100)
- `size`: number (default: 180)
- `showBadge`: boolean (default: true)

### Usage in Public Profile

```tsx
const avatarMetrics = calculateAvatarMetrics();

<FitnessAvatar
  gender={client.gender}
  progressScore={avatarMetrics.progressScore}
  size={avatarMetrics.size}
  showBadge={true}
/>
```

## Smooth Transitions

All visual changes use CSS transitions (0.5s ease-in-out):

- Size changes animate smoothly
- Color transitions blend gradually
- Scale adjustments are fluid
- Glow intensity fades in/out

This creates a **living, breathing representation** of the client's fitness journey! 🏋️‍♀️✨

## Future Enhancements

Potential additions:

1. **Muscle definition overlay** based on strength training frequency
2. **Energy aura effect** based on workout consistency
3. **Achievement badges** around avatar border
4. **Time-based animations** (morning vs. evening energy levels)
5. **Nutrition quality indicator** (clean eating vs. junk food ratio)
