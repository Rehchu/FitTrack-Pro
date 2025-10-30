from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class MeasurementBase(BaseModel):
    weight: Optional[float] = Field(None, description="Weight in kg")
    chest: Optional[float] = Field(None, description="Chest circumference in cm")
    waist: Optional[float] = Field(None, description="Waist circumference in cm")
    hips: Optional[float] = Field(None, description="Hips circumference in cm")
    biceps_left: Optional[float] = Field(None, description="Left bicep circumference in cm")
    biceps_right: Optional[float] = Field(None, description="Right bicep circumference in cm")
    thigh_left: Optional[float] = Field(None, description="Left thigh circumference in cm")
    thigh_right: Optional[float] = Field(None, description="Right thigh circumference in cm")
    calf_left: Optional[float] = Field(None, description="Left calf circumference in cm")
    calf_right: Optional[float] = Field(None, description="Right calf circumference in cm")
    shoulders: Optional[float] = Field(None, description="Shoulder circumference in cm")
    forearms: Optional[float] = Field(None, description="Forearms circumference in cm")
    body_fat: Optional[float] = Field(None, description="Body fat percentage")
    notes: Optional[str] = None
    photos: Optional[List[str]] = Field(default_factory=list, description="Array of photo URLs")

class MeasurementCreate(MeasurementBase):
    client_id: int
    date: Optional[datetime] = None

class MeasurementUpdate(MeasurementBase):
    pass

class Measurement(MeasurementBase):
    id: int
    client_id: int
    date: datetime

    class Config:
        from_attributes = True

class MeasurementStats(BaseModel):
    start_date: datetime
    end_date: datetime
    weight_change: Optional[float] = None
    body_fat_change: Optional[float] = None
    measurements_change: dict[str, float]
    total_measurements: int
    progress_rating: Optional[str] = None  # "excellent", "good", "fair", "needs_improvement"

    class Config:
        from_attributes = True