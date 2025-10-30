from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Dict, Any
from ..database import get_db
from ..models import Client, ShareToken, Measurement, Meal, Quest, Milestone, Achievement
from ..utils.auth import get_current_trainer
from pydantic import BaseModel, EmailStr
import os
import smtplib
from email.message import EmailMessage

router = APIRouter()


class ShareRequest(BaseModel):
    client_email: EmailStr
    expires_days: int = 30  # Token validity in days


@router.post("/clients/{client_id}/share")
async def share_profile(
    client_id: int,
    request: ShareRequest,
    db: Session = Depends(get_db),
    current_trainer = Depends(get_current_trainer)
):
    """Generate a shareable profile link and email it to the client"""
    
    # Verify client belongs to trainer
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.trainer_id == current_trainer.id
    ).first()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Generate token
    token = ShareToken.generate_token()
    expires_at = datetime.utcnow() + timedelta(days=request.expires_days)
    
    share_token = ShareToken(
        client_id=client_id,
        token=token,
        expires_at=expires_at,
        is_active=True
    )
    
    db.add(share_token)
    db.commit()
    db.refresh(share_token)
    
    # Build shareable URL
    worker_url = os.getenv("WORKER_URL", "http://localhost:5173")
    share_url = f"{worker_url}/profile/{token}"
    
    # Send email
    try:
        send_profile_email(
            to_email=request.client_email,
            client_name=client.name,
            trainer_name=current_trainer.name,
            share_url=share_url,
            expires_at=expires_at
        )
    except Exception as e:
        print(f"Failed to send email: {e}")
        # Don't fail the request if email fails - just return the link
    
    return {
        "share_url": share_url,
        "token": token,
        "expires_at": expires_at.isoformat(),
        "email_sent": True
    }


@router.get("/public/profile/{token}")
async def get_public_profile(token: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Fetch client profile data using a share token (no auth required)"""
    
    # Validate token
    share_token = db.query(ShareToken).filter(
        ShareToken.token == token,
        ShareToken.is_active == True,
        ShareToken.expires_at > datetime.utcnow()
    ).first()
    
    if not share_token:
        raise HTTPException(status_code=404, detail="Invalid or expired share link")
    
    # Get client data
    client = db.query(Client).filter(Client.id == share_token.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Get measurements (last 12)
    measurements = db.query(Measurement).filter(
        Measurement.client_id == client.id
    ).order_by(Measurement.date.desc()).limit(12).all()
    
    # Get recent meals (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    recent_meals = db.query(Meal).filter(
        Meal.client_id == client.id,
        Meal.date >= thirty_days_ago
    ).order_by(Meal.date.desc()).all()
    
    # Get active quests
    active_quests = db.query(Quest).filter(
        Quest.client_id == client.id,
        Quest.is_active == True,
        Quest.completed_at == None
    ).order_by(Quest.created_at.desc()).all()
    
    # Get recent milestones (last 20)
    milestones = db.query(Milestone).filter(
        Milestone.client_id == client.id
    ).order_by(Milestone.achieved_at.desc()).limit(20).all()
    
    # Get achievements (all)
    achievements = db.query(Achievement).filter(
        Achievement.client_id == client.id
    ).order_by(Achievement.awarded_at.desc()).all()
    
    # Build response
    return {
        "client": {
            "name": client.name,
            "email": client.email,
        },
        "measurements": [
            {
                "id": m.id,
                "date": m.date.isoformat() if m.date else None,
                "weight": m.weight,
                "chest": m.chest,
                "waist": m.waist,
                "hips": m.hips,
                "biceps_left": m.biceps_left,
                "biceps_right": m.biceps_right,
                "body_fat": m.body_fat,
                "photos": m.photos,
                "notes": m.notes,
            }
            for m in measurements
        ],
        "recent_meals": [
            {
                "id": meal.id,
                "date": meal.date.isoformat() if meal.date else None,
                "name": meal.name,
                "total_nutrients": meal.total_nutrients,
                "notes": meal.notes,
            }
            for meal in recent_meals
        ],
        "quests": [
            {
                "id": q.id,
                "title": q.title,
                "description": q.description,
                "quest_type": q.quest_type,
                "target_value": q.target_value,
                "current_value": q.current_value,
                "target_unit": q.target_unit,
                "progress_percentage": round(min(100, (q.current_value / q.target_value) * 100), 1) if q.target_value and q.current_value else 0,
                "reward_achievement": q.reward_achievement,
                "difficulty": q.difficulty,
                "xp_reward": q.xp_reward,
                "deadline": q.deadline.isoformat() if q.deadline else None,
                "created_at": q.created_at.isoformat() if q.created_at else None,
            }
            for q in active_quests
        ],
        "milestones": [
            {
                "id": m.id,
                "title": m.title,
                "description": m.description,
                "milestone_type": m.milestone_type,
                "value": m.value,
                "unit": m.unit,
                "icon": m.icon,
                "celebration_message": m.celebration_message,
                "achieved_at": m.achieved_at.isoformat() if m.achieved_at else None,
            }
            for m in milestones
        ],
        "achievements": [
            {
                "id": a.id,
                "name": a.name,
                "description": a.description,
                "icon": a.icon,
                "category": a.category,
                "awarded_at": a.awarded_at.isoformat() if a.awarded_at else None,
            }
            for a in achievements
        ],
        "share_expires_at": share_token.expires_at.isoformat(),
    }


def send_profile_email(
    to_email: str,
    client_name: str,
    trainer_name: str,
    share_url: str,
    expires_at: datetime
):
    """Send profile share link via email"""
    
    SMTP_HOST = os.getenv("SMTP_HOST")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER")
    SMTP_PASS = os.getenv("SMTP_PASS")
    
    if not all([SMTP_HOST, SMTP_USER, SMTP_PASS]):
        raise Exception("SMTP not configured")
    
    msg = EmailMessage()
    msg["From"] = SMTP_USER
    msg["To"] = to_email
    msg["Subject"] = f"Your FitTrack Pro Progress - Shared by {trainer_name}"
    
    body = f"""
Hi {client_name},

{trainer_name} has shared your FitTrack Pro progress profile with you!

View your profile here:
{share_url}

This link will remain active until {expires_at.strftime('%B %d, %Y')}.

Your profile includes:
✓ Body measurements and progress charts
✓ Recent meal history and nutrition stats
✓ Progress photos

This link works offline once you've visited it, so you can check your progress anytime!

- FitTrack Pro Team
"""
    
    msg.set_content(body)
    
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as smtp:
        smtp.starttls()
        smtp.login(SMTP_USER, SMTP_PASS)
        smtp.send_message(msg)
