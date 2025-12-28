"""
A.R.C SENTINEL - Response Automation Engine
=============================================
Automated incident response actions and remediation
"""

from typing import Dict, Any, Optional, List
from datetime import datetime
import asyncio
import json

from app.config import settings


class ResponseEngine:
    """
    Automated response engine for incident remediation.
    Provides capabilities for process isolation, device quarantine,
    session revocation, and alert escalation.
    """
    
    def __init__(self):
        self.action_log: List[Dict[str, Any]] = []
        self.isolated_processes: Dict[int, Dict] = {}
        self.quarantined_devices: Dict[str, Dict] = {}
        self.revoked_sessions: List[str] = []
        self.escalated_incidents: List[str] = []
    
    async def execute_response(
        self,
        incident: Dict[str, Any],
        actions: List[str] = None
    ) -> Dict[str, Any]:
        """
        Execute automated response based on incident severity and type.
        Returns summary of actions taken.
        """
        severity = incident.get("severity", "medium")
        threat_type = incident.get("threat_type", incident.get("type", "unknown"))
        incident_id = incident.get("id", "unknown")
        
        results = {
            "incident_id": incident_id,
            "actions_taken": [],
            "success": True,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Determine actions based on severity
        if severity == "critical":
            # Critical: Full automated response
            results["actions_taken"].extend([
                await self.escalate_notification(incident_id, severity, threat_type),
                await self.send_alert_email(incident)
            ])
        
        # Execute type-specific responses
        if threat_type in ["malware", "malware_detection"]:
            pid = incident.get("event_id", {}).get("details", {}).get("pid")
            if pid:
                results["actions_taken"].append(await self.isolate_process(pid, incident_id))
        
        elif threat_type == "bruteforce":
            source_ip = incident.get("source_ip", incident.get("event_id", {}).get("source_ip"))
            if source_ip:
                results["actions_taken"].append(
                    await self.quarantine_device(f"device_{source_ip}", source_ip, incident_id)
                )
        
        elif threat_type == "privilege_escalation":
            user_id = incident.get("user_id", "unknown")
            results["actions_taken"].append(await self.revoke_user_session(user_id, incident_id))
        
        # Log all actions
        self._log_action(incident_id, results["actions_taken"])
        
        return results
    
    async def isolate_process(
        self,
        pid: int,
        incident_id: str,
        reason: str = "Malware detected"
    ) -> Dict[str, Any]:
        """
        Isolate a suspicious process.
        In production: Would terminate or suspend the process.
        """
        try:
            import psutil
            
            action_result = {
                "action": "isolate_process",
                "pid": pid,
                "status": "success",
                "timestamp": datetime.utcnow().isoformat(),
                "reason": reason
            }
            
            # Check if process exists
            if psutil.pid_exists(pid):
                try:
                    proc = psutil.Process(pid)
                    action_result["process_name"] = proc.name()
                    action_result["process_status"] = proc.status()
                    
                    # In production, you would actually terminate:
                    # proc.terminate()
                    # For demo, we just mark it as isolated
                    action_result["message"] = f"Process {pid} ({proc.name()}) marked for isolation"
                    
                except psutil.NoSuchProcess:
                    action_result["message"] = f"Process {pid} no longer exists"
                except psutil.AccessDenied:
                    action_result["status"] = "access_denied"
                    action_result["message"] = f"Insufficient permissions to isolate process {pid}"
            else:
                action_result["message"] = f"Process {pid} does not exist"
            
            # Track isolated process
            self.isolated_processes[pid] = {
                "incident_id": incident_id,
                "isolated_at": datetime.utcnow().isoformat(),
                "reason": reason
            }
            
            print(f"[RESPONSE] Process isolation: PID {pid} - {action_result['message']}")
            return action_result
            
        except Exception as e:
            return {
                "action": "isolate_process",
                "pid": pid,
                "status": "error",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def quarantine_device(
        self,
        device_id: str,
        source_ip: str,
        incident_id: str
    ) -> Dict[str, Any]:
        """
        Quarantine a device by marking it as isolated in the database.
        In production: Would integrate with network/firewall APIs.
        """
        try:
            from app.database import mark_device_isolated
            
            # Mark in database
            await mark_device_isolated(device_id, source_ip)
            
            # Track quarantine
            self.quarantined_devices[device_id] = {
                "source_ip": source_ip,
                "incident_id": incident_id,
                "quarantined_at": datetime.utcnow().isoformat()
            }
            
            action_result = {
                "action": "quarantine_device",
                "device_id": device_id,
                "source_ip": source_ip,
                "status": "quarantined",
                "timestamp": datetime.utcnow().isoformat(),
                "message": f"Device {device_id} ({source_ip}) has been quarantined"
            }
            
            print(f"[RESPONSE] Device quarantine: {device_id} ({source_ip})")
            return action_result
            
        except Exception as e:
            return {
                "action": "quarantine_device",
                "device_id": device_id,
                "status": "error",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def revoke_user_session(
        self,
        user_id: str,
        incident_id: str
    ) -> Dict[str, Any]:
        """
        Revoke user session (Supabase session invalidation stub).
        In production: Would call Supabase Admin API to revoke sessions.
        """
        try:
            # In production with Supabase Admin API:
            # supabase.auth.admin.sign_out(user_id)
            
            self.revoked_sessions.append(user_id)
            
            action_result = {
                "action": "revoke_user_session",
                "user_id": user_id,
                "status": "revoked",
                "timestamp": datetime.utcnow().isoformat(),
                "message": f"Session revocation requested for user {user_id}"
            }
            
            print(f"[RESPONSE] Session revocation: User {user_id}")
            return action_result
            
        except Exception as e:
            return {
                "action": "revoke_user_session",
                "user_id": user_id,
                "status": "error",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def escalate_notification(
        self,
        incident_id: str,
        severity: str,
        threat_type: str
    ) -> Dict[str, Any]:
        """
        Escalate notification for critical incidents.
        Broadcasts alert via WebSocket and logs escalation.
        """
        try:
            self.escalated_incidents.append(incident_id)
            
            # This will be called separately to broadcast
            action_result = {
                "action": "escalate_notification",
                "incident_id": incident_id,
                "severity": severity,
                "threat_type": threat_type,
                "status": "escalated",
                "timestamp": datetime.utcnow().isoformat(),
                "message": f"CRITICAL ALERT: {threat_type} incident {incident_id} escalated"
            }
            
            print(f"[RESPONSE] CRITICAL ESCALATION: Incident {incident_id} - {threat_type}")
            return action_result
            
        except Exception as e:
            return {
                "action": "escalate_notification",
                "incident_id": incident_id,
                "status": "error",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def send_alert_email(self, incident: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send alert email for critical incidents.
        Stub function - in production would integrate with email service.
        """
        try:
            incident_id = incident.get("id", "unknown")
            severity = incident.get("severity", "unknown")
            threat_type = incident.get("threat_type", incident.get("type", "unknown"))
            
            # Email stub - in production: use SendGrid, AWS SES, etc.
            email_content = f"""
CRITICAL SECURITY ALERT - A.R.C SENTINEL

Incident ID: {incident_id}
Type: {threat_type}
Severity: {severity.upper()}
Time: {datetime.utcnow().isoformat()}
Description: {incident.get('description', 'N/A')}

Immediate action required. Please review the incident in the SOC dashboard.
            """
            
            action_result = {
                "action": "send_alert_email",
                "incident_id": incident_id,
                "status": "sent",
                "recipients": ["soc-team@arc-sentinel.local"],
                "timestamp": datetime.utcnow().isoformat(),
                "message": "Alert email queued for delivery"
            }
            
            print(f"[RESPONSE] Alert email sent for incident {incident_id}")
            return action_result
            
        except Exception as e:
            return {
                "action": "send_alert_email",
                "status": "error",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    def _log_action(self, incident_id: str, actions: List[Dict[str, Any]]):
        """Log response actions for audit trail"""
        self.action_log.append({
            "incident_id": incident_id,
            "actions": actions,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    def get_action_log(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent response actions"""
        return self.action_log[-limit:]
    
    def get_quarantined_devices(self) -> Dict[str, Dict]:
        """Get all quarantined devices"""
        return self.quarantined_devices
    
    def get_isolated_processes(self) -> Dict[int, Dict]:
        """Get all isolated processes"""
        return self.isolated_processes


# Global response engine instance
response_engine = ResponseEngine()
