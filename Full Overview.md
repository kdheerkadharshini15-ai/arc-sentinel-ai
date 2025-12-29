# 🛡️ A.R.C SENTINEL
## Autonomous Response & Correlation Security Intelligence Platform

---

## 📋 Executive Summary

**A.R.C SENTINEL** is an AI-powered Security Operations Center (SOC) platform that combines machine learning anomaly detection, automated incident response, and Google Gemini AI integration to transform how organizations detect and respond to cyber threats.

**The Problem:** Security teams are drowning in alerts—90% are false positives. Traditional SOCs rely on static rules that miss sophisticated attacks. When real threats slip through, response is too slow.

**Our Solution:** A.R.C SENTINEL reduces mean-time-to-respond from hours to seconds through intelligent automation and AI-powered analysis.

---

## 🎯 Core Features

### 1. 🔍 Dual-Layer Threat Detection
- **Rule-Based Detection** - Immediate pattern matching for known threats
- **ML Anomaly Detection** - Isolation Forest algorithm with 10 behavioral features
- **Shannon Entropy Analysis** - Detects encoded/encrypted malicious payloads
- **Real-time Scoring** - Every event gets an anomaly score (0.0 - 1.0)

### 2. 🤖 Gemini AI Integration
- **Instant Forensic Summaries** - AI-generated incident analysis
- **MITRE ATT&CK Mapping** - Automatic technique classification
- **5-Point Remediation Plans** - Actionable response recommendations
- **Contextual Intelligence** - Understands attack patterns and indicators

### 3. ⚡ Automated Response Engine
- **Process Isolation** - Terminate malicious processes automatically
- **Device Quarantine** - Network-level threat containment
- **Session Revocation** - Force logout compromised accounts
- **Tiered Response** - Actions based on severity and ML confidence

### 4. 📊 Real-Time Dashboard
- **Live Event Stream** - WebSocket-powered real-time updates
- **Incident Timeline** - Visual attack progression
- **Threat Analytics** - Severity distribution, trends, and metrics
- **ML Status Panel** - Model health and detection statistics

### 5. 🔬 Deep Forensics
- **Process Snapshots** - Running processes at incident time
- **Network Connections** - Active connections and suspicious IPs
- **Indicators of Compromise (IOCs)** - File hashes, registry keys, artifacts
- **Evidence Collection** - Complete forensic data preservation

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           A.R.C SENTINEL SOC PLATFORM                       │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────────────┐
│   Event Sources │     │    Frontend     │     │       External APIs         │
│  ─────────────  │     │  ─────────────  │     │  ─────────────────────────  │
│  • Firewalls    │     │  • React 19     │     │  • Google Gemini AI         │
│  • IDS/IPS      │     │  • TailwindCSS  │     │  • Supabase Auth            │
│  • Endpoints    │     │  • ShadCN UI    │     │  • WebSocket Real-time      │
│  • Cloud Logs   │     │  • Recharts     │     │                             │
└────────┬────────┘     └────────┬────────┘     └──────────────┬──────────────┘
         │                       │                              │
         │ Events                │ REST/WS                      │ API Calls
         ▼                       ▼                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND (FastAPI)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │   Auth Layer     │  │   API Routes     │  │    WebSocket Manager     │  │
│  │  Supabase JWT    │  │  /api/events     │  │  Real-time broadcasts    │  │
│  │  Session Mgmt    │  │  /api/incidents  │  │  • new_incident          │  │
│  │  Role-Based      │  │  /api/forensics  │  │  • critical_alert        │  │
│  └──────────────────┘  │  /api/ml         │  │  • device_quarantined    │  │
│                        │  /api/response   │  └──────────────────────────┘  │
│                        │  /api/gemini     │                                │
│                        └──────────────────┘                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Event Processing Pipeline                     │   │
│  │  ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐  │   │
│  │  │  Ingest    │──▶│ Rule-Based │──▶│     ML     │──▶│  Incident  │  │   │
│  │  │  Events    │   │ Detection  │   │  Scoring   │   │  Creation  │  │   │
│  │  └────────────┘   └────────────┘   └────────────┘   └────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │   ML Engine      │  │  Response Engine │  │    Gemini Client         │  │
│  │  Isolation       │  │  Process Isolate │  │  Incident Summarization  │  │
│  │  Forest Model    │  │  Device Quarant. │  │  Forensic Analysis       │  │
│  │  10 Features     │  │  Session Revoke  │  │  MITRE ATT&CK Mapping    │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────────┘  │
└────────────────────────────────────────────┬────────────────────────────────┘
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SUPABASE (PostgreSQL)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │    events    │  │  incidents   │  │  forensic_   │  │  audit_log   │    │
│  │              │  │              │  │  reports     │  │              │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 19, TailwindCSS, ShadCN/UI | Modern responsive UI |
| **Backend** | FastAPI, Python 3.11+, Uvicorn | High-performance async API |
| **Database** | Supabase (PostgreSQL) | Managed database with RLS |
| **Auth** | Supabase Auth, JWT | Enterprise-grade authentication |
| **ML** | scikit-learn (Isolation Forest) | Unsupervised anomaly detection |
| **AI** | Google Gemini Pro | Natural language forensics |
| **Real-time** | WebSocket | Live event streaming |
| **Charts** | Recharts | Data visualization |

---

## 🔬 ML Feature Engineering

The Isolation Forest model uses 10 engineered features for anomaly detection:

| Feature | Description | Range |
|---------|-------------|-------|
| `event_type_rarity` | How rare is this event type? | 0.0 - 1.0 |
| `source_ip_rarity` | How rare is this source IP? | 0.0 - 1.0 |
| `event_frequency` | Events from this IP in time window | 0.0 - 1.0 |
| `payload_entropy` | Shannon entropy of payload | 0.0 - 1.0 |
| `severity_score` | Mapped severity level | 0.0 - 1.0 |
| `hour_of_day` | Time-based pattern detection | 0.0 - 1.0 |
| `ip_last_octet` | Network segment analysis | 0.0 - 1.0 |
| `port_normalized` | Destination port analysis | 0.0 - 1.0 |
| `bytes_normalized` | Data volume (log scale) | 0.0 - 1.0 |
| `details_complexity` | JSON structure complexity | 0.0 - 1.0 |

**Anomaly Thresholds:**
- Score > 0.6 = Anomaly detected
- Score > 0.8 = Critical threat

---

## 📱 Application Pages

### 🏠 Dashboard
- Total events counter
- Active incidents tracker
- ML flagged events
- Live event feed (WebSocket)
- Severity distribution charts
- Recent incidents list

### ⚔️ Attack Simulator
- Simulate 6 attack types:
  - Brute Force
  - Port Scan
  - Malware Execution
  - DDoS Attack
  - SQL Injection
  - Privilege Escalation
- Train ML model on demand
- View ML model status

### 🚨 Incidents
- Full incident list
- Filter by severity/status
- Resolve incidents
- View forensic details
- AI-generated summaries

### 📡 Alerts
- Real-time alert stream
- Filter by type/severity
- Auto-refresh every 5 seconds
- Severity indicators

### 📊 Reports
- Select incident for analysis
- View forensic data:
  - Suspicious processes
  - Network connections
  - Indicators of Compromise
- Generate AI Summary
- Remediation recommendations

---

## 🔐 Security Features

| Feature | Implementation |
|---------|----------------|
| Authentication | Supabase JWT tokens |
| Authorization | Row-Level Security (RLS) |
| Session Management | Secure token handling |
| Input Validation | Pydantic models |
| CORS Protection | Configurable origins |
| Audit Logging | All actions tracked |

---

## 🚀 Deployment

### Vercel (Frontend)
```bash
cd frontend
npm install
npm run build:vercel
vercel --prod
```

### Render (Full Stack)
```bash
# Uses render.yaml configuration
# Deploys both frontend and backend
```

### Local Development
```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn server:app --reload

# Frontend
cd frontend
npm install
npm start
```

---

## 📂 Project Structure

```
arc-sentinel/
├── frontend/
│   ├── src/
│   │   ├── components/       # UI components (ShadCN)
│   │   ├── pages/           # Application pages
│   │   │   ├── Dashboard.js
│   │   │   ├── AttackSimulator.js
│   │   │   ├── Incidents.js
│   │   │   ├── Alerts.js
│   │   │   ├── Reports.js
│   │   │   └── Login.js
│   │   ├── services/        # API & WebSocket services
│   │   ├── context/         # React context (Auth)
│   │   ├── hooks/           # Custom hooks
│   │   └── constants.js     # Configuration flags
│   ├── package.json
│   └── vercel.json
│
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI routes
│   │   ├── ml_engine.py     # Isolation Forest
│   │   ├── gemini_client.py # AI integration
│   │   ├── response_engine.py # Automated response
│   │   ├── forensics.py     # Forensic capture
│   │   ├── detection.py     # Rule-based detection
│   │   ├── websocket_manager.py
│   │   └── config/
│   │       └── demo_mode.py # Demo configuration
│   ├── requirements.txt
│   └── server.py
│
├── tests/                   # Test suite
├── render.yaml             # Render deployment
├── howtorun.md            # Running instructions
└── PROJECT_OVERVIEW.md    # This file
```

---

## 🎮 Demo Mode

For hackathon presentations, the system includes a **Demo Mode** that:
- Works 100% offline
- Uses localStorage for data persistence
- Generates realistic attack simulations
- Creates AI-style forensic summaries
- Simulates WebSocket events

**Enable/Disable:**
- Frontend: `src/constants.js` → `DEMO_MODE = true/false`
- Backend: `app/config/demo_mode.py` → `DEMO_MODE = True/False`

---

## 📈 Performance Targets

| Metric | Target |
|--------|--------|
| Event ingestion | 1000/sec |
| ML inference | <10ms |
| API response (p95) | <100ms |
| WebSocket latency | <50ms |
| Concurrent users | 1000+ |

---

## 🗺️ Roadmap

### Phase 1 - Core (✅ Complete)
- [x] Event ingestion & storage
- [x] Rule-based detection
- [x] ML anomaly detection
- [x] Incident management
- [x] Real-time dashboard
- [x] Gemini AI integration
- [x] Automated response

### Phase 2 - Enterprise
- [ ] SIEM integration (Splunk, Elastic)
- [ ] SOAR playbook builder
- [ ] Advanced ML models (LSTM, Autoencoder)
- [ ] MITRE ATT&CK dashboard

### Phase 3 - Scale
- [ ] Multi-tenant support
- [ ] Compliance reporting (SOC 2, GDPR)
- [ ] Distributed ML training
- [ ] EDR agent integration

---

## 👥 Team

**A.R.C SENTINEL** - Built for the future of security operations.

---

## 📄 License

Proprietary - Hackathon Submission

---

*Last Updated: December 29, 2025*