from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# Exercise Schemas
class ExerciseBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None  # chest, back, legs, shoulders, arms, core, cardio
    equipment: Optional[str] = None  # barbell, dumbbell, machine, bodyweight, cable
    primary_muscles: Optional[List[str]] = None
    secondary_muscles: Optional[List[str]] = None
    difficulty: str = "intermediate"
    instructions: Optional[str] = None
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None


class ExerciseCreate(ExerciseBase):
    pass


class ExerciseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    equipment: Optional[str] = None
    primary_muscles: Optional[List[str]] = None
    secondary_muscles: Optional[List[str]] = None
    difficulty: Optional[str] = None
    instructions: Optional[str] = None
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None


class Exercise(ExerciseBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# WorkoutSet Schemas
class WorkoutSetBase(BaseModel):
    set_number: int
    reps: Optional[int] = None
    weight: Optional[float] = None  # kg
    duration_seconds: Optional[int] = None
    distance_meters: Optional[float] = None
    rpe: Optional[int] = Field(None, ge=1, le=10)  # Rate of Perceived Exertion
    completed: bool = False
    notes: Optional[str] = None


class WorkoutSetCreate(WorkoutSetBase):
    pass


class WorkoutSetUpdate(BaseModel):
    reps: Optional[int] = None
    weight: Optional[float] = None
    duration_seconds: Optional[int] = None
    distance_meters: Optional[float] = None
    rpe: Optional[int] = Field(None, ge=1, le=10)
    completed: Optional[bool] = None
    notes: Optional[str] = None


class WorkoutSet(WorkoutSetBase):
    id: int
    setgroup_id: int
    volume: float
    created_at: datetime

    class Config:
        from_attributes = True


# Setgroup Schemas (like Pure Training)
class SetgroupBase(BaseModel):
    exercise_id: int
    order_index: int = 0
    notes: Optional[str] = None
    rest_seconds: Optional[int] = None


class SetgroupCreate(SetgroupBase):
    sets: List[WorkoutSetCreate] = []


class SetgroupUpdate(BaseModel):
    order_index: Optional[int] = None
    notes: Optional[str] = None
    rest_seconds: Optional[int] = None


class Setgroup(SetgroupBase):
    id: int
    workout_id: int
    exercise: Exercise
    sets: List[WorkoutSet]
    total_volume: float
    created_at: datetime

    class Config:
        from_attributes = True


# Workout Schemas
class WorkoutBase(BaseModel):
    title: str
    description: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    notes: Optional[str] = None


class WorkoutCreate(WorkoutBase):
    client_id: int
    setgroups: List[SetgroupCreate] = []


class WorkoutUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    notes: Optional[str] = None


class Workout(WorkoutBase):
    id: int
    client_id: int
    trainer_id: Optional[int] = None
    completed: bool
    completed_at: Optional[datetime] = None
    total_volume: float
    setgroups: List[Setgroup]
    timestamp: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class WorkoutSummary(BaseModel):
    """Lightweight workout response without full details"""
    id: int
    client_id: int
    trainer_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    completed: bool
    completed_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    total_volume: float
    exercise_count: int
    timestamp: datetime
    created_at: datetime

    class Config:
        from_attributes = True


# Stats Schemas
class ExerciseProgressEntry(BaseModel):
    """Track progress for a specific exercise over time"""
    date: datetime
    workout_id: int
    max_weight: float
    total_volume: float
    total_reps: int
    best_set_reps: int


class ExerciseProgress(BaseModel):
    """Complete progress tracking for an exercise"""
    exercise_id: int
    exercise_name: str
    category: str
    first_workout: datetime
    last_workout: datetime
    total_workouts: int
    current_max_weight: float
    starting_max_weight: float
    weight_improvement: float
    current_volume: float
    starting_volume: float
    volume_improvement: float
    history: List[ExerciseProgressEntry]


class WorkoutStats(BaseModel):
    """Overall workout statistics for a client"""
    total_workouts: int
    completed_workouts: int
    total_exercises: int
    unique_exercises: int
    total_volume: float  # kg
    total_reps: int
    total_duration_minutes: int
    favorite_exercise: Optional[str] = None
    strongest_exercise: Optional[str] = None  # Highest weight
    most_improved_exercise: Optional[str] = None
    avg_workouts_per_week: float
    current_streak_days: int
    longest_streak_days: int
