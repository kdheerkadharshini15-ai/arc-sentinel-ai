# A.R.C SENTINEL - Backend API

## 🛡️ Security Operations Center Platform

FastAPI backend for real-time security monitoring, ML-powered threat detection, AI-enhanced analysis, and automated incident response.

**STATUS: ✅ PRODUCTION READY**

---

## 🎯 Key Features

| Feature | Technology | Status |
|---------|------------|--------|
| Authentication | Supabase Auth (JWT) | ✅ Complete |
| Event Processing | 5-second async pipeline | ✅ Complete |
| Rule-Based Detection | Threshold-based rules | ✅ Complete |
| ML Anomaly Detection | Isolation Forest (10 features) | ✅ Complete |
| Forensics Capture | psutil system snapshot | ✅ Complete |
| AI Summarization | Google Gemini Pro | ✅ Complete |
| Automated Response | Process/Device/Session control | ✅ Complete |
| Real-Time Updates | WebSocket broadcasts | ✅ Complete |

---

## 📐 Architecture Overview

```
backend/
├── server.py                 # Main FastAPI application
├── requirements.txt          # Python dependencies
├── .env                      # Environment configuration (create from template)
├── .env.production           # Production environment template
├── supabase_schema.sql       # Database schema
├── startup.sh                # Linux/Mac startup script
├── startup.bat               # Windows startup script
├── api_tests.http            # VS Code REST Client tests
├── postman_collection.json   # Postman API collection
├── BACKEND_READY.md          # Completion checklist for judges
├── DEPLOYMENT.md             # Deployment guide
├── ARCHITECTURE.md           # Architecture diagrams (ASCII)
├── PITCH_SCRIPT.md           # 60-second judge pitch
├── LIMITATIONS_AND_ROADMAP.md # Known issues + future plans
└── app/
    ├── __init__.py
    ├── config.py             # Configuration management
    ├── database.py           # Supabase operations + Auth + ML queries
    ├── models.py             # Pydantic schemas
    ├── websocket_manager.py  # WebSocket connection manager
    ├── detection.py          # Rule-based threat detection
    ├── ml_engine.py          # Isolation Forest (10-feature model)
    ├── forensics.py          # System forensics capture (psutil)
    ├── gemini_client.py      # Gemini AI integration (temp=0.2)
    ├── response_engine.py    # Automated response actions
    └── telemetry.py          # Event generation/simulation
```

---

## 🚀 Quick Start

### Option 1: One-Command Startup

**Windows:**
```bash
cd backend
startup.bat
```

**Linux/Mac:**
```bash
cd backend
chmod +x startup.sh
./startup.sh
```

### Option 2: Manual Setup

#### 1. Install Dependencies

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

#### 2. Configure Environment

Copy `.env.production` to `.env` and configure:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
HOST=0.0.0.0
PORT=8000
DEBUG=true
```

#### 3. Setup Database

Run the SQL schema in your Supabase SQL Editor (see DEPLOYMENT.md for full schema).

#### 4. Run Server

```bash
python server.py
```

**Server runs at:** http://localhost:8000  
**API Docs at:** http://localhost:8000/docs

---

## 🔐 Authentication (Supabase Auth)

This backend uses **Supabase Auth** with email verification. No custom JWT handling - all authentication is managed by Supabase.

### Auth Flow

1. **Sign Up** → User receives verification email
2. **Verify Email** → User clicks link in email
3. **Login** → Returns `access_token` + `refresh_token`
4. **API Calls** → Include `Authorization: Bearer <access_token>`
5. **Token Refresh** → Use `refresh_token` to get new access token

---

## 📡 API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register new user (sends verification email) |
| POST | `/login` | Authenticate user (returns tokens) |
| POST | `/logout` | Sign out user |
| POST | `/refresh` | Refresh access token |
| GET | `/me` | Get current user info |

### Events (`/api/events`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List events (paginated, filtered by severity/type/ip/ml_flagged) |
| GET | `/{id}` | Get single event |

### Incidents (`/api/incidents`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List incidents (with summary metrics) |
| GET | `/{id}` | Get incident details |
| POST | `/` | Create manual incident |
| PATCH | `/{id}` | Update incident |
| POST | `/{id}/resolve` | Resolve incident (with audit log) |
| POST | `/{id}/investigate` | Start investigation |

### Forensics (`/api/forensics`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/{incident_id}` | Get forensic report |
| POST | `/{incident_id}/capture` | Capture live system snapshot |

### Machine Learning (`/api/ml`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/status` | Get model status + feature count |
| POST | `/predict` | Manual anomaly prediction |
| POST | `/train` | Train/retrain model |

### Gemini AI (`/api/gemini`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/summarize/{incident_id}` | Generate AI summary with 5-bullet remediation |

### Response Automation (`/api/response`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/isolate-process/{pid}` | Isolate process by PID |
| POST | `/quarantine-device` | Quarantine device by ID/IP |
| POST | `/revoke-session/{user_id}` | Revoke user session |
| GET | `/quarantined-devices` | List quarantined devices |
| GET | `/isolated-processes` | List isolated processes |
| GET | `/action-log` | Get response action audit log |

### WebSocket

| Protocol | Endpoint | Description |
|----------|----------|-------------|
| WS | `/ws` | Real-time broadcasts (new_incident, critical_alert, etc.) |

### Attack Simulation (`/api/simulate`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/attack` | Simulate attack chain |

**Attack Types:** `bruteforce`, `port_scan`, `malware`, `ddos`, `sql_injection`, `privilege_escalation`, `exfiltration`

---

## 🗃️ Database Schema

### Tables

1. **users** - User profiles (linked to Supabase Auth)
2. **events** - Security telemetry events
3. **incidents** - Detected security incidents
4. **forensic_reports** - System forensic snapshots
5. **ml_model** - Serialized ML model storage
6. **ml_scores** - ML prediction tracking
7. **audit_log** - User action audit trail

### Event Schema

```json
{
  "id": "string (16 char)",
  "timestamp": "ISO datetime",
  "type": "os_event | login_event | process_event | network_event",
  "severity": "low | medium | high | critical",
  "source_ip": "IP address",
  "details": {},
  "anomaly_score": 0.0,
  "ml_flagged": false
}
```

### Incident Schema

```json
{
  "id": "string",
  "threat_type": "bruteforce | malware | ddos | ...",
  "status": "active | investigating | resolved",
  "severity": "low | medium | high | critical",
  "description": "string",
  "event_id": "reference to trigger event",
  "created_at": "ISO datetime",
  "resolved_at": "ISO datetime or null",
  "resolution_notes": "string or null"
}
```

---

## 🧠 Detection Engine

### Rule-Based Detection

| Threat | Rule | Severity |
|--------|------|----------|
| Brute Force | >5 failed logins in 30s | HIGH |
| Malware | Suspicious process or hash | CRITICAL |
| DDoS | Traffic > baseline × 4 | CRITICAL |
| SQL Injection | UNION SELECT, DROP TABLE patterns | HIGH |
| Exfiltration | Outbound bytes > 50KB | HIGH |
| Privilege Escalation | User -> root change | CRITICAL |
| Malicious Traffic | Connection to blacklist IP | CRITICAL |

### ML Detection (Isolation Forest - 10 Features)

| Feature | Description | Range |
|---------|-------------|-------|
| event_type_rarity | How rare is this event type | 0.0-1.0 |
| source_ip_rarity | How novel is this IP | 0.0-1.0 |
| event_frequency | Events from IP in last 5 min | Normalized |
| payload_entropy | Shannon entropy of payload | 0.0-1.0 |
| severity_score | Severity level mapping | 0.0-1.0 |
| hour_of_day | Time of event | 0.0-1.0 |
| ip_last_octet | IP address pattern | 0.0-1.0 |
| port_normalized | Destination port | 0.0-1.0 |
| bytes_normalized | Bytes transferred (log scale) | 0.0-1.0 |
| details_complexity | JSON payload complexity | 0.0-1.0 |

**Model Configuration:**
- Contamination: 10%
- Anomaly Threshold: 0.6 (warning), 0.8 (critical)
- n_estimators: 100

---

## 🔍 Forensics Engine

Captures system state on incident detection:

- **System Info:** CPU, memory, disk usage
- **Processes:** Top 20 by CPU usage
- **Connections:** Active network connections
- **Packet Data:** Mock capture simulation
- **IOCs:** Extracted indicators of compromise
- **Recommendations:** Auto-generated remediation steps

---

## 🤖 Gemini AI Integration

**Model:** gemini-pro  
**Temperature:** 0.2 (for consistent output)

Generates intelligent incident summaries including:

1. **Forensic Snapshot Analysis** - System state at detection time
2. **ML Anomaly Score Context** - Why ML flagged this event
3. **MITRE ATT&CK Mapping** - Tactic/technique identification
4. **5-Bullet Remediation Plan** - Actionable steps
5. **Prevention Measures** - Future protection recommendations

**Fallback:** Structured summary generated when Gemini unavailable.

---

## ⚡ Response Automation

### Automated Response Actions (Critical Incidents)

| Action | Description | Trigger |
|--------|-------------|---------|
| `isolate_process()` | Terminate/suspend malicious process | PID identified |
| `quarantine_device()` | Mark device as isolated in DB | Device ID + IP |
| `revoke_user_session()` | Force logout via Supabase | User compromise |
| `escalate_notification()` | WebSocket + email alert | Critical severity |

### Response Flow

```
Critical Incident Detected
         │
         ▼
    ML Score > 0.8?
         │
    Yes  │  No
         ▼     ▼
  Auto-Response   Manual Review
         │
         ├── Isolate Process
         ├── Quarantine Device
         ├── Revoke Session
         └── Escalate Alert
```

---

## 📡 WebSocket Events

Connect to `/ws` for real-time updates.

### Message Types

```json
// New incident
{ "type": "new_incident", "data": { /* incident */ } }

// Critical alert (triggers response automation)
{ "type": "critical_alert", "data": { /* incident */ } }

// Incident resolved
{ "type": "incident_resolved", "data": { /* incident */ } }

// Device quarantined
{ "type": "device_quarantined", "data": { /* device info */ } }
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Supabase project URL | ✅ Yes |
| `SUPABASE_KEY` | Supabase anon key | ✅ Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | ✅ Yes |
| `GEMINI_API_KEY` | Google Gemini API key | ✅ Yes |
| `HOST` | Server host | Default: 0.0.0.0 |
| `PORT` | Server port | Default: 8000 |
| `DEBUG` | Debug mode | Default: true |
| `CORS_ORIGINS` | Allowed CORS origins | Default: * |

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [BACKEND_READY.md](BACKEND_READY.md) | Completion checklist for judges |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Full deployment guide + SQL schema |
| [ARCHITECTURE.md](ARCHITECTURE.md) | ASCII architecture diagrams |
| [PITCH_SCRIPT.md](PITCH_SCRIPT.md) | 60-second judge pitch |
| [LIMITATIONS_AND_ROADMAP.md](LIMITATIONS_AND_ROADMAP.md) | Known issues + roadmap |
| [api_tests.http](api_tests.http) | VS Code REST Client tests |
| [postman_collection.json](postman_collection.json) | Postman collection |

---

## 🧪 Testing

### VS Code REST Client
Open `api_tests.http` in VS Code with REST Client extension installed.

### Postman
Import `postman_collection.json` into Postman.

### Manual cURL
```bash
# Health check
curl http://localhost:8000/health

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

---

## 🔒 Security Notes

1. **Supabase Auth:** Email verification required before login
2. **Access Tokens:** Short-lived JWT, use refresh tokens to renew
3. **Service Role:** Only used server-side for admin operations
4. **CORS:** Configure properly for production (not *)
5. **RLS:** Row Level Security enabled on all Supabase tables
6. **Audit Log:** All response actions logged for compliance
7. **API Keys:** Never commit `.env` to version control

---

## 📝 License

MIT License - A.R.C SENTINEL Project

---

## ✅ Phase Completion

- **PHASE 1:** Architecture & Supabase Auth ✅
- **PHASE 2:** Core Routing & Event Pipeline ✅
- **PHASE 3:** ML Engine (Isolation Forest) ✅
- **PHASE 4:** Forensics & Gemini AI ✅
- **PHASE 5:** Response Automation ✅
- **PHASE 6:** Integration Validation ✅
- **PHASE 7:** Deployment & Documentation ✅

**ALL PHASES COMPLETE. BACKEND PRODUCTION READY.**
