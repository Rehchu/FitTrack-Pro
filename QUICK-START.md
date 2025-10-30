# FitTrack Pro - Quick Start

## 🚀 One-Command Setup & Launch

Just run this command and everything will be set up and running:

```powershell
.\execute-fittrack.ps1
```

**Or in GitHub Copilot Chat, just say:**
> "execute Project Fittrack"

## What This Does Automatically

### First Time Setup (Automatic)
1. ✅ Installs Chocolatey package manager
2. ✅ Installs Git, Node.js, Python
3. ✅ Installs Docker Desktop
4. ✅ Installs Wrangler CLI (Cloudflare)
5. ✅ Installs VS Code extensions:
   - Python & Pylance
   - ESLint & Prettier
   - Docker
   - GitHub Copilot
   - Remote Containers
   - Cloudflare
6. ✅ Creates Python virtual environment
7. ✅ Installs all Python dependencies
8. ✅ Installs all Node.js dependencies (root, backend, desktop-app, web-client, cloudflare)
9. ✅ Creates `.env` template files

### Every Time You Run It
1. 🐍 Activates Python virtual environment
2. 🐳 Starts Docker (if not running)
3. 📡 Starts backend API server (http://localhost:8000)
4. 🌐 Starts web client dev server (http://localhost:5173)
5. 💻 Opens VS Code with the project loaded
6. 🌍 Opens web client in your browser
7. 📊 Displays interactive menu with quick actions

## Interactive Menu Options

Once running, you'll see a menu with these options:

- **[1]** Open Web Client in Browser
- **[2]** Open API Docs in Browser
- **[3]** Open Trainer Portal in Browser
- **[4]** Deploy Cloudflare Worker
- **[5]** View Cloudflare Logs
- **[6]** Run Tests
- **[Q]** Quit

## Service URLs

| Service | URL | Description |
|---------|-----|-------------|
| Backend API | http://localhost:8000 | FastAPI backend server |
| API Documentation | http://localhost:8000/docs | Interactive Swagger UI |
| Web Client | http://localhost:5173 | React/Vite development server |
| Trainer Portal | https://fittrack-trainer.rehchu1.workers.dev | Cloudflare Worker (production) |

## Manual Commands (If Needed)

### Start Individual Services

```powershell
# Backend only
cd backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload

# Web client only
cd web-client
npm run dev

# Desktop app
cd desktop-app
npm run dev
```

### Cloudflare Deployment

```powershell
# Deploy trainer portal
cd integrations\cloudflare\fittrack-trainer
npx wrangler deploy --name fittrack-trainer

# View logs
npx wrangler tail fittrack-trainer
```

### Run Tests

```powershell
# Backend tests
cd backend
pytest -v

# Frontend tests
cd web-client
npm test
```

## Troubleshooting

### "Script execution is disabled"
Run this in PowerShell as Administrator:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Docker not starting
- Make sure Docker Desktop is installed
- Check if virtualization is enabled in BIOS
- Try running Docker Desktop manually first

### Services won't start
- Check if ports 8000 or 5173 are already in use
- Kill existing Python/Node processes:
```powershell
Get-Process | Where-Object {$_.ProcessName -match 'python|node'} | Stop-Process -Force
```

### First-time setup failed
- Delete `.fittrack-setup-complete` file and run again
- Check internet connection
- Run PowerShell as Administrator

## Development Workflow

1. **Start**: `.\execute-fittrack.ps1`
2. **Code**: VS Code opens automatically with the project
3. **Test**: Use option [6] from the menu to run tests
4. **Deploy**: Use option [4] to deploy to Cloudflare
5. **Monitor**: Use option [5] to view real-time logs

## Git Workflow

```powershell
# Make changes, then commit
git add .
git commit -m "feat: your changes"
git push

# The GitHub Actions workflow will auto-deploy the Cloudflare worker
```

## Need Help?

- 📖 Check the docs in `/docs` folder
- 💬 Ask in GitHub Copilot Chat
- 🐛 Report issues on GitHub

---

**That's it! Just run `.\execute-fittrack.ps1` and start coding! 🎉**
