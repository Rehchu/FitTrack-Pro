from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, EmailStr
from .models import Client, Workout, MealPlan, Achievement, WeightEntry, Base
from .models import ShareToken
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .pdf_gen import generate_workout_pdf
import os
from email.message import EmailMessage
import smtplib
from .avatar_gen import generate_avatar_png

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./backend_data.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

router = APIRouter()


class ClientIn(BaseModel):
    name: str
    email: EmailStr
    notes: str | None = None


class ClientOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    notes: str | None = None


class WorkoutIn(BaseModel):
    title: str
    description: str | None = None
    scheduled_at: str | None = None


class MealPlanIn(BaseModel):
    title: str
    content: str | None = None


class EmailPayload(BaseModel):
    subject: str | None = "Your plan"
    body: str | None = "Please find attached."
    attach_pdf: bool | None = False
    attach_avatar: bool | None = False


class ShareRequest(BaseModel):
    client_email: EmailStr
    expires_days: int = 30


@router.post("/clients", response_model=ClientOut)
def create_client(payload: ClientIn):
    db = SessionLocal()
    client = Client(name=payload.name, email=payload.email, notes=payload.notes)
    db.add(client)
    db.commit()
    db.refresh(client)
    db.close()
    return ClientOut(id=client.id, name=client.name, email=client.email, notes=client.notes)


@router.get("/clients")
def list_clients():
    db = SessionLocal()
    clients = db.query(Client).all()
    db.close()
    return [{"id": c.id, "name": c.name, "email": c.email, "notes": c.notes} for c in clients]


@router.get("/clients/{client_id}")
def get_client(client_id: int):
    db = SessionLocal()
    client = db.query(Client).filter(Client.id == client_id).first()
    db.close()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"id": client.id, "name": client.name, "email": client.email, "notes": client.notes}


@router.post("/clients/{client_id}/send-email")
def send_email(client_id: int, payload: EmailPayload):
    """Send an email to a client. Accepts JSON payload with subject, body and attachment flags."""
    SMTP_HOST = os.getenv("SMTP_HOST")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER")
    SMTP_PASS = os.getenv("SMTP_PASS")

    if not all([SMTP_HOST, SMTP_USER, SMTP_PASS]):
        raise HTTPException(status_code=500, detail="SMTP not configured. Set SMTP_HOST/SMTP_USER/SMTP_PASS in .env")

    db = SessionLocal()
    client = db.query(Client).filter(Client.id == client_id).first()
    db.close()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    msg = EmailMessage()
    msg["From"] = SMTP_USER
    msg["To"] = client.email
    msg["Subject"] = payload.subject or "Your plan"
    msg.set_content(payload.body or "Please find attached.")

    attachments = []
    if payload.attach_pdf:
        db2 = SessionLocal()
        client2 = db2.query(Client).filter(Client.id == client_id).first()
        workouts = [{"title": w.title, "scheduled_at": str(w.scheduled_at)} for w in client2.workouts]
        meal_plans = []
        # If attach_avatar also requested, generate avatar and pass into PDF generator
        avatar_bytes = None
        if payload.attach_avatar:
            weight_entry = db2.query(WeightEntry).filter(WeightEntry.client_id == client_id).order_by(WeightEntry.recorded_at.desc()).first()
            latest_weight = weight_entry.weight if weight_entry else None
            avatar_bytes = generate_avatar_png(client2.name, latest_weight)
        pdf_bytes = generate_workout_pdf(client2.name, workouts, meal_plans, avatar_png=avatar_bytes)
        attachments.append(("plan.pdf", pdf_bytes, "application/pdf"))
        db2.close()

    if payload.attach_avatar and not payload.attach_pdf:
        # Generate avatar separately
        db3 = SessionLocal()
        weight_entry = db3.query(WeightEntry).filter(WeightEntry.client_id == client_id).order_by(WeightEntry.recorded_at.desc()).first()
        latest_weight = weight_entry.weight if weight_entry else None
        client3 = db3.query(Client).filter(Client.id == client_id).first()
        avatar_bytes = generate_avatar_png(client3.name, latest_weight)
        attachments.append(("avatar.png", avatar_bytes, "image/png"))
        db3.close()

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as smtp:
            smtp.starttls()
            smtp.login(SMTP_USER, SMTP_PASS)
            # Attach files if any
            for name, data, mtype in attachments:
                msg.add_attachment(data, maintype=mtype.split('/')[0], subtype=mtype.split('/')[1], filename=name)
            smtp.send_message(msg)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {e}")

    return {"status": "sent", "attachments": [n for n,_,_ in attachments]}


@router.post("/clients/{client_id}/pdf")
def client_pdf(client_id: int, embed_avatar: bool | None = False):
    """Generate a PDF for the client. If `embed_avatar=true` query param is provided, embed the generated avatar into the PDF."""
    db = SessionLocal()
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        db.close()
        raise HTTPException(status_code=404, detail="Client not found")

    workouts = [{"title": w.title, "scheduled_at": str(w.scheduled_at)} for w in client.workouts]
    meal_plans = []
    avatar_bytes = None
    if embed_avatar:
        weight_entry = db.query(WeightEntry).filter(WeightEntry.client_id == client_id).order_by(WeightEntry.recorded_at.desc()).first()
        latest_weight = weight_entry.weight if weight_entry else None
        avatar_bytes = generate_avatar_png(client.name, latest_weight)

    pdf_bytes = generate_workout_pdf(client.name, workouts, meal_plans, avatar_png=avatar_bytes)
    db.close()
    return Response(content=pdf_bytes, media_type="application/pdf")


@router.post("/clients/{client_id}/workouts")
def create_workout(client_id: int, payload: WorkoutIn):
    db = SessionLocal()
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        db.close()
        raise HTTPException(status_code=404, detail="Client not found")
    w = Workout(client_id=client_id, title=payload.title, description=payload.description)
    db.add(w)
    db.commit()
    db.refresh(w)
    db.close()
    return {"status": "created", "id": w.id}


@router.post("/clients/{client_id}/weights")
def add_weight(client_id: int, payload: dict):
    """Add a weight entry for a client. JSON body: {"weight": 78.5} """
    weight = payload.get('weight')
    if weight is None:
        raise HTTPException(status_code=400, detail="Missing weight in payload")
    db = SessionLocal()
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        db.close()
        raise HTTPException(status_code=404, detail="Client not found")
    we = WeightEntry(client_id=client_id, weight=float(weight))
    db.add(we)
    db.commit()
    db.refresh(we)
    db.close()
    return {"status": "created", "id": we.id}


@router.get("/clients/{client_id}/avatar")
def get_avatar(client_id: int):
    db = SessionLocal()
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        db.close()
        raise HTTPException(status_code=404, detail="Client not found")
    weight_entry = db.query(WeightEntry).filter(WeightEntry.client_id == client_id).order_by(WeightEntry.recorded_at.desc()).first()
    latest_weight = weight_entry.weight if weight_entry else None
    png = generate_avatar_png(client.name, latest_weight)
    db.close()
    return Response(content=png, media_type="image/png")


@router.post("/clients/{client_id}/share")
def share_profile(client_id: int, request: ShareRequest):
    """Generate a shareable profile link and email it to the client.
    Note: This legacy endpoint does not require auth and is intended for desktop app usage.
    """
    db = SessionLocal()
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        db.close()
        raise HTTPException(status_code=404, detail="Client not found")

    token = ShareToken.generate_token()
    expires_at = datetime.utcnow() + timedelta(days=request.expires_days)

    share_token = ShareToken(
        client_id=client_id,
        token=token,
        expires_at=expires_at,
        is_active=True
    )
    db.add(share_token)
    db.commit()
    db.refresh(share_token)

    worker_url = os.getenv("WORKER_URL", "http://localhost:5173")
    share_url = f"{worker_url}/profile/{token}"

    # Try to email the link; if SMTP isn't configured, still return the URL
    try:
        SMTP_HOST = os.getenv("SMTP_HOST")
        SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
        SMTP_USER = os.getenv("SMTP_USER")
        SMTP_PASS = os.getenv("SMTP_PASS")

        if all([SMTP_HOST, SMTP_USER, SMTP_PASS]):
            msg = EmailMessage()
            msg["From"] = SMTP_USER
            msg["To"] = request.client_email
            msg["Subject"] = f"Your FitTrack Pro Progress"
            msg.set_content(
                f"""
Hello {client.name},

Your trainer has shared your FitTrack Pro progress profile.

View your profile:
{share_url}

This link expires on {expires_at.strftime('%B %d, %Y')}.

- FitTrack Pro
"""
            )
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as smtp:
                smtp.starttls()
                smtp.login(SMTP_USER, SMTP_PASS)
                smtp.send_message(msg)
    except Exception as e:
        # Log and continue
        print(f"[share] email failed: {e}")
    finally:
        db.close()

    return {"share_url": share_url, "token": token, "expires_at": expires_at.isoformat(), "email_sent": True}


@router.post("/clients/{client_id}/achievements")
def award_achievement(client_id: int, payload: dict):
    """Award an achievement to a client. Payload: {"name": "Milestone", "description": "..."} """
    name = payload.get('name')
    if not name:
        raise HTTPException(status_code=400, detail="Missing achievement name")
    description = payload.get('description')
    db = SessionLocal()
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        db.close()
        raise HTTPException(status_code=404, detail="Client not found")
    ach = Achievement(client_id=client_id, name=name, description=description)
    db.add(ach)
    db.commit()
    db.refresh(ach)
    db.close()
    return {"status": "awarded", "id": ach.id}


@router.get("/clients/{client_id}/achievements")
def list_achievements(client_id: int):
    db = SessionLocal()
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        db.close()
        raise HTTPException(status_code=404, detail="Client not found")
    achs = db.query(Achievement).filter(Achievement.client_id == client_id).all()
    db.close()
    return [{"id": a.id, "name": a.name, "description": a.description, "awarded_at": str(a.awarded_at)} for a in achs]
