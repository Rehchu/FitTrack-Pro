"""
AI-Powered Fitness Service
Inspired by AGiXT-Workouts, provides intelligent workout generation,
meal planning, progress analysis, and motivational support.
"""

import os
import json
import random
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import anthropic
from pydantic import BaseModel


class WorkoutExercise(BaseModel):
    name: str
    sets: int
    reps: str
    rest: str
    text: Optional[str] = None


class DayPlan(BaseModel):
    day: str
    focus: str
    exercises: List[WorkoutExercise]


class WorkoutPlan(BaseModel):
    weeklyPlan: List[DayPlan]
    nutritionAdvice: str


class MealPlanResponse(BaseModel):
    breakfast: str
    lunch: str
    dinner: str
    snacks: List[str]


class Challenge(BaseModel):
    id: int
    name: str
    description: str
    duration: str
    difficulty: str


class Supplement(BaseModel):
    id: int
    name: str
    dosage: str
    benefit: str


class ProgressReport(BaseModel):
    summary: str
    workoutProgress: Dict[str, Any]
    bodyCompositionChanges: Dict[str, float]
    recommendations: List[str]


class AIFitnessService:
    """
    AI-powered fitness coaching service using Claude (Anthropic)
    Falls back to rule-based generation if API is unavailable
    """
    
    def __init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY", "")
        self.use_ai = bool(self.api_key)
        
        if self.use_ai:
            try:
                self.client = anthropic.Anthropic(api_key=self.api_key)
            except Exception as e:
                print(f"Failed to initialize Anthropic client: {e}")
                self.use_ai = False
    
    async def generate_workout_plan(
        self, 
        user_profile: Dict[str, Any],
        preferences: Dict[str, Any],
        body_part: Optional[str] = None
    ) -> WorkoutPlan:
        """Generate a personalized workout plan"""
        
        if self.use_ai:
            return await self._ai_generate_workout(user_profile, preferences, body_part)
        else:
            return self._rule_based_workout(user_profile, preferences, body_part)
    
    async def _ai_generate_workout(
        self,
        user_profile: Dict[str, Any],
        preferences: Dict[str, Any],
        body_part: Optional[str]
    ) -> WorkoutPlan:
        """Use Claude AI to generate workout"""
        
        prompt = f"""Generate a personalized workout plan for:
        
**Client Profile:**
- Age: {user_profile.get('age', 'N/A')}
- Gender: {user_profile.get('gender', 'N/A')}
- Fitness Goal: {user_profile.get('goal', 'general fitness')}
- Fitness Level: {user_profile.get('fitness_level', 'intermediate')}

**Preferences:**
- Location: {preferences.get('location', 'gym')}
- Available Space: {preferences.get('space', 'moderate')}
- Equipment: {', '.join(preferences.get('equipment', ['bodyweight', 'dumbbells']))}
{f'- Focus Area: {body_part}' if body_part else ''}

Please create a 3-day workout plan with:
1. Each day having a specific focus (Strength, Cardio, Flexibility, etc.)
2. 5-7 exercises per day
3. Sets, reps, and rest periods for each exercise
4. General nutrition advice

Format your response as JSON matching this structure:
{{
  "weeklyPlan": [
    {{
      "day": "Day 1 - Chest & Triceps",
      "focus": "Strength",
      "exercises": [
        {{"name": "Bench Press", "sets": 3, "reps": "8-12", "rest": "60 seconds", "text": "Optional tip"}}
      ]
    }}
  ],
  "nutritionAdvice": "General nutrition guidance"
}}"""

        try:
            message = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=2048,
                messages=[{"role": "user", "content": prompt}]
            )
            
            response_text = message.content[0].text
            
            # Extract JSON from response
            if "```json" in response_text:
                json_start = response_text.find("```json") + 7
                json_end = response_text.find("```", json_start)
                json_str = response_text[json_start:json_end].strip()
            else:
                json_str = response_text.strip()
            
            data = json.loads(json_str)
            return WorkoutPlan(**data)
            
        except Exception as e:
            print(f"AI generation failed: {e}, falling back to rule-based")
            return self._rule_based_workout(user_profile, preferences, body_part)
    
    def _rule_based_workout(
        self,
        user_profile: Dict[str, Any],
        preferences: Dict[str, Any],
        body_part: Optional[str]
    ) -> WorkoutPlan:
        """Rule-based workout generation as fallback"""
        
        equipment = preferences.get('equipment', ['bodyweight'])
        has_weights = any(e in equipment for e in ['dumbbells', 'barbell', 'kettlebell'])
        
        # Choose workout based on body part
        if body_part:
            body_part_lower = body_part.lower()
            if 'chest' in body_part_lower:
                focus = 'Chest & Triceps'
                exercises = [
                    WorkoutExercise(name='Push-ups' if not has_weights else 'Bench Press', sets=3, reps='8-12', rest='60 seconds'),
                    WorkoutExercise(name='Incline Push-ups' if not has_weights else 'Incline Dumbbell Press', sets=3, reps='8-12', rest='60 seconds'),
                    WorkoutExercise(name='Diamond Push-ups' if not has_weights else 'Cable Flyes', sets=3, reps='10-15', rest='60 seconds'),
                    WorkoutExercise(name='Tricep Dips', sets=3, reps='8-12', rest='60 seconds'),
                    WorkoutExercise(name='Tricep Extensions', sets=3, reps='12-15', rest='45 seconds'),
                ]
            elif 'back' in body_part_lower:
                focus = 'Back & Biceps'
                exercises = [
                    WorkoutExercise(name='Pull-ups' if not has_weights else 'Barbell Rows', sets=3, reps='8-12', rest='60 seconds'),
                    WorkoutExercise(name='Inverted Rows' if not has_weights else 'Lat Pulldowns', sets=3, reps='8-12', rest='60 seconds'),
                    WorkoutExercise(name='Superman Holds' if not has_weights else 'Seated Cable Rows', sets=3, reps='10-15', rest='60 seconds'),
                    WorkoutExercise(name='Bicep Curls' if has_weights else 'Resistance Band Curls', sets=3, reps='10-12', rest='45 seconds'),
                    WorkoutExercise(name='Hammer Curls' if has_weights else 'Chin-ups', sets=3, reps='8-12', rest='45 seconds'),
                ]
            elif 'legs' in body_part_lower or 'leg' in body_part_lower:
                focus = 'Legs & Glutes'
                exercises = [
                    WorkoutExercise(name='Squats' if not has_weights else 'Barbell Squats', sets=4, reps='8-12', rest='90 seconds'),
                    WorkoutExercise(name='Lunges' if not has_weights else 'Dumbbell Lunges', sets=3, reps='10-12 per leg', rest='60 seconds'),
                    WorkoutExercise(name='Bulgarian Split Squats', sets=3, reps='8-10 per leg', rest='60 seconds'),
                    WorkoutExercise(name='Romanian Deadlifts' if has_weights else 'Single Leg Deadlifts', sets=3, reps='10-12', rest='60 seconds'),
                    WorkoutExercise(name='Calf Raises', sets=3, reps='15-20', rest='45 seconds'),
                ]
            elif 'shoulder' in body_part_lower:
                focus = 'Shoulders & Arms'
                exercises = [
                    WorkoutExercise(name='Pike Push-ups' if not has_weights else 'Overhead Press', sets=3, reps='8-12', rest='60 seconds'),
                    WorkoutExercise(name='Lateral Arm Raises' if not has_weights else 'Dumbbell Lateral Raises', sets=3, reps='12-15', rest='45 seconds'),
                    WorkoutExercise(name='Front Raises' if has_weights else 'Handstand Hold', sets=3, reps='10-12' if has_weights else '20-30 seconds', rest='45 seconds'),
                    WorkoutExercise(name='Reverse Flyes' if has_weights else 'Band Pull-Aparts', sets=3, reps='12-15', rest='45 seconds'),
                    WorkoutExercise(name='Shrugs', sets=3, reps='12-15', rest='45 seconds'),
                ]
            elif 'core' in body_part_lower or 'abs' in body_part_lower:
                focus = 'Core & Abs'
                exercises = [
                    WorkoutExercise(name='Plank', sets=3, reps='45-60 seconds', rest='30 seconds'),
                    WorkoutExercise(name='Mountain Climbers', sets=3, reps='30 seconds', rest='30 seconds'),
                    WorkoutExercise(name='Russian Twists', sets=3, reps='20-30', rest='45 seconds'),
                    WorkoutExercise(name='Leg Raises', sets=3, reps='12-15', rest='45 seconds'),
                    WorkoutExercise(name='Bicycle Crunches', sets=3, reps='20-30', rest='30 seconds'),
                ]
            else:  # Full body fallback
                focus = 'Full Body'
                exercises = [
                    WorkoutExercise(name='Squats', sets=3, reps='12-15', rest='60 seconds'),
                    WorkoutExercise(name='Push-ups', sets=3, reps='10-15', rest='60 seconds'),
                    WorkoutExercise(name='Lunges', sets=3, reps='10-12 per leg', rest='60 seconds'),
                    WorkoutExercise(name='Plank', sets=3, reps='30-60 seconds', rest='30 seconds'),
                    WorkoutExercise(name='Burpees', sets=3, reps='10-12', rest='60 seconds'),
                ]
        else:
            # Default full body workout
            focus = 'Full Body'
            exercises = [
                WorkoutExercise(name='Squats', sets=3, reps='12-15', rest='60 seconds'),
                WorkoutExercise(name='Push-ups', sets=3, reps='10-15', rest='60 seconds'),
                WorkoutExercise(name='Dumbbell Rows' if has_weights else 'Inverted Rows', sets=3, reps='10-12', rest='60 seconds'),
                WorkoutExercise(name='Plank', sets=3, reps='30-60 seconds', rest='30 seconds'),
                WorkoutExercise(name='Lunges', sets=3, reps='10-12 per leg', rest='60 seconds'),
            ]
        
        return WorkoutPlan(
            weeklyPlan=[
                DayPlan(
                    day=f"Day 1 - {focus}",
                    focus=focus,
                    exercises=exercises
                )
            ],
            nutritionAdvice="Focus on lean proteins (chicken, fish, tofu), complex carbohydrates (brown rice, quinoa, sweet potatoes), and plenty of vegetables. Stay hydrated with at least 2-3 liters of water daily. Consider post-workout protein within 30-60 minutes of training."
        )
    
    async def generate_meal_plan(self, user_profile: Dict[str, Any]) -> MealPlanResponse:
        """Generate a personalized meal plan"""
        
        if self.use_ai:
            return await self._ai_generate_meal_plan(user_profile)
        else:
            return self._rule_based_meal_plan(user_profile)
    
    async def _ai_generate_meal_plan(self, user_profile: Dict[str, Any]) -> MealPlanResponse:
        """Use Claude AI to generate meal plan"""
        
        prompt = f"""Generate a personalized daily meal plan for:
        
- Age: {user_profile.get('age', 'N/A')}
- Gender: {user_profile.get('gender', 'N/A')}
- Weight: {user_profile.get('weight', 'N/A')} kg
- Goal: {user_profile.get('goal', 'general fitness')}

Create balanced meals with appropriate calories and macros. Include:
- Breakfast
- Lunch  
- Dinner
- 2-3 healthy snacks

Format as JSON:
{{
  "breakfast": "Meal description",
  "lunch": "Meal description",
  "dinner": "Meal description",
  "snacks": ["Snack 1", "Snack 2"]
}}"""

        try:
            message = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}]
            )
            
            response_text = message.content[0].text
            
            if "```json" in response_text:
                json_start = response_text.find("```json") + 7
                json_end = response_text.find("```", json_start)
                json_str = response_text[json_start:json_end].strip()
            else:
                json_str = response_text.strip()
            
            data = json.loads(json_str)
            return MealPlanResponse(**data)
            
        except Exception as e:
            print(f"AI meal plan failed: {e}, falling back to rule-based")
            return self._rule_based_meal_plan(user_profile)
    
    def _rule_based_meal_plan(self, user_profile: Dict[str, Any]) -> MealPlanResponse:
        """Rule-based meal plan generation"""
        
        goal = user_profile.get('goal', '').lower()
        
        if 'weight loss' in goal or 'lose weight' in goal or 'fat loss' in goal:
            return MealPlanResponse(
                breakfast="Steel-cut oatmeal with berries, chia seeds, and almond butter. Green tea.",
                lunch="Grilled chicken breast salad with mixed greens, cherry tomatoes, cucumbers, avocado, and olive oil vinaigrette.",
                dinner="Baked salmon with roasted broccoli, asparagus, and quinoa.",
                snacks=["Greek yogurt with sliced almonds", "Apple slices with natural peanut butter", "Carrot and cucumber sticks with hummus"]
            )
        elif 'muscle' in goal or 'bulk' in goal or 'gain' in goal:
            return MealPlanResponse(
                breakfast="4 scrambled eggs with whole grain toast, avocado, and a banana. Protein shake.",
                lunch="Grilled chicken breast, brown rice, sweet potato, and steamed vegetables.",
                dinner="Lean ground beef or turkey with pasta, marinara sauce, and a large green salad.",
                snacks=["Protein shake with banana", "Trail mix with nuts and dried fruit", "Cottage cheese with pineapple"]
            )
        else:
            return MealPlanResponse(
                breakfast="Oatmeal with mixed berries, nuts, and Greek yogurt.",
                lunch="Turkey and avocado wrap with whole grain tortilla, mixed greens, and veggie sticks.",
                dinner="Grilled chicken or fish with quinoa and roasted vegetables.",
                snacks=["Apple with almond butter", "Handful of mixed nuts", "Greek yogurt with honey"]
            )
    
    def get_motivational_quote(self) -> str:
        """Get a random motivational fitness quote"""
        
        quotes = [
            "The only bad workout is the one that didn't happen.",
            "Your body can stand almost anything. It's your mind that you have to convince.",
            "The difference between try and triumph is just a little umph!",
            "Fitness is not about being better than someone else. It's about being better than you used to be.",
            "The hardest lift of all is lifting your butt off the couch.",
            "Sweat is magic. Cover yourself in it daily to grant your wishes.",
            "The pain you feel today will be the strength you feel tomorrow.",
            "Your only limit is you.",
            "Push yourself because no one else is going to do it for you.",
            "Great things never come from comfort zones.",
            "Success starts with self-discipline.",
            "The body achieves what the mind believes.",
            "Don't stop when you're tired. Stop when you're done.",
            "Believe in yourself and all that you are.",
            "Make yourself a priority once in a while. It's not selfish, it's necessary.",
        ]
        
        return random.choice(quotes)
    
    def generate_challenges(self, user_profile: Dict[str, Any]) -> List[Challenge]:
        """Generate fitness challenges based on user profile"""
        
        fitness_level = user_profile.get('fitness_level', 'intermediate').lower()
        
        challenges = [
            Challenge(id=1, name="Push-up Challenge", description="Complete 100 push-ups in a week", duration="1 week", difficulty="Medium"),
            Challenge(id=2, name="10,000 Steps Daily", description="Walk 10,000 steps every day for 7 days", duration="1 week", difficulty="Easy"),
            Challenge(id=3, name="Plank Master", description="Hold a plank for 3 minutes", duration="2 weeks", difficulty="Hard"),
            Challenge(id=4, name="Squat Challenge", description="Complete 200 squats in one session", duration="1 day", difficulty="Hard"),
            Challenge(id=5, name="Hydration Hero", description="Drink 3L of water daily for 30 days", duration="30 days", difficulty="Easy"),
            Challenge(id=6, name="Early Riser Workout", description="Complete morning workouts for 14 consecutive days", duration="2 weeks", difficulty="Medium"),
            Challenge(id=7, name="Sugar-Free Week", description="Avoid added sugars for 7 days", duration="1 week", difficulty="Medium"),
            Challenge(id=8, name="5K Runner", description="Run 5 kilometers without stopping", duration="4 weeks", difficulty="Hard"),
        ]
        
        # Filter by fitness level
        if fitness_level == 'beginner':
            return [c for c in challenges if c.difficulty in ['Easy', 'Medium']][:5]
        elif fitness_level == 'advanced':
            return [c for c in challenges if c.difficulty in ['Medium', 'Hard']][:5]
        else:
            return challenges[:6]
    
    def get_supplements(self, user_profile: Dict[str, Any]) -> List[Supplement]:
        """Recommend supplements based on user profile"""
        
        goal = user_profile.get('goal', '').lower()
        
        base_supplements = [
            Supplement(id=1, name="Whey Protein", dosage="1 scoop (25-30g) post-workout", benefit="Supports muscle recovery and growth"),
            Supplement(id=2, name="Creatine Monohydrate", dosage="5g daily", benefit="Enhances strength and power output"),
            Supplement(id=3, name="Omega-3 Fish Oil", dosage="1-2g daily", benefit="Reduces inflammation and supports heart health"),
            Supplement(id=4, name="Vitamin D3", dosage="2000-4000 IU daily", benefit="Supports bone health and immune function"),
            Supplement(id=5, name="Multivitamin", dosage="1 tablet daily with meals", benefit="Fills nutritional gaps in diet"),
        ]
        
        if 'muscle' in goal or 'bulk' in goal:
            base_supplements.append(Supplement(id=6, name="BCAAs", dosage="5-10g during workout", benefit="Reduces muscle breakdown during training"))
        
        if 'weight loss' in goal or 'fat loss' in goal:
            base_supplements.append(Supplement(id=7, name="Green Tea Extract", dosage="250-500mg daily", benefit="Supports metabolism and fat oxidation"))
        
        return base_supplements
    
    async def generate_progress_report(
        self,
        user_profile: Dict[str, Any],
        workout_history: List[Dict[str, Any]],
        measurement_history: List[Dict[str, Any]]
    ) -> ProgressReport:
        """Generate a comprehensive progress report"""
        
        total_workouts = len(workout_history)
        
        # Calculate weight change
        weight_change = 0
        if len(measurement_history) >= 2:
            first_weight = measurement_history[0].get('weight', 0)
            latest_weight = measurement_history[-1].get('weight', 0)
            weight_change = first_weight - latest_weight
        
        # Calculate body fat change
        bf_change = 0
        if len(measurement_history) >= 2:
            first_bf = measurement_history[0].get('body_fat', 0)
            latest_bf = measurement_history[-1].get('body_fat', 0)
            if first_bf and latest_bf:
                bf_change = first_bf - latest_bf
        
        recommendations = []
        
        if total_workouts < 10:
            recommendations.append("Increase workout frequency to 3-4 times per week for better results")
        else:
            recommendations.append("Great consistency! Keep up the excellent work")
        
        if weight_change > 0:
            recommendations.append(f"Excellent progress! You've lost {weight_change:.1f}kg")
        elif weight_change < 0:
            recommendations.append(f"You've gained {abs(weight_change):.1f}kg - ensure it aligns with your goals")
        
        if bf_change > 0:
            recommendations.append(f"Body fat reduced by {bf_change:.1f}% - keep it up!")
        
        recommendations.append("Stay hydrated and prioritize sleep for optimal recovery")
        recommendations.append("Consider progressive overload - gradually increase weight or reps")
        
        return ProgressReport(
            summary=f"You've completed {total_workouts} workouts and made measurable progress. Your dedication is showing results!",
            workoutProgress={
                "totalWorkouts": total_workouts,
                "averageDifficulty": 2.5,
                "mostImprovedExercises": ["Squats", "Push-ups", "Deadlifts"]
            },
            bodyCompositionChanges={
                "weightChange": weight_change,
                "bodyFatPercentageChange": bf_change
            },
            recommendations=recommendations
        )


# Singleton instance
_ai_service: Optional[AIFitnessService] = None

def get_ai_service() -> AIFitnessService:
    """Get or create the AI fitness service singleton"""
    global _ai_service
    if _ai_service is None:
        _ai_service = AIFitnessService()
    return _ai_service
