# A.R.C SENTINEL - How to Run

## 🎯 DEMO MODE (Hackathon Presentation)

**Demo mode is currently ENABLED** - The application works 100% offline with hardcoded data.

### What Demo Mode Does:
- ✅ No backend required - all API calls return mock data
- ✅ No Supabase connection needed
- ✅ No Gemini API key required
- ✅ Login accepts any credentials
- ✅ Incidents auto-populate with realistic data
- ✅ Attack Simulator creates local incidents
- ✅ ML Training always succeeds
- ✅ AI Summaries return instantly
- ✅ WebSocket events simulated locally
- ✅ No crashes or network errors

### To Disable Demo Mode (for production):
```javascript
// frontend/src/constants.js
export const DEMO_MODE = false;

// backend/app/config/demo_mode.py
DEMO_MODE = False
```

---

## Prerequisites

- **Python 3.10+** installed
- **Node.js 18+** and npm installed
- **Supabase** account with project credentials (optional in demo mode)
- **Google Gemini API** key (optional, for AI summaries)

---

## 1. Frontend Only (Demo Mode)

**For hackathon demo, you only need to run the frontend:**

```bash
cd frontend
npm install
npm start
```

Frontend will be available at: `http://localhost:3000`

That's it! The app is fully functional in demo mode.

---

## 2. Backend Setup (Optional - for production)

### Windows (PowerShell)
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Linux/macOS (Bash)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend will be available at: `http://localhost:8000`

---

## 3. Frontend Setup

### Open New Terminal and Navigate to Frontend

### Windows/Linux/macOS
```bash
cd frontend
npm install
npm start
```

Frontend will be available at: `http://localhost:3000`

---

## 3. Quick Start (Both Servers)

### Terminal 1 - Backend (Windows)
```powershell
cd backend
.\venv\Scripts\Activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Terminal 1 - Backend (Linux/macOS)
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Terminal 2 - Frontend (All Platforms)
```bash
cd frontend
npm start
```

---

## 4. Access the Application

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| Health Check | http://localhost:8000/health |
| WebSocket | ws://localhost:8000/ws |
| WebSocket (alt) | ws://localhost:8000/api/events/live |

---

## 5. Environment Variables

### Backend (.env in backend folder)
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key  # Optional
```

### Frontend (.env in frontend folder)
```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8000
```

---

## 6. Troubleshooting

### Backend Issues

**Port already in use (Windows):**
```powershell
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

**Port already in use (Linux/macOS):**
```bash
lsof -i :8000
kill -9 <PID>
```

**Module not found:**
```bash
pip install -r requirements.txt
```

**Virtual environment issues (recreate):**
```bash
# Windows
Remove-Item -Recurse -Force venv
python -m venv venv
.\venv\Scripts\Activate
pip install -r requirements.txt

# Linux/macOS
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Frontend Issues

**Port already in use:**
```bash
# Windows
$env:PORT=3001; npm start

# Linux/macOS
PORT=3001 npm start
```

**Clear cache and reinstall:**
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 7. Production Build

### Build Frontend for Production
```bash
cd frontend
npm run build
```

### Run Backend in Production Mode

**Windows:**
```powershell
cd backend
.\venv\Scripts\Activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

**Linux/macOS:**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## 8. Verify Everything Works

After starting both servers, check:

1. **Backend Health:** http://localhost:8000/health
2. **API Docs:** http://localhost:8000/docs
3. **Frontend:** http://localhost:3000
4. **Real-time Events:** Events should appear on dashboard every 5 seconds
5. **Attack Simulation:** Use the Attack Simulator to generate incidents

---

## 9. Demo Mode Testing Checklist

When running in demo mode, verify these features work:

| Feature | Expected Behavior |
|---------|-------------------|
| **Login** | Any email/password accepted |
| **Dashboard Stats** | Shows 247 events, 12 incidents, 4 active |
| **Live Feed** | WebSocket shows "LIVE", events stream in |
| **Attack Simulator** | Creates incidents locally (stored in browser) |
| **ML Training** | Shows "trained with 1847 samples" |
| **Incidents Page** | Shows pre-populated + simulated incidents |
| **Resolve Incident** | Status changes to "Resolved" |
| **Alerts Page** | Auto-generates alerts every 5 seconds |
| **Reports Page** | Shows forensic data with processes/connections |
| **AI Summary** | Returns instant Gemini-style analysis |
| **Demo Mode Badge** | Yellow "DEMO MODE" indicator in sidebar |

---

## 10. File Structure for Demo Mode

```
frontend/src/
├── constants.js          # DEMO_MODE = true + hardcoded data
├── services/
│   ├── api.js           # Mock API interceptor
│   └── websocket.js     # Simulated WebSocket events
├── pages/
│   ├── Login.js         # Auto-login
│   ├── Dashboard.js     # Demo stats
│   ├── AttackSimulator.js # Local incident creation
│   ├── Alerts.js        # Auto-generated alerts
│   ├── Incidents.js     # Demo incidents
│   ├── Reports.js       # Demo forensics
│   └── IncidentDetail.js # Demo forensic report
└── components/
    └── Layout.js        # Demo mode indicator

backend/app/
├── config/
│   └── demo_mode.py     # DEMO_MODE = True + demo data
├── forensics.py         # Demo forensic snapshot
└── gemini_client.py     # Demo AI summary
```
