from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class TrainerBase(BaseModel):
    name: str
    email: EmailStr

class TrainerCreate(TrainerBase):
    password: str

class TrainerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None

class TrainerResponse(TrainerBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True