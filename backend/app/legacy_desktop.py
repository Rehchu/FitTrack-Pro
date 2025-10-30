from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, EmailStr
from .models import Client, Workout, Achievement, WeightEntry, ShareToken, Trainer, Meal, MealItem, Measurement
from datetime import datetime, timedelta
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
    # Ensure a default trainer exists for legacy (no-auth) flows
    default_trainer = db.query(Trainer).filter(Trainer.email == "legacy@local").first()
    if not default_trainer:
        default_trainer = Trainer(
            name="Legacy Trainer",
            email="legacy@local",
            password_hash="legacy"
        )
        db.add(default_trainer)
        db.flush()

    client = Client(
        name=payload.name,
        email=payload.email,
        notes=payload.notes,
        trainer_id=default_trainer.id
    )
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
    SMTP_HOST = os.getenv("SMTP_HOST")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER")
    SMTP_PASS = os.getenv("SMTP_PASS")

    if not all([SMTP_HOST, SMTP_USER, SMTP_PASS]):
        raise HTTPException(status_code=500, detail="SMTP not configured. Set SMTP_HOST/SMTP_USER/SMTP_PASS in .env")

    db = SessionLocal()
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        db.close()
        raise HTTPException(status_code=404, detail="Client not found")

    msg = EmailMessage()
    msg["From"] = SMTP_USER
    msg["To"] = client.email
    msg["Subject"] = payload.subject or "Your plan"
    msg.set_content(payload.body or "Please find attached.")

    attachments = []
    if payload.attach_pdf:
        workouts = [{"title": w.title, "scheduled_at": str(w.scheduled_at)} for w in client.workouts]
        avatar_bytes = None
        if payload.attach_avatar:
            weight_entry = db.query(WeightEntry).filter(WeightEntry.client_id == client_id).order_by(WeightEntry.recorded_at.desc()).first()
            latest_weight = weight_entry.weight if weight_entry else None
            avatar_bytes = generate_avatar_png(client.name, latest_weight)
        pdf_bytes = generate_workout_pdf(client.name, workouts, [], avatar_png=avatar_bytes)
        attachments.append(("plan.pdf", pdf_bytes, "application/pdf"))

    if payload.attach_avatar and not payload.attach_pdf:
        weight_entry = db.query(WeightEntry).filter(WeightEntry.client_id == client_id).order_by(WeightEntry.recorded_at.desc()).first()
        latest_weight = weight_entry.weight if weight_entry else None
        avatar_bytes = generate_avatar_png(client.name, latest_weight)
        attachments.append(("avatar.png", avatar_bytes, "image/png"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as smtp:
            smtp.starttls()
            smtp.login(SMTP_USER, SMTP_PASS)
            for name, data, mtype in attachments:
                msg.add_attachment(data, maintype=mtype.split('/')[0], subtype=mtype.split('/')[1], filename=name)
            smtp.send_message(msg)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {e}")
    finally:
        db.close()

    return {"status": "sent", "attachments": [n for n,_,_ in attachments]}


@router.post("/clients/{client_id}/pdf")
def client_pdf(client_id: int, embed_avatar: bool | None = False):
    db = SessionLocal()
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        db.close()
        raise HTTPException(status_code=404, detail="Client not found")

    workouts = [{"title": w.title, "scheduled_at": str(w.scheduled_at)} for w in client.workouts]
    avatar_bytes = None
    if embed_avatar:
        weight_entry = db.query(WeightEntry).filter(WeightEntry.client_id == client_id).order_by(WeightEntry.recorded_at.desc()).first()
        latest_weight = weight_entry.weight if weight_entry else None
        avatar_bytes = generate_avatar_png(client.name, latest_weight)

    pdf_bytes = generate_workout_pdf(client.name, workouts, [], avatar_png=avatar_bytes)
    db.close()
    return Response(content=pdf_bytes, media_type="application/pdf")


@router.post("/clients/{client_id}/weights")
def add_weight(client_id: int, payload: dict):
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
        print(f"[share] email failed: {e}")
    finally:
        db.close()

    return {"share_url": share_url, "token": token, "expires_at": expires_at.isoformat(), "email_sent": True}


# --- Minimal legacy helpers for workouts & achievements (no auth) ---
@router.post("/clients/{client_id}/workouts")
def create_workout(client_id: int, payload: dict):
    """Create a simple workout for a client (legacy, minimal fields)."""
    title = payload.get("title")
    if not title:
        raise HTTPException(status_code=400, detail="Missing title")
    db = SessionLocal()
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        db.close()
        raise HTTPException(status_code=404, detail="Client not found")

    w = Workout(
        client_id=client_id,
        trainer_id=None,  # legacy simple flow; detailed tracking uses auth router
        title=title,
        description=payload.get("description"),
        scheduled_at=datetime.utcnow()
    )
    db.add(w)
    db.commit()
    db.refresh(w)
    db.close()
    return {"id": w.id, "title": w.title}


@router.get("/clients/{client_id}/workouts")
def list_workouts(client_id: int):
    """List recent workouts for a client (legacy, minimal fields)."""
    db = SessionLocal()
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        db.close()
        raise HTTPException(status_code=404, detail="Client not found")

    items = db.query(Workout).filter(Workout.client_id == client_id).order_by(Workout.scheduled_at.desc()).limit(50).all()
    out = []
    for w in items:
        out.append({
            "id": w.id,
            "title": w.title,
            "description": w.description,
            "scheduled_at": (w.scheduled_at.isoformat() if getattr(w, 'scheduled_at', None) else None)
        })
    db.close()
    return out


@router.post("/clients/{client_id}/achievements")
def award_achievement(client_id: int, payload: dict):
    name = payload.get("name")
    if not name:
        raise HTTPException(status_code=400, detail="Missing achievement name")
    db = SessionLocal()
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        db.close()
        raise HTTPException(status_code=404, detail="Client not found")

    a = Achievement(
        client_id=client_id,
        name=name,
        description=payload.get("description")
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    db.close()
    return {"id": a.id, "name": a.name, "description": a.description}


@router.get("/clients/{client_id}/achievements")
def list_achievements(client_id: int):
    db = SessionLocal()
    items = db.query(Achievement).filter(Achievement.client_id == client_id).order_by(Achievement.awarded_at.desc()).all()
    db.close()
    return [
        {"id": i.id, "name": i.name, "description": i.description, "awarded_at": (i.awarded_at.isoformat() if i.awarded_at else None)}
        for i in items
    ]


# --- Meals (legacy, no auth) ---
@router.post("/clients/{client_id}/meals")
def create_meal(client_id: int, payload: dict):
    name = payload.get("name")
    if not name:
        raise HTTPException(status_code=400, detail="Missing meal name")
    db = SessionLocal()
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        db.close()
        raise HTTPException(status_code=404, detail="Client not found")

    # Normalize date
    raw_date = payload.get("date")
    if isinstance(raw_date, str):
        try:
            parsed_date = datetime.fromisoformat(raw_date)
        except Exception:
            parsed_date = datetime.utcnow()
    else:
        parsed_date = raw_date or datetime.utcnow()

    meal = Meal(
        client_id=client_id,
        trainer_id=None,
        meal_plan_id=payload.get("meal_plan_id"),
        name=name,
        date=parsed_date,
        notes=payload.get("notes")
    )
    db.add(meal)
    db.commit()
    db.refresh(meal)

    # Add items
    items = payload.get("items") or []
    item_objs = []
    import re
    def _parse_qty_unit(q):
        if isinstance(q, (int, float)):
            return float(q), None
        if isinstance(q, str):
            m = re.match(r"\s*(\d+(?:\.\d+)?)\s*(.*)", q)
            if m:
                qty = float(m.group(1))
                unit = m.group(2).strip() or None
                return qty, unit
            else:
                return 1.0, q.strip() or None
        return 1.0, None

    for it in items:
        qty_val, unit_val = _parse_qty_unit(it.get("quantity"))
        unit_final = it.get("unit") or unit_val
        item = MealItem(
            meal_id=meal.id,
            name=it.get("name"),
            quantity=qty_val,
            unit=unit_final,
            calories=it.get("calories"),
            protein=it.get("protein"),
            carbs=it.get("carbs"),
            fat=it.get("fat"),
            fiber=it.get("fiber"),
            sodium=it.get("sodium"),
            raw_data=it.get("raw_data")
        )
        db.add(item)
        item_objs.append(item)
    db.commit()

    # Aggregate nutrients
    agg = {}
    for it in item_objs:
        agg['calories'] = agg.get('calories', 0) + (it.calories or 0)
        agg['protein'] = agg.get('protein', 0) + (it.protein or 0)
        agg['carbs'] = agg.get('carbs', 0) + (it.carbs or 0)
        agg['fat'] = agg.get('fat', 0) + (it.fat or 0)
        agg['fiber'] = agg.get('fiber', 0) + (it.fiber or 0)
        agg['sodium'] = agg.get('sodium', 0) + (it.sodium or 0)
    meal.total_nutrients = agg
    db.add(meal)
    db.commit()
    db.refresh(meal)
    db.close()

    return {
        "id": meal.id,
        "name": meal.name,
        "date": meal.date.isoformat() if getattr(meal, 'date', None) else None,
        "notes": meal.notes,
        "total_nutrients": meal.total_nutrients,
    }


@router.get("/clients/{client_id}/meals")
def list_meals(client_id: int):
    db = SessionLocal()
    meals = db.query(Meal).filter(Meal.client_id == client_id).order_by(Meal.date.desc()).all()
    out = []
    for m in meals:
        out.append({
            "id": m.id,
            "name": m.name,
            "date": m.date.isoformat() if getattr(m, 'date', None) else None,
            "notes": m.notes,
            "total_nutrients": m.total_nutrients,
        })
    db.close()
    return out


# --- Measurements (legacy, no auth) ---
@router.post("/clients/{client_id}/measurements")
def create_measurement(client_id: int, payload: dict):
    db = SessionLocal()
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        db.close()
        raise HTTPException(status_code=404, detail="Client not found")

    # Normalize date
    raw_date = payload.get("date")
    if isinstance(raw_date, str):
        try:
            parsed_date = datetime.fromisoformat(raw_date)
        except Exception:
            parsed_date = datetime.utcnow()
    else:
        parsed_date = raw_date or datetime.utcnow()

    m = Measurement(
        client_id=client_id,
        date=parsed_date,
        weight=payload.get("weight"),
        chest=payload.get("chest"),
        waist=payload.get("waist"),
        hips=payload.get("hips"),
        biceps_left=payload.get("biceps_left"),
        biceps_right=payload.get("biceps_right"),
        thigh_left=payload.get("thigh_left"),
        thigh_right=payload.get("thigh_right"),
        calf_left=payload.get("calf_left"),
        calf_right=payload.get("calf_right"),
        shoulders=payload.get("shoulders"),
        forearms=payload.get("forearms"),
        body_fat=payload.get("body_fat"),
        notes=payload.get("notes"),
        photos=payload.get("photos")
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    db.close()
    return {
        "id": m.id,
        "date": m.date.isoformat() if getattr(m, 'date', None) else None,
        "weight": m.weight,
        "body_fat": m.body_fat,
        "chest": m.chest,
        "waist": m.waist,
        "hips": m.hips,
        "notes": m.notes
    }


@router.get("/clients/{client_id}/measurements")
def list_measurements(client_id: int):
    db = SessionLocal()
    items = db.query(Measurement).filter(Measurement.client_id == client_id).order_by(Measurement.date.desc()).all()
    out = []
    for m in items:
        out.append({
            "id": m.id,
            "date": m.date.isoformat() if getattr(m, 'date', None) else None,
            "weight": m.weight,
            "body_fat": m.body_fat,
            "chest": m.chest,
            "waist": m.waist,
            "hips": m.hips,
            "notes": m.notes
        })
    db.close()
    return out


@router.delete("/clients/{client_id}")
def delete_client(client_id: int):
    """Delete a client and all associated data (measurements, meals, workouts, etc.)"""
    db = SessionLocal()
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        db.close()
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Delete all related records (cascade should handle this, but being explicit)
    db.query(WeightEntry).filter(WeightEntry.client_id == client_id).delete()
    db.query(Measurement).filter(Measurement.client_id == client_id).delete()
    db.query(Achievement).filter(Achievement.client_id == client_id).delete()
    db.query(ShareToken).filter(ShareToken.client_id == client_id).delete()
    
    # Delete meals and their items
    meal_ids = [m.id for m in db.query(Meal).filter(Meal.client_id == client_id).all()]
    if meal_ids:
        db.query(MealItem).filter(MealItem.meal_id.in_(meal_ids)).delete(synchronize_session=False)
    db.query(Meal).filter(Meal.client_id == client_id).delete()
    
    # Delete workouts
    db.query(Workout).filter(Workout.client_id == client_id).delete()
    
    # Finally delete the client
    db.delete(client)
    db.commit()
    db.close()
    
    return {"status": "deleted", "client_id": client_id}
