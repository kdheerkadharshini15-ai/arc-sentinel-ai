# A.R.C SENTINEL - How to Run

## Prerequisites

- **Python 3.10+** installed
- **Node.js 18+** and npm installed
- **Supabase** account with project credentials
- **Google Gemini API** key (optional, for AI summaries)

---

## 1. Backend Setup

### Open Terminal and Navigate to Backend

```powershell
cd "d:\Projects\New folder\dwwd\backend"
```

### Create Virtual Environment (First Time Only)

```powershell
python -m venv venv
```

### Activate Virtual Environment

```powershell
.\venv\Scripts\Activate
```

### Install Dependencies

```powershell
pip install -r requirements.txt
```

### Create Environment File

Create a `.env` file in the backend folder:

```powershell
New-Item -Path ".env" -ItemType File
```

Add these variables to `backend/.env`:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_jwt_secret_key
```

### Run Backend Server

```powershell
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

Backend will be available at: `http://localhost:8000`

---

## 2. Frontend Setup

### Open New Terminal and Navigate to Frontend

```powershell
cd "d:\Projects\New folder\dwwd\frontend"
```

### Install Dependencies (First Time Only)

```powershell
npm install
```

### Verify Environment File

Check that `frontend/.env` contains:

```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8000
```

### Run Frontend Development Server

```powershell
npm start
```

Frontend will be available at: `http://localhost:3000`

---

## 3. Quick Start (Both Servers)

### Terminal 1 - Backend

```powershell
cd "d:\Projects\New folder\dwwd\backend"
.\venv\Scripts\Activate
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

### Terminal 2 - Frontend

```powershell
cd "d:\Projects\New folder\dwwd\frontend"
npm start
```

---

## 4. Access the Application

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| WebSocket | ws://localhost:8000/ws |

---

## 5. Troubleshooting

### Backend Issues

**Port already in use:**
```powershell
# Find process using port 8000
netstat -ano | findstr :8000
# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

**Module not found:**
```powershell
pip install -r requirements.txt
```

### Frontend Issues

**Port already in use:**
```powershell
# Use different port
$env:PORT=3001; npm start
```

**Clear cache and reinstall:**
```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

---

## 6. Production Build

### Build Frontend for Production

```powershell
cd "d:\Projects\New folder\dwwd\frontend"
npm run build
```

### Run Backend in Production Mode

```powershell
cd "d:\Projects\New folder\dwwd\backend"
.\venv\Scripts\Activate
uvicorn server:app --host 0.0.0.0 --port 8000 --workers 4
```
