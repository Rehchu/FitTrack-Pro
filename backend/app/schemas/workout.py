from datetime import datetime
from pydantic import BaseModel
from typing import Optional

class WorkoutVideoBase(BaseModel):
    title: str
    description: str
    category_id: str
    difficulty: str
    duration: Optional[float] = None  # in seconds
    thumbnail_url: Optional[str] = None
    video_url: Optional[str] = None

class WorkoutVideoCreate(WorkoutVideoBase):
    pass

class WorkoutVideo(WorkoutVideoBase):
    id: str
    trainer_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class WorkoutCategory(BaseModel):
    id: str
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True