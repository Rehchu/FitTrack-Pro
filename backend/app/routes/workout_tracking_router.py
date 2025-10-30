"""
Workout Tracking API Routes
Based on Pure Training architecture: Exercise → Workout (Session) → Setgroup → WorkoutSet
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from ..database import get_db
from ..models import Exercise, Workout, Setgroup, WorkoutSet, Client, Trainer
from ..schemas.workout_tracking import (
    Exercise as ExerciseSchema,
    ExerciseCreate,
    ExerciseUpdate,
    Workout as WorkoutSchema,
    WorkoutCreate,
    WorkoutUpdate,
    WorkoutSummary,
    Setgroup as SetgroupSchema,
    SetgroupCreate,
    SetgroupUpdate,
    WorkoutSet as WorkoutSetSchema,
    WorkoutSetCreate,
    WorkoutSetUpdate,
    ExerciseProgress,
    WorkoutStats
)
from ..utils.auth import get_current_trainer

router = APIRouter(prefix="/workouts", tags=["Workout Tracking"])


# ==================== EXERCISE ROUTES ====================

@router.get("/exercises", response_model=List[ExerciseSchema])
def get_exercises(
    category: Optional[str] = None,
    equipment: Optional[str] = None,
    difficulty: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all exercises with optional filters"""
    query = db.query(Exercise)
    
    if category:
        query = query.filter(Exercise.category == category)
    if equipment:
        query = query.filter(Exercise.equipment == equipment)
    if difficulty:
        query = query.filter(Exercise.difficulty == difficulty)
    if search:
        query = query.filter(Exercise.name.ilike(f"%{search}%"))
    
    return query.order_by(Exercise.name).all()


@router.post("/exercises", response_model=ExerciseSchema, status_code=status.HTTP_201_CREATED)
def create_exercise(
    exercise: ExerciseCreate,
    db: Session = Depends(get_db),
    current_trainer: Trainer = Depends(get_current_trainer)
):
    """Create a new exercise"""
    # Check if exercise already exists
    existing = db.query(Exercise).filter(Exercise.name == exercise.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Exercise '{exercise.name}' already exists"
        )
    
    db_exercise = Exercise(**exercise.dict())
    db.add(db_exercise)
    db.commit()
    db.refresh(db_exercise)
    return db_exercise


@router.get("/exercises/{exercise_id}", response_model=ExerciseSchema)
def get_exercise(exercise_id: int, db: Session = Depends(get_db)):
    """Get a specific exercise"""
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return exercise


@router.put("/exercises/{exercise_id}", response_model=ExerciseSchema)
def update_exercise(
    exercise_id: int,
    exercise_update: ExerciseUpdate,
    db: Session = Depends(get_db),
    current_trainer: Trainer = Depends(get_current_trainer)
):
    """Update an exercise"""
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    
    update_data = exercise_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(exercise, field, value)
    
    db.commit()
    db.refresh(exercise)
    return exercise


@router.delete("/exercises/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_exercise(
    exercise_id: int,
    db: Session = Depends(get_db),
    current_trainer: Trainer = Depends(get_current_trainer)
):
    """Delete an exercise (only if not used in any workouts)"""
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    
    # Check if exercise is used in any setgroups
    setgroup_count = db.query(Setgroup).filter(Setgroup.exercise_id == exercise_id).count()
    if setgroup_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete exercise. It's used in {setgroup_count} workout(s)."
        )
    
    db.delete(exercise)
    db.commit()
    return None


# ==================== WORKOUT (SESSION) ROUTES ====================

@router.get("/", response_model=List[WorkoutSummary])
def get_workouts(
    client_id: Optional[int] = None,
    trainer_id: Optional[int] = None,
    completed: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all workouts with optional filters"""
    query = db.query(Workout)
    
    if client_id:
        query = query.filter(Workout.client_id == client_id)
    if trainer_id:
        query = query.filter(Workout.trainer_id == trainer_id)
    if completed is not None:
        if completed:
            query = query.filter(Workout.completed_at.isnot(None))
        else:
            query = query.filter(Workout.completed_at.is_(None))
    
    workouts = query.order_by(Workout.timestamp.desc()).offset(skip).limit(limit).all()
    
    # Convert to summary format
    summaries = []
    for workout in workouts:
        summaries.append(WorkoutSummary(
            id=workout.id,
            client_id=workout.client_id,
            trainer_id=workout.trainer_id,
            title=workout.title,
            description=workout.description,
            scheduled_at=workout.scheduled_at,
            completed=workout.completed,
            completed_at=workout.completed_at,
            duration_minutes=workout.duration_minutes,
            total_volume=workout.total_volume,
            exercise_count=len(workout.setgroups),
            timestamp=workout.timestamp,
            created_at=workout.created_at
        ))
    
    return summaries


@router.post("/", response_model=WorkoutSchema, status_code=status.HTTP_201_CREATED)
def create_workout(
    workout: WorkoutCreate,
    db: Session = Depends(get_db),
    current_trainer: Trainer = Depends(get_current_trainer)
):
    """Create a new workout with setgroups and sets"""
    # Verify client exists
    client = db.query(Client).filter(Client.id == workout.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Create workout
    db_workout = Workout(
        client_id=workout.client_id,
        trainer_id=current_trainer.id,
        title=workout.title,
        description=workout.description,
        scheduled_at=workout.scheduled_at,
        duration_minutes=workout.duration_minutes,
        notes=workout.notes
    )
    db.add(db_workout)
    db.flush()  # Get workout ID
    
    # Create setgroups and sets
    for setgroup_data in workout.setgroups:
        # Verify exercise exists
        exercise = db.query(Exercise).filter(Exercise.id == setgroup_data.exercise_id).first()
        if not exercise:
            raise HTTPException(status_code=404, detail=f"Exercise {setgroup_data.exercise_id} not found")
        
        db_setgroup = Setgroup(
            workout_id=db_workout.id,
            exercise_id=setgroup_data.exercise_id,
            order_index=setgroup_data.order_index,
            notes=setgroup_data.notes,
            rest_seconds=setgroup_data.rest_seconds
        )
        db.add(db_setgroup)
        db.flush()  # Get setgroup ID
        
        # Create sets
        for set_data in setgroup_data.sets:
            db_set = WorkoutSet(
                setgroup_id=db_setgroup.id,
                set_number=set_data.set_number,
                reps=set_data.reps,
                weight=set_data.weight,
                duration_seconds=set_data.duration_seconds,
                distance_meters=set_data.distance_meters,
                rpe=set_data.rpe,
                completed=set_data.completed,
                notes=set_data.notes
            )
            db.add(db_set)
    
    db.commit()
    db.refresh(db_workout)
    return db_workout


@router.get("/{workout_id}", response_model=WorkoutSchema)
def get_workout(workout_id: int, db: Session = Depends(get_db)):
    """Get a specific workout with all details"""
    workout = db.query(Workout).filter(Workout.id == workout_id).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    return workout


@router.put("/{workout_id}", response_model=WorkoutSchema)
def update_workout(
    workout_id: int,
    workout_update: WorkoutUpdate,
    db: Session = Depends(get_db),
    current_trainer: Trainer = Depends(get_current_trainer)
):
    """Update a workout"""
    workout = db.query(Workout).filter(Workout.id == workout_id).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    
    update_data = workout_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(workout, field, value)
    
    db.commit()
    db.refresh(workout)
    return workout


@router.delete("/{workout_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workout(
    workout_id: int,
    db: Session = Depends(get_db),
    current_trainer: Trainer = Depends(get_current_trainer)
):
    """Delete a workout (cascades to setgroups and sets)"""
    workout = db.query(Workout).filter(Workout.id == workout_id).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    
    db.delete(workout)
    db.commit()
    return None


@router.post("/{workout_id}/complete", response_model=WorkoutSchema)
def complete_workout(
    workout_id: int,
    duration_minutes: Optional[int] = None,
    db: Session = Depends(get_db),
    current_trainer: Trainer = Depends(get_current_trainer)
):
    """Mark a workout as completed"""
    workout = db.query(Workout).filter(Workout.id == workout_id).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    
    workout.completed_at = datetime.utcnow()
    if duration_minutes:
        workout.duration_minutes = duration_minutes
    
    db.commit()
    db.refresh(workout)
    return workout


# ==================== SETGROUP ROUTES ====================

@router.post("/{workout_id}/setgroups", response_model=SetgroupSchema, status_code=status.HTTP_201_CREATED)
def add_setgroup_to_workout(
    workout_id: int,
    setgroup: SetgroupCreate,
    db: Session = Depends(get_db),
    current_trainer: Trainer = Depends(get_current_trainer)
):
    """Add a new exercise (setgroup) to an existing workout"""
    workout = db.query(Workout).filter(Workout.id == workout_id).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    
    # Verify exercise exists
    exercise = db.query(Exercise).filter(Exercise.id == setgroup.exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    
    # Check if exercise already in this workout
    existing = db.query(Setgroup).filter(
        Setgroup.workout_id == workout_id,
        Setgroup.exercise_id == setgroup.exercise_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Exercise already exists in this workout"
        )
    
    db_setgroup = Setgroup(
        workout_id=workout_id,
        exercise_id=setgroup.exercise_id,
        order_index=setgroup.order_index,
        notes=setgroup.notes,
        rest_seconds=setgroup.rest_seconds
    )
    db.add(db_setgroup)
    db.flush()
    
    # Add sets if provided
    for set_data in setgroup.sets:
        db_set = WorkoutSet(
            setgroup_id=db_setgroup.id,
            set_number=set_data.set_number,
            reps=set_data.reps,
            weight=set_data.weight,
            duration_seconds=set_data.duration_seconds,
            distance_meters=set_data.distance_meters,
            rpe=set_data.rpe,
            completed=set_data.completed,
            notes=set_data.notes
        )
        db.add(db_set)
    
    db.commit()
    db.refresh(db_setgroup)
    return db_setgroup


@router.put("/setgroups/{setgroup_id}", response_model=SetgroupSchema)
def update_setgroup(
    setgroup_id: int,
    setgroup_update: SetgroupUpdate,
    db: Session = Depends(get_db),
    current_trainer: Trainer = Depends(get_current_trainer)
):
    """Update a setgroup"""
    setgroup = db.query(Setgroup).filter(Setgroup.id == setgroup_id).first()
    if not setgroup:
        raise HTTPException(status_code=404, detail="Setgroup not found")
    
    update_data = setgroup_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(setgroup, field, value)
    
    db.commit()
    db.refresh(setgroup)
    return setgroup


@router.delete("/setgroups/{setgroup_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_setgroup(
    setgroup_id: int,
    db: Session = Depends(get_db),
    current_trainer: Trainer = Depends(get_current_trainer)
):
    """Delete a setgroup (cascades to sets)"""
    setgroup = db.query(Setgroup).filter(Setgroup.id == setgroup_id).first()
    if not setgroup:
        raise HTTPException(status_code=404, detail="Setgroup not found")
    
    db.delete(setgroup)
    db.commit()
    return None


# ==================== WORKOUT SET ROUTES ====================

@router.post("/setgroups/{setgroup_id}/sets", response_model=WorkoutSetSchema, status_code=status.HTTP_201_CREATED)
def add_set_to_setgroup(
    setgroup_id: int,
    workout_set: WorkoutSetCreate,
    db: Session = Depends(get_db),
    current_trainer: Trainer = Depends(get_current_trainer)
):
    """Add a new set to a setgroup"""
    setgroup = db.query(Setgroup).filter(Setgroup.id == setgroup_id).first()
    if not setgroup:
        raise HTTPException(status_code=404, detail="Setgroup not found")
    
    db_set = WorkoutSet(
        setgroup_id=setgroup_id,
        set_number=workout_set.set_number,
        reps=workout_set.reps,
        weight=workout_set.weight,
        duration_seconds=workout_set.duration_seconds,
        distance_meters=workout_set.distance_meters,
        rpe=workout_set.rpe,
        completed=workout_set.completed,
        notes=workout_set.notes
    )
    db.add(db_set)
    db.commit()
    db.refresh(db_set)
    return db_set


@router.put("/sets/{set_id}", response_model=WorkoutSetSchema)
def update_set(
    set_id: int,
    set_update: WorkoutSetUpdate,
    db: Session = Depends(get_db),
    current_trainer: Trainer = Depends(get_current_trainer)
):
    """Update a workout set"""
    workout_set = db.query(WorkoutSet).filter(WorkoutSet.id == set_id).first()
    if not workout_set:
        raise HTTPException(status_code=404, detail="Set not found")
    
    update_data = set_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(workout_set, field, value)
    
    db.commit()
    db.refresh(workout_set)
    return workout_set


@router.delete("/sets/{set_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_set(
    set_id: int,
    db: Session = Depends(get_db),
    current_trainer: Trainer = Depends(get_current_trainer)
):
    """Delete a workout set"""
    workout_set = db.query(WorkoutSet).filter(WorkoutSet.id == set_id).first()
    if not workout_set:
        raise HTTPException(status_code=404, detail="Set not found")
    
    db.delete(workout_set)
    db.commit()
    return None


# ==================== PROGRESS & STATS ROUTES ====================

@router.get("/clients/{client_id}/exercise-progress/{exercise_id}", response_model=ExerciseProgress)
def get_exercise_progress(
    client_id: int,
    exercise_id: int,
    db: Session = Depends(get_db)
):
    """Get progress history for a specific exercise for a client"""
    # Get all setgroups for this client and exercise
    setgroups = db.query(Setgroup).join(Workout).filter(
        Workout.client_id == client_id,
        Setgroup.exercise_id == exercise_id,
        Workout.completed_at.isnot(None)
    ).order_by(Workout.completed_at).all()
    
    if not setgroups:
        raise HTTPException(status_code=404, detail="No workout history found for this exercise")
    
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    
    # Calculate progress metrics
    history = []
    for setgroup in setgroups:
        max_weight = max([s.weight for s in setgroup.sets if s.weight], default=0)
        total_volume = setgroup.total_volume
        total_reps = sum([s.reps for s in setgroup.sets if s.reps], default=0)
        best_set_reps = max([s.reps for s in setgroup.sets if s.reps], default=0)
        
        history.append({
            "date": setgroup.workout.completed_at,
            "workout_id": setgroup.workout_id,
            "max_weight": max_weight,
            "total_volume": total_volume,
            "total_reps": total_reps,
            "best_set_reps": best_set_reps
        })
    
    # Calculate improvements
    starting_max_weight = history[0]["max_weight"] if history else 0
    current_max_weight = history[-1]["max_weight"] if history else 0
    starting_volume = history[0]["total_volume"] if history else 0
    current_volume = history[-1]["total_volume"] if history else 0
    
    return ExerciseProgress(
        exercise_id=exercise_id,
        exercise_name=exercise.name,
        category=exercise.category or "",
        first_workout=history[0]["date"] if history else datetime.utcnow(),
        last_workout=history[-1]["date"] if history else datetime.utcnow(),
        total_workouts=len(history),
        current_max_weight=current_max_weight,
        starting_max_weight=starting_max_weight,
        weight_improvement=current_max_weight - starting_max_weight,
        current_volume=current_volume,
        starting_volume=starting_volume,
        volume_improvement=current_volume - starting_volume,
        history=history
    )


@router.get("/clients/{client_id}/stats", response_model=WorkoutStats)
def get_workout_stats(client_id: int, db: Session = Depends(get_db)):
    """Get overall workout statistics for a client"""
    # Get all workouts for this client
    workouts = db.query(Workout).filter(Workout.client_id == client_id).all()
    completed_workouts = [w for w in workouts if w.completed]
    
    if not completed_workouts:
        return WorkoutStats(
            total_workouts=0,
            completed_workouts=0,
            total_exercises=0,
            unique_exercises=0,
            total_volume=0,
            total_reps=0,
            total_duration_minutes=0,
            avg_workouts_per_week=0,
            current_streak_days=0,
            longest_streak_days=0
        )
    
    # Calculate stats
    total_volume = sum([w.total_volume for w in completed_workouts])
    total_duration = sum([w.duration_minutes for w in completed_workouts if w.duration_minutes], default=0)
    
    # Count exercises
    all_setgroups = []
    for w in completed_workouts:
        all_setgroups.extend(w.setgroups)
    
    total_exercises = len(all_setgroups)
    unique_exercise_ids = set([sg.exercise_id for sg in all_setgroups])
    unique_exercises = len(unique_exercise_ids)
    
    # Count total reps
    total_reps = 0
    for sg in all_setgroups:
        for s in sg.sets:
            if s.reps:
                total_reps += s.reps
    
    # Find favorite exercise (most frequently performed)
    exercise_counts = {}
    for sg in all_setgroups:
        exercise_counts[sg.exercise_id] = exercise_counts.get(sg.exercise_id, 0) + 1
    
    favorite_exercise = None
    if exercise_counts:
        favorite_id = max(exercise_counts, key=exercise_counts.get)
        favorite_ex = db.query(Exercise).filter(Exercise.id == favorite_id).first()
        favorite_exercise = favorite_ex.name if favorite_ex else None
    
    # Find strongest exercise (highest weight)
    strongest_exercise = None
    max_weight = 0
    for sg in all_setgroups:
        for s in sg.sets:
            if s.weight and s.weight > max_weight:
                max_weight = s.weight
                strongest_exercise = sg.exercise.name
    
    # Calculate workout frequency
    if len(completed_workouts) > 1:
        first_workout = min([w.completed_at for w in completed_workouts])
        last_workout = max([w.completed_at for w in completed_workouts])
        weeks = (last_workout - first_workout).days / 7
        avg_workouts_per_week = len(completed_workouts) / weeks if weeks > 0 else 0
    else:
        avg_workouts_per_week = 0
    
    # Calculate streaks
    workout_dates = sorted([w.completed_at.date() for w in completed_workouts])
    current_streak = 0
    longest_streak = 0
    temp_streak = 1
    
    for i in range(len(workout_dates) - 1):
        if (workout_dates[i + 1] - workout_dates[i]).days <= 7:  # Within a week
            temp_streak += 1
        else:
            longest_streak = max(longest_streak, temp_streak)
            temp_streak = 1
    
    longest_streak = max(longest_streak, temp_streak)
    
    # Current streak (from today)
    today = datetime.now().date()
    if workout_dates and (today - workout_dates[-1]).days <= 7:
        current_streak = temp_streak
    
    return WorkoutStats(
        total_workouts=len(workouts),
        completed_workouts=len(completed_workouts),
        total_exercises=total_exercises,
        unique_exercises=unique_exercises,
        total_volume=total_volume,
        total_reps=total_reps,
        total_duration_minutes=total_duration,
        favorite_exercise=favorite_exercise,
        strongest_exercise=strongest_exercise,
        most_improved_exercise=None,  # TODO: Calculate based on progress
        avg_workouts_per_week=avg_workouts_per_week,
        current_streak_days=current_streak,
        longest_streak_days=longest_streak
    )
