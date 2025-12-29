"""
A.R.C SENTINEL - FastAPI Application
=====================================
Main FastAPI application entrypoint with router includes and lifecycle events.

Features:
- Supabase Auth with email verification
- Real-time telemetry generation every 5 seconds
- Rule-based and ML-based threat detection
- WebSocket broadcast for live alerts
- Gemini AI integration for incident summarization
- Supabase (Postgres) database integration
- Forensic snapshot capture using psutil
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, BackgroundTasks, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional, Dict, Any
import asyncio
import json
import hashlib
import os

# Local imports
from app.config import settings
from app.database import (
    SupabaseClient, Database, insert_event, get_events, insert_incident, get_incidents,
    get_incident_by_id, update_incident, insert_forensic_report,
    get_forensic_report, get_all_forensic_reports, update_forensic_report,
    get_stats, sign_up_user, sign_in_user, sign_out_user, get_user_from_token,
    refresh_session, reset_password, create_or_update_user_profile,
    get_event_frequency, get_event_type_rarity, get_ip_rarity, log_audit, mark_device_isolated
)
from app.websocket_manager import ws_manager
from app.detection import detection_engine, DetectionResult, Severity, ThreatType
from app.ml_engine import ml_detector
from app.forensics import forensics_engine
from app.gemini_client import gemini_client
from app.telemetry import telemetry_generator, attack_chain_generator
from app.models import (
    SignUpRequest, SignUpResponse, LoginRequest, LoginResponse,
    RefreshTokenRequest, RefreshTokenResponse, ResetPasswordRequest,
    EventsListResponse, IncidentsListResponse, IncidentResolveRequest,
    AttackSimulationRequest, AttackSimulationResponse,
    MLTrainResponse, StatsResponse, GeminiSummarizeResponse
)
from app.response_engine import response_engine


# ============================================================================
# Telemetry Background Task
# ============================================================================

telemetry_task: Optional[asyncio.Task] = None


async def telemetry_loop():
    """Background task that generates telemetry every 5 seconds"""
    print("[TELEMETRY] Background task started")
    
    while True:
        try:
            # Generate telemetry event
            event = telemetry_generator.generate_event()
            
            # Process the event through detection pipeline
            await process_event(event)
            
        except asyncio.CancelledError:
            print("[TELEMETRY] Background task cancelled")
            break
        except Exception as e:
            print(f"[TELEMETRY] Error: {e}")
        
        await asyncio.sleep(settings.TELEMETRY_INTERVAL_SECONDS)


async def start_telemetry_generator():
    """Start the telemetry generator as a background task"""
    global telemetry_task
    if telemetry_task is None or telemetry_task.done():
        telemetry_task = asyncio.create_task(telemetry_loop())
        print(f"[STARTUP] Telemetry generation started: Every {settings.TELEMETRY_INTERVAL_SECONDS}s")


async def stop_telemetry_generator():
    """Stop the telemetry generator background task"""
    global telemetry_task
    if telemetry_task and not telemetry_task.done():
        telemetry_task.cancel()
        try:
            await telemetry_task
        except asyncio.CancelledError:
            pass
        print("[SHUTDOWN] Telemetry generator stopped")


# ============================================================================
# Event Processing Pipeline
# ============================================================================

async def process_event(event: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Process an event through the complete detection pipeline:
    1. Compute ML features (frequency, rarity, entropy)
    2. Run ML scoring (anomaly detection)
    3. Run rule-based detection
    4. Store event with scores
    5. Create incident if threat detected
    6. Execute automated response for critical incidents
    7. Broadcast via WebSocket
    """
    incident = None
    
    try:
        # Compute ML features
        source_ip = event.get("source_ip", "0.0.0.0")
        event_type = event.get("type", "unknown")
        
        # Get frequency and rarity from database
        event_freq = await get_event_frequency(source_ip, minutes=5)
        type_rarity = await get_event_type_rarity(event_type)
        ip_rarity = await get_ip_rarity(source_ip)
        
        # Add ML context to event
        event["ml_context"] = {
            "event_frequency": event_freq,
            "type_rarity": type_rarity,
            "ip_rarity": ip_rarity,
            "payload_entropy": ml_detector.calculate_entropy(str(event.get("details", {})))
        }
        
        # ML-based detection (runs first to get anomaly score)
        anomaly_score, is_ml_flagged = ml_detector.predict(event)
        event["anomaly_score"] = anomaly_score
        event["ml_flagged"] = is_ml_flagged
        
        # Rule-based detection
        detection_result = detection_engine.analyze_event(event)
        
        # ML can escalate to incident if rules didn't catch it
        if is_ml_flagged and not detection_result.is_threat:
            detection_result = DetectionResult(
                is_threat=True,
                threat_type=ThreatType.ML_ANOMALY,
                severity=Severity.HIGH,
                description=f"ML anomaly detected (score: {anomaly_score:.2f})",
                confidence=anomaly_score,
                indicators=[
                    f"Anomaly score: {anomaly_score:.2f}",
                    f"Event frequency: {event_freq} in 5min",
                    f"Type rarity: {type_rarity:.2f}",
                    f"IP rarity: {ip_rarity:.2f}"
                ]
            )
        
        # Store event in database
        await insert_event(event)
        
        # Create incident if threat detected
        if detection_result.is_threat:
            incident = await create_incident_from_detection(event, detection_result)
            
            # Execute automated response for critical incidents
            if incident and incident.get("severity") == "critical":
                response_result = await response_engine.execute_response(incident)
                print(f"[RESPONSE] Automated response executed: {len(response_result.get('actions_taken', []))} actions")
        
        # Broadcast to WebSocket clients with proper event tagging
        await ws_manager.broadcast({
            "event": "NEW_EVENT",
            "type": "new_event",
            "data": event
        })
        
    except Exception as e:
        print(f"[PROCESS] Error processing event: {e}")
    
    return incident


async def create_incident_from_detection(
    event: Dict[str, Any],
    detection_result: DetectionResult
) -> Dict[str, Any]:
    """Create an incident and forensic report from a detection"""
    
    # Create incident record
    incident_id = hashlib.md5(
        f"{datetime.utcnow().isoformat()}{event.get('id')}".encode()
    ).hexdigest()[:16]
    
    incident = {
        "id": incident_id,
        "threat_type": detection_result.threat_type.value if detection_result.threat_type else "unknown",
        "type": detection_result.threat_type.value if detection_result.threat_type else "unknown",
        "status": "active",
        "severity": detection_result.severity.value if detection_result.severity else "medium",
        "description": detection_result.description,
        "event_id": event.get("id"),
        "source_ip": event.get("source_ip"),
        "anomaly_score": event.get("anomaly_score", 0.0),
        "ml_flagged": event.get("ml_flagged", False),
        "confidence": detection_result.confidence,
        "indicators": json.dumps(detection_result.indicators) if detection_result.indicators else "[]",
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
        "timestamp": datetime.utcnow().isoformat()
    }
    
    # Store incident
    await insert_incident(incident)
    
    # Capture forensic snapshot
    forensic_snapshot = forensics_engine.capture_snapshot(
        event,
        {
            "threat_type": detection_result.threat_type.value if detection_result.threat_type else "unknown",
            "severity": detection_result.severity.value if detection_result.severity else "medium",
            "description": detection_result.description
        }
    )
    
    # Store forensic report
    report = {
        "id": hashlib.md5(f"{incident_id}{datetime.utcnow().isoformat()}".encode()).hexdigest()[:16],
        "incident_id": incident_id,
        "processes": json.dumps(forensic_snapshot.get("processes", [])),
        "connections": json.dumps(forensic_snapshot.get("connections", [])),
        "packet_data": json.dumps(forensic_snapshot.get("packet_data", [])),
        "gemini_summary": None,
        "created_at": datetime.utcnow().isoformat(),
        "forensic_data": json.dumps(forensic_snapshot)
    }
    await insert_forensic_report(report)
    
    # Broadcast incident to WebSocket clients with proper event tagging
    broadcast_data = {
        "event": "NEW_INCIDENT",
        "type": "new_incident",
        "data": incident
    }
    
    # Add critical alert flag for critical severity
    if incident.get("severity") == "critical":
        broadcast_data["event"] = "CRITICAL_ALERT"
        broadcast_data["type"] = "critical_alert"
        broadcast_data["priority"] = "immediate"
    
    await ws_manager.broadcast(broadcast_data)
    
    print(f"[INCIDENT] Created: {detection_result.threat_type} - {detection_result.severity}")
    
    return incident


# ============================================================================
# Application Lifecycle
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown"""
    # Startup
    print("=" * 60)
    print("  A.R.C SENTINEL - Security Operations Center")
    print("=" * 60)
    print(f"[STARTUP] Supabase URL: {settings.SUPABASE_URL[:30]}..." if settings.SUPABASE_URL else "[STARTUP] Supabase not configured")
    print(f"[STARTUP] Gemini API: {'Configured' if settings.GEMINI_API_KEY else 'Not configured'}")
    
    # Initialize database connection
    SupabaseClient.get_client()
    
    # Load ML model if available
    await ml_detector.load_model()
    
    # Start telemetry background task
    await start_telemetry_generator()
    
    print("[STARTUP] Authentication: Supabase Auth (Email Verification)")
    print("=" * 60)
    
    yield
    
    # Shutdown
    print("[SHUTDOWN] Stopping background tasks...")
    await stop_telemetry_generator()
    print("[SHUTDOWN] Complete")


# ============================================================================
# FastAPI Application
# ============================================================================

app = FastAPI(
    title="A.R.C SENTINEL API",
    description="Security Operations Center Backend API with Supabase Auth",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
origins = settings.CORS_ORIGINS.split(",") if settings.CORS_ORIGINS != "*" else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Security
security = HTTPBearer(auto_error=False)


# ============================================================================
# Startup Event (Fallback - lifespan is primary)
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """
    Fallback startup event handler.
    The lifespan context manager is the primary handler, but this ensures
    telemetry starts even if lifespan has issues.
    """
    global telemetry_task
    if telemetry_task is None or telemetry_task.done():
        print("[STARTUP] on_event: Ensuring telemetry generator is running...")
        await start_telemetry_generator()


@app.on_event("shutdown")
async def shutdown_event():
    """Fallback shutdown event handler."""
    await stop_telemetry_generator()


# ============================================================================
# Authentication Dependency (Supabase Auth)
# ============================================================================

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    authorization: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """
    Verify Supabase access token and get current user.
    Accepts token from Authorization header (Bearer token).
    """
    token = None
    
    # Get token from HTTPBearer
    if credentials:
        token = credentials.credentials
    # Or from raw Authorization header
    elif authorization:
        if authorization.startswith("Bearer "):
            token = authorization[7:]
        else:
            token = authorization
    
    if not token:
        print("[AUTH] No token provided in request")
        raise HTTPException(
            status_code=401,
            detail="Authorization token required",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    print(f"[AUTH] Token received: {token[:20]}...")
    
    # Verify token with Supabase
    user = await get_user_from_token(token)
    
    if not user:
        print("[AUTH] Token verification failed")
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    print(f"[AUTH] User authenticated: {user.get('email')}")
    return user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    authorization: Optional[str] = Header(None)
) -> Optional[Dict[str, Any]]:
    """
    Optional authentication - returns None if no valid token.
    Used for demo/hackathon endpoints that should work without login.
    """
    token = None
    
    if credentials:
        token = credentials.credentials
    elif authorization:
        if authorization.startswith("Bearer "):
            token = authorization[7:]
        else:
            token = authorization
    
    if not token:
        return None
    
    user = await get_user_from_token(token)
    return user


# ============================================================================
# API Routes
# ============================================================================

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "name": "A.R.C SENTINEL API",
        "version": "1.0.0",
        "status": "operational",
        "auth": "Supabase Auth (Email Verification)",
        "websocket": "/api/events/live"
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "database": SupabaseClient.is_connected(),
        "auth": "supabase",
        "gemini": gemini_client.is_configured,
        "ml_model": ml_detector.is_trained,
        "websocket_connections": ws_manager.connection_count,
        "telemetry_active": telemetry_task is not None and not telemetry_task.done()
    }


# ============================================================================
# Auth Routes (Supabase Auth)
# ============================================================================

@app.post("/api/auth/signup", response_model=SignUpResponse)
async def signup(request: SignUpRequest):
    """
    Register a new user with email verification.
    Supabase will send a verification email automatically.
    User must verify email before they can log in.
    """
    try:
        print(f"[SIGNUP] Attempting signup for: {request.email}")
        result = await sign_up_user(request.email, request.password)
        print(f"[SIGNUP] Success for: {request.email}")
        return result
    except Exception as e:
        print(f"[SIGNUP] Error for {request.email}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """
    Authenticate user with email and password.
    Returns access_token and refresh_token for API calls.
    User must have verified their email to log in.
    """
    try:
        result = await sign_in_user(request.email, request.password)
        
        # Create/update user profile in users table
        if result.get("user"):
            await create_or_update_user_profile(
                user_id=result["user"]["id"],
                email=result["user"]["email"],
                role=result["user"].get("role", "analyst")
            )
        
        return result
    except Exception as e:
        error_msg = str(e)
        if "Invalid email or password" in error_msg:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        elif "verify your email" in error_msg.lower():
            raise HTTPException(status_code=403, detail="Please verify your email before signing in")
        elif "rate" in error_msg.lower() or "too many" in error_msg.lower() or "wait" in error_msg.lower():
            raise HTTPException(status_code=429, detail="Too many login attempts. Please wait 60 seconds and try again.")
        raise HTTPException(status_code=401, detail=error_msg)


@app.post("/api/auth/logout")
async def logout(user: Dict = Depends(get_current_user)):
    """Sign out the current user"""
    # Note: Client should also clear stored tokens
    return {"message": "Logged out successfully"}


@app.post("/api/auth/refresh", response_model=RefreshTokenResponse)
async def refresh_token(request: RefreshTokenRequest):
    """
    Refresh an expired access token using the refresh token.
    Returns new access_token and refresh_token.
    """
    result = await refresh_session(request.refresh_token)
    
    if not result:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    return result


@app.post("/api/auth/reset-password")
async def request_password_reset(request: ResetPasswordRequest):
    """
    Request a password reset email.
    Supabase will send an email with reset instructions.
    """
    success = await reset_password(request.email)
    
    # Always return success to prevent email enumeration
    return {"message": "If an account exists with this email, a reset link has been sent"}


@app.get("/api/auth/me")
async def get_current_user_info(user: Dict = Depends(get_current_user)):
    """Get the current authenticated user's information"""
    return {
        "id": user.get("id"),
        "email": user.get("email"),
        "role": user.get("role", "analyst"),
        "email_confirmed": user.get("email_confirmed", False)
    }


# ============================================================================
# WebSocket Route
# ============================================================================

@app.websocket("/api/events/live")
async def websocket_events(websocket: WebSocket):
    """WebSocket endpoint for real-time event streaming"""
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, listen for client messages
            data = await websocket.receive_text()
            # Could handle client commands here if needed
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)


@app.websocket("/ws")
async def websocket_events_legacy(websocket: WebSocket):
    """Legacy WebSocket endpoint for frontend compatibility"""
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)


# ============================================================================
# Events Routes
# ============================================================================

@app.get("/api/events")
async def list_events(
    limit: int = Query(100, ge=1, le=500),
    severity: Optional[str] = None,
    event_type: Optional[str] = Query(None, alias="type"),
    source_ip: Optional[str] = None,
    start_date: Optional[str] = Query(None, description="Start date (ISO format)"),
    end_date: Optional[str] = Query(None, description="End date (ISO format)"),
    ml_flagged: Optional[bool] = None,
    user: Dict = Depends(get_current_user)
):
    """Get list of events with optional filters including date range"""
    start_time = None
    end_time = None
    
    if start_date:
        try:
            start_time = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        except:
            pass
    
    if end_date:
        try:
            end_time = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
        except:
            pass
    
    events = await get_events(
        limit=limit,
        severity=severity,
        event_type=event_type,
        start_time=start_time,
        end_time=end_time,
        source_ip=source_ip,
        ml_flagged=ml_flagged
    )
    return {"events": events, "count": len(events)}


# ============================================================================
# Incidents Routes
# ============================================================================

@app.get("/api/incidents")
async def list_incidents(
    limit: int = Query(100, ge=1, le=500),
    status: Optional[str] = None,
    severity: Optional[str] = None,
    threat_type: Optional[str] = None,
    user: Dict = Depends(get_current_user)
):
    """Get list of incidents with optional filters and dashboard summary"""
    incidents = await get_incidents(limit=limit, status=status)
    
    # Apply additional filters
    if severity:
        incidents = [i for i in incidents if i.get("severity") == severity]
    if threat_type:
        incidents = [i for i in incidents if i.get("threat_type") == threat_type or i.get("type") == threat_type]
    
    # Calculate summary metrics
    summary = {
        "total": len(incidents),
        "active": len([i for i in incidents if i.get("status") == "active"]),
        "investigating": len([i for i in incidents if i.get("status") == "investigating"]),
        "resolved": len([i for i in incidents if i.get("status") == "resolved"]),
        "critical": len([i for i in incidents if i.get("severity") == "critical"]),
        "high": len([i for i in incidents if i.get("severity") == "high"]),
        "medium": len([i for i in incidents if i.get("severity") == "medium"]),
        "low": len([i for i in incidents if i.get("severity") == "low"])
    }
    
    return {"incidents": incidents, "summary": summary}


@app.get("/api/incident/{incident_id}")
async def get_incident(incident_id: str, user: Dict = Depends(get_current_user)):
    """Get single incident details with forensic report"""
    incident = await get_incident_by_id(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    # Include forensic report if available
    report = await get_forensic_report(incident_id)
    if report:
        if isinstance(report.get("forensic_data"), str):
            try:
                report["forensic_data"] = json.loads(report["forensic_data"])
            except:
                pass
        incident["forensic_report"] = report
    
    return incident


@app.post("/api/incident/{incident_id}/resolve")
async def resolve_incident(
    incident_id: str,
    resolve_data: IncidentResolveRequest,
    user: Dict = Depends(get_current_user)
):
    """Resolve an incident with closure summary and broadcast update"""
    incident = await get_incident_by_id(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    resolution_data = {
        "status": "resolved",
        "resolved_at": datetime.utcnow().isoformat(),
        "resolved_by": user.get("email", "unknown"),
        "resolution_notes": resolve_data.resolution_notes,
        "updated_at": datetime.utcnow().isoformat()
    }
    
    await update_incident(incident_id, resolution_data)
    
    # Log audit
    await log_audit(
        user_id=user.get("id", "unknown"),
        action="incident_resolved",
        details={"incident_id": incident_id, "notes": resolve_data.resolution_notes}
    )
    
    # Broadcast resolution over WebSocket with proper event tagging
    await ws_manager.broadcast({
        "event": "INCIDENT_RESOLVED",
        "type": "incident_resolved",
        "data": {
            "incident_id": incident_id,
            "status": "resolved",
            "resolved_by": user.get("email"),
            "resolved_at": resolution_data["resolved_at"]
        }
    })
    
    return {
        "status": "resolved",
        "incident_id": incident_id,
        "resolved_at": resolution_data["resolved_at"],
        "resolved_by": user.get("email")
    }


@app.post("/api/incident/{incident_id}/investigate")
async def mark_investigating(
    incident_id: str,
    user: Dict = Depends(get_current_user)
):
    """Mark an incident as under investigation"""
    incident = await get_incident_by_id(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    update_data = {
        "status": "investigating",
        "investigating_by": user.get("email", "unknown"),
        "investigation_started_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }
    
    await update_incident(incident_id, update_data)
    
    # Broadcast update with proper event tagging
    await ws_manager.broadcast({
        "event": "INCIDENT_UPDATED",
        "type": "incident_updated",
        "data": {
            "incident_id": incident_id,
            "status": "investigating",
            "investigating_by": user.get("email")
        }
    })
    
    return {"status": "investigating", "incident_id": incident_id}


@app.get("/api/incidents/counts")
async def get_incident_counts(user: Dict = Depends(get_current_user)):
    """Get dashboard metrics counts"""
    return await get_stats()


# ============================================================================
# Stats Route
# ============================================================================

@app.get("/api/stats", response_model=StatsResponse)
async def get_statistics(user: Dict = Depends(get_current_user)):
    """Get dashboard statistics"""
    return await get_stats()


# ============================================================================
# Reports Routes
# ============================================================================

@app.get("/api/reports")
async def list_reports(
    limit: int = Query(100, ge=1, le=500),
    user: Dict = Depends(get_current_user)
):
    """Get all forensic reports"""
    reports = await get_all_forensic_reports(limit=limit)
    return {"reports": reports}


@app.get("/api/report/{incident_id}")
async def get_report(incident_id: str, user: Dict = Depends(get_current_user)):
    """Get forensic report for an incident"""
    report = await get_forensic_report(incident_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Parse forensic_data if stored as string
    if isinstance(report.get("forensic_data"), str):
        try:
            report["forensic_data"] = json.loads(report["forensic_data"])
        except:
            pass
    
    return report


# ============================================================================
# Attack Simulation Route
# ============================================================================

@app.post("/api/simulate/attack", response_model=AttackSimulationResponse)
async def simulate_attack(
    attack: AttackSimulationRequest,
    background_tasks: BackgroundTasks,
    user: Optional[Dict] = Depends(get_optional_user)
):
    """
    Simulate a multi-stage attack.
    Generates attack chain events, processes through detection pipeline.
    Auth is optional for demo/hackathon mode.
    """
    attack_type = attack.attack_type
    target = attack.target or "192.168.1.100"
    
    print(f"🚨 Attack simulation received: {attack_type} targeting {target}")
    
    # Generate attack chain
    chain = attack_chain_generator.generate_chain(attack_type, target)
    print(f"🔗 Generated attack chain with {len(chain)} events")
    
    incident_created = False
    incident_id = None
    
    async def inject_attack_chain():
        nonlocal incident_created, incident_id
        for i, event in enumerate(chain):
            print(f"  📍 Processing event {i+1}/{len(chain)}: {event.get('type')}")
            incident = await process_event(event)
            if incident:
                incident_created = True
                incident_id = incident.get("id")
            await asyncio.sleep(0.3)  # Faster delay for better demo
    
    # Run attack simulation
    await inject_attack_chain()
    
    print(f"✅ Attack simulation completed: incident_created={incident_created}")
    
    return {
        "status": "attack_simulation_completed",
        "attack_type": attack_type,
        "chain_length": len(chain),
        "incident_created": incident_created,
        "message": f"Simulated {attack_type} attack with {len(chain)} events"
    }


# ============================================================================
# ML Routes
# ============================================================================

@app.post("/api/ml/train", response_model=MLTrainResponse)
async def train_ml_model(user: Dict = Depends(get_current_user)):
    """
    Train Isolation Forest ML model on baseline events.
    Manual trigger from UI.
    """
    # Get baseline events for training
    events = await get_events(limit=500)
    
    if not events:
        return {
            "status": "error",
            "error": "No events available for training"
        }
    
    # Train model
    result = await ml_detector.train(events)
    
    return result


@app.get("/api/ml/status")
async def get_ml_status(user: Dict = Depends(get_current_user)):
    """Get ML model status"""
    return {
        "is_trained": ml_detector.is_trained,
        "training_samples": ml_detector.training_samples,
        "threshold": settings.ML_ANOMALY_THRESHOLD,
        "contamination": settings.ML_CONTAMINATION
    }


# ============================================================================
# Gemini AI Routes
# ============================================================================

@app.post("/api/gemini/summarize/{incident_id}", response_model=GeminiSummarizeResponse)
async def summarize_incident_with_gemini(
    incident_id: str,
    user: Dict = Depends(get_current_user)
):
    """
    Generate AI summary for an incident using Gemini.
    Fetches forensic data and creates detailed analyst report.
    """
    # Get incident
    incident = await get_incident_by_id(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    # Get forensic report
    report = await get_forensic_report(incident_id)
    forensic_data = {}
    
    if report:
        if isinstance(report.get("forensic_data"), str):
            try:
                forensic_data = json.loads(report["forensic_data"])
            except:
                forensic_data = report
        else:
            forensic_data = report.get("forensic_data", report)
    
    # Generate AI summary
    summary = await gemini_client.summarize_incident(incident, forensic_data)
    
    # Save summary to forensic report
    if report:
        await update_forensic_report(incident_id, {"gemini_summary": summary})
    
    return {
        "incident_id": incident_id,
        "summary": summary,
        "generated_at": datetime.utcnow().isoformat()
    }


# ============================================================================
# Response Automation Routes
# ============================================================================

@app.post("/api/response/isolate-process/{pid}")
async def isolate_process_endpoint(
    pid: int,
    incident_id: Optional[str] = Query(None),
    user: Dict = Depends(get_current_user)
):
    """Isolate a suspicious process by PID"""
    result = await response_engine.isolate_process(pid, incident_id or "manual")
    
    # Log audit
    await log_audit(
        user_id=user.get("id", "unknown"),
        action="process_isolated",
        details={"pid": pid, "incident_id": incident_id}
    )
    
    return result


@app.post("/api/response/quarantine-device")
async def quarantine_device_endpoint(
    device_id: str = Query(...),
    source_ip: str = Query(...),
    incident_id: Optional[str] = Query(None),
    user: Dict = Depends(get_current_user)
):
    """Quarantine a device"""
    result = await response_engine.quarantine_device(
        device_id, source_ip, incident_id or "manual"
    )
    
    # Log audit
    await log_audit(
        user_id=user.get("id", "unknown"),
        action="device_quarantined",
        details={"device_id": device_id, "source_ip": source_ip}
    )
    
    # Broadcast quarantine action with proper event tagging
    await ws_manager.broadcast({
        "event": "DEVICE_QUARANTINED",
        "type": "device_quarantined",
        "data": result
    })
    
    return result


@app.post("/api/response/revoke-session/{user_id}")
async def revoke_session_endpoint(
    user_id: str,
    incident_id: Optional[str] = Query(None),
    user: Dict = Depends(get_current_user)
):
    """Revoke a user's session"""
    result = await response_engine.revoke_user_session(user_id, incident_id or "manual")
    
    # Log audit
    await log_audit(
        user_id=user.get("id", "unknown"),
        action="session_revoked",
        details={"target_user_id": user_id, "incident_id": incident_id}
    )
    
    return result


@app.get("/api/response/quarantined-devices")
async def get_quarantined_devices(user: Dict = Depends(get_current_user)):
    """Get list of quarantined devices"""
    return response_engine.get_quarantined_devices()


@app.get("/api/response/isolated-processes")
async def get_isolated_processes(user: Dict = Depends(get_current_user)):
    """Get list of isolated processes"""
    return response_engine.get_isolated_processes()


@app.get("/api/response/action-log")
async def get_response_action_log(
    limit: int = Query(50, ge=1, le=200),
    user: Dict = Depends(get_current_user)
):
    """Get response action audit log"""
    return {"actions": response_engine.get_action_log(limit)}


# ============================================================================
# Serve React Static Files (Production)
# ============================================================================

STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")

if os.path.exists(STATIC_DIR):
    # Mount static files (JS, CSS, images)
    app.mount("/static", StaticFiles(directory=os.path.join(STATIC_DIR, "static")), name="static")
    
    # Catch-all route for React SPA - must be after all API routes
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        """Serve React app for all non-API routes"""
        # Skip API routes
        if full_path.startswith("api/") or full_path.startswith("ws") or full_path == "health":
            raise HTTPException(status_code=404, detail="Not found")
        
        # Try to serve the requested file
        file_path = os.path.join(STATIC_DIR, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        
        # Fallback to index.html for SPA routing
        index_path = os.path.join(STATIC_DIR, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        
        raise HTTPException(status_code=404, detail="Not found")
