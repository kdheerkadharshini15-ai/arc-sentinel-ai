"""
A.R.C SENTINEL - Telemetry Generator
=====================================
Simulated security event generation for testing and demonstration
"""

import random
import hashlib
from datetime import datetime
from typing import Dict, Any, List, Optional
import asyncio

from app.config import settings


# Configuration for telemetry generation
EVENT_TYPES = ["os_event", "login_event", "process_event", "network_event"]
SEVERITIES = ["low", "medium", "high", "critical"]
SEVERITY_WEIGHTS = [0.4, 0.35, 0.2, 0.05]  # Most events are low/medium

# Simulated network data
INTERNAL_IPS = [f"192.168.1.{i}" for i in range(1, 255)]
EXTERNAL_IPS = ["8.8.8.8", "1.1.1.1", "208.67.222.222", "9.9.9.9"]
COMMON_PORTS = [22, 80, 443, 3306, 5432, 8080, 8443, 3389]

# Known malicious IPs for occasional injection
BLACKLIST_IPS = ["45.33.32.156", "198.51.100.42", "203.0.113.0", "192.0.2.1"]

# Simulated user accounts
USERNAMES = ["admin", "root", "user1", "user2", "developer", "analyst", "guest", "service_account"]

# Simulated processes
NORMAL_PROCESSES = [
    "nginx", "python", "node", "java", "postgres", "redis", 
    "docker", "systemd", "sshd", "cron", "apache2"
]
SUSPICIOUS_PROCESSES = ["suspicious.exe", "cryptominer", "backdoor.sh"]


class TelemetryGenerator:
    """
    Generates realistic simulated security telemetry events.
    Events are created based on configurable patterns and probabilities.
    """
    
    def __init__(self):
        self.event_count = 0
        self.anomaly_injection_rate = 0.05  # 5% of events will be somewhat suspicious
    
    def generate_event(self) -> Dict[str, Any]:
        """Generate a single telemetry event"""
        self.event_count += 1
        
        event_type = random.choice(EVENT_TYPES)
        severity = random.choices(SEVERITIES, weights=SEVERITY_WEIGHTS)[0]
        
        # Occasionally inject slightly suspicious events (not full attacks)
        is_suspicious = random.random() < self.anomaly_injection_rate
        
        event = {
            "id": self._generate_event_id(),
            "timestamp": datetime.utcnow().isoformat(),
            "type": event_type,
            "source_ip": self._get_source_ip(is_suspicious),
            "severity": severity if not is_suspicious else random.choice(["medium", "high"]),
            "details": self._generate_details(event_type, is_suspicious),
            "anomaly_score": 0.0,
            "ml_flagged": False
        }
        
        return event
    
    def _generate_event_id(self) -> str:
        """Generate unique event ID"""
        unique_str = f"{datetime.utcnow().isoformat()}{self.event_count}{random.random()}"
        return hashlib.md5(unique_str.encode()).hexdigest()[:16]
    
    def _get_source_ip(self, is_suspicious: bool = False) -> str:
        """Get a source IP address"""
        if is_suspicious and random.random() < 0.3:
            return random.choice(BLACKLIST_IPS)
        return random.choice(INTERNAL_IPS)
    
    def _generate_details(self, event_type: str, is_suspicious: bool = False) -> Dict[str, Any]:
        """Generate event-specific details"""
        generators = {
            "login_event": self._generate_login_details,
            "process_event": self._generate_process_details,
            "network_event": self._generate_network_details,
            "os_event": self._generate_os_details
        }
        
        generator = generators.get(event_type, self._generate_os_details)
        return generator(is_suspicious)
    
    def _generate_login_details(self, is_suspicious: bool = False) -> Dict[str, Any]:
        """Generate login event details"""
        success = not is_suspicious and random.random() > 0.1  # 10% normal failure rate
        
        return {
            "username": random.choice(USERNAMES),
            "success": success,
            "method": random.choice(["ssh", "console", "rdp", "api"]),
            "attempts": 1 if success else random.randint(1, 3),
            "client_version": f"OpenSSH_{random.randint(7, 9)}.{random.randint(0, 9)}"
        }
    
    def _generate_process_details(self, is_suspicious: bool = False) -> Dict[str, Any]:
        """Generate process event details"""
        if is_suspicious and random.random() < 0.5:
            process_name = random.choice(SUSPICIOUS_PROCESSES)
        else:
            process_name = random.choice(NORMAL_PROCESSES)
        
        return {
            "process_name": process_name,
            "pid": random.randint(1000, 65535),
            "ppid": random.randint(1, 1000),
            "hash": hashlib.md5(f"{process_name}{random.random()}".encode()).hexdigest(),
            "cpu_percent": round(random.uniform(0, 15), 2),
            "memory_mb": random.randint(10, 500),
            "user": random.choice(USERNAMES)
        }
    
    def _generate_network_details(self, is_suspicious: bool = False) -> Dict[str, Any]:
        """Generate network event details"""
        if is_suspicious and random.random() < 0.4:
            dest_ip = random.choice(BLACKLIST_IPS)
            bytes_transferred = random.randint(10000, 100000)  # Large transfer
        else:
            dest_ip = random.choice(EXTERNAL_IPS + INTERNAL_IPS[:10])
            bytes_transferred = random.randint(64, 5000)
        
        return {
            "destination_ip": dest_ip,
            "port": random.choice(COMMON_PORTS),
            "protocol": random.choice(["TCP", "UDP"]),
            "bytes": bytes_transferred,
            "direction": random.choice(["inbound", "outbound"]),
            "connection_state": random.choice(["ESTABLISHED", "SYN_SENT", "TIME_WAIT", "CLOSE_WAIT"])
        }
    
    def _generate_os_details(self, is_suspicious: bool = False) -> Dict[str, Any]:
        """Generate OS-level event details"""
        actions = [
            "file_access", "file_modify", "registry_change", 
            "service_start", "service_stop", "config_change"
        ]
        
        return {
            "action": random.choice(actions),
            "path": f"/var/log/{'suspicious/' if is_suspicious else ''}{random.choice(['syslog', 'auth.log', 'messages'])}",
            "user": random.choice(USERNAMES),
            "result": "success" if not is_suspicious else random.choice(["success", "failure"]),
            "audit_id": random.randint(10000, 99999)
        }


# Attack chain generators for simulation
class AttackChainGenerator:
    """Generates multi-stage attack event chains for simulation"""
    
    def __init__(self):
        self.attack_chains = {
            "bruteforce": self._bruteforce_chain,
            "brute_force": self._bruteforce_chain,
            "port_scan": self._portscan_chain,
            "malware": self._malware_chain,
            "malware_detection": self._malware_chain,
            "ddos": self._ddos_chain,
            "sql_injection": self._sqli_chain,
            "privilege_escalation": self._privesc_chain,
            "exfiltration": self._exfiltration_chain,
            "data_exfiltration": self._exfiltration_chain
        }
    
    def generate_chain(
        self, 
        attack_type: str, 
        target: str = "192.168.1.100"
    ) -> List[Dict[str, Any]]:
        """Generate an attack event chain"""
        generator = self.attack_chains.get(attack_type.lower(), self._default_chain)
        return generator(target)
    
    def _create_event(
        self,
        event_type: str,
        severity: str,
        details: Dict[str, Any],
        source_ip: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a single attack event"""
        return {
            "id": hashlib.md5(f"{datetime.utcnow().isoformat()}{random.random()}".encode()).hexdigest()[:16],
            "timestamp": datetime.utcnow().isoformat(),
            "type": event_type,
            "source_ip": source_ip or f"192.168.1.{random.randint(1, 255)}",
            "severity": severity,
            "details": details,
            "anomaly_score": 0.0,
            "ml_flagged": False
        }
    
    def _bruteforce_chain(self, target: str) -> List[Dict[str, Any]]:
        """Generate brute force attack chain"""
        attacker_ip = f"10.0.0.{random.randint(1, 255)}"
        events = []
        
        # Multiple failed login attempts
        for i in range(6):
            events.append(self._create_event(
                "login_event",
                "medium" if i < 4 else "high",
                {
                    "username": random.choice(["admin", "root", "administrator"]),
                    "success": False,
                    "method": "ssh",
                    "attempts": 1,
                    "reason": "invalid_password"
                },
                attacker_ip
            ))
        
        # Final successful login (optional)
        events.append(self._create_event(
            "login_event",
            "critical",
            {
                "username": "admin",
                "success": True,
                "method": "ssh",
                "attempts": 1,
                "suspicious": True
            },
            attacker_ip
        ))
        
        return events
    
    def _portscan_chain(self, target: str) -> List[Dict[str, Any]]:
        """Generate port scan attack chain"""
        attacker_ip = f"10.0.0.{random.randint(1, 255)}"
        events = []
        
        scanned_ports = [22, 23, 80, 443, 445, 3306, 3389, 5432, 8080, 8443]
        for port in scanned_ports:
            events.append(self._create_event(
                "network_event",
                "medium",
                {
                    "destination_ip": target,
                    "port": port,
                    "protocol": "TCP",
                    "bytes": 64,
                    "flags": "SYN",
                    "scan_detected": True
                },
                attacker_ip
            ))
        
        return events
    
    def _malware_chain(self, target: str) -> List[Dict[str, Any]]:
        """Generate malware detection chain"""
        events = []
        
        # Suspicious process spawned
        events.append(self._create_event(
            "process_event",
            "critical",
            {
                "process_name": "suspicious.exe",
                "pid": 6666,
                "hash": "abc123malicious",
                "parent_process": "explorer.exe",
                "command_line": "suspicious.exe -hidden -persist"
            }
        ))
        
        # C2 communication
        events.append(self._create_event(
            "network_event",
            "critical",
            {
                "destination_ip": BLACKLIST_IPS[0],
                "port": 443,
                "protocol": "TCP",
                "bytes": 5000,
                "beacon": True
            }
        ))
        
        # File modification
        events.append(self._create_event(
            "os_event",
            "high",
            {
                "action": "file_modify",
                "path": "/etc/crontab",
                "user": "root",
                "suspicious": True
            }
        ))
        
        return events
    
    def _ddos_chain(self, target: str) -> List[Dict[str, Any]]:
        """Generate DDoS attack chain"""
        events = []
        
        for _ in range(10):
            events.append(self._create_event(
                "network_event",
                "critical",
                {
                    "destination_ip": target,
                    "port": 80,
                    "protocol": "TCP",
                    "bytes": random.randint(5000, 15000),
                    "flags": random.choice(["SYN", "ACK", "RST"]),
                    "flood_detected": True
                },
                f"{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}"
            ))
        
        return events
    
    def _sqli_chain(self, target: str) -> List[Dict[str, Any]]:
        """Generate SQL injection attack chain"""
        attacker_ip = f"10.0.0.{random.randint(1, 255)}"
        events = []
        
        # Database connection
        events.append(self._create_event(
            "network_event",
            "medium",
            {
                "destination_ip": target,
                "port": 3306,
                "protocol": "TCP",
                "bytes": 512,
                "service": "mysql"
            },
            attacker_ip
        ))
        
        # SQL injection attempt
        events.append(self._create_event(
            "os_event",
            "high",
            {
                "action": "database_query",
                "command": "SELECT * FROM users WHERE id=1 OR 1=1; DROP TABLE users;--",
                "database": "production_db",
                "injection_detected": True
            },
            attacker_ip
        ))
        
        return events
    
    def _privesc_chain(self, target: str) -> List[Dict[str, Any]]:
        """Generate privilege escalation attack chain"""
        events = []
        
        # Normal user login
        events.append(self._create_event(
            "login_event",
            "low",
            {
                "username": "user1",
                "success": True,
                "method": "ssh"
            }
        ))
        
        # Sudo execution
        events.append(self._create_event(
            "process_event",
            "high",
            {
                "process_name": "sudo",
                "pid": 8888,
                "hash": "privilege_esc",
                "command_line": "sudo -i"
            }
        ))
        
        # Role change
        events.append(self._create_event(
            "os_event",
            "critical",
            {
                "action": "role_change",
                "user_change": "user1 -> root",
                "method": "sudo",
                "suspicious": True
            }
        ))
        
        return events
    
    def _exfiltration_chain(self, target: str) -> List[Dict[str, Any]]:
        """Generate data exfiltration attack chain"""
        events = []
        
        # Data compression
        events.append(self._create_event(
            "process_event",
            "medium",
            {
                "process_name": "tar",
                "pid": 7777,
                "hash": "compress_data",
                "command_line": "tar -czf /tmp/data.tar.gz /var/sensitive/"
            }
        ))
        
        # Large data transfer to external IP
        events.append(self._create_event(
            "network_event",
            "critical",
            {
                "destination_ip": BLACKLIST_IPS[1],
                "port": 443,
                "protocol": "TCP",
                "bytes": 500000,
                "direction": "outbound",
                "exfiltration_suspected": True
            }
        ))
        
        return events
    
    def _default_chain(self, target: str) -> List[Dict[str, Any]]:
        """Default attack chain for unknown types"""
        return [self._create_event(
            "network_event",
            "high",
            {
                "destination_ip": target,
                "port": 80,
                "protocol": "TCP",
                "bytes": 1000,
                "suspicious": True
            }
        )]


# Global instances
telemetry_generator = TelemetryGenerator()
attack_chain_generator = AttackChainGenerator()
