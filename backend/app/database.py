"""
A.R.C SENTINEL - Database & Auth (Supabase)
=============================================
Handles all database operations and Supabase Auth
"""

from supabase import create_client, Client
from typing import Optional, Dict, Any, List
from datetime import datetime
import json

from app.config import settings


class SupabaseClient:
    """Supabase client wrapper for database and auth operations"""
    
    _instance: Optional[Client] = None
    
    @classmethod
    def get_client(cls) -> Optional[Client]:
        """Get or create Supabase client singleton"""
        if cls._instance is None and settings.SUPABASE_URL and settings.SUPABASE_KEY:
            cls._instance = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        return cls._instance
    
    @classmethod
    def is_connected(cls) -> bool:
        """Check if database is connected"""
        return cls._instance is not None


# Alias for backward compatibility
Database = SupabaseClient

# Get client instance
db = SupabaseClient.get_client()


# ============================================================================
# SUPABASE AUTH FUNCTIONS
# ============================================================================

async def sign_up_user(email: str, password: str) -> Dict[str, Any]:
    """
    Sign up a new user with email verification.
    Supabase will send a verification email automatically.
    """
    if not db:
        raise Exception("Database not connected")
    
    try:
        response = db.auth.sign_up({
            "email": email,
            "password": password
        })
        
        if response.user:
            return {
                "user": {
                    "id": response.user.id,
                    "email": response.user.email,
                    "email_confirmed": response.user.email_confirmed_at is not None,
                    "created_at": str(response.user.created_at) if response.user.created_at else None
                },
                "session": {
                    "access_token": response.session.access_token if response.session else None,
                    "refresh_token": response.session.refresh_token if response.session else None,
                } if response.session else None,
                "message": "Please check your email for verification link" if not response.session else "Signed up successfully"
            }
        else:
            raise Exception("Sign up failed")
            
    except Exception as e:
        raise Exception(f"Sign up error: {str(e)}")


async def sign_in_user(email: str, password: str) -> Dict[str, Any]:
    """
    Sign in user with email and password.
    Returns session with access_token for API calls.
    """
    if not db:
        raise Exception("Database not connected")
    
    try:
        response = db.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        
        if response.user and response.session:
            # Get user role from users table
            role = "analyst"  # default role
            try:
                user_data = db.table("users").select("role").eq("email", email).execute()
                if user_data.data and len(user_data.data) > 0:
                    role = user_data.data[0].get("role", "analyst")
            except:
                pass
            
            return {
                "user": {
                    "id": response.user.id,
                    "email": response.user.email,
                    "role": role,
                    "email_confirmed": response.user.email_confirmed_at is not None
                },
                "session": {
                    "access_token": response.session.access_token,
                    "refresh_token": response.session.refresh_token,
                    "expires_at": response.session.expires_at,
                    "token_type": "Bearer"
                }
            }
        else:
            raise Exception("Invalid credentials")
            
    except Exception as e:
        error_msg = str(e)
        if "Invalid login credentials" in error_msg:
            raise Exception("Invalid email or password")
        elif "Email not confirmed" in error_msg:
            raise Exception("Please verify your email before signing in")
        elif "rate" in error_msg.lower() or "too many" in error_msg.lower():
            raise Exception("Too many login attempts. Please wait a moment and try again.")
        raise Exception(f"Sign in error: {error_msg}")


async def sign_out_user(access_token: str) -> bool:
    """Sign out user and invalidate session"""
    if not db:
        return False
    
    try:
        db.auth.sign_out()
        return True
    except:
        return False


async def get_user_from_token(access_token: str) -> Optional[Dict[str, Any]]:
    """
    Verify access token and get user info.
    This validates the Supabase JWT.
    """
    if not db:
        return None
    
    try:
        # Get user from token
        response = db.auth.get_user(access_token)
        
        if response and response.user:
            user = response.user
            
            # Get additional user data from users table
            role = "analyst"
            try:
                user_data = db.table("users").select("role, full_name").eq("email", user.email).execute()
                if user_data.data and len(user_data.data) > 0:
                    role = user_data.data[0].get("role", "analyst")
            except:
                pass
            
            return {
                "id": user.id,
                "email": user.email,
                "role": role,
                "email_confirmed": user.email_confirmed_at is not None
            }
        return None
        
    except Exception as e:
        print(f"[AUTH] Token verification error: {e}")
        return None


async def refresh_session(refresh_token: str) -> Optional[Dict[str, Any]]:
    """Refresh an expired session using refresh token"""
    if not db:
        return None
    
    try:
        response = db.auth.refresh_session(refresh_token)
        
        if response.session:
            return {
                "access_token": response.session.access_token,
                "refresh_token": response.session.refresh_token,
                "expires_at": response.session.expires_at
            }
        return None
        
    except Exception as e:
        print(f"[AUTH] Refresh error: {e}")
        return None


async def reset_password(email: str) -> bool:
    """Send password reset email"""
    if not db:
        return False
    
    try:
        db.auth.reset_password_email(email)
        return True
    except:
        return False


async def update_user_password(access_token: str, new_password: str) -> bool:
    """Update user password (requires valid session)"""
    if not db:
        return False
    
    try:
        db.auth.update_user({"password": new_password})
        return True
    except:
        return False


# ============================================================================
# DATABASE CRUD FUNCTIONS
# ============================================================================

async def insert_event(event_data: Dict[str, Any]) -> Optional[Dict]:
    """Insert a new event into the database"""
    if not db:
        return None
    try:
        result = db.table("events").insert(event_data).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"Error inserting event: {e}")
        return None


async def get_events(
    limit: int = 100,
    severity: Optional[str] = None,
    event_type: Optional[str] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    source_ip: Optional[str] = None,
    ml_flagged: Optional[bool] = None
) -> List[Dict]:
    """Get events with optional filters"""
    if not db:
        return []
    try:
        query = db.table("events").select("*")
        
        if severity:
            query = query.eq("severity", severity)
        if event_type:
            query = query.eq("type", event_type)
        if start_time:
            query = query.gte("timestamp", start_time.isoformat())
        if end_time:
            query = query.lte("timestamp", end_time.isoformat())
        if source_ip:
            query = query.eq("source_ip", source_ip)
        if ml_flagged is not None:
            query = query.eq("ml_flagged", ml_flagged)
        
        result = query.order("timestamp", desc=True).limit(limit).execute()
        return result.data or []
    except Exception as e:
        print(f"Error getting events: {e}")
        return []


async def get_event_frequency(source_ip: str, minutes: int = 5) -> int:
    """Get count of events from a source IP in the last N minutes"""
    if not db:
        return 0
    try:
        from datetime import timedelta
        cutoff = (datetime.utcnow() - timedelta(minutes=minutes)).isoformat()
        result = db.table("events").select("*", count="exact").eq("source_ip", source_ip).gte("timestamp", cutoff).execute()
        return result.count or 0
    except Exception as e:
        print(f"Error getting event frequency: {e}")
        return 0


async def get_event_type_rarity(event_type: str) -> float:
    """Calculate rarity of an event type (0-1, higher = rarer)"""
    if not db:
        return 0.5
    try:
        total = db.table("events").select("*", count="exact").execute()
        type_count = db.table("events").select("*", count="exact").eq("type", event_type).execute()
        
        total_count = total.count or 1
        event_count = type_count.count or 0
        
        if total_count == 0:
            return 0.5
        
        ratio = event_count / total_count
        rarity = 1.0 - ratio
        return round(rarity, 4)
    except Exception as e:
        print(f"Error calculating event rarity: {e}")
        return 0.5


async def get_ip_rarity(source_ip: str) -> float:
    """Calculate rarity of a source IP (0-1, higher = rarer)"""
    if not db:
        return 0.5
    try:
        total = db.table("events").select("*", count="exact").execute()
        ip_count = db.table("events").select("*", count="exact").eq("source_ip", source_ip).execute()
        
        total_count = total.count or 1
        ip_events = ip_count.count or 0
        
        if total_count == 0:
            return 0.5
        
        ratio = ip_events / total_count
        rarity = 1.0 - ratio
        return round(rarity, 4)
    except Exception as e:
        print(f"Error calculating IP rarity: {e}")
        return 0.5


async def log_audit(user_id: str, action: str, details: Dict[str, Any]) -> Optional[Dict]:
    """Log an audit event"""
    if not db:
        return None
    try:
        result = db.table("audit_log").insert({
            "user_id": user_id,
            "action": action,
            "details": json.dumps(details),
            "timestamp": datetime.utcnow().isoformat()
        }).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"Error logging audit: {e}")
        return None


async def mark_device_isolated(device_id: str, source_ip: str) -> Optional[Dict]:
    """Mark a device as isolated (quarantine)"""
    if not db:
        return None
    try:
        result = db.table("devices").upsert({
            "id": device_id,
            "source_ip": source_ip,
            "status": "isolated",
            "isolated_at": datetime.utcnow().isoformat()
        }).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"Error marking device isolated: {e}")
        return None


async def insert_incident(incident_data: Dict[str, Any]) -> Optional[Dict]:
    """Insert a new incident into the database"""
    if not db:
        return None
    try:
        result = db.table("incidents").insert(incident_data).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"Error inserting incident: {e}")
        return None


async def get_incidents(
    limit: int = 100,
    status: Optional[str] = None
) -> List[Dict]:
    """Get incidents with optional status filter"""
    if not db:
        return []
    try:
        query = db.table("incidents").select("*")
        
        if status:
            query = query.eq("status", status)
        
        result = query.order("created_at", desc=True).limit(limit).execute()
        return result.data or []
    except Exception as e:
        print(f"Error getting incidents: {e}")
        return []


async def get_incident_by_id(incident_id: str) -> Optional[Dict]:
    """Get a single incident by ID"""
    if not db:
        return None
    try:
        result = db.table("incidents").select("*").eq("id", incident_id).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"Error getting incident: {e}")
        return None


async def update_incident(incident_id: str, update_data: Dict[str, Any]) -> Optional[Dict]:
    """Update an incident"""
    if not db:
        return None
    try:
        result = db.table("incidents").update(update_data).eq("id", incident_id).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"Error updating incident: {e}")
        return None


async def insert_forensic_report(report_data: Dict[str, Any]) -> Optional[Dict]:
    """Insert a forensic report"""
    if not db:
        return None
    try:
        result = db.table("forensic_reports").insert(report_data).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"Error inserting forensic report: {e}")
        return None


async def get_forensic_report(incident_id: str) -> Optional[Dict]:
    """Get forensic report for an incident"""
    if not db:
        return None
    try:
        result = db.table("forensic_reports").select("*").eq("incident_id", incident_id).execute()
        if result.data:
            report = result.data[0]
            # Parse JSONB fields
            for field in ['processes', 'connections', 'packet_data']:
                if field in report and isinstance(report[field], str):
                    report[field] = json.loads(report[field])
            return report
        return None
    except Exception as e:
        print(f"Error getting forensic report: {e}")
        return None


async def get_all_forensic_reports(limit: int = 100) -> List[Dict]:
    """Get all forensic reports"""
    if not db:
        return []
    try:
        result = db.table("forensic_reports").select("*, incidents(*)").order("created_at", desc=True).limit(limit).execute()
        reports = result.data or []
        for report in reports:
            for field in ['processes', 'connections', 'packet_data']:
                if field in report and isinstance(report[field], str):
                    report[field] = json.loads(report[field])
        return reports
    except Exception as e:
        print(f"Error getting forensic reports: {e}")
        return []


async def update_forensic_report(incident_id: str, update_data: Dict[str, Any]) -> Optional[Dict]:
    """Update a forensic report"""
    if not db:
        return None
    try:
        result = db.table("forensic_reports").update(update_data).eq("incident_id", incident_id).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"Error updating forensic report: {e}")
        return None


async def save_ml_model(model_bytes: bytes) -> Optional[Dict]:
    """Save ML model to database"""
    if not db:
        return None
    try:
        import base64
        model_b64 = base64.b64encode(model_bytes).decode('utf-8')
        
        # Upsert (update if exists, insert if not)
        result = db.table("ml_model").upsert({
            "id": 1,
            "model_data": model_b64,
            "trained_at": datetime.utcnow().isoformat()
        }).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"Error saving ML model: {e}")
        return None


async def load_ml_model() -> Optional[bytes]:
    """Load ML model from database"""
    if not db:
        return None
    try:
        import base64
        result = db.table("ml_model").select("*").eq("id", 1).execute()
        if result.data and result.data[0].get("model_data"):
            return base64.b64decode(result.data[0]["model_data"])
        return None
    except Exception as e:
        print(f"Error loading ML model: {e}")
        return None


async def get_stats() -> Dict[str, int]:
    """Get dashboard statistics"""
    if not db:
        return {
            "total_events": 0,
            "total_incidents": 0,
            "active_incidents": 0,
            "ml_flagged": 0
        }
    try:
        events = db.table("events").select("*", count="exact").execute()
        incidents = db.table("incidents").select("*", count="exact").execute()
        active = db.table("incidents").select("*", count="exact").eq("status", "active").execute()
        ml_flagged = db.table("events").select("*", count="exact").eq("ml_flagged", True).execute()
        
        return {
            "total_events": events.count or 0,
            "total_incidents": incidents.count or 0,
            "active_incidents": active.count or 0,
            "ml_flagged": ml_flagged.count or 0
        }
    except Exception as e:
        print(f"Error getting stats: {e}")
        return {
            "total_events": 0,
            "total_incidents": 0,
            "active_incidents": 0,
            "ml_flagged": 0
        }


async def get_user_by_email(email: str) -> Optional[Dict]:
    """Get user by email from users table"""
    if not db:
        return None
    try:
        result = db.table("users").select("*").eq("email", email).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"Error getting user: {e}")
        return None


async def create_or_update_user_profile(user_id: str, email: str, role: str = "analyst") -> Optional[Dict]:
    """Create or update user profile in users table"""
    if not db:
        return None
    try:
        result = db.table("users").upsert({
            "id": user_id,
            "email": email,
            "role": role,
            "updated_at": datetime.utcnow().isoformat()
        }).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"Error creating/updating user profile: {e}")
        return None

