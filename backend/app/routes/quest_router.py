# Quest Templates and Enhanced Milestone Detection
# This file contains pre-generated quest templates and improved auto-detection

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List
from ..database import get_db
from ..models import Quest, Milestone, Achievement, Client, Measurement, Meal
from pydantic import BaseModel

router = APIRouter(prefix="/quests", tags=["quests"])


class QuestTemplate(BaseModel):
    title: str
    description: str
    quest_type: str
    target_value: float | None = None
    target_unit: str | None = None
    reward_achievement: str | None = None
    reward_description: str | None = None
    difficulty: str = "medium"
    xp_reward: int = 100
    icon: str = "🎯"
    category: str = "general"


# ============================================
# PRE-GENERATED QUEST TEMPLATES
# ============================================

QUEST_TEMPLATES = [
    # WEIGHT LOSS QUESTS
    QuestTemplate(
        title="First Steps - Lose 2kg",
        description="Start your journey by losing your first 2kg. Small steps lead to big changes!",
        quest_type="weight_loss",
        target_value=2.0,
        target_unit="kg",
        reward_achievement="First Steps Champion",
        reward_description="You've taken your first steps towards your goal!",
        difficulty="easy",
        xp_reward=50,
        icon="🚶",
        category="weight_loss"
    ),
    QuestTemplate(
        title="Getting Serious - Lose 5kg",
        description="Time to get serious! Lose 5kg and prove your commitment.",
        quest_type="weight_loss",
        target_value=5.0,
        target_unit="kg",
        reward_achievement="Determined Fighter",
        reward_description="Your determination is showing results!",
        difficulty="medium",
        xp_reward=150,
        icon="💪",
        category="weight_loss"
    ),
    QuestTemplate(
        title="Major Milestone - Lose 10kg",
        description="Achieve a major milestone by losing 10kg. This is a game-changer!",
        quest_type="weight_loss",
        target_value=10.0,
        target_unit="kg",
        reward_achievement="Transformation Hero",
        reward_description="You've achieved a major transformation!",
        difficulty="hard",
        xp_reward=300,
        icon="🏆",
        category="weight_loss"
    ),
    QuestTemplate(
        title="Epic Journey - Lose 20kg",
        description="Embark on an epic journey to lose 20kg. This requires true dedication!",
        quest_type="weight_loss",
        target_value=20.0,
        target_unit="kg",
        reward_achievement="Epic Warrior",
        reward_description="You've completed an epic transformation journey!",
        difficulty="epic",
        xp_reward=600,
        icon="👑",
        category="weight_loss"
    ),
    
    # BODY FAT REDUCTION QUESTS
    QuestTemplate(
        title="Lean Machine - Reduce 3% Body Fat",
        description="Reduce your body fat percentage by 3% to become leaner and stronger.",
        quest_type="body_fat",
        target_value=3.0,
        target_unit="%",
        reward_achievement="Lean Machine",
        reward_description="You're getting leaner and meaner!",
        difficulty="medium",
        xp_reward=200,
        icon="⚡",
        category="body_composition"
    ),
    QuestTemplate(
        title="Shredded - Reduce 5% Body Fat",
        description="Get shredded! Reduce body fat by 5% and reveal your hard work.",
        quest_type="body_fat",
        target_value=5.0,
        target_unit="%",
        reward_achievement="Shredded Champion",
        reward_description="You're absolutely shredded!",
        difficulty="hard",
        xp_reward=400,
        icon="🔥",
        category="body_composition"
    ),
    
    # MEASUREMENT QUESTS
    QuestTemplate(
        title="Waist Warrior - Lose 5cm",
        description="Trim your waistline by 5cm. Say goodbye to belly fat!",
        quest_type="waist_reduction",
        target_value=5.0,
        target_unit="cm",
        reward_achievement="Waist Warrior",
        reward_description="Your waistline is looking amazing!",
        difficulty="medium",
        xp_reward=150,
        icon="📏",
        category="measurements"
    ),
    QuestTemplate(
        title="Waist Master - Lose 10cm",
        description="Achieve a 10cm waist reduction. This is serious progress!",
        quest_type="waist_reduction",
        target_value=10.0,
        target_unit="cm",
        reward_achievement="Waist Master",
        reward_description="You've mastered your waistline!",
        difficulty="hard",
        xp_reward=300,
        icon="🎯",
        category="measurements"
    ),
    
    # MEAL TRACKING QUESTS
    QuestTemplate(
        title="Tracking Beginner - 7 Days",
        description="Build the habit! Track your meals for 7 consecutive days.",
        quest_type="meal_streak",
        target_value=7.0,
        target_unit="days",
        reward_achievement="Tracking Rookie",
        reward_description="You've started building a great habit!",
        difficulty="easy",
        xp_reward=75,
        icon="📱",
        category="nutrition"
    ),
    QuestTemplate(
        title="Tracking Pro - 14 Days",
        description="You're getting consistent! Track meals for 14 days straight.",
        quest_type="meal_streak",
        target_value=14.0,
        target_unit="days",
        reward_achievement="Tracking Pro",
        reward_description="Consistency is your superpower!",
        difficulty="medium",
        xp_reward=150,
        icon="📊",
        category="nutrition"
    ),
    QuestTemplate(
        title="Tracking Master - 30 Days",
        description="Master the art of tracking! 30 consecutive days of meal logging.",
        quest_type="meal_streak",
        target_value=30.0,
        target_unit="days",
        reward_achievement="Tracking Master",
        reward_description="You've mastered nutritional awareness!",
        difficulty="hard",
        xp_reward=350,
        icon="🥇",
        category="nutrition"
    ),
    QuestTemplate(
        title="Nutrition Legend - 90 Days",
        description="Become a legend! Track every meal for 90 days. Ultimate dedication!",
        quest_type="meal_streak",
        target_value=90.0,
        target_unit="days",
        reward_achievement="Nutrition Legend",
        reward_description="You are a nutritional tracking legend!",
        difficulty="epic",
        xp_reward=800,
        icon="👑",
        category="nutrition"
    ),
    
    # PROGRESS PHOTO QUESTS
    QuestTemplate(
        title="Photo Tracker - Upload 5 Photos",
        description="Document your journey! Upload 5 progress photos.",
        quest_type="photo_count",
        target_value=5.0,
        target_unit="photos",
        reward_achievement="Visual Tracker",
        reward_description="You're documenting your transformation!",
        difficulty="easy",
        xp_reward=100,
        icon="📸",
        category="progress"
    ),
    QuestTemplate(
        title="Photo Pro - Upload 15 Photos",
        description="Become a photo pro! Upload 15 progress photos to track your journey.",
        quest_type="photo_count",
        target_value=15.0,
        target_unit="photos",
        reward_achievement="Photo Pro",
        reward_description="Your transformation is well documented!",
        difficulty="medium",
        xp_reward=250,
        icon="📷",
        category="progress"
    ),
]


@router.get("/templates", response_model=List[dict])
def get_quest_templates(category: str | None = None):
    """Get all pre-defined quest templates that trainers can assign"""
    templates = QUEST_TEMPLATES
    
    if category:
        templates = [t for t in templates if t.category == category]
    
    return [
        {
            "index": idx,
            "title": t.title,
            "description": t.description,
            "quest_type": t.quest_type,
            "target_value": t.target_value,
            "target_unit": t.target_unit,
            "reward_achievement": t.reward_achievement,
            "reward_description": t.reward_description,
            "difficulty": t.difficulty,
            "xp_reward": t.xp_reward,
            "icon": t.icon,
            "category": t.category
        }
        for idx, t in enumerate(templates)
    ]


@router.get("/templates/categories")
def get_quest_categories():
    """Get all available quest categories with counts"""
    categories = list(set(t.category for t in QUEST_TEMPLATES))
    return {
        "categories": sorted(categories),
        "count": {cat: len([t for t in QUEST_TEMPLATES if t.category == cat]) for cat in categories},
        "total_templates": len(QUEST_TEMPLATES)
    }


class QuestCreate(BaseModel):
    client_id: int
    template_index: int
    deadline_days: int = 30


@router.post("/", response_model=dict)
def create_quest_from_template(quest: QuestCreate, db: Session = Depends(get_db)):
    """Create a new quest for a client from a template"""
    client = db.query(Client).filter(Client.id == quest.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    if quest.template_index >= len(QUEST_TEMPLATES):
        raise HTTPException(status_code=400, detail="Invalid template index")
    
    template = QUEST_TEMPLATES[quest.template_index]
    deadline = datetime.utcnow() + timedelta(days=quest.deadline_days)
    
    new_quest = Quest(
        client_id=quest.client_id,
        trainer_id=client.trainer_id,
        title=template.title,
        description=template.description,
        quest_type=template.quest_type,
        target_value=template.target_value,
        current_value=0.0,
        target_unit=template.target_unit,
        reward_achievement=template.reward_achievement,
        reward_description=template.reward_description,
        deadline=deadline,
        difficulty=template.difficulty,
        xp_reward=template.xp_reward
    )
    
    db.add(new_quest)
    db.commit()
    db.refresh(new_quest)
    
    return {
        "id": new_quest.id,
        "title": new_quest.title,
        "difficulty": new_quest.difficulty,
        "message": "Quest created successfully!"
    }


@router.get("/client/{client_id}", response_model=List[dict])
def get_client_quests(client_id: int, active_only: bool = True, db: Session = Depends(get_db)):
    """Get all quests for a specific client"""
    query = db.query(Quest).filter(Quest.client_id == client_id)
    
    if active_only:
        query = query.filter(Quest.is_active == True, Quest.completed_at == None)
    
    quests = query.order_by(Quest.created_at.desc()).all()
    
    result = []
    for q in quests:
        progress_percentage = 0
        if q.target_value and q.target_value > 0 and q.current_value is not None:
            progress_percentage = min(100, (q.current_value / q.target_value) * 100)
        
        result.append({
            "id": q.id,
            "title": q.title,
            "description": q.description,
            "quest_type": q.quest_type,
            "target_value": q.target_value,
            "current_value": q.current_value,
            "target_unit": q.target_unit,
            "progress_percentage": round(progress_percentage, 1),
            "reward_achievement": q.reward_achievement,
            "reward_description": q.reward_description,
            "created_at": q.created_at.isoformat(),
            "deadline": q.deadline.isoformat() if q.deadline else None,
            "completed_at": q.completed_at.isoformat() if q.completed_at else None,
            "is_active": q.is_active,
            "difficulty": q.difficulty,
            "xp_reward": q.xp_reward,
            "is_completed": q.completed_at is not None
        })
    
    return result


@router.delete("/{quest_id}")
def delete_quest(quest_id: int, db: Session = Depends(get_db)):
    """Delete a quest"""
    quest = db.query(Quest).filter(Quest.id == quest_id).first()
    if not quest:
        raise HTTPException(status_code=404, detail="Quest not found")
    
    db.delete(quest)
    db.commit()
    
    return {"message": "Quest deleted successfully"}


# =============== MILESTONE & ACHIEVEMENT ROUTES ===============

@router.get("/milestones/client/{client_id}", response_model=List[dict])
def get_client_milestones(client_id: int, limit: int = 50, db: Session = Depends(get_db)):
    """Get all milestones for a specific client"""
    milestones = db.query(Milestone)\
        .filter(Milestone.client_id == client_id)\
        .order_by(Milestone.achieved_at.desc())\
        .limit(limit)\
        .all()
    
    return [
        {
            "id": m.id,
            "title": m.title,
            "description": m.description,
            "milestone_type": m.milestone_type,
            "value": m.value,
            "unit": m.unit,
            "achieved_at": m.achieved_at.isoformat(),
            "icon": m.icon,
            "celebration_message": m.celebration_message
        }
        for m in milestones
    ]


@router.get("/achievements/client/{client_id}", response_model=List[dict])
def get_client_achievements(client_id: int, limit: int = 100, db: Session = Depends(get_db)):
    """Get all achievements for a specific client"""
    achievements = db.query(Achievement)\
        .filter(Achievement.client_id == client_id)\
        .order_by(Achievement.awarded_at.desc())\
        .limit(limit)\
        .all()
    
    return [
        {
            "id": a.id,
            "name": a.name,
            "description": a.description,
            "icon": a.icon,
            "category": a.category,
            "awarded_at": a.awarded_at.isoformat()
        }
        for a in achievements
    ]


# =============== ENHANCED AUTO-DETECTION ===============

@router.post("/auto-check/{client_id}")
def auto_check_milestones(client_id: int, db: Session = Depends(get_db)):
    """Enhanced automatic milestone detection with comprehensive tracking"""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    measurements = db.query(Measurement).filter(Measurement.client_id == client_id)\
        .order_by(Measurement.date).all()
    
    if len(measurements) < 2:
        return {"message": "Not enough data for milestone detection", "milestones": [], "quests_updated": 0}
    
    created_milestones = []
    latest = measurements[-1]
    oldest = measurements[0]
    
    # Calculate progress metrics
    weight_lost = (oldest.weight - latest.weight) if (oldest.weight and latest.weight) else 0
    bf_lost = (oldest.body_fat - latest.body_fat) if (oldest.body_fat and latest.body_fat) else 0
    waist_lost = (oldest.waist - latest.waist) if (oldest.waist and latest.waist) else 0
    
    # Get meals for streak calculation
    meals = db.query(Meal).filter(Meal.client_id == client_id).order_by(Meal.date).all()
    dates_logged = set(m.date.date() for m in meals if m.date)
    
    streak_count = 0
    if dates_logged:
        max_date = max(dates_logged)
        current_date = max_date
        while current_date in dates_logged:
            streak_count += 1
            current_date = current_date - timedelta(days=1)
    
    total_photos = sum(len(m.photos) if m.photos else 0 for m in measurements)
    measurement_count = len(measurements)
    
    # ========== CREATE MILESTONES ==========
    
    def create_milestone_if_new(milestone_type, value, title, description, icon, celebration):
        existing = db.query(Milestone).filter(
            Milestone.client_id == client_id,
            Milestone.milestone_type == milestone_type,
            Milestone.value == value
        ).first()
        
        if not existing:
            new_m = Milestone(
                client_id=client_id,
                title=title,
                description=description,
                milestone_type=milestone_type,
                value=value,
                unit="kg" if "weight" in milestone_type else "%" if "fat" in milestone_type else "cm" if "waist" in milestone_type else "days" if "streak" in milestone_type else "photos" if "photo" in milestone_type else "count",
                icon=icon,
                celebration_message=celebration
            )
            db.add(new_m)
            created_milestones.append(title)
            return True
        return False
    
    # Weight loss milestones
    for kg in [2, 5, 10, 15, 20, 25, 30, 40, 50]:
        if weight_lost >= kg:
            icons = {2: "🎯", 5: "💪", 10: "🏆", 15: "⭐", 20: "🌟", 25: "👑", 30: "🔥", 40: "💎", 50: "🏅"}
            create_milestone_if_new(
                "weight_loss", kg,
                f"Lost {kg}kg!",
                f"Amazing progress! You've lost {kg}kg since you started.",
                icons.get(kg, "🎯"),
                f"🎉 Incredible! {kg}kg down! Your hard work is paying off!"
            )
    
    # Body fat milestones
    for pct in [2, 3, 5, 7, 10]:
        if bf_lost >= pct:
            create_milestone_if_new(
                "body_fat_reduction", pct,
                f"Lost {pct}% Body Fat!",
                f"You're getting leaner! Body fat reduced by {pct}%.",
                "⚡",
                f"⚡ Shredded! {pct}% body fat eliminated!"
            )
    
    # Waist milestones
    for cm in [3, 5, 10, 15, 20]:
        if waist_lost >= cm:
            create_milestone_if_new(
                "waist_reduction", cm,
                f"Lost {cm}cm Off Waist!",
                f"Trimmed down! Waist reduced by {cm}cm.",
                "📏",
                f"📏 Amazing! Your waist is {cm}cm smaller!"
            )
    
    # Streak milestones
    for days in [3, 7, 14, 21, 30, 60, 90, 100]:
        if streak_count >= days:
            icons = {3: "🌱", 7: "🔥", 14: "⚡", 21: "💫", 30: "⭐", 60: "🌟", 90: "👑", 100: "🏆"}
            create_milestone_if_new(
                "meal_streak", days,
                f"{days}-Day Streak!",
                f"Consistency wins! {days} days of meal tracking.",
                icons.get(days, "🔥"),
                f"{icons.get(days, '🔥')} On fire! {days} days straight!"
            )
    
    # Photo milestones
    for photos in [5, 10, 20, 30, 50]:
        if total_photos >= photos:
            create_milestone_if_new(
                "photo_count", photos,
                f"{photos} Progress Photos!",
                f"Documented! You've uploaded {photos} progress photos.",
                "📸",
                f"📸 Your transformation is well documented with {photos} photos!"
            )
    
    # Measurement count milestones
    for count in [5, 10, 20, 30, 50, 100]:
        if measurement_count >= count:
            create_milestone_if_new(
                "measurement_count", count,
                f"{count} Measurements Logged!",
                f"Dedication! You've logged {count} total measurements.",
                "📊",
                f"📊 Data master! {count} measurements tracked!"
            )
    
    # ========== UPDATE ACTIVE QUESTS ==========
    active_quests = db.query(Quest).filter(
        Quest.client_id == client_id,
        Quest.is_active == True,
        Quest.completed_at == None
    ).all()
    
    for quest in active_quests:
        if quest.quest_type == "weight_loss":
            quest.current_value = weight_lost
        elif quest.quest_type == "body_fat":
            quest.current_value = bf_lost
        elif quest.quest_type == "waist_reduction":
            quest.current_value = waist_lost
        elif quest.quest_type == "meal_streak":
            quest.current_value = streak_count
        elif quest.quest_type == "photo_count":
            quest.current_value = total_photos
        
        # Check completion
        if quest.target_value and quest.current_value >= quest.target_value:
            quest.completed_at = datetime.utcnow()
            quest.is_active = False
            
            if quest.reward_achievement:
                achievement = Achievement(
                    client_id=quest.client_id,
                    name=quest.reward_achievement,
                    description=quest.reward_description or f"Completed: {quest.title}",
                    icon="🏆",
                    category=quest.quest_type
                )
                db.add(achievement)
            
            milestone = Milestone(
                client_id=quest.client_id,
                title=f"Quest Complete: {quest.title}",
                description=quest.description,
                milestone_type=f"{quest.quest_type}_quest",
                value=quest.target_value,
                unit=quest.target_unit,
                icon="✅",
                celebration_message=f"🎉 Quest Completed! {quest.title}!"
            )
            db.add(milestone)
            created_milestones.append(f"Quest: {quest.title}")
    
    db.commit()
    
    return {
        "message": f"Auto-check complete. Created {len(created_milestones)} new milestones/updates.",
        "milestones": created_milestones,
        "quests_updated": len(active_quests),
        "stats": {
            "weight_lost": round(weight_lost, 1),
            "body_fat_lost": round(bf_lost, 1),
            "waist_lost": round(waist_lost, 1),
            "current_streak": streak_count,
            "total_photos": total_photos,
            "total_measurements": measurement_count
        }
    }
