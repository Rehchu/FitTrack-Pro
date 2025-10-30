from typing import Optional, List, Dict
from pydantic import BaseModel, Field
from datetime import datetime

class MealItemBase(BaseModel):
    name: str
    quantity: float = Field(1.0, description="Quantity of the item")
    unit: Optional[str] = None
    calories: Optional[float] = None
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fat: Optional[float] = None
    fiber: Optional[float] = None
    sodium: Optional[float] = None
    raw_data: Optional[Dict] = None

class MealItemCreate(MealItemBase):
    pass

class MealItem(MealItemBase):
    id: int

    class Config:
        from_attributes = True

class MealBase(BaseModel):
    name: str
    date: Optional[datetime] = None
    notes: Optional[str] = None
    total_nutrients: Optional[Dict[str, float]] = None

class MealCreate(MealBase):
    client_id: int
    items: List[MealItemCreate] = Field(default_factory=list)

class MealUpdate(MealBase):
    items: Optional[List[MealItemCreate]] = None

class Meal(MealBase):
    id: int
    client_id: int
    trainer_id: Optional[int] = None
    meal_plan_id: Optional[int] = None
    items: List[MealItem] = Field(default_factory=list)

    class Config:
        from_attributes = True

class MealPlanBase(BaseModel):
    title: str
    content: Optional[str] = None
    nutrients: Optional[Dict[str, float]] = None

class MealPlanCreate(MealPlanBase):
    client_id: int
    created_by_trainer_id: Optional[int] = None

class MealPlanUpdate(MealPlanBase):
    pass

class MealPlan(MealPlanBase):
    id: int
    client_id: int
    created_by_trainer_id: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
