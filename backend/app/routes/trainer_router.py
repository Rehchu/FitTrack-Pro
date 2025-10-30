from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Trainer, BrandingConfig, Message, VideoCall
from ..schemas.trainer import TrainerCreate, TrainerUpdate, TrainerResponse
from ..utils.auth import get_password_hash, create_access_token, get_current_trainer

router = APIRouter()

@router.post("/", response_model=TrainerResponse)
def create_trainer(trainer: TrainerCreate, db: Session = Depends(get_db)):
    """Create a new trainer account (100% free, no limits)"""
    db_trainer = db.query(Trainer).filter(Trainer.email == trainer.email).first()
    if db_trainer:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(trainer.password)
    db_trainer = Trainer(
        name=trainer.name,
        email=trainer.email,
        password_hash=hashed_password
    )
    db.add(db_trainer)
    db.commit()
    db.refresh(db_trainer)
    
    # Create default branding config
    branding = BrandingConfig(
        trainer_id=db_trainer.id,
        business_name=f"{db_trainer.name}'s Training",
        primary_color="#4A90E2",
        secondary_color="#F5A623"
    )
    db.add(branding)
    db.commit()
    
    return db_trainer

@router.get("/me", response_model=TrainerResponse)
def read_current_trainer(current_trainer: Trainer = Depends(get_current_trainer)):
    """Get current trainer profile"""
    return current_trainer

@router.put("/me", response_model=TrainerResponse)
def update_trainer(
    trainer_update: TrainerUpdate,
    current_trainer: Trainer = Depends(get_current_trainer),
    db: Session = Depends(get_db)
):
    """Update current trainer profile"""
    for key, value in trainer_update.dict(exclude_unset=True).items():
        if key == "password":
            value = get_password_hash(value)
            key = "password_hash"
        setattr(current_trainer, key, value)
    
    db.commit()
    db.refresh(current_trainer)
    return current_trainer

@router.get("/dashboard")
def get_dashboard_stats(
    current_trainer: Trainer = Depends(get_current_trainer),
    db: Session = Depends(get_db)
):
    """Get trainer dashboard statistics"""
    total_clients = len(current_trainer.clients)
    active_teams = len(current_trainer.teams)
    upcoming_calls = db.query(VideoCall).filter(
        VideoCall.trainer_id == current_trainer.id,
        VideoCall.status == "scheduled"
    ).count()
    unread_messages = db.query(Message).filter(
        Message.trainer_id == current_trainer.id,
        Message.is_read == False
    ).count()
    
    return {
        "total_clients": total_clients,
        "active_teams": active_teams,
        "upcoming_calls": upcoming_calls,
        "unread_messages": unread_messages
    }