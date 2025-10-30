from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import WorkoutVideo, WorkoutCategory, Trainer
from ..schemas.workout import WorkoutVideoCreate, WorkoutVideo as WorkoutVideoSchema, WorkoutCategory as WorkoutCategorySchema
from ..utils.auth import get_current_trainer
import os
import aiofiles
import uuid
from datetime import datetime
import asyncio
import subprocess

router = APIRouter()

UPLOAD_DIR = "uploads/workout_videos"
THUMBNAIL_DIR = "uploads/thumbnails"

# Ensure upload directories exist
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(THUMBNAIL_DIR, exist_ok=True)

async def generate_thumbnail(video_path: str, thumbnail_path: str):
    """Generate thumbnail from video using ffmpeg"""
    try:
        cmd = [
            'ffmpeg', '-i', video_path,
            '-ss', '00:00:01',  # Take frame from 1 second in
            '-vframes', '1',
            '-vf', 'scale=480:-1',  # Resize to 480p width, maintain aspect ratio
            thumbnail_path
        ]
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        await process.communicate()
        
        if process.returncode != 0:
            raise Exception("Failed to generate thumbnail")
            
    except Exception as e:
        print(f"Error generating thumbnail: {str(e)}")
        raise

@router.post("/categories/", response_model=WorkoutCategorySchema)
async def create_category(
    name: str,
    description: str = None,
    db: Session = Depends(get_db),
    current_trainer: Trainer = Depends(get_current_trainer)
):
    category = WorkoutCategory(name=name, description=description)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category

@router.get("/categories/", response_model=List[WorkoutCategorySchema])
async def list_categories(
    db: Session = Depends(get_db),
    current_trainer: Trainer = Depends(get_current_trainer)
):
    return db.query(WorkoutCategory).all()

@router.post("/videos/", response_model=WorkoutVideoSchema)
async def upload_workout_video(
    video: UploadFile = File(...),
    title: str = Form(...),
    description: str = Form(...),
    category_id: int = Form(...),
    difficulty: str = Form(...),
    db: Session = Depends(get_db),
    current_trainer: Trainer = Depends(get_current_trainer)
):
    # Validate video file
    if not video.content_type.startswith('video/'):
        raise HTTPException(status_code=400, detail="File must be a video")

    # Generate unique filename
    video_filename = f"{uuid.uuid4()}{os.path.splitext(video.filename)[1]}"
    video_path = os.path.join(UPLOAD_DIR, video_filename)
    
    # Save video file
    async with aiofiles.open(video_path, 'wb') as out_file:
        content = await video.read()
        await out_file.write(content)

    # Generate thumbnail
    thumbnail_filename = f"{uuid.uuid4()}.jpg"
    thumbnail_path = os.path.join(THUMBNAIL_DIR, thumbnail_filename)
    await generate_thumbnail(video_path, thumbnail_path)

    # Create database entry
    video_url = f"/uploads/workout_videos/{video_filename}"
    thumbnail_url = f"/uploads/thumbnails/{thumbnail_filename}"
    
    db_video = WorkoutVideo(
        trainer_id=current_trainer.id,
        category_id=category_id,
        title=title,
        description=description,
        video_url=video_url,
        thumbnail_url=thumbnail_url,
        difficulty=difficulty
    )
    
    db.add(db_video)
    db.commit()
    db.refresh(db_video)
    return db_video

@router.get("/videos/", response_model=List[WorkoutVideoSchema])
async def list_workout_videos(
    category_id: int = None,
    difficulty: str = None,
    db: Session = Depends(get_db),
    current_trainer: Trainer = Depends(get_current_trainer)
):
    query = db.query(WorkoutVideo).filter(
        WorkoutVideo.trainer_id == current_trainer.id
    )
    
    if category_id:
        query = query.filter(WorkoutVideo.category_id == category_id)
    if difficulty:
        query = query.filter(WorkoutVideo.difficulty == difficulty)
        
    return query.order_by(WorkoutVideo.created_at.desc()).all()

@router.get("/videos/{video_id}", response_model=WorkoutVideoSchema)
async def get_workout_video(
    video_id: int,
    db: Session = Depends(get_db),
    current_trainer: Trainer = Depends(get_current_trainer)
):
    video = db.query(WorkoutVideo).filter(
        WorkoutVideo.id == video_id,
        WorkoutVideo.trainer_id == current_trainer.id
    ).first()
    
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    return video

@router.delete("/videos/{video_id}")
async def delete_workout_video(
    video_id: int,
    db: Session = Depends(get_db),
    current_trainer: Trainer = Depends(get_current_trainer)
):
    video = db.query(WorkoutVideo).filter(
        WorkoutVideo.id == video_id,
        WorkoutVideo.trainer_id == current_trainer.id
    ).first()
    
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Delete files
    try:
        if video.video_url:
            video_path = os.path.join(".", video.video_url.lstrip('/'))
            if os.path.exists(video_path):
                os.remove(video_path)
                
        if video.thumbnail_url:
            thumbnail_path = os.path.join(".", video.thumbnail_url.lstrip('/'))
            if os.path.exists(thumbnail_path):
                os.remove(thumbnail_path)
    except Exception as e:
        print(f"Error deleting files: {str(e)}")
    
    # Delete database entry
    db.delete(video)
    db.commit()
    
    return {"status": "success"}