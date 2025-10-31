import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from .models import Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .routes.trainer_router import router as trainer_router
from .routes.team_router import router as team_router
from .routes.messaging_router import router as messaging_router
from .routes.video_router import router as video_router
from .routes.branding_router import router as branding_router
from .routes.push_router import router as push_router
from .routes.workout_video_router import router as workout_video_router
from .routes.measurements_router import router as measurements_router
from .routes.meal_router import router as meal_router
from .routes.samsung_router import router as samsung_router
from .routes.share_router import router as share_router
from .routes.quest_router import router as quest_router
from .routes.workout_tracking_router import router as workout_tracking_router
from .routes.pdf_router import router as pdf_router
from .routes.email_router import router as email_router
from .routes.exercisedb_router import router as exercisedb_router
from .routes.ai_router import router as ai_router
from .routes.dashboard_router import router as dashboard_router
from .routes.usda_router import router as usda_router
from .routes.settings_router import router as settings_router
from .routes.auth_router import router as auth_router
# Include legacy desktop-friendly routes (no-auth helpers)
from .legacy_desktop import router as legacy_router

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./backend_data.db")
PUSH_API_KEY = os.getenv("PUSH_API_KEY", "")
WEBRTC_ICE_SERVERS = os.getenv("WEBRTC_ICE_SERVERS", "[]")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Ensure tables are created
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="FitTrack Pro - Free Forever Edition",
    description="Dedicated to MaxWCooper – No Tiers. No Limits. No Catch.",
    version="1.1.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, configure specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

"""
Router registration order matters when paths overlap. We register legacy (no-auth) routes first so
desktop-friendly endpoints like /clients/... (meals, measurements, share, etc.) do not require auth in tests.
Auth-protected routers still handle other endpoints via distinct prefixes.
"""
app.include_router(legacy_router, tags=["legacy-desktop"])  # must come first to take precedence on overlapping paths

# Include routers
app.include_router(trainer_router, prefix="/trainers", tags=["trainers"])
app.include_router(team_router, prefix="/teams", tags=["teams"])
app.include_router(messaging_router, prefix="/messages", tags=["messaging"])
app.include_router(video_router, prefix="/video", tags=["video-calls"])
app.include_router(branding_router, prefix="/branding", tags=["white-label"])
app.include_router(push_router, prefix="/push", tags=["notifications"])
app.include_router(workout_video_router, prefix="/workouts", tags=["workout-videos"])
app.include_router(measurements_router, prefix="/clients", tags=["measurements"])
app.include_router(meal_router, prefix="/clients", tags=["meals"])
app.include_router(samsung_router, prefix="/integrations", tags=["shealth"])
app.include_router(share_router, tags=["profile-sharing"])
app.include_router(quest_router, tags=["quests-achievements"])
app.include_router(workout_tracking_router, tags=["workout-tracking"])
app.include_router(pdf_router, tags=["pdf-generation"])
app.include_router(email_router, tags=["email"])
app.include_router(exercisedb_router, tags=["exercisedb"])
app.include_router(ai_router, tags=["ai-fitness"])
app.include_router(dashboard_router, tags=["dashboard"])
app.include_router(usda_router, tags=["usda-nutrition"])
app.include_router(settings_router, tags=["settings"])
app.include_router(auth_router, prefix="/auth", tags=["auth"])

# Serve uploaded files (progress photos, thumbnails, workout videos)
uploads_dir = os.path.join(os.getcwd(), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict = {}  # user_id: WebSocket

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

    async def send_personal_message(self, message: str, user_id: str):
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_text(message)

    async def broadcast(self, message: str, exclude: str = None):
        for user_id, connection in self.active_connections.items():
            if user_id != exclude:
                await connection.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Process real-time messages, video call signaling, etc.
            await manager.broadcast(f"Message from {user_id}: {data}", exclude=user_id)
    except WebSocketDisconnect:
        manager.disconnect(user_id)
        await manager.broadcast(f"Client #{user_id} left the chat")

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "ok",
        "version": "1.1.0",
        "features": {
            "messaging": True,
            "video_calls": True,
            "push_notifications": bool(PUSH_API_KEY),
            "white_label": True,
            "teams": True
        }
    }
