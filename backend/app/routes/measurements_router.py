from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta
from ..database import get_db
from ..models import Measurement, Client, Trainer
from ..schemas.measurements import (
    MeasurementCreate,
    MeasurementUpdate,
    Measurement as MeasurementSchema,
    MeasurementStats
)
from ..utils.auth import get_current_trainer
import os
import aiofiles
import uuid
from fastapi.responses import JSONResponse

router = APIRouter()

PHOTOS_DIR = "uploads/measurement_photos"
os.makedirs(PHOTOS_DIR, exist_ok=True)

def calculate_progress_rating(changes: dict) -> str:
    """Calculate progress rating based on measurements changes"""
    positive_changes = sum(1 for change in changes.values() if change < 0)  # negative change is good for most measurements
    total_changes = len(changes)
    
    if total_changes == 0:
        return None
    
    ratio = positive_changes / total_changes
    if ratio >= 0.8:
        return "excellent"
    elif ratio >= 0.6:
        return "good"
    elif ratio >= 0.4:
        return "fair"
    else:
        return "needs_improvement"

@router.post("/{client_id}/measurements", response_model=MeasurementSchema)
async def create_measurement(
    client_id: int,
    measurement: MeasurementCreate,
    photos: List[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_trainer: Trainer = Depends(get_current_trainer)
):
    # Verify client belongs to trainer
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.trainer_id == current_trainer.id
    ).first()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Handle photo uploads
    photo_urls = []
    if photos:
        for photo in photos:
            if not photo.content_type.startswith('image/'):
                raise HTTPException(status_code=400, detail="File must be an image")
            
            # Generate unique filename
            ext = os.path.splitext(photo.filename)[1]
            filename = f"{uuid.uuid4()}{ext}"
            filepath = os.path.join(PHOTOS_DIR, filename)
            
            # Save photo
            async with aiofiles.open(filepath, 'wb') as out_file:
                content = await photo.read()
                await out_file.write(content)
            
            photo_urls.append(f"/uploads/measurement_photos/{filename}")

    # Create measurement
    db_measurement = Measurement(
        client_id=client_id,
        date=measurement.date or datetime.utcnow(),
        photos=photo_urls,
        **measurement.model_dump(exclude={'client_id', 'date'})
    )
    
    db.add(db_measurement)
    db.commit()
    db.refresh(db_measurement)
    return db_measurement

@router.get("/{client_id}/measurements", response_model=List[MeasurementSchema])
async def get_measurements(
    client_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_trainer: Trainer = Depends(get_current_trainer)
):
    # Verify client belongs to trainer
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.trainer_id == current_trainer.id
    ).first()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    measurements = db.query(Measurement).filter(
        Measurement.client_id == client_id
    ).order_by(Measurement.date.desc()).offset(skip).limit(limit).all()
    
    return measurements

@router.get("/{client_id}/measurements/{measurement_id}", response_model=MeasurementSchema)
async def get_measurement(
    client_id: int,
    measurement_id: int,
    db: Session = Depends(get_db),
    current_trainer: Trainer = Depends(get_current_trainer)
):
    # Verify client belongs to trainer
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.trainer_id == current_trainer.id
    ).first()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    measurement = db.query(Measurement).filter(
        Measurement.id == measurement_id,
        Measurement.client_id == client_id
    ).first()
    
    if not measurement:
        raise HTTPException(status_code=404, detail="Measurement not found")
    
    return measurement

@router.put("/{client_id}/measurements/{measurement_id}", response_model=MeasurementSchema)
async def update_measurement(
    client_id: int,
    measurement_id: int,
    measurement: MeasurementUpdate,
    db: Session = Depends(get_db),
    current_trainer: Trainer = Depends(get_current_trainer)
):
    # Verify client belongs to trainer
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.trainer_id == current_trainer.id
    ).first()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    db_measurement = db.query(Measurement).filter(
        Measurement.id == measurement_id,
        Measurement.client_id == client_id
    ).first()
    
    if not db_measurement:
        raise HTTPException(status_code=404, detail="Measurement not found")
    
    # Update measurement
    for key, value in measurement.model_dump(exclude_unset=True).items():
        setattr(db_measurement, key, value)
    
    db.commit()
    db.refresh(db_measurement)
    return db_measurement

@router.get("/{client_id}/measurements/stats", response_model=MeasurementStats)
async def get_measurement_stats(
    client_id: int,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_trainer: Trainer = Depends(get_current_trainer)
):
    # Verify client belongs to trainer
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.trainer_id == current_trainer.id
    ).first()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Set default date range if not provided
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    # Get measurements within date range
    measurements = db.query(Measurement).filter(
        Measurement.client_id == client_id,
        Measurement.date.between(start_date, end_date)
    ).order_by(Measurement.date).all()

    if not measurements:
        return JSONResponse(
            status_code=404,
            content={"detail": "No measurements found in the specified date range"}
        )

    first_measurement = measurements[0]
    last_measurement = measurements[-1]

    # Calculate changes
    changes = {}
    numeric_fields = ['weight', 'chest', 'waist', 'hips', 'body_fat']
    
    for field in numeric_fields:
        old_value = getattr(first_measurement, field)
        new_value = getattr(last_measurement, field)
        if old_value is not None and new_value is not None:
            changes[field] = new_value - old_value

    # Calculate stats
    stats = MeasurementStats(
        start_date=start_date,
        end_date=end_date,
        weight_change=changes.get('weight'),
        body_fat_change=changes.get('body_fat'),
        measurements_change=changes,
        total_measurements=len(measurements),
        progress_rating=calculate_progress_rating(changes)
    )

    return stats