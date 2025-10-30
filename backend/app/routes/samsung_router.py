from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from ..database import get_db
from ..utils.auth import get_current_trainer
from .. import models

router = APIRouter()

@router.post('/shealth/webhook')
async def shealth_webhook(request: Request, db: Session = Depends(get_db)):
    """Receive Samsung Health data from an external app or integration.
    This is a lightweight webhook that stores the incoming JSON payload for later processing.
    For a production integration follow S-HealthStack instructions and validate signatures.
    """
    payload = await request.json()

    # If payload contains client identifier, try to associate
    client_id = payload.get('client_id')
    trainer_id = payload.get('trainer_id')

    shealth = models.SHealthData(
        client_id=client_id,
        trainer_id=trainer_id,
        payload=payload
    )
    db.add(shealth)
    db.commit()
    db.refresh(shealth)

    return {"status": "ok", "received_id": shealth.id}

@router.post('/shealth/import_for_client/{client_id}')
async def shealth_import_for_client(client_id: int, request: Request, db: Session = Depends(get_db), current_trainer: models.Trainer = Depends(get_current_trainer)):
    # Trainer can import S-Health data for a client (payload should follow agreed schema)
    client = db.query(models.Client).filter(models.Client.id == client_id, models.Client.trainer_id == current_trainer.id).first()
    if not client:
        raise HTTPException(status_code=404, detail='Client not found')

    payload = await request.json()
    shealth = models.SHealthData(
        client_id=client_id,
        trainer_id=current_trainer.id,
        payload=payload
    )
    db.add(shealth)
    db.commit()
    db.refresh(shealth)
    return {"status": "ok", "id": shealth.id}
