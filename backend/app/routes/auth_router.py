from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from ..database import get_db
from ..models import Trainer
from ..utils.auth import verify_password, create_access_token

router = APIRouter()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    token: str
    user: dict


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Minimal trainer login returning a JWT and basic user info.

    This is intentionally simple to support the fresh rebuild smoke test:
    - Looks up a Trainer by email
    - Verifies password using passlib bcrypt
    - Returns JWT token with `sub` = trainer.id
    """
    trainer = db.query(Trainer).filter(Trainer.email == payload.email).first()
    if not trainer or not verify_password(payload.password, trainer.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": trainer.id})
    return {
        "token": token,
        "user": {
            "id": trainer.id,
            "name": trainer.name,
            "email": trainer.email,
        },
    }
