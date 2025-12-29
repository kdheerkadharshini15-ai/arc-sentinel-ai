"""
A.R.C SENTINEL - Detection Engine
==================================
Stateful rule-based threat detection with configurable thresholds.

Features:
- Brute force detection with sliding window memory
- Port scan detection with port aggregation
- DDoS spike detection with configurable multiplier
- Privilege escalation from role changes
- Malware signature detection
- SQL injection pattern matching
"""

from typing import Dict, Any, Optional, List, Tuple, Set
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict
import threading


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


@dataclass
class LoginAttempt:
    """Tracks a single login attempt"""
    timestamp: datetime
    username: str
    success: bool


@dataclass
class PortScanEvent:
    """Tracks a port scan event"""
    timestamp: datetime
    port: int
    destination_ip: str


@dataclass
class TrafficEvent:
    """Tracks traffic volume for DDoS detection"""
    timestamp: datetime
    bytes: int
    source_ip: str


@dataclass
class RoleChange:
    """Tracks user role changes for privilege escalation"""
    timestamp: datetime
    from_role: str
    to_role: str
    user: str


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

# Privileged roles that trigger escalation detection
PRIVILEGED_ROLES = ["root", "admin", "administrator", "sudo", "wheel", "superuser"]


class DetectionEngine:
    """
    Stateful rule-based threat detection engine.
    Maintains memory windows for aggregation-based detection.
    
    Detection Thresholds:
    - Brute force: >5 failed logins in 30 seconds from same IP
    - Port scan: >10 unique ports scanned in 60 seconds from same IP
    - DDoS: Traffic spike > 4x baseline
    - Privilege escalation: Role change to privileged account
    """
    
    # Configuration thresholds
    BRUTEFORCE_THRESHOLD = 5           # Max failed attempts before alert
    BRUTEFORCE_WINDOW_SECONDS = 30     # Time window for brute force
    PORT_SCAN_THRESHOLD = 10           # Max ports before alert
    PORT_SCAN_WINDOW_SECONDS = 60      # Time window for port scan
    DDOS_SPIKE_MULTIPLIER = 4.0        # Traffic spike threshold
    DDOS_WINDOW_SECONDS = 30           # Time window for DDoS detection
    EXFIL_THRESHOLD_BYTES = 50000      # Bytes threshold for exfiltration
    
    def __init__(self):
        # Thread-safe lock for concurrent access
        self._lock = threading.Lock()
        
        # Stateful memory windows
        # Brute force: IP -> list of LoginAttempt
        self.failed_login_memory: Dict[str, List[LoginAttempt]] = defaultdict(list)
        
        # Port scan: IP -> list of PortScanEvent
        self.port_scan_memory: Dict[str, List[PortScanEvent]] = defaultdict(list)
        
        # DDoS: IP -> list of TrafficEvent
        self.traffic_memory: Dict[str, List[TrafficEvent]] = defaultdict(list)
        
        # Privilege escalation: user -> list of RoleChange
        self.role_change_memory: Dict[str, List[RoleChange]] = defaultdict(list)
        
        # Traffic baseline (adaptive)
        self.traffic_baseline: float = 1000.0  # bytes per event baseline
        self.traffic_samples: int = 0
        self.traffic_sum: float = 0.0
        
    def _cleanup_old_entries(self, cutoff: datetime):
        """Remove entries older than cutoff from all memory windows"""
        with self._lock:
            # Clean brute force memory
            for ip in list(self.failed_login_memory.keys()):
                self.failed_login_memory[ip] = [
                    attempt for attempt in self.failed_login_memory[ip]
                    if attempt.timestamp > cutoff
                ]
                if not self.failed_login_memory[ip]:
                    del self.failed_login_memory[ip]
            
            # Clean port scan memory
            port_cutoff = datetime.utcnow() - timedelta(seconds=self.PORT_SCAN_WINDOW_SECONDS)
            for ip in list(self.port_scan_memory.keys()):
                self.port_scan_memory[ip] = [
                    scan for scan in self.port_scan_memory[ip]
                    if scan.timestamp > port_cutoff
                ]
                if not self.port_scan_memory[ip]:
                    del self.port_scan_memory[ip]
            
            # Clean traffic memory
            traffic_cutoff = datetime.utcnow() - timedelta(seconds=self.DDOS_WINDOW_SECONDS)
            for ip in list(self.traffic_memory.keys()):
                self.traffic_memory[ip] = [
                    event for event in self.traffic_memory[ip]
                    if event.timestamp > traffic_cutoff
                ]
                if not self.traffic_memory[ip]:
                    del self.traffic_memory[ip]
    
    def analyze_event(
        self,
        event: Dict[str, Any],
        recent_events: Optional[List[Dict]] = None
    ) -> DetectionResult:
        """
        Analyze an event for potential threats using stateful detection.
        Returns DetectionResult with threat details if found.
        """
        event_type = event.get("type", "")
        details = event.get("details", {})
        source_ip = event.get("source_ip", "")
        
        # Periodic cleanup of old entries
        now = datetime.utcnow()
        cutoff = now - timedelta(seconds=max(
            self.BRUTEFORCE_WINDOW_SECONDS,
            self.PORT_SCAN_WINDOW_SECONDS,
            self.DDOS_WINDOW_SECONDS
        ))
        self._cleanup_old_entries(cutoff)
        
        # Check each detection rule
        checks = [
            self._check_bruteforce(event, source_ip, details),
            self._check_port_scan(event, source_ip, details),
            self._check_malware(event, details),
            self._check_ddos(event, source_ip, details),
            self._check_sql_injection(event, details),
            self._check_exfiltration(event, details),
            self._check_privilege_escalation(event, details),
            self._check_malicious_traffic(event, details),
        ]
        
        # Return highest severity threat detected
        threats = [result for result in checks if result.is_threat]
        if threats:
            # Sort by severity (critical > high > medium > low)
            severity_order = {Severity.CRITICAL: 0, Severity.HIGH: 1, Severity.MEDIUM: 2, Severity.LOW: 3}
            threats.sort(key=lambda x: severity_order.get(x.severity, 4))
            return threats[0]
        
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
        details: Dict
    ) -> DetectionResult:
        """
        Check for brute force attacks using sliding window memory.
        Triggers when >5 failed logins in 30 seconds from same IP.
        """
        if event.get("type") != "login_event":
            return DetectionResult(is_threat=False, threat_type=None, severity=None, description="")
        
        success = details.get("success", True)
        username = details.get("username", "unknown")
        now = datetime.utcnow()
        
        # Track this attempt in memory
        with self._lock:
            if not success:
                self.failed_login_memory[source_ip].append(LoginAttempt(
                    timestamp=now,
                    username=username,
                    success=False
                ))
            
            # Clean old entries for this IP
            cutoff = now - timedelta(seconds=self.BRUTEFORCE_WINDOW_SECONDS)
            self.failed_login_memory[source_ip] = [
                attempt for attempt in self.failed_login_memory[source_ip]
                if attempt.timestamp > cutoff
            ]
            
            # Count failed attempts
            failed_count = len(self.failed_login_memory[source_ip])
            targeted_users = set(a.username for a in self.failed_login_memory[source_ip])
        
        if failed_count > self.BRUTEFORCE_THRESHOLD:
            return DetectionResult(
                is_threat=True,
                threat_type=ThreatType.BRUTEFORCE,
                severity=Severity.HIGH if failed_count < 10 else Severity.CRITICAL,
                description=f"Brute force attack detected: {failed_count} failed login attempts in {self.BRUTEFORCE_WINDOW_SECONDS} seconds",
                confidence=min(0.95, 0.5 + (failed_count - self.BRUTEFORCE_THRESHOLD) * 0.1),
                indicators=[
                    f"Source IP: {source_ip}",
                    f"Failed attempts: {failed_count}",
                    f"Window: {self.BRUTEFORCE_WINDOW_SECONDS}s",
                    f"Targeted users: {', '.join(list(targeted_users)[:5])}"
                ]
            )
        
        return DetectionResult(is_threat=False, threat_type=None, severity=None, description="")
    
    def _check_port_scan(
        self,
        event: Dict,
        source_ip: str,
        details: Dict
    ) -> DetectionResult:
        """
        Check for port scanning using sliding window memory.
        Triggers when >10 unique ports scanned in 60 seconds from same IP.
        """
        if event.get("type") != "network_event":
            return DetectionResult(is_threat=False, threat_type=None, severity=None, description="")
        
        port = details.get("port")
        dest_ip = details.get("destination_ip", "")
        flags = details.get("flags", "")
        
        # Only track SYN or connection attempts
        if not port:
            return DetectionResult(is_threat=False, threat_type=None, severity=None, description="")
        
        now = datetime.utcnow()
        
        with self._lock:
            # Track this port scan
            self.port_scan_memory[source_ip].append(PortScanEvent(
                timestamp=now,
                port=port,
                destination_ip=dest_ip
            ))
            
            # Clean old entries
            cutoff = now - timedelta(seconds=self.PORT_SCAN_WINDOW_SECONDS)
            self.port_scan_memory[source_ip] = [
                scan for scan in self.port_scan_memory[source_ip]
                if scan.timestamp > cutoff
            ]
            
            # Count unique ports
            unique_ports = set(scan.port for scan in self.port_scan_memory[source_ip])
            unique_targets = set(scan.destination_ip for scan in self.port_scan_memory[source_ip])
        
        if len(unique_ports) > self.PORT_SCAN_THRESHOLD:
            return DetectionResult(
                is_threat=True,
                threat_type=ThreatType.PORT_SCAN,
                severity=Severity.HIGH,
                description=f"Port scan detected: {len(unique_ports)} unique ports scanned in {self.PORT_SCAN_WINDOW_SECONDS} seconds",
                confidence=min(0.9, 0.5 + (len(unique_ports) - self.PORT_SCAN_THRESHOLD) * 0.05),
                indicators=[
                    f"Source IP: {source_ip}",
                    f"Unique ports: {len(unique_ports)}",
                    f"Window: {self.PORT_SCAN_WINDOW_SECONDS}s",
                    f"Target IPs: {', '.join(list(unique_targets)[:3])}",
                    f"Sample ports: {', '.join(str(p) for p in list(unique_ports)[:10])}"
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
    
    def _check_ddos(
        self,
        event: Dict,
        source_ip: str,
        details: Dict
    ) -> DetectionResult:
        """
        Check for DDoS indicators using traffic spike detection.
        Triggers when traffic > baseline * DDOS_SPIKE_MULTIPLIER.
        Updates adaptive baseline with normal traffic.
        """
        if event.get("type") != "network_event":
            return DetectionResult(is_threat=False, threat_type=None, severity=None, description="")
        
        traffic_volume = details.get("bytes", 0)
        now = datetime.utcnow()
        
        with self._lock:
            # Track this traffic event
            self.traffic_memory[source_ip].append(TrafficEvent(
                timestamp=now,
                bytes=traffic_volume,
                source_ip=source_ip
            ))
            
            # Clean old entries
            cutoff = now - timedelta(seconds=self.DDOS_WINDOW_SECONDS)
            self.traffic_memory[source_ip] = [
                event for event in self.traffic_memory[source_ip]
                if event.timestamp > cutoff
            ]
            
            # Calculate traffic in window
            window_traffic = sum(e.bytes for e in self.traffic_memory[source_ip])
            event_count = len(self.traffic_memory[source_ip])
        
        # Update adaptive baseline for normal traffic
        threshold = self.traffic_baseline * self.DDOS_SPIKE_MULTIPLIER
        
        if traffic_volume < threshold:
            # Update baseline with exponential moving average
            self.traffic_samples += 1
            self.traffic_sum += traffic_volume
            if self.traffic_samples > 10:
                self.traffic_baseline = self.traffic_sum / self.traffic_samples
        
        # Check for spike
        if traffic_volume > threshold or (event_count > 5 and window_traffic > threshold * event_count):
            return DetectionResult(
                is_threat=True,
                threat_type=ThreatType.DDOS,
                severity=Severity.CRITICAL,
                description=f"DDoS attack detected: traffic volume {traffic_volume} bytes exceeds threshold ({threshold:.0f} bytes)",
                confidence=0.85,
                indicators=[
                    f"Traffic volume: {traffic_volume} bytes",
                    f"Baseline: {self.traffic_baseline:.0f} bytes",
                    f"Multiplier: {traffic_volume / self.traffic_baseline:.1f}x",
                    f"Window traffic: {window_traffic} bytes in {self.DDOS_WINDOW_SECONDS}s",
                    f"Source IP: {source_ip}"
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
        """
        Check for privilege escalation attempts.
        Detects role changes to privileged accounts and elevation tools.
        """
        indicators = []
        severity = None
        
        # Check for user role changes
        user_change = details.get("user_change", "")
        action = details.get("action", "")
        
        # Parse role change (format: "user -> root")
        if "->" in user_change:
            parts = user_change.split("->")
            if len(parts) == 2:
                from_role = parts[0].strip().lower()
                to_role = parts[1].strip().lower()
                user = details.get("user", "unknown")
                
                # Track role change in memory
                now = datetime.utcnow()
                with self._lock:
                    self.role_change_memory[user].append(RoleChange(
                        timestamp=now,
                        from_role=from_role,
                        to_role=to_role,
                        user=user
                    ))
                
                # Check if escalating to privileged role
                for priv_role in PRIVILEGED_ROLES:
                    if priv_role in to_role and priv_role not in from_role:
                        indicators.append(f"Role change: {user_change}")
                        indicators.append(f"Escalated to privileged role: {to_role}")
                        severity = Severity.CRITICAL
                        break
        
        # Check for role_change action type
        if action == "role_change":
            indicators.append(f"Role change action detected")
            if not severity:
                severity = Severity.HIGH
        
        # Check for sudo or elevation processes
        if event.get("type") == "process_event":
            process_name = details.get("process_name", "").lower()
            elevation_tools = ["sudo", "su", "doas", "pkexec", "runas", "gsudo", "elevate"]
            
            if process_name in elevation_tools:
                indicators.append(f"Elevation tool executed: {process_name}")
                indicators.append(f"PID: {details.get('pid', 'unknown')}")
                command_line = details.get("command_line", "")
                if command_line:
                    indicators.append(f"Command: {command_line[:100]}")
                if not severity:
                    severity = Severity.HIGH
        
        if indicators:
            return DetectionResult(
                is_threat=True,
                threat_type=ThreatType.PRIVILEGE_ESCALATION,
                severity=severity or Severity.HIGH,
                description=f"Privilege escalation detected: {indicators[0]}",
                confidence=0.92 if severity == Severity.CRITICAL else 0.7,
                indicators=indicators
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
