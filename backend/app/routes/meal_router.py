from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..utils.auth import get_current_trainer
from .. import models
from ..schemas.meal import (
    MealCreate,
    Meal,
    MealItemCreate,
    MealPlanCreate,
    MealPlan
)
from ..utils import nutrition

router = APIRouter()

@router.post("/{client_id}/meals", response_model=Meal)
async def create_meal(client_id: int, payload: MealCreate, db: Session = Depends(get_db), current_trainer: models.Trainer = Depends(get_current_trainer)):
    # verify client belongs to trainer
    client = db.query(models.Client).filter(models.Client.id == client_id, models.Client.trainer_id == current_trainer.id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # build meal
    meal = models.Meal(
        client_id=client_id,
        trainer_id=current_trainer.id,
        meal_plan_id=payload.meal_plan_id if hasattr(payload, 'meal_plan_id') else None,
        name=payload.name,
        date=payload.date or None,
        notes=payload.notes
    )
    # compute total nutrients if provided
    total = payload.total_nutrients or {}

    db.add(meal)
    db.commit()
    db.refresh(meal)

    # add items
    item_objs = []
    for item in payload.items:
        item_obj = models.MealItem(
            meal_id=meal.id,
            name=item.name,
            quantity=item.quantity,
            unit=item.unit,
            calories=item.calories,
            protein=item.protein,
            carbs=item.carbs,
            fat=item.fat,
            fiber=item.fiber,
            sodium=item.sodium,
            raw_data=item.raw_data
        )
        db.add(item_obj)
        item_objs.append(item_obj)

    db.commit()

    # aggregate nutrients if not provided
    if not total:
        agg = {}
        for it in item_objs:
            agg['calories'] = agg.get('calories', 0) + (it.calories or 0)
            agg['protein'] = agg.get('protein', 0) + (it.protein or 0)
            agg['carbs'] = agg.get('carbs', 0) + (it.carbs or 0)
            agg['fat'] = agg.get('fat', 0) + (it.fat or 0)
            agg['fiber'] = agg.get('fiber', 0) + (it.fiber or 0)
            agg['sodium'] = agg.get('sodium', 0) + (it.sodium or 0)
        meal.total_nutrients = agg
        db.add(meal)
        db.commit()
        db.refresh(meal)

    return meal

@router.get("/{client_id}/meals", response_model=List[Meal])
async def list_meals(client_id: int, db: Session = Depends(get_db), current_trainer: models.Trainer = Depends(get_current_trainer)):
    client = db.query(models.Client).filter(models.Client.id == client_id, models.Client.trainer_id == current_trainer.id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    meals = db.query(models.Meal).filter(models.Meal.client_id == client_id).order_by(models.Meal.date.desc()).all()
    return meals

@router.get("/{client_id}/meals/{meal_id}", response_model=Meal)
async def get_meal(client_id: int, meal_id: int, db: Session = Depends(get_db), current_trainer: models.Trainer = Depends(get_current_trainer)):
    client = db.query(models.Client).filter(models.Client.id == client_id, models.Client.trainer_id == current_trainer.id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    meal = db.query(models.Meal).filter(models.Meal.id == meal_id, models.Meal.client_id == client_id).first()
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")
    return meal

@router.post("/meal-plans", response_model=MealPlan)
async def create_meal_plan(payload: MealPlanCreate, db: Session = Depends(get_db), current_trainer: models.Trainer = Depends(get_current_trainer)):
    # allow trainer to create plan for a client
    client = db.query(models.Client).filter(models.Client.id == payload.client_id, models.Client.trainer_id == current_trainer.id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    plan = models.MealPlan(
        client_id=payload.client_id,
        title=payload.title,
        content=payload.content,
        created_by_trainer_id=current_trainer.id,
        nutrients=payload.nutrients
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan

@router.post('/nutrition/search')
async def nutrition_search(query: dict):
    q = query.get('q') if isinstance(query, dict) else None
    if not q:
        raise HTTPException(status_code=400, detail='Missing query parameter q')
    results = nutrition.search_food(q)
    return {'results': results}

@router.post('/nutrition/details')
async def nutrition_details(payload: dict):
    """Get detailed nutrition information for a specific food item."""
    food_name = payload.get('name')
    source = payload.get('source', 'usda')
    food_id = payload.get('id')
    
    if not food_name:
        raise HTTPException(status_code=400, detail='Missing food name')
    
    result = nutrition.get_nutrition_details(food_name, source, food_id)
    if result is None:
        raise HTTPException(status_code=503, detail='Nutrition service unavailable')
    return result

@router.post('/nutrition/natural')
async def nutrition_natural(payload: dict):
    """Legacy endpoint - now uses search_food for compatibility."""
    text = payload.get('text') if isinstance(payload, dict) else None
    if not text:
        raise HTTPException(status_code=400, detail='Missing text')
    
    # Use the new search function
    results = nutrition.search_food(text)
    
    # Return in a format similar to the old API for compatibility
    if results:
        return {
            'foods': results,
            'total_nutrients': {
                'calories': sum(r.get('nutrients', {}).get('calories', 0) for r in results if 'nutrients' in r),
                'protein': sum(r.get('nutrients', {}).get('protein', 0) for r in results if 'nutrients' in r),
                'carbs': sum(r.get('nutrients', {}).get('carbs', 0) for r in results if 'nutrients' in r),
                'fat': sum(r.get('nutrients', {}).get('fat', 0) for r in results if 'nutrients' in r),
            }
        }
    return {'foods': [], 'total_nutrients': {}}

