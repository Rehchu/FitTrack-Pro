"""
PDF Generation Router for FitTrack Pro
API endpoints for generating and downloading PDF reports
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional

from ..database import get_db
from ..utils.auth import get_current_trainer
from ..models import Client, Measurement, Meal, Workout, Achievement, Quest, Milestone
from ..pdf_generator import (
    generate_workout_pdf,
    generate_meal_plan_pdf,
    generate_progress_report_pdf,
    generate_health_stats_pdf
)

router = APIRouter(prefix="/pdf")


@router.get("/workout/{workout_id}")
async def download_workout_pdf(
    workout_id: int,
    db: Session = Depends(get_db),
    current_trainer = Depends(get_current_trainer)
):
    """
    Generate and download workout log PDF
    """
    workout = db.query(Workout).filter(Workout.id == workout_id).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    
    # Verify trainer has access
    if workout.trainer_id != current_trainer.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    client = db.query(Client).filter(Client.id == workout.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Generate PDF
    pdf_buffer = generate_workout_pdf(workout, client)
    
    # Return as streaming response
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="workout_{workout.id}_{datetime.now().strftime("%Y%m%d")}.pdf"'
        }
    )


@router.get("/meal-plan/{client_id}")
async def download_meal_plan_pdf(
    client_id: int,
    days: int = Query(7, ge=1, le=30),
    start_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_trainer = Depends(get_current_trainer)
):
    """
    Generate and download meal plan PDF
    
    Args:
        client_id: Client ID
        days: Number of days (default 7, max 30)
        start_date: Start date in YYYY-MM-DD format (defaults to today)
    """
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Verify trainer has access
    if client.trainer_id != current_trainer.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Parse date range
    if start_date:
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    else:
        start = datetime.now().date()
    
    end = start + timedelta(days=days)
    
    # Get meals in date range
    meals = db.query(Meal).filter(
        Meal.client_id == client_id,
        Meal.date >= start,
        Meal.date < end
    ).order_by(Meal.date, Meal.id).all()
    
    if not meals:
        raise HTTPException(status_code=404, detail="No meals found in date range")
    
    # Generate PDF
    pdf_buffer = generate_meal_plan_pdf(meals, client, days)
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="meal_plan_{client_id}_{datetime.now().strftime("%Y%m%d")}.pdf"'
        }
    )


@router.get("/progress-report/{client_id}")
async def download_progress_report_pdf(
    client_id: int,
    days: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
    current_trainer = Depends(get_current_trainer)
):
    """
    Generate and download comprehensive progress report PDF
    
    Args:
        client_id: Client ID
        days: Number of days to include (default 30, max 365)
    """
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Verify trainer has access
    if client.trainer_id != current_trainer.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    # Get data
    measurements = db.query(Measurement).filter(
        Measurement.client_id == client_id,
        Measurement.date >= start_date.date()
    ).order_by(Measurement.date.desc()).all()
    
    achievements = db.query(Achievement).filter(
        Achievement.client_id == client_id,
        Achievement.awarded_at >= start_date
    ).order_by(Achievement.awarded_at.desc()).all()
    
    quests = db.query(Quest).filter(
        Quest.client_id == client_id,
        Quest.is_active == True
    ).all()
    
    milestones = db.query(Milestone).filter(
        Milestone.client_id == client_id,
        Milestone.achieved_at >= start_date
    ).order_by(Milestone.achieved_at.desc()).all()
    
    # Generate PDF
    pdf_buffer = generate_progress_report_pdf(client, measurements, achievements, quests, milestones)
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="progress_report_{client_id}_{datetime.now().strftime("%Y%m%d")}.pdf"'
        }
    )


@router.get("/health-stats/{client_id}")
async def download_health_stats_pdf(
    client_id: int,
    days: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
    current_trainer = Depends(get_current_trainer)
):
    """
    Generate and download health statistics PDF
    
    Args:
        client_id: Client ID
        days: Number of days to include (default 30, max 365)
    """
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Verify trainer has access
    if client.trainer_id != current_trainer.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    # Get data
    measurements = db.query(Measurement).filter(
        Measurement.client_id == client_id,
        Measurement.date >= start_date.date()
    ).order_by(Measurement.date.desc()).all()
    
    meals = db.query(Meal).filter(
        Meal.client_id == client_id,
        Meal.date >= start_date.date()
    ).all()
    
    workouts = db.query(Workout).filter(
        Workout.client_id == client_id,
        Workout.created_at >= start_date
    ).all()
    
    # Generate PDF
    pdf_buffer = generate_health_stats_pdf(client, measurements, meals, workouts)
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="health_stats_{client_id}_{datetime.now().strftime("%Y%m%d")}.pdf"'
        }
    )
