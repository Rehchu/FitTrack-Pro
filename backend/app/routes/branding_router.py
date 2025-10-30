from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, status
from sqlalchemy.orm import Session
from typing import Optional, Dict
from pydantic import BaseModel, HttpUrl
from ..database import get_db
from ..models import BrandingConfig, Trainer
from ..utils.auth import get_current_trainer

router = APIRouter()

class BrandingUpdate(BaseModel):
    business_name: Optional[str]
    primary_color: Optional[str]
    secondary_color: Optional[str]
    custom_domain: Optional[str]
    custom_styles: Optional[Dict[str, str]]

class BrandingResponse(BaseModel):
    business_name: str
    logo_url: Optional[str]
    primary_color: str
    secondary_color: str
    custom_domain: Optional[str]
    custom_styles: Optional[Dict[str, str]]

    class Config:
        orm_mode = True

@router.get("/", response_model=BrandingResponse)
async def get_branding(
    current_trainer: Trainer = Depends(get_current_trainer),
    db: Session = Depends(get_db)
):
    """Get trainer's branding configuration"""
    branding = current_trainer.branding_config
    if not branding:
        # Create default branding if none exists
        branding = BrandingConfig(
            trainer_id=current_trainer.id,
            business_name=f"{current_trainer.name}'s Training",
            primary_color="#4A90E2",
            secondary_color="#F5A623"
        )
        db.add(branding)
        db.commit()
        db.refresh(branding)
    
    return branding

@router.put("/", response_model=BrandingResponse)
async def update_branding(
    branding: BrandingUpdate,
    current_trainer: Trainer = Depends(get_current_trainer),
    db: Session = Depends(get_db)
):
    """Update trainer's branding configuration"""
    db_branding = current_trainer.branding_config
    if not db_branding:
        raise HTTPException(status_code=404, detail="Branding config not found")
    
    for key, value in branding.dict(exclude_unset=True).items():
        setattr(db_branding, key, value)
    
    db.commit()
    db.refresh(db_branding)
    return db_branding

@router.post("/logo", response_model=BrandingResponse)
async def upload_logo(
    file: UploadFile = File(...),
    current_trainer: Trainer = Depends(get_current_trainer),
    db: Session = Depends(get_db)
):
    """Upload trainer's business logo"""
    # Verify file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=400,
            detail="File must be an image"
        )
    
    # Save file and update logo URL
    file_path = f"static/logos/{current_trainer.id}_{file.filename}"
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    db_branding = current_trainer.branding_config
    if not db_branding:
        raise HTTPException(status_code=404, detail="Branding config not found")
    
    db_branding.logo_url = f"/static/logos/{current_trainer.id}_{file.filename}"
    db.commit()
    db.refresh(db_branding)
    
    return db_branding

@router.post("/preview")
async def generate_preview(
    branding: BrandingUpdate,
    current_trainer: Trainer = Depends(get_current_trainer)
):
    """Generate preview of branding changes"""
    # This would typically generate preview images or return
    # a temporary URL where the preview can be viewed
    preview_data = {
        "mobile_app": f"/preview/mobile/{current_trainer.id}",
        "web_portal": f"/preview/web/{current_trainer.id}",
        "email_template": f"/preview/email/{current_trainer.id}"
    }
    return preview_data