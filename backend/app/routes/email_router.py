"""
Email Router for FitTrack Pro
API endpoints for sending emails with workout plans, meal plans, and reports
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from typing import Optional

from ..database import get_db
from ..utils.auth import get_current_trainer
from ..models import Client, Workout, Meal, Measurement, Achievement, Quest, Milestone
from ..email_service import EmailService
from ..pdf_generator import (
    generate_workout_pdf,
    generate_meal_plan_pdf,
    generate_progress_report_pdf,
    generate_health_stats_pdf
)

router = APIRouter(prefix="/email")


class SendWorkoutEmailRequest(BaseModel):
    workout_id: int
    client_email: Optional[EmailStr] = None  # Optional override, uses client.email by default


class SendMealPlanEmailRequest(BaseModel):
    client_id: int
    days: int = 7
    start_date: Optional[str] = None
    client_email: Optional[EmailStr] = None


class SendProgressReportEmailRequest(BaseModel):
    client_id: int
    days: int = 30
    client_email: Optional[EmailStr] = None


class SendHealthStatsEmailRequest(BaseModel):
    client_id: int
    days: int = 30
    client_email: Optional[EmailStr] = None


@router.post("/send-workout")
async def send_workout_email(
    request: SendWorkoutEmailRequest,
    db: Session = Depends(get_db),
    current_trainer = Depends(get_current_trainer)
):
    """
    Send workout plan email with PDF attachment
    """
    workout = db.query(Workout).filter(Workout.id == request.workout_id).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    
    # Verify trainer has access
    if workout.trainer_id != current_trainer.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    client = db.query(Client).filter(Client.id == workout.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Get client email
    to_email = request.client_email or client.email
    if not to_email:
        raise HTTPException(status_code=400, detail="Client email not available")
    
    # Generate PDF
    pdf_buffer = generate_workout_pdf(workout, client)
    pdf_bytes = pdf_buffer.getvalue()
    
    # Send email
    email_service = EmailService()
    success = email_service.send_workout_plan(
        to_email=to_email,
        client_name=client.name,
        trainer_name=current_trainer.name,
        workout_title=workout.title,
        scheduled_date=workout.scheduled_at.strftime('%A, %B %d, %Y') if workout.scheduled_at else "Not scheduled",
        pdf_bytes=pdf_bytes
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send email. Check SMTP configuration.")
    
    return {"message": "Workout plan email sent successfully", "to": to_email}


@router.post("/send-meal-plan")
async def send_meal_plan_email(
    request: SendMealPlanEmailRequest,
    db: Session = Depends(get_db),
    current_trainer = Depends(get_current_trainer)
):
    """
    Send meal plan email with PDF attachment
    """
    client = db.query(Client).filter(Client.id == request.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Verify trainer has access
    if client.trainer_id != current_trainer.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get client email
    to_email = request.client_email or client.email
    if not to_email:
        raise HTTPException(status_code=400, detail="Client email not available")
    
    # Parse date range
    if request.start_date:
        try:
            start = datetime.strptime(request.start_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    else:
        start = datetime.now().date()
    
    end = start + timedelta(days=request.days)
    
    # Get meals
    meals = db.query(Meal).filter(
        Meal.client_id == request.client_id,
        Meal.date >= start,
        Meal.date < end
    ).order_by(Meal.date, Meal.id).all()
    
    if not meals:
        raise HTTPException(status_code=404, detail="No meals found in date range")
    
    # Generate PDF
    pdf_buffer = generate_meal_plan_pdf(meals, client, request.days)
    pdf_bytes = pdf_buffer.getvalue()
    
    # Send email
    email_service = EmailService()
    success = email_service.send_meal_plan(
        to_email=to_email,
        client_name=client.name,
        trainer_name=current_trainer.name,
        days=request.days,
        pdf_bytes=pdf_bytes
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send email. Check SMTP configuration.")
    
    return {"message": f"{request.days}-day meal plan email sent successfully", "to": to_email}


@router.post("/send-progress-report")
async def send_progress_report_email(
    request: SendProgressReportEmailRequest,
    db: Session = Depends(get_db),
    current_trainer = Depends(get_current_trainer)
):
    """
    Send progress report email with PDF attachment
    """
    client = db.query(Client).filter(Client.id == request.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Verify trainer has access
    if client.trainer_id != current_trainer.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get client email
    to_email = request.client_email or client.email
    if not to_email:
        raise HTTPException(status_code=400, detail="Client email not available")
    
    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=request.days)
    
    # Get data
    measurements = db.query(Measurement).filter(
        Measurement.client_id == request.client_id,
        Measurement.date >= start_date.date()
    ).order_by(Measurement.date.desc()).all()
    
    achievements = db.query(Achievement).filter(
        Achievement.client_id == request.client_id,
        Achievement.awarded_at >= start_date
    ).order_by(Achievement.awarded_at.desc()).all()
    
    quests = db.query(Quest).filter(
        Quest.client_id == request.client_id,
        Quest.is_active == True
    ).all()
    
    milestones = db.query(Milestone).filter(
        Milestone.client_id == request.client_id,
        Milestone.achieved_at >= start_date
    ).order_by(Milestone.achieved_at.desc()).all()
    
    # Generate PDF
    pdf_buffer = generate_progress_report_pdf(client, measurements, achievements, quests, milestones)
    pdf_bytes = pdf_buffer.getvalue()
    
    # Send email
    email_service = EmailService()
    success = email_service.send_progress_report(
        to_email=to_email,
        client_name=client.name,
        trainer_name=current_trainer.name,
        days=request.days,
        pdf_bytes=pdf_bytes
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send email. Check SMTP configuration.")
    
    return {"message": f"{request.days}-day progress report email sent successfully", "to": to_email}


@router.post("/send-health-stats")
async def send_health_stats_email(
    request: SendHealthStatsEmailRequest,
    db: Session = Depends(get_db),
    current_trainer = Depends(get_current_trainer)
):
    """
    Send health statistics email with PDF attachment
    """
    client = db.query(Client).filter(Client.id == request.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Verify trainer has access
    if client.trainer_id != current_trainer.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get client email
    to_email = request.client_email or client.email
    if not to_email:
        raise HTTPException(status_code=400, detail="Client email not available")
    
    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=request.days)
    
    # Get data
    measurements = db.query(Measurement).filter(
        Measurement.client_id == request.client_id,
        Measurement.date >= start_date.date()
    ).order_by(Measurement.date.desc()).all()
    
    meals = db.query(Meal).filter(
        Meal.client_id == request.client_id,
        Meal.date >= start_date.date()
    ).all()
    
    workouts = db.query(Workout).filter(
        Workout.client_id == request.client_id,
        Workout.created_at >= start_date
    ).all()
    
    # Generate PDF
    pdf_buffer = generate_health_stats_pdf(client, measurements, meals, workouts)
    pdf_bytes = pdf_buffer.getvalue()
    
    # Send email
    email_service = EmailService()
    success = email_service.send_health_stats(
        to_email=to_email,
        client_name=client.name,
        trainer_name=current_trainer.name,
        days=request.days,
        pdf_bytes=pdf_bytes
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send email. Check SMTP configuration.")
    
    return {"message": f"{request.days}-day health statistics email sent successfully", "to": to_email}
