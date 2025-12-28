"""
A.R.C SENTINEL - Detection Engine
==================================
Rule-based threat detection with configurable thresholds
"""

from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum


class ThreatType(str, Enum):
    BRUTEFORCE = "bruteforce"
    PORT_SCAN = "port_scan"
    MALWARE = "malware"
    DDOS = "ddos"
    SQL_INJECTION = "sql_injection"
    EXFILTRATION = "exfiltration"
    PRIVILEGE_ESCALATION = "privilege_escalation"
    ML_ANOMALY = "ml_anomaly"
    MALICIOUS_TRAFFIC = "malicious_traffic"


class Severity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class DetectionResult:
    """Result of threat detection analysis"""
    is_threat: bool
    threat_type: Optional[ThreatType]
    severity: Optional[Severity]
    description: str
    confidence: float = 0.0
    indicators: List[str] = None
    
    def __post_init__(self):
        if self.indicators is None:
            self.indicators = []


# Known malicious IPs (simulated threat intelligence)
BLACKLIST_IPS = [
    "45.33.32.156",      # Known scanner
    "198.51.100.42",     # C2 server
    "203.0.113.0",       # Botnet node
    "192.0.2.1",         # Malware distribution
    "10.255.255.1",      # Internal threat
]

# Known malicious process hashes
MALICIOUS_HASHES = [
    "abc123malicious",
    "def456ransomware",
    "ghi789trojan",
    "jkl012rootkit",
]

# SQL Injection patterns
SQLI_PATTERNS = [
    "UNION SELECT",
    "DROP TABLE",
    "DELETE FROM",
    "INSERT INTO",
    "UPDATE SET",
    "--",
    "'; --",
    "1=1",
    "OR 1=1",
    "' OR '",
]

# Suspicious process names
SUSPICIOUS_PROCESSES = [
    "suspicious.exe",
    "mimikatz",
    "pwdump",
    "keylogger",
    "backdoor",
    "rootkit",
    "cryptominer",
    "ransomware",
]


class DetectionEngine:
    """
    Rule-based threat detection engine.
    Analyzes events against predefined security rules.
    """
    
    def __init__(self):
        self.failed_login_window: Dict[str, List[datetime]] = {}  # IP -> timestamps
        self.port_scan_window: Dict[str, List[int]] = {}  # IP -> ports scanned
        self.traffic_baseline: float = 1000.0  # bytes per event baseline
        
    def analyze_event(
        self,
        event: Dict[str, Any],
        recent_events: Optional[List[Dict]] = None
    ) -> DetectionResult:
        """
        Analyze an event for potential threats.
        Returns DetectionResult with threat details if found.
        """
        event_type = event.get("type", "")
        details = event.get("details", {})
        source_ip = event.get("source_ip", "")
        
        # Check each detection rule
        checks = [
            self._check_bruteforce(event, source_ip, details, recent_events),
            self._check_malware(event, details),
            self._check_ddos(event, details),
            self._check_sql_injection(event, details),
            self._check_exfiltration(event, details),
            self._check_privilege_escalation(event, details),
            self._check_malicious_traffic(event, details),
        ]
        
        # Return the first threat detected (could be enhanced to return highest severity)
        for result in checks:
            if result.is_threat:
                return result
        
        return DetectionResult(
            is_threat=False,
            threat_type=None,
            severity=None,
            description="No threats detected"
        )
    
    def _check_bruteforce(
        self,
        event: Dict,
        source_ip: str,
        details: Dict,
        recent_events: Optional[List[Dict]]
    ) -> DetectionResult:
        """Check for brute force attacks: >5 failed logins in 30 seconds"""
        if event.get("type") != "login_event":
            return DetectionResult(is_threat=False, threat_type=None, severity=None, description="")
        
        if details.get("success", True):
            return DetectionResult(is_threat=False, threat_type=None, severity=None, description="")
        
        # Track failed logins
        now = datetime.utcnow()
        if source_ip not in self.failed_login_window:
            self.failed_login_window[source_ip] = []
        
        # Clean old entries (older than 30 seconds)
        cutoff = now - timedelta(seconds=30)
        self.failed_login_window[source_ip] = [
            ts for ts in self.failed_login_window[source_ip]
            if ts > cutoff
        ]
        
        # Add current attempt
        self.failed_login_window[source_ip].append(now)
        
        failed_count = len(self.failed_login_window[source_ip])
        
        if failed_count > 5:
            return DetectionResult(
                is_threat=True,
                threat_type=ThreatType.BRUTEFORCE,
                severity=Severity.HIGH,
                description=f"Brute force attack detected: {failed_count} failed login attempts in 30 seconds",
                confidence=min(0.95, 0.5 + (failed_count - 5) * 0.1),
                indicators=[
                    f"Source IP: {source_ip}",
                    f"Failed attempts: {failed_count}",
                    f"Target user: {details.get('username', 'unknown')}"
                ]
            )
        
        return DetectionResult(is_threat=False, threat_type=None, severity=None, description="")
    
    def _check_malware(self, event: Dict, details: Dict) -> DetectionResult:
        """Check for malware indicators"""
        if event.get("type") != "process_event":
            return DetectionResult(is_threat=False, threat_type=None, severity=None, description="")
        
        process_name = details.get("process_name", "").lower()
        process_hash = details.get("hash", "")
        
        indicators = []
        
        # Check for suspicious process names
        for suspicious in SUSPICIOUS_PROCESSES:
            if suspicious in process_name:
                indicators.append(f"Suspicious process: {process_name}")
                break
        
        # Check for known malicious hashes
        if process_hash in MALICIOUS_HASHES:
            indicators.append(f"Known malicious hash: {process_hash}")
        
        if indicators:
            return DetectionResult(
                is_threat=True,
                threat_type=ThreatType.MALWARE,
                severity=Severity.CRITICAL,
                description="Malware detected: suspicious process or known malicious hash",
                confidence=0.9,
                indicators=indicators
            )
        
        return DetectionResult(is_threat=False, threat_type=None, severity=None, description="")
    
    def _check_ddos(self, event: Dict, details: Dict) -> DetectionResult:
        """Check for DDoS indicators: traffic > baseline * 4"""
        if event.get("type") != "network_event":
            return DetectionResult(is_threat=False, threat_type=None, severity=None, description="")
        
        traffic_volume = details.get("bytes", 0)
        
        if traffic_volume > self.traffic_baseline * 4:
            return DetectionResult(
                is_threat=True,
                threat_type=ThreatType.DDOS,
                severity=Severity.CRITICAL,
                description=f"DDoS attack detected: traffic volume {traffic_volume} bytes exceeds threshold",
                confidence=0.85,
                indicators=[
                    f"Traffic volume: {traffic_volume} bytes",
                    f"Baseline: {self.traffic_baseline} bytes",
                    f"Multiplier: {traffic_volume / self.traffic_baseline:.1f}x"
                ]
            )
        
        return DetectionResult(is_threat=False, threat_type=None, severity=None, description="")
    
    def _check_sql_injection(self, event: Dict, details: Dict) -> DetectionResult:
        """Check for SQL injection patterns"""
        # Check command field or any string in details
        check_strings = [
            details.get("command", ""),
            details.get("request_payload", ""),
            details.get("query", ""),
            str(details)
        ]
        
        for check_str in check_strings:
            for pattern in SQLI_PATTERNS:
                if pattern.upper() in check_str.upper():
                    return DetectionResult(
                        is_threat=True,
                        threat_type=ThreatType.SQL_INJECTION,
                        severity=Severity.HIGH,
                        description=f"SQL injection attempt detected: found pattern '{pattern}'",
                        confidence=0.88,
                        indicators=[
                            f"Pattern matched: {pattern}",
                            f"Source: {event.get('source_ip', 'unknown')}"
                        ]
                    )
        
        return DetectionResult(is_threat=False, threat_type=None, severity=None, description="")
    
    def _check_exfiltration(self, event: Dict, details: Dict) -> DetectionResult:
        """Check for data exfiltration: large outbound data transfers"""
        if event.get("type") != "network_event":
            return DetectionResult(is_threat=False, threat_type=None, severity=None, description="")
        
        outbound_bytes = details.get("bytes", 0)
        dest_ip = details.get("destination_ip", "")
        
        # Threshold for suspicious data transfer (50KB in single event)
        EXFIL_THRESHOLD = 50000
        
        if outbound_bytes > EXFIL_THRESHOLD:
            return DetectionResult(
                is_threat=True,
                threat_type=ThreatType.EXFILTRATION,
                severity=Severity.HIGH,
                description=f"Potential data exfiltration: {outbound_bytes} bytes transferred to {dest_ip}",
                confidence=0.75,
                indicators=[
                    f"Outbound bytes: {outbound_bytes}",
                    f"Destination: {dest_ip}",
                    "Exceeds normal transfer threshold"
                ]
            )
        
        return DetectionResult(is_threat=False, threat_type=None, severity=None, description="")
    
    def _check_privilege_escalation(self, event: Dict, details: Dict) -> DetectionResult:
        """Check for privilege escalation attempts"""
        # Check for user role changes
        user_change = details.get("user_change", "")
        
        if "root" in user_change.lower() or "admin" in user_change.lower():
            if "->" in user_change:
                return DetectionResult(
                    is_threat=True,
                    threat_type=ThreatType.PRIVILEGE_ESCALATION,
                    severity=Severity.CRITICAL,
                    description=f"Privilege escalation detected: {user_change}",
                    confidence=0.92,
                    indicators=[
                        f"Role change: {user_change}",
                        "Sudden elevation to privileged account"
                    ]
                )
        
        # Check for sudo or elevation processes
        if event.get("type") == "process_event":
            process_name = details.get("process_name", "").lower()
            if process_name in ["sudo", "su", "doas", "pkexec", "runas"]:
                return DetectionResult(
                    is_threat=True,
                    threat_type=ThreatType.PRIVILEGE_ESCALATION,
                    severity=Severity.HIGH,
                    description=f"Privilege escalation attempt via {process_name}",
                    confidence=0.7,
                    indicators=[
                        f"Elevation tool: {process_name}",
                        f"PID: {details.get('pid', 'unknown')}"
                    ]
                )
        
        return DetectionResult(is_threat=False, threat_type=None, severity=None, description="")
    
    def _check_malicious_traffic(self, event: Dict, details: Dict) -> DetectionResult:
        """Check for traffic to known malicious IPs"""
        if event.get("type") != "network_event":
            return DetectionResult(is_threat=False, threat_type=None, severity=None, description="")
        
        dest_ip = details.get("destination_ip", "")
        
        if dest_ip in BLACKLIST_IPS:
            return DetectionResult(
                is_threat=True,
                threat_type=ThreatType.MALICIOUS_TRAFFIC,
                severity=Severity.CRITICAL,
                description=f"Communication with known malicious IP: {dest_ip}",
                confidence=0.95,
                indicators=[
                    f"Blacklisted IP: {dest_ip}",
                    f"Port: {details.get('port', 'unknown')}",
                    f"Protocol: {details.get('protocol', 'unknown')}"
                ]
            )
        
        return DetectionResult(is_threat=False, threat_type=None, severity=None, description="")


# Global detection engine instance
detection_engine = DetectionEngine()
