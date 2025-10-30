from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Boolean, JSON, Table
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
import datetime
import secrets

Base = declarative_base()

# Association table for trainer teams
trainer_team = Table('trainer_team', Base.metadata,
    Column('trainer_id', Integer, ForeignKey('trainers.id')),
    Column('team_id', Integer, ForeignKey('teams.id'))
)

class Trainer(Base):
    __tablename__ = "trainers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    clients = relationship("Client", back_populates="trainer")
    teams = relationship("Team", secondary=trainer_team, back_populates="trainers")
    branding_config = relationship("BrandingConfig", uselist=False, back_populates="trainer")
    push_tokens = relationship("PushToken", back_populates="trainer")

class Team(Base):
    __tablename__ = "teams"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    trainers = relationship("Trainer", secondary=trainer_team, back_populates="teams")
    clients = relationship("Client", back_populates="team")

class Client(Base):
    __tablename__ = "clients"
    id = Column(Integer, primary_key=True, index=True)
    trainer_id = Column(Integer, ForeignKey("trainers.id"), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    name = Column(String, index=True, nullable=False)
    email = Column(String, index=True, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    weight_history = relationship("WeightEntry", back_populates="client")
    measurements = relationship("Measurement", back_populates="client", order_by="desc(Measurement.date)")
    workouts = relationship("Workout", back_populates="client")
    achievements = relationship("Achievement", back_populates="client")
    trainer = relationship("Trainer", back_populates="clients")
    team = relationship("Team", back_populates="clients")
    messages = relationship("Message", back_populates="client")
    video_calls = relationship("VideoCall", back_populates="client")
    push_tokens = relationship("PushToken", back_populates="client")
    meal_plans = relationship("MealPlan", back_populates="client")
    meals = relationship("Meal", back_populates="client")

class Measurement(Base):
    __tablename__ = "measurements"
    id = Column(Integer, primary_key=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    date = Column(DateTime, default=datetime.datetime.utcnow)
    weight = Column(Float)  # in kg
    chest = Column(Float)  # in cm
    waist = Column(Float)  # in cm
    hips = Column(Float)  # in cm
    biceps_left = Column(Float)  # in cm
    biceps_right = Column(Float)  # in cm
    thigh_left = Column(Float)  # in cm
    thigh_right = Column(Float)  # in cm
    calf_left = Column(Float)  # in cm
    calf_right = Column(Float)  # in cm
    shoulders = Column(Float)  # in cm
    forearms = Column(Float)  # in cm
    body_fat = Column(Float)  # percentage
    notes = Column(Text)
    photos = Column(JSON)  # Array of photo URLs
    client = relationship("Client", back_populates="measurements")

    def average_arm_size(self):
        if self.biceps_left and self.biceps_right:
            return (self.biceps_left + self.biceps_right) / 2
        return None

    def average_leg_size(self):
        if self.thigh_left and self.thigh_right:
            return (self.thigh_left + self.thigh_right) / 2
        return None

class WeightEntry(Base):
    __tablename__ = "weight_entries"
    id = Column(Integer, primary_key=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    weight = Column(Float, nullable=False)
    recorded_at = Column(DateTime, default=datetime.datetime.utcnow)
    client = relationship("Client", back_populates="weight_history")

class Exercise(Base):
    """Master list of exercises (like Pure Training's Exercise model)"""
    __tablename__ = "exercises"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    category = Column(String, nullable=True)  # chest, back, legs, shoulders, arms, core, cardio
    equipment = Column(String, nullable=True)  # barbell, dumbbell, machine, bodyweight, cable
    primary_muscles = Column(JSON, nullable=True)  # ["chest", "triceps"]
    secondary_muscles = Column(JSON, nullable=True)  # ["shoulders"]
    difficulty = Column(String, default="intermediate")  # beginner, intermediate, advanced
    instructions = Column(Text, nullable=True)
    video_url = Column(String, nullable=True)
    thumbnail_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    # Relationships
    setgroups = relationship("Setgroup", back_populates="exercise")

    def __str__(self):
        return self.name


class Workout(Base):
    """Actual workout session (like Pure Training's Session model)"""
    __tablename__ = "workouts"
    id = Column(Integer, primary_key=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    trainer_id = Column(Integer, ForeignKey("trainers.id"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    scheduled_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)  # When workout was logged
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    # Relationships
    client = relationship("Client", back_populates="workouts")
    trainer = relationship("Trainer", backref="created_workouts")
    setgroups = relationship("Setgroup", back_populates="workout", cascade="all, delete-orphan", order_by="Setgroup.order_index")
    
    @property
    def completed(self):
        return self.completed_at is not None
    
    @property
    def total_volume(self):
        """Calculate total volume (sets × reps × weight) for the workout"""
        total = 0
        for setgroup in self.setgroups:
            total += setgroup.total_volume
        return total

    def __str__(self):
        return f"Workout {self.id} - {self.title} by {self.client.name if self.client else 'Unknown'}"


class Setgroup(Base):
    """Group of sets for a specific exercise in a workout (like Pure Training's Setgroup)"""
    __tablename__ = "setgroups"
    id = Column(Integer, primary_key=True)
    workout_id = Column(Integer, ForeignKey("workouts.id"), nullable=False)
    exercise_id = Column(Integer, ForeignKey("exercises.id"), nullable=False)
    order_index = Column(Integer, default=0)  # Order of exercises in workout
    notes = Column(Text, nullable=True)  # Specific notes for this exercise
    rest_seconds = Column(Integer, nullable=True)  # Rest time between sets
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    # Relationships
    workout = relationship("Workout", back_populates="setgroups")
    exercise = relationship("Exercise", back_populates="setgroups")
    sets = relationship("WorkoutSet", back_populates="setgroup", cascade="all, delete-orphan", order_by="WorkoutSet.set_number")
    
    @property
    def total_volume(self):
        """Calculate volume for this exercise"""
        return sum(s.volume for s in self.sets if s.volume)

    def __str__(self):
        return f"{self.exercise.name} Sets"


class WorkoutSet(Base):
    """Individual set within a setgroup (like Pure Training's Set model)"""
    __tablename__ = "workout_sets"
    id = Column(Integer, primary_key=True)
    setgroup_id = Column(Integer, ForeignKey("setgroups.id"), nullable=False)
    set_number = Column(Integer, nullable=False)  # 1, 2, 3, etc.
    reps = Column(Integer, nullable=True)
    weight = Column(Float, nullable=True)  # in kg
    duration_seconds = Column(Integer, nullable=True)  # For timed exercises like planks
    distance_meters = Column(Float, nullable=True)  # For cardio exercises
    rpe = Column(Integer, nullable=True)  # Rate of Perceived Exertion (1-10)
    completed = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    # Relationships
    setgroup = relationship("Setgroup", back_populates="sets")
    
    @property
    def volume(self):
        """Calculate volume for this set (reps × weight)"""
        if self.reps and self.weight:
            return self.reps * self.weight
        return 0

    def __str__(self):
        return f"Set {self.set_number} of {self.setgroup.exercise.name if self.setgroup else 'Unknown'}"
    
    def serialize(self):
        """Serialize for API (like Pure Training)"""
        return {
            "id": self.id,
            "set_number": self.set_number,
            "reps": self.reps,
            "weight": self.weight,
            "duration_seconds": self.duration_seconds,
            "distance_meters": self.distance_meters,
            "rpe": self.rpe,
            "completed": self.completed,
            "volume": self.volume
        }

class MealPlan(Base):
    __tablename__ = "meal_plans"
    id = Column(Integer, primary_key=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=True)
    created_by_trainer_id = Column(Integer, ForeignKey("trainers.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    nutrients = Column(JSON)  # aggregated nutrient totals for the plan
    client = relationship("Client", back_populates="meal_plans")
    trainer = relationship("Trainer", backref="created_meal_plans")


class Meal(Base):
    __tablename__ = "meals"
    id = Column(Integer, primary_key=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    trainer_id = Column(Integer, ForeignKey("trainers.id"), nullable=True)
    meal_plan_id = Column(Integer, ForeignKey("meal_plans.id"), nullable=True)
    name = Column(String, nullable=False)
    date = Column(DateTime, default=datetime.datetime.utcnow)
    notes = Column(Text)
    total_nutrients = Column(JSON)  # calories, protein, carbs, fat, fiber, etc.
    client = relationship("Client", back_populates="meals")
    trainer = relationship("Trainer", backref="meals")
    items = relationship("MealItem", back_populates="meal", cascade="all, delete-orphan")


class MealItem(Base):
    __tablename__ = "meal_items"
    id = Column(Integer, primary_key=True)
    meal_id = Column(Integer, ForeignKey("meals.id"), nullable=False)
    name = Column(String, nullable=False)
    quantity = Column(Float, nullable=False, default=1.0)
    unit = Column(String, nullable=True)
    calories = Column(Float, nullable=True)
    protein = Column(Float, nullable=True)
    carbs = Column(Float, nullable=True)
    fat = Column(Float, nullable=True)
    fiber = Column(Float, nullable=True)
    sodium = Column(Float, nullable=True)
    raw_data = Column(JSON)  # original API response or metadata
    meal = relationship("Meal", back_populates="items")

class Achievement(Base):
    __tablename__ = "achievements"
    id = Column(Integer, primary_key=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text)
    icon = Column(String, nullable=True)  # emoji or icon name
    category = Column(String, nullable=True)  # weight_loss, strength, consistency, nutrition, etc.
    tier = Column(String, default="bronze")  # bronze, silver, gold, platinum
    badge_image_url = Column(String, nullable=True)  # Custom badge image
    unlock_animation = Column(JSON, nullable=True)  # Animation config for unlock
    awarded_at = Column(DateTime, default=datetime.datetime.utcnow)
    client = relationship("Client", back_populates="achievements")


class Quest(Base):
    __tablename__ = "quests"
    id = Column(Integer, primary_key=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    trainer_id = Column(Integer, ForeignKey("trainers.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    quest_type = Column(String, nullable=False)  # weight, measurement, workout, meal, streak
    target_value = Column(Float, nullable=True)  # e.g., 75kg target weight, 30cm target waist
    current_value = Column(Float, nullable=True)  # current progress
    target_unit = Column(String, nullable=True)  # kg, cm, days, workouts, meals
    reward_achievement = Column(String, nullable=True)  # Achievement name to unlock upon completion
    reward_description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    deadline = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    difficulty = Column(String, default="medium")  # easy, medium, hard, epic
    xp_reward = Column(Integer, default=100)  # gamification points
    client = relationship("Client")
    trainer = relationship("Trainer")


class Milestone(Base):
    __tablename__ = "milestones"
    id = Column(Integer, primary_key=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    milestone_type = Column(String, nullable=False)  # weight_milestone, measurement_milestone, streak_milestone, etc.
    value = Column(Float, nullable=True)  # e.g., lost 10kg, 30-day streak
    unit = Column(String, nullable=True)  # kg, cm, days
    achieved_at = Column(DateTime, default=datetime.datetime.utcnow)
    icon = Column(String, nullable=True)  # emoji or icon
    celebration_message = Column(Text, nullable=True)
    client = relationship("Client")

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    trainer_id = Column(Integer, ForeignKey("trainers.id"), nullable=False)
    content = Column(Text, nullable=False)
    sent_at = Column(DateTime, default=datetime.datetime.utcnow)
    is_read = Column(Boolean, default=False)
    client = relationship("Client", back_populates="messages")
    trainer = relationship("Trainer", backref="messages")

class VideoCall(Base):
    __tablename__ = "video_calls"
    id = Column(Integer, primary_key=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    trainer_id = Column(Integer, ForeignKey("trainers.id"), nullable=False)
    scheduled_at = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer)
    status = Column(String)  # scheduled, in-progress, completed, cancelled
    recording_url = Column(String, nullable=True)
    client = relationship("Client", back_populates="video_calls")
    trainer = relationship("Trainer", backref="video_calls")

class WorkoutCategory(Base):
    __tablename__ = "workout_categories"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    videos = relationship("WorkoutVideo", back_populates="category")

class WorkoutVideo(Base):
    __tablename__ = "workout_videos"
    id = Column(Integer, primary_key=True)
    trainer_id = Column(Integer, ForeignKey("trainers.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("workout_categories.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    video_url = Column(String, nullable=False)
    thumbnail_url = Column(String)
    duration = Column(Float)  # in seconds
    difficulty = Column(String)  # beginner, intermediate, advanced, expert
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    views = Column(Integer, default=0)
    category = relationship("WorkoutCategory", back_populates="videos")
    trainer = relationship("Trainer", backref="workout_videos")

class BrandingConfig(Base):
    __tablename__ = "branding_configs"
    id = Column(Integer, primary_key=True)
    trainer_id = Column(Integer, ForeignKey("trainers.id"), unique=True)
    business_name = Column(String, nullable=False)
    logo_url = Column(String)
    primary_color = Column(String)
    secondary_color = Column(String)
    custom_domain = Column(String)
    custom_styles = Column(JSON)  # Additional CSS customizations
    trainer = relationship("Trainer", back_populates="branding_config")

class PushToken(Base):
    __tablename__ = "push_tokens"
    id = Column(Integer, primary_key=True)
    token = Column(String, nullable=False)
    device_type = Column(String)  # ios, android, web
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    trainer_id = Column(Integer, ForeignKey("trainers.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_used = Column(DateTime)
    client = relationship("Client", back_populates="push_tokens")
    trainer = relationship("Trainer", back_populates="push_tokens")


class SHealthData(Base):
    __tablename__ = "shealth_data"
    id = Column(Integer, primary_key=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    trainer_id = Column(Integer, ForeignKey("trainers.id"), nullable=True)
    received_at = Column(DateTime, default=datetime.datetime.utcnow)
    payload = Column(JSON)


class ShareToken(Base):
    """Secure shareable tokens for client profile access"""
    __tablename__ = "share_tokens"
    id = Column(Integer, primary_key=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    token = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True)
    
    client = relationship("Client")
    
    @staticmethod
    def generate_token():
        """Generate a secure random token"""
        return secrets.token_urlsafe(32)


