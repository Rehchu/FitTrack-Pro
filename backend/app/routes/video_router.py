from fastapi import APIRouter, Depends, HTTPException, WebSocket, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from ..database import get_db
from ..models import VideoCall, Trainer, Client
from ..utils.auth import get_current_trainer
from pydantic import BaseModel
import json
import os

router = APIRouter()

class VideoCallCreate(BaseModel):
    client_id: int
    scheduled_at: datetime
    duration_minutes: Optional[int] = 60

class VideoCallUpdate(BaseModel):
    status: str
    recording_url: Optional[str] = None

class VideoCallResponse(BaseModel):
    id: int
    client_id: int
    trainer_id: int
    scheduled_at: datetime
    duration_minutes: int
    status: str
    recording_url: Optional[str]

    class Config:
        orm_mode = True

@router.post("/schedule", response_model=VideoCallResponse)
async def schedule_call(
    call: VideoCallCreate,
    current_trainer: Trainer = Depends(get_current_trainer),
    db: Session = Depends(get_db)
):
    """Schedule a new video call with a client"""
    # Verify client belongs to trainer
    client = db.query(Client).filter(
        Client.id == call.client_id,
        Client.trainer_id == current_trainer.id
    ).first()
    
    if not client:
        raise HTTPException(
            status_code=404,
            detail="Client not found or not authorized"
        )
    
    db_call = VideoCall(
        client_id=call.client_id,
        trainer_id=current_trainer.id,
        scheduled_at=call.scheduled_at,
        duration_minutes=call.duration_minutes,
        status="scheduled"
    )
    db.add(db_call)
    db.commit()
    db.refresh(db_call)
    
    return db_call

@router.get("/upcoming", response_model=List[VideoCallResponse])
async def get_upcoming_calls(
    current_trainer: Trainer = Depends(get_current_trainer),
    db: Session = Depends(get_db)
):
    """Get all upcoming video calls"""
    calls = db.query(VideoCall).filter(
        VideoCall.trainer_id == current_trainer.id,
        VideoCall.status == "scheduled",
        VideoCall.scheduled_at > datetime.utcnow()
    ).order_by(VideoCall.scheduled_at.asc()).all()
    
    return calls

@router.put("/{call_id}/status", response_model=VideoCallResponse)
async def update_call_status(
    call_id: int,
    update: VideoCallUpdate,
    current_trainer: Trainer = Depends(get_current_trainer),
    db: Session = Depends(get_db)
):
    """Update video call status"""
    call = db.query(VideoCall).filter(
        VideoCall.id == call_id,
        VideoCall.trainer_id == current_trainer.id
    ).first()
    
    if not call:
        raise HTTPException(
            status_code=404,
            detail="Call not found or not authorized"
        )
    
    call.status = update.status
    if update.recording_url:
        call.recording_url = update.recording_url
    
    db.commit()
    db.refresh(call)
    return call

@router.get("/{call_id}/ice-servers")
async def get_ice_servers(
    call_id: int,
    current_trainer: Trainer = Depends(get_current_trainer),
    db: Session = Depends(get_db)
):
    """Get ICE servers configuration for WebRTC"""
    call = db.query(VideoCall).filter(
        VideoCall.id == call_id,
        VideoCall.trainer_id == current_trainer.id
    ).first()
    
    if not call:
        raise HTTPException(
            status_code=404,
            detail="Call not found or not authorized"
        )
    
    # Get ICE servers from environment or use defaults
    ice_servers = json.loads(os.getenv("WEBRTC_ICE_SERVERS", "[]"))
    if not ice_servers:
        ice_servers = [
            {"urls": "stun:stun.l.google.com:19302"},
            {"urls": "stun:stun1.l.google.com:19302"}
        ]
    
    return {"iceServers": ice_servers}