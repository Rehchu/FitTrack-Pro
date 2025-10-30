from fastapi import APIRouter, Depends, HTTPException, WebSocket, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Message, Trainer, Client
from ..utils.auth import get_current_trainer
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class MessageCreate(BaseModel):
    client_id: int
    content: str

class MessageResponse(BaseModel):
    id: int
    client_id: int
    trainer_id: int
    content: str
    sent_at: datetime
    is_read: bool

    class Config:
        orm_mode = True

@router.post("/", response_model=MessageResponse)
async def send_message(
    message: MessageCreate,
    current_trainer: Trainer = Depends(get_current_trainer),
    db: Session = Depends(get_db)
):
    """Send a message to a client"""
    # Verify client belongs to trainer
    client = db.query(Client).filter(
        Client.id == message.client_id,
        Client.trainer_id == current_trainer.id
    ).first()
    
    if not client:
        raise HTTPException(
            status_code=404,
            detail="Client not found or not authorized"
        )
    
    db_message = Message(
        client_id=message.client_id,
        trainer_id=current_trainer.id,
        content=message.content
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    
    return db_message

@router.get("/client/{client_id}", response_model=List[MessageResponse])
async def get_chat_history(
    client_id: int,
    current_trainer: Trainer = Depends(get_current_trainer),
    db: Session = Depends(get_db)
):
    """Get chat history with a specific client"""
    # Verify client belongs to trainer
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.trainer_id == current_trainer.id
    ).first()
    
    if not client:
        raise HTTPException(
            status_code=404,
            detail="Client not found or not authorized"
        )
    
    messages = db.query(Message).filter(
        Message.client_id == client_id,
        Message.trainer_id == current_trainer.id
    ).order_by(Message.sent_at.desc()).all()
    
    return messages

@router.put("/mark-read/{client_id}")
async def mark_messages_read(
    client_id: int,
    current_trainer: Trainer = Depends(get_current_trainer),
    db: Session = Depends(get_db)
):
    """Mark all messages from a client as read"""
    # Verify client belongs to trainer
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.trainer_id == current_trainer.id
    ).first()
    
    if not client:
        raise HTTPException(
            status_code=404,
            detail="Client not found or not authorized"
        )
    
    db.query(Message).filter(
        Message.client_id == client_id,
        Message.trainer_id == current_trainer.id,
        Message.is_read == False
    ).update({"is_read": True})
    
    db.commit()
    return {"status": "success"}