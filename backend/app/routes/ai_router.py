"""
AI-Powered Fitness Endpoints
Provides intelligent workout generation, meal planning, and coaching
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Client, Workout, Measurement
from ..ai_service import get_ai_service

router = APIRouter(prefix="/ai", tags=["ai"])


class WorkoutGenerationRequest(BaseModel):
    client_id: int
    body_part: Optional[str] = None
    equipment: List[str] = ['bodyweight', 'dumbbells']
    location: str = 'gym'
    space: str = 'moderate'


class MealPlanRequest(BaseModel):
    client_id: int


class ProgressReportRequest(BaseModel):
    client_id: int


@router.post("/workout-plan")
async def generate_workout_plan(request: WorkoutGenerationRequest, db: Session = Depends(get_db)):
    """
    Generate an AI-powered personalized workout plan
    
    Uses Claude AI if available, falls back to rule-based generation
    """
    client = db.query(Client).filter(Client.id == request.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Get latest measurements for context
    latest_measurement = db.query(Measurement)\
        .filter(Measurement.client_id == request.client_id)\
        .order_by(Measurement.date.desc())\
        .first()
    
    user_profile = {
        'name': client.name,
        'age': 'N/A',  # Add age field to Client model if needed
        'gender': 'N/A',  # Add gender field to Client model if needed
        'weight': latest_measurement.weight if latest_measurement else None,
        'goal': 'general fitness',  # Add goals field to Client model if needed
        'fitness_level': 'intermediate'  # Can be derived from workout history
    }
    
    preferences = {
        'location': request.location,
        'space': request.space,
        'equipment': request.equipment
    }
    
    ai_service = get_ai_service()
    workout_plan = await ai_service.generate_workout_plan(
        user_profile,
        preferences,
        request.body_part
    )
    
    return {
        "success": True,
        "workout_plan": workout_plan.dict(),
        "generated_by": "AI" if ai_service.use_ai else "Rule-based"
    }


@router.post("/meal-plan")
async def generate_meal_plan(request: MealPlanRequest, db: Session = Depends(get_db)):
    """
    Generate an AI-powered personalized meal plan
    """
    client = db.query(Client).filter(Client.id == request.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    latest_measurement = db.query(Measurement)\
        .filter(Measurement.client_id == request.client_id)\
        .order_by(Measurement.date.desc())\
        .first()
    
    user_profile = {
        'name': client.name,
        'age': 'N/A',
        'gender': 'N/A',
        'weight': latest_measurement.weight if latest_measurement else None,
        'goal': 'general fitness'
    }
    
    ai_service = get_ai_service()
    meal_plan = await ai_service.generate_meal_plan(user_profile)
    
    return {
        "success": True,
        "meal_plan": meal_plan.dict(),
        "generated_by": "AI" if ai_service.use_ai else "Rule-based"
    }


@router.get("/motivational-quote")
def get_motivational_quote():
    """
    Get a random motivational fitness quote
    """
    ai_service = get_ai_service()
    quote = ai_service.get_motivational_quote()
    
    return {
        "quote": quote
    }


@router.get("/challenges/{client_id}")
def get_challenges(client_id: int, db: Session = Depends(get_db)):
    """
    Get personalized fitness challenges
    """
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    user_profile = {
        'fitness_level': 'intermediate'  # Can be calculated from workout history
    }
    
    ai_service = get_ai_service()
    challenges = ai_service.generate_challenges(user_profile)
    
    return {
        "challenges": [c.dict() for c in challenges]
    }


@router.get("/supplements/{client_id}")
def get_supplements(client_id: int, db: Session = Depends(get_db)):
    """
    Get personalized supplement recommendations
    """
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    user_profile = {
        'goal': 'general fitness'  # Add goals to client model
    }
    
    ai_service = get_ai_service()
    supplements = ai_service.get_supplements(user_profile)
    
    return {
        "supplements": [s.dict() for s in supplements]
    }


@router.post("/progress-report")
async def generate_progress_report(request: ProgressReportRequest, db: Session = Depends(get_db)):
    """
    Generate comprehensive AI-powered progress report
    """
    client = db.query(Client).filter(Client.id == request.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Get workout history
    workouts = db.query(Workout)\
        .filter(Workout.client_id == request.client_id)\
        .filter(Workout.completed_at.isnot(None))\
        .all()
    
    workout_history = [
        {
            'title': w.title,
            'completed_at': w.completed_at.isoformat() if w.completed_at else None,
            'duration_minutes': w.duration_minutes
        }
        for w in workouts
    ]
    
    # Get measurement history
    measurements = db.query(Measurement)\
        .filter(Measurement.client_id == request.client_id)\
        .order_by(Measurement.date)\
        .all()
    
    measurement_history = [
        {
            'weight': m.weight,
            'body_fat': m.body_fat,
            'date': m.date.isoformat()
        }
        for m in measurements
    ]
    
    user_profile = {
        'name': client.name
    }
    
    ai_service = get_ai_service()
    report = await ai_service.generate_progress_report(
        user_profile,
        workout_history,
        measurement_history
    )
    
    return {
        "success": True,
        "report": report.dict(),
        "generated_by": "AI" if ai_service.use_ai else "Rule-based"
    }
