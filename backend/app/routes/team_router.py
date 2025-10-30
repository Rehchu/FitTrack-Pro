from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from ..database import get_db
from ..models import Team, Trainer, Client
from ..utils.auth import get_current_trainer

router = APIRouter()

class TeamCreate(BaseModel):
    name: str
    description: Optional[str]

class TeamUpdate(BaseModel):
    name: Optional[str]
    description: Optional[str]

class TeamResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    trainer_count: int
    client_count: int

    class Config:
        orm_mode = True

@router.post("/", response_model=TeamResponse)
async def create_team(
    team: TeamCreate,
    current_trainer: Trainer = Depends(get_current_trainer),
    db: Session = Depends(get_db)
):
    """Create a new trainer team"""
    db_team = Team(
        name=team.name,
        description=team.description
    )
    db_team.trainers.append(current_trainer)
    
    db.add(db_team)
    db.commit()
    db.refresh(db_team)
    
    return {
        **db_team.__dict__,
        "trainer_count": len(db_team.trainers),
        "client_count": len(db_team.clients)
    }

@router.get("/", response_model=List[TeamResponse])
async def list_teams(
    current_trainer: Trainer = Depends(get_current_trainer),
    db: Session = Depends(get_db)
):
    """List all teams the trainer is part of"""
    teams = current_trainer.teams
    return [
        {
            **team.__dict__,
            "trainer_count": len(team.trainers),
            "client_count": len(team.clients)
        }
        for team in teams
    ]

@router.put("/{team_id}", response_model=TeamResponse)
async def update_team(
    team_id: int,
    team_update: TeamUpdate,
    current_trainer: Trainer = Depends(get_current_trainer),
    db: Session = Depends(get_db)
):
    """Update team details"""
    db_team = db.query(Team).filter(Team.id == team_id).first()
    if not db_team or current_trainer not in db_team.trainers:
        raise HTTPException(
            status_code=404,
            detail="Team not found or not authorized"
        )
    
    for key, value in team_update.dict(exclude_unset=True).items():
        setattr(db_team, key, value)
    
    db.commit()
    db.refresh(db_team)
    
    return {
        **db_team.__dict__,
        "trainer_count": len(db_team.trainers),
        "client_count": len(db_team.clients)
    }

@router.post("/{team_id}/trainers/{trainer_id}")
async def add_trainer_to_team(
    team_id: int,
    trainer_id: int,
    current_trainer: Trainer = Depends(get_current_trainer),
    db: Session = Depends(get_db)
):
    """Add a trainer to the team"""
    db_team = db.query(Team).filter(Team.id == team_id).first()
    if not db_team or current_trainer not in db_team.trainers:
        raise HTTPException(
            status_code=404,
            detail="Team not found or not authorized"
        )
    
    new_trainer = db.query(Trainer).filter(Trainer.id == trainer_id).first()
    if not new_trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")
    
    if new_trainer in db_team.trainers:
        raise HTTPException(
            status_code=400,
            detail="Trainer already in team"
        )
    
    db_team.trainers.append(new_trainer)
    db.commit()
    
    return {"status": "added"}

@router.delete("/{team_id}/trainers/{trainer_id}")
async def remove_trainer_from_team(
    team_id: int,
    trainer_id: int,
    current_trainer: Trainer = Depends(get_current_trainer),
    db: Session = Depends(get_db)
):
    """Remove a trainer from the team"""
    db_team = db.query(Team).filter(Team.id == team_id).first()
    if not db_team or current_trainer not in db_team.trainers:
        raise HTTPException(
            status_code=404,
            detail="Team not found or not authorized"
        )
    
    if len(db_team.trainers) == 1:
        raise HTTPException(
            status_code=400,
            detail="Cannot remove last trainer from team"
        )
    
    trainer_to_remove = db.query(Trainer).filter(Trainer.id == trainer_id).first()
    if not trainer_to_remove or trainer_to_remove not in db_team.trainers:
        raise HTTPException(
            status_code=404,
            detail="Trainer not found in team"
        )
    
    db_team.trainers.remove(trainer_to_remove)
    db.commit()
    
    return {"status": "removed"}