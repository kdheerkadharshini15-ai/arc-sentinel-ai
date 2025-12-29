"""
A.R.C SENTINEL - Forensics Engine
==================================
System forensics capture using psutil and mock packet data
DEMO MODE: Returns hardcoded data when enabled
"""

import psutil
from typing import Dict, Any, List, Optional
from datetime import datetime
import json
import random
import hashlib

# Import demo mode config
try:
    from app.config.demo_mode import DEMO_MODE, DEMO_FORENSIC_REPORT
except ImportError:
    DEMO_MODE = False
    DEMO_FORENSIC_REPORT = {}


class ForensicsEngine:
    """
    Captures system forensic snapshots for incident investigation.
    Uses psutil for live system data and generates mock packet captures.
    """
    
    def __init__(self):
        self.capture_count = 0
    
    def capture_snapshot(
        self,
        event: Dict[str, Any],
        incident_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Capture a complete forensic snapshot for an incident.
        Includes processes, network connections, and mock packet data.
        """
        # DEMO MODE: Return hardcoded forensic data
        if DEMO_MODE:
            return {
                "snapshot_id": hashlib.md5(f"{datetime.utcnow().isoformat()}".encode()).hexdigest()[:16],
                "captured_at": datetime.utcnow().isoformat(),
                "incident_type": incident_info.get("threat_type", "unknown"),
                "system_info": DEMO_FORENSIC_REPORT.get("system_info", {}),
                "processes": DEMO_FORENSIC_REPORT.get("processes", []),
                "connections": DEMO_FORENSIC_REPORT.get("connections", []),
                "packet_data": self._generate_mock_packets(event, incident_info),
                "suspicious_indicators": DEMO_FORENSIC_REPORT.get("indicators", []),
                "recommended_actions": DEMO_FORENSIC_REPORT.get("recommendations", []),
                "gemini_summary": DEMO_FORENSIC_REPORT.get("summary", ""),
                "confidence": DEMO_FORENSIC_REPORT.get("confidence", "94%"),
                "trigger_event": {
                    "id": event.get("id"),
                    "type": event.get("type"),
                    "source_ip": event.get("source_ip"),
                    "severity": event.get("severity")
                }
            }
        
        self.capture_count += 1
        
        snapshot = {
            "snapshot_id": hashlib.md5(
                f"{datetime.utcnow().isoformat()}{self.capture_count}".encode()
            ).hexdigest()[:16],
            "captured_at": datetime.utcnow().isoformat(),
            "incident_type": incident_info.get("threat_type", "unknown"),
            "system_info": self._get_system_info(),
            "processes": self._get_processes(),
            "connections": self._get_network_connections(),
            "packet_data": self._generate_mock_packets(event, incident_info),
            "suspicious_indicators": self._extract_indicators(event, incident_info),
            "recommended_actions": self._generate_recommendations(incident_info),
            "trigger_event": {
                "id": event.get("id"),
                "type": event.get("type"),
                "source_ip": event.get("source_ip"),
                "severity": event.get("severity")
            }
        }
        
        return snapshot
    
    def _get_system_info(self) -> Dict[str, Any]:
        """Get current system information"""
        try:
            cpu_percent = psutil.cpu_percent(interval=0.1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage("/")
            boot_time = datetime.fromtimestamp(psutil.boot_time())
            
            return {
                "cpu_percent": round(cpu_percent, 2),
                "memory_percent": round(memory.percent, 2),
                "memory_total_gb": round(memory.total / (1024**3), 2),
                "memory_available_gb": round(memory.available / (1024**3), 2),
                "disk_percent": round(disk.percent, 2),
                "disk_total_gb": round(disk.total / (1024**3), 2),
                "boot_time": boot_time.isoformat(),
                "uptime_hours": round((datetime.now() - boot_time).total_seconds() / 3600, 2)
            }
        except Exception as e:
            return {"error": str(e)}
    
    def _get_processes(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Get list of running processes sorted by CPU usage"""
        processes = []
        try:
            for proc in psutil.process_iter(['pid', 'name', 'username', 'cpu_percent', 'memory_percent', 'status', 'create_time']):
                try:
                    pinfo = proc.info
                    processes.append({
                        "pid": pinfo.get('pid'),
                        "name": pinfo.get('name'),
                        "username": pinfo.get('username'),
                        "cpu_percent": round(pinfo.get('cpu_percent', 0), 2),
                        "memory_percent": round(pinfo.get('memory_percent', 0), 2),
                        "status": pinfo.get('status'),
                        "created": datetime.fromtimestamp(pinfo.get('create_time', 0)).isoformat() if pinfo.get('create_time') else None
                    })
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
            
            # Sort by CPU and return top processes
            processes.sort(key=lambda x: x.get('cpu_percent', 0), reverse=True)
            return processes[:limit]
            
        except Exception as e:
            return [{"error": str(e)}]
    
    def _get_network_connections(self, limit: int = 15) -> List[Dict[str, Any]]:
        """Get active network connections"""
        connections = []
        try:
            for conn in psutil.net_connections(kind='inet'):
                try:
                    conn_info = {
                        "family": "IPv4" if conn.family.name == "AF_INET" else "IPv6",
                        "type": conn.type.name,
                        "local_address": f"{conn.laddr.ip}:{conn.laddr.port}" if conn.laddr else None,
                        "remote_address": f"{conn.raddr.ip}:{conn.raddr.port}" if conn.raddr else None,
                        "status": conn.status,
                        "pid": conn.pid
                    }
                    
                    # Try to get process name
                    if conn.pid:
                        try:
                            proc = psutil.Process(conn.pid)
                            conn_info["process_name"] = proc.name()
                        except:
                            conn_info["process_name"] = "unknown"
                    
                    connections.append(conn_info)
                except:
                    pass
            
            return connections[:limit]
            
        except Exception as e:
            return [{"error": str(e)}]
    
    def _generate_mock_packets(
        self,
        event: Dict[str, Any],
        incident_info: Dict[str, Any],
        count: int = 5
    ) -> List[Dict[str, Any]]:
        """Generate mock packet capture data for the incident"""
        packets = []
        details = event.get("details", {})
        
        protocols = ["TCP", "UDP", "ICMP"]
        flags = ["SYN", "SYN-ACK", "ACK", "FIN", "RST", "PSH"]
        
        for i in range(count):
            packet = {
                "sequence": i + 1,
                "timestamp": datetime.utcnow().isoformat(),
                "source_ip": event.get("source_ip", "192.168.1.1"),
                "source_port": random.randint(1024, 65535),
                "destination_ip": details.get("destination_ip", "10.0.0.1"),
                "destination_port": details.get("port", random.choice([22, 80, 443, 3306, 8080])),
                "protocol": details.get("protocol", random.choice(protocols)),
                "flags": random.choice(flags),
                "size_bytes": random.randint(64, 1500),
                "ttl": random.choice([64, 128, 255]),
                "payload_preview": self._generate_payload_preview(incident_info.get("threat_type", ""))
            }
            packets.append(packet)
        
        return packets
    
    def _generate_payload_preview(self, threat_type: str) -> str:
        """Generate realistic-looking payload preview based on threat type"""
        payloads = {
            "bruteforce": "[AUTH] Failed password for admin from 192.168.1.x port 52341 ssh2",
            "malware": "[BINARY] MZ\\x90\\x00\\x03\\x00\\x00\\x00...PE signature detected",
            "ddos": "[FLOOD] GET / HTTP/1.1\\r\\nHost: target.com\\r\\nUser-Agent: [RANDOMIZED]",
            "sql_injection": "[SQL] SELECT * FROM users WHERE id='1' OR '1'='1'--",
            "exfiltration": "[DATA] POST /upload HTTP/1.1\\r\\nContent-Length: 524288\\r\\n[ENCRYPTED]",
            "privilege_escalation": "[SUDO] user : TTY=pts/0 ; PWD=/home/user ; USER=root ; COMMAND=/bin/bash",
            "malicious_traffic": "[C2] BEACON: id=0x4A2B status=ACTIVE interval=60s",
        }
        return payloads.get(threat_type, "[ENCRYPTED DATA]")
    
    def _extract_indicators(
        self,
        event: Dict[str, Any],
        incident_info: Dict[str, Any]
    ) -> List[str]:
        """Extract Indicators of Compromise (IOCs) from the event"""
        indicators = []
        details = event.get("details", {})
        
        # Add basic indicators
        indicators.append(f"Event Type: {event.get('type', 'unknown')}")
        indicators.append(f"Source IP: {event.get('source_ip', 'unknown')}")
        indicators.append(f"Severity: {incident_info.get('severity', 'unknown')}")
        indicators.append(f"Detection Time: {datetime.utcnow().isoformat()}")
        
        # Add event-specific indicators
        if details.get("destination_ip"):
            indicators.append(f"Destination IP: {details['destination_ip']}")
        if details.get("port"):
            indicators.append(f"Target Port: {details['port']}")
        if details.get("process_name"):
            indicators.append(f"Process: {details['process_name']}")
        if details.get("hash"):
            indicators.append(f"Hash: {details['hash']}")
        if details.get("username"):
            indicators.append(f"Username: {details['username']}")
        
        return indicators
    
    def _generate_recommendations(self, incident_info: Dict[str, Any]) -> List[str]:
        """Generate remediation recommendations based on incident type"""
        threat_type = incident_info.get("threat_type", "")
        severity = incident_info.get("severity", "medium")
        
        base_recommendations = [
            "Document all findings for incident report",
            "Review related logs for additional context",
            "Update incident response runbook if needed"
        ]
        
        threat_recommendations = {
            "bruteforce": [
                "Block source IP at firewall level",
                "Force password reset for targeted accounts",
                "Enable account lockout policy",
                "Implement multi-factor authentication",
                "Review authentication logs for successful compromise"
            ],
            "malware": [
                "Isolate affected system immediately",
                "Kill malicious process and quarantine files",
                "Run full antivirus/EDR scan",
                "Check for persistence mechanisms",
                "Scan network for lateral movement indicators"
            ],
            "ddos": [
                "Enable rate limiting on affected services",
                "Activate CDN/DDoS protection services",
                "Block attacking IP ranges at edge",
                "Scale infrastructure if possible",
                "Contact ISP for upstream filtering"
            ],
            "sql_injection": [
                "Block source IP immediately",
                "Review database for unauthorized changes",
                "Check for data exfiltration",
                "Patch vulnerable application",
                "Implement Web Application Firewall (WAF) rules"
            ],
            "exfiltration": [
                "Block destination IP and domain",
                "Identify scope of data potentially leaked",
                "Preserve logs for forensic analysis",
                "Notify security leadership immediately",
                "Prepare for potential breach disclosure"
            ],
            "privilege_escalation": [
                "Revoke elevated privileges immediately",
                "Reset all affected user credentials",
                "Audit recent admin actions",
                "Check for unauthorized changes to system files",
                "Review sudo/admin group memberships"
            ],
            "malicious_traffic": [
                "Block C2 IP/domain at DNS and firewall",
                "Isolate infected host from network",
                "Scan for additional compromised systems",
                "Check for beaconing patterns in proxy logs",
                "Identify initial infection vector"
            ]
        }
        
        recommendations = threat_recommendations.get(threat_type, [
            "Investigate event source and context",
            "Check for related suspicious activity",
            "Escalate if severity is high or critical",
            "Monitor for recurrence"
        ])
        
        return recommendations + base_recommendations


# Global forensics engine instance
forensics_engine = ForensicsEngine()
