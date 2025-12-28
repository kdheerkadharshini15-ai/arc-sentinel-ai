# ============================================================================
# A.R.C SENTINEL - Architecture Documentation
# System Design & Data Flow
# ============================================================================

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           A.R.C SENTINEL SOC PLATFORM                       │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────────────┐
│   Event Sources │     │    Frontend     │     │       External APIs         │
│  ─────────────  │     │  ─────────────  │     │  ─────────────────────────  │
│  • Firewalls    │     │  • React SPA    │     │  • Google Gemini AI         │
│  • IDS/IPS      │     │  • TailwindCSS  │     │  • Supabase Auth            │
│  • Endpoints    │     │  • ShadCN UI    │     │  • Email/Slack (Future)     │
│  • Cloud Logs   │     │  • WebSocket    │     │                             │
└────────┬────────┘     └────────┬────────┘     └──────────────┬──────────────┘
         │                       │                              │
         │ Events                │ REST/WS                      │ API Calls
         ▼                       ▼                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND (FastAPI)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │   Auth Layer     │  │   API Routes     │  │    WebSocket Manager     │  │
│  │  ─────────────   │  │  ─────────────   │  │  ──────────────────────  │  │
│  │  Supabase JWT    │  │  /api/events     │  │  Real-time broadcasts    │  │
│  │  Session Mgmt    │  │  /api/incidents  │  │  • new_incident          │  │
│  │  Role-Based      │  │  /api/forensics  │  │  • critical_alert        │  │
│  └──────────────────┘  │  /api/ml         │  │  • device_quarantined    │  │
│                        │  /api/response   │  └──────────────────────────┘  │
│                        │  /api/gemini     │                                │
│                        └──────────────────┘                                │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Event Processing Pipeline                     │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │  ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐  │   │
│  │  │  Ingest    │──▶│ Rule-Based │──▶│     ML     │──▶│  Incident  │  │   │
│  │  │  Events    │   │ Detection  │   │  Scoring   │   │  Creation  │  │   │
│  │  └────────────┘   └────────────┘   └────────────┘   └────────────┘  │   │
│  │       │                                                    │         │   │
│  │       │              5-second processing loop              │         │   │
│  │       └────────────────────────────────────────────────────┘         │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │   ML Engine      │  │  Response Engine │  │    Gemini Client         │  │
│  │  ─────────────   │  │  ──────────────  │  │  ──────────────────────  │  │
│  │  Isolation       │  │  Process Isolate │  │  Incident Summarization  │  │
│  │  Forest Model    │  │  Device Quarant. │  │  Forensic Analysis       │  │
│  │  10 Features     │  │  Session Revoke  │  │  MITRE ATT&CK Mapping    │  │
│  │  Shannon Entropy │  │  Alert Escalate  │  │  5-Bullet Remediation    │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────────┘  │
│                                                                             │
└────────────────────────────────────────────┬────────────────────────────────┘
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SUPABASE (PostgreSQL)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │    events    │  │  incidents   │  │  forensic_   │  │  audit_log   │    │
│  │              │  │              │  │  reports     │  │              │    │
│  │ • id         │  │ • id         │  │ • id         │  │ • id         │    │
│  │ • event_type │  │ • title      │  │ • incident_id│  │ • user_id    │    │
│  │ • severity   │  │ • severity   │  │ • forensic_  │  │ • action     │    │
│  │ • source_ip  │  │ • status     │  │   data       │  │ • details    │    │
│  │ • ml_flagged │  │ • ml_flagged │  │ • gemini_    │  │ • timestamp  │    │
│  │ • ml_score   │  │ • resolution │  │   summary    │  │              │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                             │
│  ┌──────────────────────────┐  ┌──────────────────────────────────────┐    │
│  │   quarantined_devices    │  │           Supabase Auth              │    │
│  │                          │  │  ────────────────────────────────    │    │
│  │ • device_id              │  │  • User registration/login           │    │
│  │ • source_ip              │  │  • Email verification                │    │
│  │ • incident_id            │  │  • JWT token management              │    │
│  │ • quarantined_at         │  │  • Session handling                  │    │
│  └──────────────────────────┘  └──────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ML Feature Engineering Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     ISOLATION FOREST FEATURE EXTRACTION                     │
└─────────────────────────────────────────────────────────────────────────────┘

Raw Event Data                    Feature Engineering                  Model Input
─────────────                     ───────────────────                  ───────────

┌─────────────────┐              ┌──────────────────────┐            ┌──────────┐
│ event_type      │──────────────│ event_type_rarity    │───────────▶│ Float[0] │
│ "auth_failure"  │   DB Query   │ (0.0 - 1.0)          │            │ 0.15     │
└─────────────────┘              └──────────────────────┘            └──────────┘

┌─────────────────┐              ┌──────────────────────┐            ┌──────────┐
│ source_ip       │──────────────│ source_ip_rarity     │───────────▶│ Float[1] │
│ "192.168.1.100" │   DB Query   │ (0.0 - 1.0)          │            │ 0.85     │
└─────────────────┘              └──────────────────────┘            └──────────┘

┌─────────────────┐              ┌──────────────────────┐            ┌──────────┐
│ source_ip +     │──────────────│ event_frequency      │───────────▶│ Float[2] │
│ time_window     │   DB Query   │ (count / 100)        │            │ 0.42     │
└─────────────────┘              └──────────────────────┘            └──────────┘

┌─────────────────┐              ┌──────────────────────┐            ┌──────────┐
│ details (JSON)  │──────────────│ payload_entropy      │───────────▶│ Float[3] │
│ {"user": "..."} │   Shannon    │ (0.0 - 1.0)          │            │ 0.67     │
└─────────────────┘              └──────────────────────┘            └──────────┘

┌─────────────────┐              ┌──────────────────────┐            ┌──────────┐
│ severity        │──────────────│ severity_score       │───────────▶│ Float[4] │
│ "high"          │   Mapping    │ (0.0 - 1.0)          │            │ 0.75     │
└─────────────────┘              └──────────────────────┘            └──────────┘

┌─────────────────┐              ┌──────────────────────┐            ┌──────────┐
│ timestamp       │──────────────│ hour_of_day          │───────────▶│ Float[5] │
│ "2025-01-15..." │   Extract    │ (hour / 24)          │            │ 0.125    │
└─────────────────┘              └──────────────────────┘            └──────────┘

┌─────────────────┐              ┌──────────────────────┐            ┌──────────┐
│ source_ip       │──────────────│ ip_last_octet        │───────────▶│ Float[6] │
│ "192.168.1.100" │   Extract    │ (octet / 255)        │            │ 0.39     │
└─────────────────┘              └──────────────────────┘            └──────────┘

┌─────────────────┐              ┌──────────────────────┐            ┌──────────┐
│ destination_port│──────────────│ port_normalized      │───────────▶│ Float[7] │
│ 22              │   Normalize  │ (port / 65535)       │            │ 0.00034  │
└─────────────────┘              └──────────────────────┘            └──────────┘

┌─────────────────┐              ┌──────────────────────┐            ┌──────────┐
│ bytes_transferred│─────────────│ bytes_normalized     │───────────▶│ Float[8] │
│ 15000           │   Log Scale  │ log(bytes)/log(max)  │            │ 0.52     │
└─────────────────┘              └──────────────────────┘            └──────────┘

┌─────────────────┐              ┌──────────────────────┐            ┌──────────┐
│ details (JSON)  │──────────────│ details_complexity   │───────────▶│ Float[9] │
│ {"nested":...}  │   Key Count  │ (keys / 50)          │            │ 0.12     │
└─────────────────┘              └──────────────────────┘            └──────────┘

                                                                            │
                                                                            ▼
                                                            ┌───────────────────────┐
                                                            │   Isolation Forest    │
                                                            │   ─────────────────   │
                                                            │   contamination=0.1   │
                                                            │   n_estimators=100    │
                                                            │   random_state=42     │
                                                            └───────────┬───────────┘
                                                                        │
                                                                        ▼
                                                            ┌───────────────────────┐
                                                            │   Anomaly Score       │
                                                            │   (0.0 - 1.0)         │
                                                            │   ─────────────────   │
                                                            │   > 0.6 = Anomaly     │
                                                            │   > 0.8 = Critical    │
                                                            └───────────────────────┘
```

---

## Incident Response Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AUTOMATED RESPONSE FLOW                            │
└─────────────────────────────────────────────────────────────────────────────┘

Event Detected                     Severity Assessment                  Response
──────────────                     ───────────────────                  ────────

┌─────────────────┐
│ New Event       │
│ Ingested        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Rule-Based      │───No Match──────────────────────────────────▶ Log & Continue
│ Detection       │
└────────┬────────┘
         │ Match
         ▼
┌─────────────────┐
│ ML Scoring      │
│ (Isolation      │
│  Forest)        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Incident        │
│ Created         │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SEVERITY ROUTER                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐     │
│  │    LOW      │   │   MEDIUM    │   │    HIGH     │   │  CRITICAL   │     │
│  │  ───────    │   │  ────────   │   │  ───────    │   │  ─────────  │     │
│  │             │   │             │   │             │   │             │     │
│  │ • Log event │   │ • Log event │   │ • Log event │   │ • Log event │     │
│  │ • Store in  │   │ • Store in  │   │ • Store in  │   │ • Store DB  │     │
│  │   database  │   │   database  │   │   database  │   │ • WebSocket │     │
│  │             │   │ • WebSocket │   │ • WebSocket │   │   Broadcast │     │
│  │             │   │   Notify    │   │   Alert     │   │ • AUTO      │     │
│  │             │   │             │   │ • Flag for  │   │   RESPONSE  │     │
│  │             │   │             │   │   Review    │   │ • Escalate  │     │
│  │             │   │             │   │             │   │ • Notify    │     │
│  └─────────────┘   └─────────────┘   └─────────────┘   └──────┬──────┘     │
│                                                               │             │
└───────────────────────────────────────────────────────────────┼─────────────┘
                                                                │
                                                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CRITICAL INCIDENT AUTO-RESPONSE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    execute_response(incident)                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│          ┌─────────────────────────┼─────────────────────────┐             │
│          │                         │                         │             │
│          ▼                         ▼                         ▼             │
│  ┌───────────────┐         ┌───────────────┐         ┌───────────────┐     │
│  │ isolate_      │         │ quarantine_   │         │ revoke_user_  │     │
│  │ process()     │         │ device()      │         │ session()     │     │
│  │ ───────────── │         │ ───────────── │         │ ───────────── │     │
│  │ • Get PID     │         │ • Mark in DB  │         │ • Revoke via  │     │
│  │ • Suspend/    │         │ • Block IP    │         │   Supabase    │     │
│  │   Terminate   │         │ • Notify      │         │ • Force       │     │
│  │ • Log action  │         │ • Log action  │         │   logout      │     │
│  └───────────────┘         └───────────────┘         └───────────────┘     │
│          │                         │                         │             │
│          └─────────────────────────┼─────────────────────────┘             │
│                                    │                                        │
│                                    ▼                                        │
│                         ┌───────────────────┐                              │
│                         │ escalate_         │                              │
│                         │ notification()    │                              │
│                         │ ───────────────── │                              │
│                         │ • WebSocket push  │                              │
│                         │ • Email alert     │                              │
│                         │ • Slack webhook   │                              │
│                         │ • Audit log       │                              │
│                         └───────────────────┘                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TECHNOLOGY STACK                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  FRONTEND                  BACKEND                   INFRASTRUCTURE         │
│  ────────                  ───────                   ──────────────         │
│                                                                             │
│  • React 18               • FastAPI 0.110           • Supabase (Postgres)  │
│  • TailwindCSS            • Python 3.10+            • Supabase Auth        │
│  • ShadCN/UI              • Uvicorn ASGI            • Google Gemini Pro    │
│  • Lucide Icons           • scikit-learn            • WebSocket            │
│  • Recharts               • psutil                  • Row-Level Security   │
│                           • google-generativeai                             │
│                                                                             │
│  SECURITY                  ML/AI                     MONITORING            │
│  ────────                  ─────                     ──────────            │
│                                                                             │
│  • JWT Bearer Tokens      • Isolation Forest        • Health endpoints     │
│  • Supabase RLS           • Shannon Entropy         • Audit logging        │
│  • CORS Protection        • Feature Engineering     • Action tracking      │
│  • Input Validation       • Gemini Summarization    • WebSocket status     │
│                           • MITRE ATT&CK                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## API Endpoint Map

```
                              A.R.C SENTINEL API
                              ─────────────────

                                  /health
                                     │
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         ▼                           ▼                           ▼
    /api/auth                   /api/events               /api/incidents
    ─────────                   ───────────               ──────────────
    POST /register              GET /                     GET /
    POST /login                 GET /{id}                 GET /{id}
    GET  /me                                              POST /
    POST /logout                                          PATCH /{id}
                                                          POST /{id}/resolve
                                                          POST /{id}/investigate
         │                           │                           │
         └───────────────────────────┼───────────────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         ▼                           ▼                           ▼
   /api/forensics               /api/ml                  /api/gemini
   ──────────────               ───────                  ───────────
   GET /{incident_id}           GET /status              POST /summarize/{id}
   POST /{incident_id}/capture  POST /predict
                                POST /train
                                     │
                                     │
                                     ▼
                              /api/response
                              ─────────────
                              POST /isolate-process/{pid}
                              POST /quarantine-device
                              POST /revoke-session/{uid}
                              GET  /quarantined-devices
                              GET  /isolated-processes
                              GET  /action-log
                                     │
                                     │
                                     ▼
                                   /ws
                                   ────
                              WebSocket endpoint
                              Real-time broadcasts
```

---

*Architecture Document - A.R.C SENTINEL v1.0*
