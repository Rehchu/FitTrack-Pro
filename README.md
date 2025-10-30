# FitTrack Pro v1.2 - Complete Personal Trainer Platform

> **"Dedicated to MaxWCooper – No Tiers. No Limits. No Catch."**

A comprehensive personal training platform with desktop app, web client, local backend, workout tracking, PDF generation, email system, and optional cloud integration.

## 🎉 What's New in v1.2

### ✅ Workout Tracking System
- **Exercise Library** - Master exercise database with metadata (category, equipment, difficulty, muscles, instructions, videos)
- **Workout Sessions** - Create detailed workout programs with exercises, sets, reps, weights, and RPE
- **Progress Tracking** - Track client progress per exercise with historical data and improvement calculations
- **Statistics** - Comprehensive client stats including volume, streaks, favorite exercises, and workout frequency
- **20+ REST API Endpoints** - Complete CRUD operations for exercises, workouts, setgroups, and sets

### ✅ PDF Generation System
- **Workout Logs** - Professional PDFs with exercise tables, volume calculations, and workout summaries
- **Meal Plans** - Multi-day meal plans with nutrition breakdowns and daily totals
- **Progress Reports** - Comprehensive reports with measurements, achievements, quests, and milestones
- **Health Statistics** - Aggregated health data with nutrition, workout, and body composition insights
- **Custom Styling** - Branded PDFs with customizable colors, fonts, and layouts

### ✅ Email System
- **SMTP Integration** - Send emails via Gmail, SendGrid, Mailgun, or any SMTP provider
- **HTML Templates** - Professional, responsive email templates with brand customization
- **PDF Attachments** - Automatically attach generated PDFs to emails
- **4 Email Types** - Workout plans, meal plans, progress reports, and health statistics

## 🚀 Quick Start

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env  # Windows
# cp .env.example .env  # macOS/Linux

# Edit .env with your settings (SMTP, database, etc.)

# Start server
uvicorn app.main:app --reload
```

Server runs at: **http://localhost:8000**

Interactive API docs: **http://localhost:8000/docs**

### Frontend Setup

```bash
cd web-client

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs at: **http://localhost:5173**

## 📚 Documentation

- **[v1.2 Setup Guide](docs/v1.2-setup-guide.md)** - Complete installation and configuration
- **[Workout Tracking](docs/workout-tracking.md)** - Exercise library, workout creation, progress tracking
- **[PDF & Email System](docs/pdf-email-system.md)** - PDF generation, email templates, SMTP configuration
- **[Quest System](docs/quest-system.md)** - Gamification features
- **[Samsung Health](docs/samsung-health.md)** - Integration guide
- **[Dynamic Avatars](docs/dynamic-avatars.md)** - Avatar system
- **[Desktop App](docs/desktop-app-setup.md)** - Electron app setup

## 🔑 Key Features

### For Trainers
- ✅ Client management and onboarding
- ✅ Workout program creation with nested exercises/sets
- ✅ Meal planning with nutrition tracking
- ✅ Progress monitoring and analytics
- ✅ Video call integration
- ✅ Messaging system
- ✅ PDF report generation
- ✅ Email communication
- ✅ White-label branding
- ✅ Team collaboration
- 🚧 Trainer dashboard with analytics
- 🚧 Calendar view for scheduling

### For Clients
- ✅ Personalized workout programs
- ✅ Meal plans and nutrition guidance
- ✅ Progress tracking (measurements, photos)
- ✅ Achievement system and quests
- ✅ Video calls with trainer
- ✅ Direct messaging
- ✅ Samsung Health integration
- ✅ Profile sharing
- 🚧 Workout logging UI
- 🚧 Exercise library browser

### Technical Features
- ✅ FastAPI backend with SQLAlchemy ORM
- ✅ React + TypeScript frontend
- ✅ Electron desktop app
- ✅ WebRTC video calls
- ✅ WebSocket real-time messaging
- ✅ Push notifications
- ✅ PDF generation (ReportLab + Matplotlib)
- ✅ SMTP email system with templates
- ✅ SQLite/PostgreSQL/MySQL support
- ✅ JWT authentication
- ✅ File uploads (videos, photos)
- ✅ Cloudflare Worker integration

## 📋 API Endpoints

### Workout Tracking (`/workouts`)
- `GET /exercises` - List exercises with filters
- `POST /exercises` - Create exercise
- `GET /exercises/{id}` - Get exercise
- `PUT/DELETE /exercises/{id}` - Update/delete exercise
- `GET /` - List workouts with filters
- `POST /` - Create workout with nested setgroups/sets
- `GET /{id}` - Get workout with full details
- `PUT/DELETE /{id}` - Update/delete workout
- `POST /{id}/complete` - Mark workout complete
- `POST /{id}/setgroups` - Add exercise to workout
- `PUT/DELETE /setgroups/{id}` - Update/delete setgroup
- `POST /setgroups/{id}/sets` - Add set
- `PUT/DELETE /sets/{id}` - Update/delete set
- `GET /clients/{id}/exercise-progress/{exercise_id}` - Progress tracking
- `GET /clients/{id}/stats` - Client statistics

### PDF Generation (`/pdf`)
- `GET /workout/{id}` - Download workout PDF
- `GET /meal-plan/{client_id}` - Download meal plan PDF
- `GET /progress-report/{client_id}` - Download progress report PDF
- `GET /health-stats/{client_id}` - Download health stats PDF

### Email System (`/email`)
- `POST /send-workout` - Email workout plan with PDF
- `POST /send-meal-plan` - Email meal plan with PDF
- `POST /send-progress-report` - Email progress report with PDF
- `POST /send-health-stats` - Email health stats with PDF

### Client Management (`/clients`)
- `GET /` - List clients
- `POST /` - Create client
- `GET /{id}` - Get client details
- `PUT/DELETE /{id}` - Update/delete client

### Measurements (`/clients/{id}/measurements`)
- `GET /` - List measurements
- `POST /` - Log new measurement
- `GET /{measurement_id}` - Get measurement
- `PUT/DELETE /{measurement_id}` - Update/delete measurement

### Meals (`/clients/{id}/meals`)
- `GET /` - List meals
- `POST /` - Create meal plan
- `GET /{meal_id}` - Get meal
- `PUT/DELETE /{meal_id}` - Update/delete meal

### Quests & Achievements (`/quests`)
- Quest management, milestone tracking, achievement awards

### Other
- `/trainers` - Trainer authentication and management
- `/teams` - Team collaboration
- `/messages` - Real-time messaging
- `/video` - Video call signaling
- `/branding` - White-label customization
- `/push` - Push notifications
- `/integrations` - Samsung Health, etc.
- `/workouts` - Workout video uploads
- `/share` - Profile sharing

## 🔧 Configuration

### Environment Variables (`.env`)

```env
# Database
DATABASE_URL=sqlite:///./backend_data.db

# SMTP Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@gmail.com
FROM_NAME=FitTrack Pro

# JWT Authentication
SECRET_KEY=your-secret-key-change-this
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Optional
PUSH_API_KEY=
WEBRTC_ICE_SERVERS=[]
SAMSUNG_CLIENT_ID=
SAMSUNG_CLIENT_SECRET=
```

### Gmail SMTP Setup

1. Enable 2-Factor Authentication
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use App Password as `SMTP_PASSWORD`

## 🧪 Testing

```bash
# Start backend
cd backend
uvicorn app.main:app --reload

# Visit interactive docs
# http://localhost:8000/docs

# Test PDF generation
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8000/pdf/workout/1 \
  --output workout.pdf

# Test email sending
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workout_id": 1}' \
  http://localhost:8000/email/send-workout
```

## 🏗️ Project Structure

```
FitTrack Pro 1.1/
├── backend/
│   ├── app/
│   │   ├── main.py                      # FastAPI app entry point
│   │   ├── models.py                    # SQLAlchemy models
│   │   ├── database.py                  # Database connection
│   │   ├── pdf_generator.py             # PDF generation system
│   │   ├── email_service.py             # Email system with templates
│   │   ├── routes/
│   │   │   ├── workout_tracking_router.py  # Workout tracking API
│   │   │   ├── pdf_router.py               # PDF download endpoints
│   │   │   ├── email_router.py             # Email sending endpoints
│   │   │   ├── trainer_router.py           # Trainer auth/management
│   │   │   ├── meal_router.py              # Meal planning
│   │   │   ├── measurements_router.py      # Progress tracking
│   │   │   └── ... (12 more routers)
│   │   ├── schemas/
│   │   │   ├── workout_tracking.py      # Pydantic schemas for workouts
│   │   │   └── ...
│   │   └── utils/
│   │       ├── auth.py                  # JWT authentication
│   │       └── nutrition.py             # Nutrition calculations
│   ├── requirements.txt                 # Python dependencies
│   └── .env.example                     # Environment template
├── web-client/
│   ├── src/
│   │   ├── pages/                       # React pages
│   │   ├── components/                  # React components
│   │   ├── stores/                      # State management
│   │   └── services/                    # API clients
│   └── package.json
├── desktop-app/
│   ├── src/
│   │   ├── main.js                      # Electron main process
│   │   └── renderer/                    # React UI
│   └── package.json
├── docs/
│   ├── v1.2-setup-guide.md              # Setup instructions
│   ├── workout-tracking.md              # Workout system docs
│   ├── pdf-email-system.md              # PDF/Email docs
│   └── ...
├── infra/
│   └── cloudflare/                      # Cloudflare Worker
├── uploads/                             # User uploads (gitignored)
└── README.md
```

## 🎯 Roadmap

### v1.2 (In Progress)
- ✅ Workout tracking backend
- ✅ PDF generation system
- ✅ Email system
- 🚧 Workout UI components
- 🚧 Trainer dashboard
- 🚧 Calendar view

### v1.3 (Planned)
- Exercise video library
- Auto-progression algorithms
- Workout templates
- Advanced analytics
- Mobile app (React Native)

### v2.0 (Future)
- AI form analysis
- Nutrition AI assistant
- Integration marketplace
- Multi-language support
- Advanced reporting

## 🤝 Contributing

This is a personal project, but suggestions and feedback are welcome!

## 📄 License

MIT License - Free to use, modify, and distribute.

## 🙏 Credits

**Dedicated to MaxWCooper** - This project embodies the "No Tiers. No Limits. No Catch." philosophy.

**Architecture Inspiration**: Pure Training by hneels - Workout tracking pattern

## 📞 Support

- Check `/docs` folder for detailed guides
- Visit `/docs` API endpoint for interactive documentation
- Review example code in documentation files

