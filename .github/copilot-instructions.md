# GitHub Copilot - FitTrack Pro Command Handler

This file defines how GitHub Copilot should respond to natural language commands for FitTrack Pro.

## Primary Commands

### "execute Project Fittrack" | "start fittrack" | "launch fittrack" | "run fittrack"

**What the user wants**: Start the entire FitTrack Pro development environment

**Agent should do**:
1. Run `execute-fittrack.ps1` using the `run_in_terminal` tool
2. The script will:
   - Check if first-time setup is needed (run auto-setup.ps1)
   - Activate Python virtual environment
   - Start Docker if needed
   - Start backend API server (port 8000)
   - Start web client dev server (port 5173)
   - Open VS Code with the project
   - Open browser to http://localhost:5173
   - Display interactive menu

**Command to execute**:
```powershell
cd "E:\FitTrack Pro 1.1" ; .\execute-fittrack.ps1
```

---

### "bootstrap fittrack" | "setup fittrack from scratch" | "install fittrack"

**What the user wants**: Set up FitTrack Pro on a fresh machine with no prerequisites

**Agent should do**:
1. Check if running on a machine without the repo cloned
2. Run `bootstrap-fittrack.ps1` which will:
   - Install Chocolatey
   - Install Git, Node.js, Python, VS Code, Docker Desktop
   - Install Wrangler CLI
   - Install all 40+ VS Code extensions
   - Clone the repository from GitHub
   - Run auto-setup.ps1
   - Optionally start the project

**Command to execute**:
```powershell
# If bootstrap script exists locally:
cd "E:\FitTrack Pro 1.1\scripts" ; .\bootstrap-fittrack.ps1

# If on a fresh machine (download from GitHub):
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/Rehchu/FitTrack-Pro/fix/cloudflare-pages-config/scripts/bootstrap-fittrack.ps1" -OutFile "$env:TEMP\bootstrap-fittrack.ps1"; & "$env:TEMP\bootstrap-fittrack.ps1"
```

---

### "deploy trainer portal" | "deploy cloudflare worker" | "deploy fittrack"

**What the user wants**: Deploy the trainer portal worker to Cloudflare

**Agent should do**:
1. Navigate to the fittrack-trainer directory
2. Deploy using wrangler

**Command to execute**:
```powershell
cd "E:\FitTrack Pro 1.1\integrations\cloudflare\fittrack-trainer" ; npx wrangler deploy --name fittrack-trainer
```

---

### "show cloudflare logs" | "tail logs" | "view worker logs"

**What the user wants**: View real-time logs from the trainer portal worker

**Agent should do**:
1. Navigate to fittrack-trainer directory
2. Start tailing logs (this runs in background until Ctrl+C)

**Command to execute**:
```powershell
cd "E:\FitTrack Pro 1.1\integrations\cloudflare\fittrack-trainer" ; npx wrangler tail fittrack-trainer
```

---

### "run tests" | "test fittrack" | "run backend tests"

**What the user wants**: Execute the test suite

**Agent should do**:
1. Activate Python virtual environment
2. Run pytest in backend directory

**Command to execute**:
```powershell
cd "E:\FitTrack Pro 1.1" ; & .\.venv\Scripts\Activate.ps1 ; cd backend ; pytest -v
```

---

### "start backend" | "run backend only"

**What the user wants**: Start just the backend API server

**Agent should do**:
1. Activate Python virtual environment
2. Start uvicorn server

**Command to execute**:
```powershell
cd "E:\FitTrack Pro 1.1" ; & .\.venv\Scripts\Activate.ps1 ; cd backend ; python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

### "start web client" | "run web client" | "start frontend"

**What the user wants**: Start just the web client dev server

**Agent should do**:
1. Navigate to web-client
2. Start vite dev server

**Command to execute**:
```powershell
cd "E:\FitTrack Pro 1.1\web-client" ; npm run dev
```

---

### "open api docs" | "show swagger" | "api documentation"

**What the user wants**: Open the FastAPI Swagger documentation

**Agent should do**:
1. Open browser to http://localhost:8000/docs

**Command to execute**:
```powershell
Start-Process "http://localhost:8000/docs"
```

---

### "open web client" | "open browser"

**What the user wants**: Open the web client in browser

**Agent should do**:
1. Open browser to http://localhost:5173

**Command to execute**:
```powershell
Start-Process "http://localhost:5173"
```

---

### "open trainer portal" | "open production"

**What the user wants**: Open the deployed trainer portal

**Agent should do**:
1. Open browser to production URL

**Command to execute**:
```powershell
Start-Process "https://fittrack-trainer.rehchu1.workers.dev"
```

---

### "login to cloudflare" | "authenticate wrangler"

**What the user wants**: Authenticate with Cloudflare

**Agent should do**:
1. Run wrangler login

**Command to execute**:
```powershell
npx wrangler login
```

---

### "check status" | "show services" | "is fittrack running"

**What the user wants**: See what services are currently running

**Agent should do**:
1. Check if backend is running on port 8000
2. Check if web client is running on port 5173
3. Check if Docker is running
4. Report status to user

**Command to execute**:
```powershell
Write-Host "Checking FitTrack services..." -ForegroundColor Cyan ; $backend = Test-NetConnection -ComputerName localhost -Port 8000 -WarningAction SilentlyContinue ; $webclient = Test-NetConnection -ComputerName localhost -Port 5173 -WarningAction SilentlyContinue ; $docker = docker info 2>&1 | Select-String "Server Version" ; Write-Host "`nBackend (8000):  $(if($backend.TcpTestSucceeded){'✅ Running'}else{'❌ Stopped'})" ; Write-Host "Web Client (5173): $(if($webclient.TcpTestSucceeded){'✅ Running'}else{'❌ Stopped'})" ; Write-Host "Docker:           $(if($docker){'✅ Running'}else{'❌ Stopped'})"
```

---

### "stop fittrack" | "stop all services" | "kill services"

**What the user wants**: Stop all FitTrack services

**Agent should do**:
1. Kill Python processes (backend)
2. Kill Node processes (web client)

**Command to execute**:
```powershell
Get-Process | Where-Object {$_.ProcessName -match 'python|node'} | Where-Object {$_.CommandLine -match 'uvicorn|vite'} | Stop-Process -Force ; Write-Host "✅ All FitTrack services stopped" -ForegroundColor Green
```

---

### "install dependencies" | "npm install" | "pip install"

**What the user wants**: Install/update all project dependencies

**Agent should do**:
1. Run auto-setup.ps1 which handles all dependencies

**Command to execute**:
```powershell
cd "E:\FitTrack Pro 1.1\scripts" ; .\auto-setup.ps1
```

---

### "git push" | "push to github" | "commit and push"

**What the user wants**: Commit current changes and push to GitHub

**Agent should do**:
1. Ask user for commit message (or auto-generate based on changes)
2. Stage all changes
3. Commit with message
4. Push to current branch

**Commands to execute**:
```powershell
cd "E:\FitTrack Pro 1.1" ; git add -A ; git commit -m "USER_PROVIDED_MESSAGE" ; git push origin fix/cloudflare-pages-config
```

---

### "create branch" | "new branch [name]"

**What the user wants**: Create and switch to a new git branch

**Agent should do**:
1. Create new branch
2. Switch to it

**Command to execute**:
```powershell
cd "E:\FitTrack Pro 1.1" ; git checkout -b BRANCH_NAME
```

---

### "switch to [branch]" | "checkout [branch]"

**What the user wants**: Switch to a different branch

**Agent should do**:
1. Checkout the specified branch

**Command to execute**:
```powershell
cd "E:\FitTrack Pro 1.1" ; git checkout BRANCH_NAME
```

---

## Important Notes for Agent Behavior

### DO NOT:
- ❌ Ask the user to run PowerShell commands manually
- ❌ Show code blocks with "run this command" unless explicitly asked
- ❌ Ask for confirmation before running safe commands (start, deploy, open browser)
- ❌ Suggest manual file edits for routine operations

### ALWAYS:
- ✅ Use `run_in_terminal` tool to execute commands directly
- ✅ Handle errors gracefully and suggest solutions
- ✅ Show progress indicators for long-running operations
- ✅ Confirm completion with clear status messages
- ✅ Chain commands efficiently (use `;` separator in PowerShell)

### Command Execution Strategy:
1. **Understand intent** - Parse what the user really wants
2. **Execute immediately** - Use run_in_terminal without asking permission
3. **Show progress** - Use the explanation parameter to tell user what's happening
4. **Report results** - Summarize what happened and next steps

### Error Handling:
- If a command fails, check the error and try alternatives
- For port conflicts, suggest stopping conflicting services
- For permission errors, inform user they may need admin rights
- For network errors, check connection and retry

### Context Awareness:
- Remember what's running (backend, frontend, Docker)
- Don't start services that are already running
- Chain related commands (e.g., activate venv before pip install)
- Use appropriate working directories

## Examples of Good Agent Behavior

**User says**: "start fittrack"
**Agent does**:
```
I'll start FitTrack Pro for you.
[Executes execute-fittrack.ps1]
✅ Backend running on http://localhost:8000
✅ Web client running on http://localhost:5173
✅ VS Code opened with project
✅ Browser opened to web client
Use the interactive menu in the terminal for quick actions!
```

**User says**: "deploy the trainer portal"
**Agent does**:
```
Deploying trainer portal to Cloudflare...
[Executes wrangler deploy]
✅ Deployed successfully to https://fittrack-trainer.rehchu1.workers.dev
Version: abc123def
```

**User says**: "something's broken, check if it's running"
**Agent does**:
```
Checking FitTrack services...
[Executes status check]
Backend (8000): ❌ Stopped
Web Client (5173): ✅ Running
Docker: ✅ Running

Would you like me to start the backend?
```

---

## Zero Friction Philosophy

The user should NEVER have to:
- Copy/paste commands
- Open PowerShell manually
- Remember port numbers
- Navigate directories
- Look up syntax

Just talk naturally, and the agent handles everything! 🚀
