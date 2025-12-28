from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import asyncio
import random
import hashlib
import psutil
import json
import os
from jose import jwt, JWTError
from passlib.context import CryptContext
from supabase import create_client, Client
from sklearn.ensemble import IsolationForest
import numpy as np
import pickle

app = FastAPI()

# Environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
JWT_SECRET = os.getenv("JWT_SECRET", "arc-sentinel-jwt-secret")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[CORS_ORIGINS] if CORS_ORIGINS != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

# ML Model storage
ml_model = None
ml_scaler = None

# WebSocket manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

# Pydantic models
class LoginRequest(BaseModel):
    email: str
    password: str

class AttackSimulation(BaseModel):
    attack_type: str
    target: Optional[str] = "192.168.1.100"
    intensity: Optional[int] = 1

class IncidentResolve(BaseModel):
    resolution_notes: Optional[str] = ""

# Blacklist IPs
BLACKLIST_IPS = ["45.33.32.156", "198.51.100.42", "203.0.113.0", "192.0.2.1"]

# Helper functions
def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm="HS256")

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Event generator
async def generate_telemetry():
    """Generate telemetry events every 5 seconds"""
    while True:
        try:
            event_types = ["os_event", "login_event", "process_event", "network_event"]
            event_type = random.choice(event_types)
            
            event_data = {
                "id": hashlib.md5(f"{datetime.utcnow().isoformat()}{random.random()}".encode()).hexdigest()[:16],
                "timestamp": datetime.utcnow().isoformat(),
                "type": event_type,
                "source_ip": f"192.168.1.{random.randint(1, 255)}",
                "severity": random.choice(["low", "medium", "high"]),
                "details": {}
            }
            
            if event_type == "login_event":
                event_data["details"] = {
                    "username": random.choice(["admin", "user1", "root", "guest"]),
                    "success": random.choice([True, True, True, False]),
                    "method": "ssh"
                }
            elif event_type == "process_event":
                event_data["details"] = {
                    "process_name": random.choice(["nginx", "python", "node", "suspicious.exe"]),
                    "pid": random.randint(1000, 9999),
                    "hash": hashlib.md5(f"{random.random()}".encode()).hexdigest()
                }
            elif event_type == "network_event":
                event_data["details"] = {
                    "destination_ip": random.choice(["8.8.8.8", "1.1.1.1"] + BLACKLIST_IPS),
                    "port": random.choice([80, 443, 22, 3389, 8080]),
                    "protocol": random.choice(["TCP", "UDP"]),
                    "bytes": random.randint(100, 10000)
                }
            
            # Store in Supabase
            if supabase:
                try:
                    supabase.table("events").insert(event_data).execute()
                except:
                    pass
            
            # Broadcast to WebSocket
            await manager.broadcast({"type": "new_event", "data": event_data})
            
            # Check for anomalies
            await check_event_for_threats(event_data)
            
        except Exception as e:
            print(f"Error generating telemetry: {e}")
        
        await asyncio.sleep(5)

async def check_event_for_threats(event: dict):
    """Rule-based and ML-based threat detection"""
    global ml_model, ml_scaler
    
    incident = None
    
    # Rule-based detection
    if event["type"] == "login_event" and not event["details"].get("success"):
        # Check failed login count
        if supabase:
            result = supabase.table("events").select("*").eq("type", "login_event").execute()
            failed_logins = [e for e in result.data if not e.get("details", {}).get("success")]
            if len(failed_logins) > 3:
                incident = {
                    "type": "brute_force",
                    "severity": "high",
                    "description": "Multiple failed login attempts detected"
                }
    
    elif event["type"] == "network_event":
        dest_ip = event["details"].get("destination_ip")
        if dest_ip in BLACKLIST_IPS:
            incident = {
                "type": "malicious_traffic",
                "severity": "critical",
                "description": f"Traffic to blacklisted IP: {dest_ip}"
            }
    
    elif event["type"] == "process_event":
        if "suspicious" in event["details"].get("process_name", "").lower():
            incident = {
                "type": "malware_detection",
                "severity": "critical",
                "description": "Suspicious process detected"
            }
    
    # ML-based detection
    if ml_model and ml_scaler:
        try:
            features = extract_features(event)
            if features:
                features_scaled = ml_scaler.transform([features])
                anomaly_score = ml_model.decision_function(features_scaled)[0]
                
                # Store ML score
                ml_score_data = {
                    "event_id": event["id"],
                    "score": float(anomaly_score),
                    "timestamp": datetime.utcnow().isoformat()
                }
                if supabase:
                    supabase.table("ml_scores").insert(ml_score_data).execute()
                
                if anomaly_score < -0.3:
                    incident = {
                        "type": "ml_anomaly",
                        "severity": "high",
                        "description": f"ML detected anomaly (score: {anomaly_score:.2f})"
                    }
        except Exception as e:
            print(f"ML detection error: {e}")
    
    # Create incident if threat detected
    if incident:
        await create_incident(event, incident)

def extract_features(event: dict) -> Optional[List[float]]:
    """Extract numerical features from event for ML"""
    try:
        features = []
        features.append(hash(event["type"]) % 1000 / 1000)
        features.append({"low": 0.33, "medium": 0.66, "high": 1.0}.get(event["severity"], 0.5))
        features.append(len(str(event["details"])))
        features.append(datetime.fromisoformat(event["timestamp"]).hour / 24)
        return features
    except:
        return None

async def create_incident(event: dict, incident_info: dict):
    """Create incident and trigger automated response"""
    try:
        # Generate forensic snapshot
        forensic_data = capture_forensic_snapshot(event, incident_info)
        
        # Create incident record
        incident_data = {
            "id": hashlib.md5(f"{datetime.utcnow().isoformat()}{random.random()}".encode()).hexdigest()[:16],
            "timestamp": datetime.utcnow().isoformat(),
            "type": incident_info["type"],
            "severity": incident_info["severity"],
            "description": incident_info["description"],
            "event_id": event["id"],
            "status": "active",
            "resolved_at": None,
            "resolution_notes": None
        }
        
        if supabase:
            supabase.table("incidents").insert(incident_data).execute()
            
            # Store forensic report
            report_data = {
                "incident_id": incident_data["id"],
                "timestamp": datetime.utcnow().isoformat(),
                "forensic_data": json.dumps(forensic_data)
            }
            supabase.table("forensic_reports").insert(report_data).execute()
        
        # Notify via WebSocket
        await manager.broadcast({
            "type": "new_incident",
            "data": incident_data
        })
        
    except Exception as e:
        print(f"Error creating incident: {e}")

def capture_forensic_snapshot(event: dict, incident_info: dict) -> dict:
    """Capture system state using psutil"""
    try:
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'username', 'cpu_percent']):
            try:
                processes.append(proc.info)
            except:
                pass
        
        network_connections = []
        for conn in psutil.net_connections(kind='inet'):
            network_connections.append({
                "laddr": f"{conn.laddr.ip}:{conn.laddr.port}" if conn.laddr else None,
                "raddr": f"{conn.raddr.ip}:{conn.raddr.port}" if conn.raddr else None,
                "status": conn.status
            })
        
        # Mock packet capture
        mock_packets = [
            {
                "timestamp": datetime.utcnow().isoformat(),
                "src": event.get("source_ip"),
                "dst": event.get("details", {}).get("destination_ip", "N/A"),
                "protocol": event.get("details", {}).get("protocol", "TCP"),
                "payload": "[ENCRYPTED DATA]"
            }
            for _ in range(5)
        ]
        
        return {
            "snapshot_time": datetime.utcnow().isoformat(),
            "incident_type": incident_info["type"],
            "system_info": {
                "cpu_percent": psutil.cpu_percent(interval=0.1),
                "memory_percent": psutil.virtual_memory().percent,
                "uptime_seconds": int(psutil.boot_time())
            },
            "processes": processes[:20],
            "network_connections": network_connections[:10],
            "packet_capture": mock_packets,
            "suspicious_indicators": [
                f"Event type: {event['type']}",
                f"Source IP: {event.get('source_ip')}",
                f"Severity: {incident_info['severity']}"
            ],
            "recommended_actions": [
                "Isolate affected system",
                "Review authentication logs",
                "Update firewall rules",
                "Scan for malware"
            ]
        }
    except Exception as e:
        return {"error": str(e)}

# API Routes
@app.on_event("startup")
async def startup_event():
    asyncio.create_task(generate_telemetry())

@app.post("/api/auth/login")
async def login(request: LoginRequest):
    # Simple demo auth - in production, validate against Supabase
    if request.email == "admin@arc.com" and request.password == "admin123":
        token = create_access_token({"email": request.email})
        return {"token": token, "user": {"email": request.email, "role": "admin"}}
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.websocket("/api/events/live")
async def websocket_events(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/api/events")
async def get_events(limit: int = 100, token: dict = Depends(verify_token)):
    if supabase:
        result = supabase.table("events").select("*").order("timestamp", desc=True).limit(limit).execute()
        return {"events": result.data}
    return {"events": []}

@app.post("/api/simulate/attack")
async def simulate_attack(attack: AttackSimulation, background_tasks: BackgroundTasks, token: dict = Depends(verify_token)):
    attack_chains = {
        "brute_force": [
            {"type": "login_event", "details": {"username": "admin", "success": False, "method": "ssh"}},
            {"type": "login_event", "details": {"username": "admin", "success": False, "method": "ssh"}},
            {"type": "login_event", "details": {"username": "admin", "success": False, "method": "ssh"}},
            {"type": "login_event", "details": {"username": "admin", "success": True, "method": "ssh"}}
        ],
        "port_scan": [
            {"type": "network_event", "details": {"destination_ip": attack.target, "port": p, "protocol": "TCP", "bytes": 64}}
            for p in [22, 80, 443, 3389, 8080, 3306, 5432]
        ],
        "malware_detection": [
            {"type": "process_event", "details": {"process_name": "suspicious.exe", "pid": 6666, "hash": "abc123malicious"}},
            {"type": "network_event", "details": {"destination_ip": BLACKLIST_IPS[0], "port": 443, "protocol": "TCP", "bytes": 5000}}
        ],
        "ddos": [
            {"type": "network_event", "details": {"destination_ip": attack.target, "port": 80, "protocol": "TCP", "bytes": 10000}}
            for _ in range(10)
        ],
        "sql_injection": [
            {"type": "network_event", "details": {"destination_ip": attack.target, "port": 3306, "protocol": "TCP", "bytes": 512}},
            {"type": "os_event", "details": {"command": "SELECT * FROM users WHERE id=1 OR 1=1"}}
        ],
        "privilege_escalation": [
            {"type": "login_event", "details": {"username": "user1", "success": True, "method": "ssh"}},
            {"type": "process_event", "details": {"process_name": "sudo", "pid": 8888, "hash": "privilege_esc"}},
            {"type": "os_event", "details": {"user_change": "user1 -> root"}}
        ],
        "data_exfiltration": [
            {"type": "process_event", "details": {"process_name": "tar", "pid": 7777, "hash": "compress_data"}},
            {"type": "network_event", "details": {"destination_ip": BLACKLIST_IPS[1], "port": 443, "protocol": "TCP", "bytes": 500000}}
        ]
    }
    
    chain = attack_chains.get(attack.attack_type, [])
    
    async def inject_events():
        for event_template in chain:
            event_data = {
                "id": hashlib.md5(f"{datetime.utcnow().isoformat()}{random.random()}".encode()).hexdigest()[:16],
                "timestamp": datetime.utcnow().isoformat(),
                "type": event_template["type"],
                "source_ip": f"192.168.1.{random.randint(1, 255)}",
                "severity": "high",
                "details": event_template["details"]
            }
            
            if supabase:
                try:
                    supabase.table("events").insert(event_data).execute()
                except:
                    pass
            
            await manager.broadcast({"type": "new_event", "data": event_data})
            await check_event_for_threats(event_data)
            await asyncio.sleep(1)
    
    background_tasks.add_task(inject_events)
    return {"status": "attack_simulation_started", "attack_type": attack.attack_type}

@app.post("/api/ml/train")
async def train_ml_model(token: dict = Depends(verify_token)):
    global ml_model, ml_scaler
    
    try:
        # Get baseline events
        if supabase:
            result = supabase.table("events").select("*").limit(200).execute()
            events = result.data
        else:
            events = []
        
        if len(events) < 10:
            return {"error": "Not enough data to train model", "min_required": 10}
        
        # Extract features
        features = []
        for event in events:
            f = extract_features(event)
            if f:
                features.append(f)
        
        features = np.array(features)
        
        # Normalize
        from sklearn.preprocessing import StandardScaler
        ml_scaler = StandardScaler()
        features_scaled = ml_scaler.fit_transform(features)
        
        # Train Isolation Forest
        ml_model = IsolationForest(contamination=0.1, random_state=42)
        ml_model.fit(features_scaled)
        
        return {
            "status": "model_trained",
            "samples": len(features),
            "features_per_sample": len(features[0])
        }
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/incidents")
async def get_incidents(token: dict = Depends(verify_token)):
    if supabase:
        result = supabase.table("incidents").select("*").order("timestamp", desc=True).execute()
        return {"incidents": result.data}
    return {"incidents": []}

@app.get("/api/incident/{incident_id}")
async def get_incident_detail(incident_id: str, token: dict = Depends(verify_token)):
    if supabase:
        result = supabase.table("incidents").select("*").eq("id", incident_id).execute()
        if result.data:
            return result.data[0]
    raise HTTPException(status_code=404, detail="Incident not found")

@app.post("/api/incident/{incident_id}/resolve")
async def resolve_incident(incident_id: str, resolve_data: IncidentResolve, token: dict = Depends(verify_token)):
    if supabase:
        supabase.table("incidents").update({
            "status": "resolved",
            "resolved_at": datetime.utcnow().isoformat(),
            "resolution_notes": resolve_data.resolution_notes
        }).eq("id", incident_id).execute()
        return {"status": "resolved"}
    raise HTTPException(status_code=404, detail="Incident not found")

@app.get("/api/report/{incident_id}")
async def get_forensic_report(incident_id: str, token: dict = Depends(verify_token)):
    if supabase:
        result = supabase.table("forensic_reports").select("*").eq("incident_id", incident_id).execute()
        if result.data:
            report = result.data[0]
            report["forensic_data"] = json.loads(report["forensic_data"])
            return report
    raise HTTPException(status_code=404, detail="Report not found")

@app.get("/api/stats")
async def get_stats(token: dict = Depends(verify_token)):
    if supabase:
        events = supabase.table("events").select("*", count="exact").execute()
        incidents = supabase.table("incidents").select("*", count="exact").execute()
        active_incidents = supabase.table("incidents").select("*", count="exact").eq("status", "active").execute()
        ml_anomalies = supabase.table("ml_scores").select("*", count="exact").lt("score", -0.3).execute()
        
        return {
            "total_events": events.count,
            "total_incidents": incidents.count,
            "active_incidents": active_incidents.count,
            "ml_flagged": ml_anomalies.count
        }
    return {"total_events": 0, "total_incidents": 0, "active_incidents": 0, "ml_flagged": 0}
