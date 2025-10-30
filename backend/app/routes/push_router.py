from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from ..database import get_db
from ..models import PushToken, Trainer, Client
from ..utils.auth import get_current_trainer
from pywebpush import webpush, WebPushException
import json
import os

router = APIRouter()

VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY")
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY")
VAPID_CLAIMS = {
    "sub": "mailto:support@fittrackpro.com"
}

class PushTokenCreate(BaseModel):
    token: str
    device_type: str
    client_id: Optional[int]

class PushNotification(BaseModel):
    title: str
    body: str
    client_ids: Optional[List[int]]
    data: Optional[dict]

@router.post("/token")
async def register_push_token(
    token: PushTokenCreate,
    current_trainer: Trainer = Depends(get_current_trainer),
    db: Session = Depends(get_db)
):
    """Register a push notification token"""
    if token.client_id:
        # Verify client belongs to trainer
        client = db.query(Client).filter(
            Client.id == token.client_id,
            Client.trainer_id == current_trainer.id
        ).first()
        if not client:
            raise HTTPException(
                status_code=404,
                detail="Client not found or not authorized"
            )
    
    db_token = PushToken(
        token=token.token,
        device_type=token.device_type,
        client_id=token.client_id,
        trainer_id=None if token.client_id else current_trainer.id
    )
    db.add(db_token)
    db.commit()
    
    return {"status": "registered"}

@router.post("/send")
async def send_push_notification(
    notification: PushNotification,
    current_trainer: Trainer = Depends(get_current_trainer),
    db: Session = Depends(get_db)
):
    """Send push notifications to specific clients or all clients"""
    if notification.client_ids:
        # Send to specific clients
        tokens = db.query(PushToken).filter(
            PushToken.client_id.in_(notification.client_ids)
        ).all()
        
        # Verify all clients belong to trainer
        for token in tokens:
            if token.client and token.client.trainer_id != current_trainer.id:
                raise HTTPException(
                    status_code=403,
                    detail="Not authorized to send notifications to some clients"
                )
    else:
        # Send to all trainer's clients
        tokens = db.query(PushToken).filter(
            PushToken.client_id.in_([c.id for c in current_trainer.clients])
        ).all()
    
    failed_tokens = []
    for token in tokens:
        try:
            webpush(
                subscription_info=json.loads(token.token),
                data=json.dumps({
                    "title": notification.title,
                    "body": notification.body,
                    "data": notification.data or {}
                }),
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims=VAPID_CLAIMS
            )
        except WebPushException as e:
            failed_tokens.append(str(e))
            if "410" in str(e):  # Token expired/invalid
                db.delete(token)
                db.commit()
    
    return {
        "success": len(tokens) - len(failed_tokens),
        "failed": len(failed_tokens),
        "errors": failed_tokens
    }

@router.get("/vapid-public-key")
async def get_vapid_public_key():
    """Get VAPID public key for push notification subscription"""
    if not VAPID_PUBLIC_KEY:
        raise HTTPException(
            status_code=503,
            detail="Push notifications not configured"
        )
    return {"publicKey": VAPID_PUBLIC_KEY}