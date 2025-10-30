"""
Trainer Dashboard Analytics Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from ..database import get_db
from ..models import Trainer, Client, Workout, Achievement, Quest, Measurement
from datetime import datetime, timedelta
from typing import Dict, Any

router = APIRouter(prefix="/trainers", tags=["trainer-analytics"])


@router.get("/{trainer_id}/dashboard")
def get_trainer_dashboard(trainer_id: int, db: Session = Depends(get_db)):
    """
    Get comprehensive dashboard analytics for a trainer
    """
    trainer = db.query(Trainer).filter(Trainer.id == trainer_id).first()
    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")
    
    # Total clients
    total_clients = db.query(Client).filter(Client.trainer_id == trainer_id).count()
    
    # Active quests (not completed)
    active_quests = db.query(Quest)\
        .join(Client)\
        .filter(Client.trainer_id == trainer_id)\
        .filter(Quest.is_active == True)\
        .filter(Quest.completed_at == None)\
        .count()
    
    # Recent achievements (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    recent_achievements = db.query(Achievement)\
        .join(Client)\
        .filter(Client.trainer_id == trainer_id)\
        .filter(Achievement.awarded_at >= thirty_days_ago)\
        .count()
    
    # Completed workouts (last 30 days)
    completed_workouts_30d = db.query(Workout)\
        .join(Client)\
        .filter(Client.trainer_id == trainer_id)\
        .filter(Workout.completed_at >= thirty_days_ago)\
        .count()
    
    # Average client progress (based on measurements)
    avg_weight_loss = db.query(func.avg(
        db.query(
            (func.max(Measurement.weight) - func.min(Measurement.weight))
        ).filter(Measurement.client_id == Client.id)
        .scalar_subquery()
    )).filter(Client.trainer_id == trainer_id).scalar() or 0
    
    # Client list with quick stats
    clients = db.query(Client).filter(Client.trainer_id == trainer_id).all()
    client_stats = []
    
    for client in clients:
        # Latest measurement
        latest_measurement = db.query(Measurement)\
            .filter(Measurement.client_id == client.id)\
            .order_by(desc(Measurement.date))\
            .first()
        
        # Workout count
        workout_count = db.query(Workout)\
            .filter(Workout.client_id == client.id)\
            .filter(Workout.completed_at != None)\
            .count()
        
        # Active quests
        client_active_quests = db.query(Quest)\
            .filter(Quest.client_id == client.id)\
            .filter(Quest.is_active == True)\
            .count()
        
        # Achievement count
        achievement_count = db.query(Achievement)\
            .filter(Achievement.client_id == client.id)\
            .count()
        
        client_stats.append({
            "id": client.id,
            "name": client.name,
            "email": client.email,
            "current_weight": latest_measurement.weight if latest_measurement else None,
            "workout_count": workout_count,
            "active_quests": client_active_quests,
            "achievements": achievement_count,
            "last_measurement": latest_measurement.date.isoformat() if latest_measurement else None
        })
    
    # Recent activity feed (last 20 activities)
    recent_workouts = db.query(Workout)\
        .join(Client)\
        .filter(Client.trainer_id == trainer_id)\
        .filter(Workout.completed_at != None)\
        .order_by(desc(Workout.completed_at))\
        .limit(10)\
        .all()
    
    recent_achievements_list = db.query(Achievement)\
        .join(Client)\
        .filter(Client.trainer_id == trainer_id)\
        .order_by(desc(Achievement.awarded_at))\
        .limit(10)\
        .all()
    
    activity_feed = []
    
    for workout in recent_workouts:
        activity_feed.append({
            "type": "workout",
            "client_name": workout.client.name,
            "client_id": workout.client.id,
            "title": workout.title,
            "timestamp": workout.completed_at.isoformat(),
            "icon": "💪"
        })
    
    for achievement in recent_achievements_list:
        activity_feed.append({
            "type": "achievement",
            "client_name": achievement.client.name,
            "client_id": achievement.client.id,
            "title": achievement.name,
            "description": achievement.description,
            "timestamp": achievement.awarded_at.isoformat(),
            "icon": achievement.icon or "🏆"
        })
    
    # Sort activity feed by timestamp
    activity_feed.sort(key=lambda x: x['timestamp'], reverse=True)
    activity_feed = activity_feed[:20]  # Limit to 20 most recent
    
    return {
        "trainer": {
            "id": trainer.id,
            "name": trainer.name,
            "email": trainer.email
        },
        "metrics": {
            "total_clients": total_clients,
            "active_quests": active_quests,
            "recent_achievements": recent_achievements,
            "completed_workouts_30d": completed_workouts_30d,
            "avg_weight_loss": round(avg_weight_loss, 2) if avg_weight_loss else 0
        },
        "clients": client_stats,
        "activity_feed": activity_feed
    }
