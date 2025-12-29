"""
A.R.C SENTINEL - Pydantic Models
=================================
Request/Response models for API validation
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum


# Enums
class Severity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class IncidentStatus(str, Enum):
    ACTIVE = "active"
    RESOLVED = "resolved"
    INVESTIGATING = "investigating"


class AttackType(str, Enum):
    BRUTEFORCE = "bruteforce"
    BRUTE_FORCE = "brute_force"
    PORT_SCAN = "port_scan"
    MALWARE = "malware"
    MALWARE_DETECTION = "malware_detection"
    DDOS = "ddos"
    SQL_INJECTION = "sql_injection"
    PRIVILEGE_ESCALATION = "privilege_escalation"
    EXFILTRATION = "exfiltration"
    DATA_EXFILTRATION = "data_exfiltration"


# ============================================================================
# AUTH MODELS (Supabase Auth)
# ============================================================================

class SignUpRequest(BaseModel):
    """Sign up with email verification"""
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")


class SignUpResponse(BaseModel):
    """Response after sign up"""
    user: Dict[str, Any]
    session: Optional[Dict[str, Any]] = None
    message: str


class LoginRequest(BaseModel):
    """Login with email and password"""
    email: EmailStr
    password: str = Field(..., min_length=1)


class LoginResponse(BaseModel):
    """Response after successful login"""
    user: Dict[str, Any]
    session: Dict[str, Any]


class RefreshTokenRequest(BaseModel):
    """Refresh session token"""
    refresh_token: str


class RefreshTokenResponse(BaseModel):
    """New session tokens"""
    access_token: str
    refresh_token: str
    expires_at: Optional[int] = None


class ResetPasswordRequest(BaseModel):
    """Password reset request"""
    email: EmailStr


class UpdatePasswordRequest(BaseModel):
    """Update password"""
    new_password: str = Field(..., min_length=6)


class UserResponse(BaseModel):
    """User information"""
    id: str
    email: str
    role: str
    email_confirmed: bool = False


# ============================================================================
# EVENT MODELS
# ============================================================================

class EventBase(BaseModel):
    type: str
    source_ip: str
    severity: Severity
    details: Dict[str, Any] = Field(default_factory=dict)


class EventCreate(EventBase):
    pass


class EventResponse(BaseModel):
    id: str
    timestamp: str
    type: str
    source_ip: str
    severity: str
    details: Dict[str, Any]
    anomaly_score: float = 0.0
    ml_flagged: bool = False
    
    class Config:
        from_attributes = True


class EventsListResponse(BaseModel):
    events: List[EventResponse]
    total: Optional[int] = None


# ============================================================================
# INCIDENT MODELS
# ============================================================================

class IncidentCreate(BaseModel):
    threat_type: str
    severity: Severity
    description: str
    event_id: Optional[str] = None


class IncidentResponse(BaseModel):
    id: str
    threat_type: Optional[str] = None
    type: Optional[str] = None
    status: str
    severity: str
    description: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    timestamp: Optional[str] = None
    event_id: Optional[str] = None
    resolved_at: Optional[str] = None
    resolution_notes: Optional[str] = None
    anomaly_score: Optional[float] = None
    
    class Config:
        from_attributes = True


class IncidentsListResponse(BaseModel):
    incidents: List[Dict[str, Any]]


class IncidentResolveRequest(BaseModel):
    resolution_notes: Optional[str] = ""


# ============================================================================
# ATTACK SIMULATION MODELS
# ============================================================================

class AttackSimulationRequest(BaseModel):
    attack_type: str = Field(..., description="Type of attack to simulate")
    target: Optional[str] = "192.168.1.100"
    intensity: Optional[int] = Field(default=1, ge=1, le=10)
    
    class Config:
        populate_by_name = True
    
    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        if isinstance(obj, dict) and 'type' in obj and 'attack_type' not in obj:
            obj = dict(obj)
            obj['attack_type'] = obj.pop('type')
        return super().model_validate(obj, *args, **kwargs)


class AttackSimulationResponse(BaseModel):
    status: str
    attack_type: str
    chain_length: int
    incident_created: bool
    message: Optional[str] = None


# ============================================================================
# ML MODELS
# ============================================================================

class MLTrainResponse(BaseModel):
    status: str
    samples: Optional[int] = None
    features_per_sample: Optional[int] = None
    contamination: Optional[float] = None
    threshold: Optional[float] = None
    error: Optional[str] = None


# ============================================================================
# FORENSIC REPORT MODELS
# ============================================================================

class ForensicReportResponse(BaseModel):
    id: Optional[str] = None
    incident_id: str
    processes: Optional[List[Dict[str, Any]]] = None
    connections: Optional[List[Dict[str, Any]]] = None
    packet_data: Optional[List[Dict[str, Any]]] = None
    gemini_summary: Optional[str] = None
    forensic_data: Optional[Dict[str, Any]] = None
    created_at: Optional[str] = None
    timestamp: Optional[str] = None
    
    class Config:
        from_attributes = True


class ReportsListResponse(BaseModel):
    reports: List[Dict[str, Any]]


# ============================================================================
# STATS MODELS
# ============================================================================

class StatsResponse(BaseModel):
    total_events: int
    total_incidents: int
    active_incidents: int
    ml_flagged: int


# ============================================================================
# GEMINI MODELS
# ============================================================================

class GeminiSummarizeRequest(BaseModel):
    incident_id: str


class GeminiSummarizeResponse(BaseModel):
    incident_id: str
    summary: str
    generated_at: str


# ============================================================================
# WEBSOCKET MODELS
# ============================================================================

class WSMessage(BaseModel):
    type: str
    data: Dict[str, Any]

