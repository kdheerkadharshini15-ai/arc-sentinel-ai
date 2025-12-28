# ============================================================================
# A.R.C SENTINEL - Deployment Guide
# Production Deployment Instructions
# ============================================================================

## Table of Contents
1. [Local Development](#local-development)
2. [Production Environment](#production-environment)
3. [Docker Deployment](#docker-deployment)
4. [Cloud Deployment Options](#cloud-deployment-options)
5. [Database Setup](#database-setup)
6. [Troubleshooting](#troubleshooting)

---

## Local Development

### Prerequisites
- Python 3.10+
- Node.js 18+ (for frontend)
- Supabase account (free tier works)
- Google AI Studio account (for Gemini API)

### Step 1: Clone and Setup Backend
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

### Step 2: Configure Environment
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=eyJ...your_anon_key...
SUPABASE_SERVICE_ROLE_KEY=eyJ...your_service_role_key...
GEMINI_API_KEY=AI...your_gemini_key...
HOST=0.0.0.0
PORT=8000
DEBUG=true
```

### Step 3: Setup Supabase Database
Run the SQL migrations in Supabase SQL Editor (see [Database Setup](#database-setup))

### Step 4: Start Backend
```bash
python server.py
```
Backend runs at: http://localhost:8000

### Step 5: Start Frontend
```bash
cd frontend
npm install
npm start
```
Frontend runs at: http://localhost:3000

---

## Production Environment

### Environment Variables (.env.production)
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_api_key
HOST=0.0.0.0
PORT=8000
DEBUG=false
LOG_LEVEL=INFO
CORS_ORIGINS=https://your-frontend-domain.com
```

### Production Startup Command
```bash
uvicorn server:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## Docker Deployment

### Dockerfile (Backend)
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
```

### docker-compose.yml
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file:
      - ./backend/.env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
    restart: unless-stopped
```

### Build and Run
```bash
docker-compose up -d --build
```

---

## Cloud Deployment Options

### Option 1: Railway (Recommended for Hackathon)
1. Connect GitHub repository
2. Add environment variables
3. Deploy with one click

### Option 2: Render
1. Create new Web Service
2. Connect repository
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `uvicorn server:app --host 0.0.0.0 --port $PORT`

### Option 3: Google Cloud Run
```bash
gcloud run deploy arc-sentinel \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Option 4: AWS (EC2 + Application Load Balancer)
1. Launch EC2 instance (t3.small minimum)
2. Install Python, clone repo
3. Setup systemd service
4. Configure ALB for HTTPS

---

## Database Setup

### Supabase SQL Migrations

Run these in Supabase SQL Editor:

```sql
-- Events Table
CREATE TABLE IF NOT EXISTS events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) DEFAULT 'low',
    source_ip VARCHAR(45),
    destination_ip VARCHAR(45),
    destination_port INTEGER,
    bytes_transferred BIGINT DEFAULT 0,
    details JSONB DEFAULT '{}',
    ml_flagged BOOLEAN DEFAULT false,
    ml_score FLOAT,
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Incidents Table
CREATE TABLE IF NOT EXISTS incidents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'open',
    threat_type VARCHAR(100),
    source_ip VARCHAR(45),
    event_ids UUID[] DEFAULT '{}',
    indicators TEXT[] DEFAULT '{}',
    ml_flagged BOOLEAN DEFAULT false,
    ml_confidence FLOAT,
    resolution TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Forensic Reports Table
CREATE TABLE IF NOT EXISTS forensic_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
    forensic_data JSONB DEFAULT '{}',
    gemini_summary TEXT,
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    captured_by UUID
);

-- Audit Log Table
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quarantined Devices Table
CREATE TABLE IF NOT EXISTS quarantined_devices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id VARCHAR(255) NOT NULL,
    source_ip VARCHAR(45),
    incident_id VARCHAR(255),
    quarantined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'active'
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_severity ON events(severity);
CREATE INDEX IF NOT EXISTS idx_events_source_ip ON events(source_ip);
CREATE INDEX IF NOT EXISTS idx_events_ml_flagged ON events(ml_flagged);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at DESC);

-- Enable Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE forensic_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow authenticated users)
CREATE POLICY "Allow authenticated read events" ON events
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read incidents" ON incidents
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated all forensic_reports" ON forensic_reports
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read audit_log" ON audit_log
    FOR SELECT TO authenticated USING (true);
```

---

## Troubleshooting

### Common Issues

**1. Supabase Connection Failed**
```
Error: Invalid API key
```
Solution: Verify SUPABASE_URL and SUPABASE_KEY in .env

**2. Gemini API Error**
```
Error: API key not valid
```
Solution: Check GEMINI_API_KEY, ensure it's from AI Studio

**3. WebSocket Connection Failed**
```
WebSocket connection to 'ws://...' failed
```
Solution: Check CORS settings, ensure backend is running

**4. ML Model Not Trained**
```
Warning: Model not trained
```
Solution: Call POST /api/ml/train after ingesting events

**5. Port Already in Use**
```
Error: Address already in use
```
Solution: Kill existing process or change PORT in .env

### Health Check
```bash
curl http://localhost:8000/health
```
Expected: `{"status": "healthy", "timestamp": "..."}`

---

## Security Checklist

- [ ] Change default passwords
- [ ] Enable HTTPS in production
- [ ] Set DEBUG=false in production
- [ ] Configure proper CORS origins
- [ ] Enable Supabase RLS policies
- [ ] Rotate API keys regularly
- [ ] Monitor audit logs

---

**Deployment Status: READY**

For questions, check the API docs at `/docs` or the Postman collection.
