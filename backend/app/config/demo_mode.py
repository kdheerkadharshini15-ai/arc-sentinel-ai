"""
A.R.C SENTINEL - Demo Mode Configuration
=========================================
Global flag and hardcoded responses for hackathon demo
"""

# 🚨 DEMO MODE: Set to True for hackathon presentation
DEMO_MODE = True

# Hardcoded demo responses
DEMO_FORENSIC_REPORT = {
    "summary": """⚠️ AI ANALYSIS (Gemini):

THREAT ASSESSMENT: HIGH SEVERITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Detected suspicious process execution chain
• Potential credential harvesting activity
• Outbound C2 communication patterns identified

RECOMMENDED ACTIONS:
1. Immediately isolate affected host from network
2. Force password reset for all affected accounts
3. Enable multi-factor authentication
4. Conduct full forensic disk image
5. Review firewall logs for lateral movement

CONFIDENCE SCORE: 94%""",
    "processes": [
        {"pid": 1234, "name": "cmd.exe", "cpu_percent": 2.5, "memory_percent": 15.2, "status": "running", "username": "SYSTEM"},
        {"pid": 5678, "name": "powershell.exe", "cpu_percent": 8.1, "memory_percent": 45.6, "status": "running", "username": "admin"},
        {"pid": 3456, "name": "malware_proc.exe", "cpu_percent": 15.2, "memory_percent": 88.4, "status": "running", "username": "guest"},
        {"pid": 7890, "name": "ssh.exe", "cpu_percent": 0.8, "memory_percent": 8.2, "status": "running", "username": "admin"},
    ],
    "connections": [
        {"local_address": "192.168.1.42:52341", "remote_address": "45.33.32.156:443", "status": "ESTABLISHED", "process_name": "malware_proc.exe"},
        {"local_address": "192.168.1.42:22", "remote_address": "10.0.0.55:49152", "status": "ESTABLISHED", "process_name": "ssh.exe"},
        {"local_address": "192.168.1.42:49200", "remote_address": "8.8.8.8:53", "status": "TIME_WAIT", "process_name": "svchost.exe"},
    ],
    "system_info": {
        "cpu_percent": 45.2,
        "memory_percent": 68.5,
        "memory_total_gb": 16.0,
        "memory_available_gb": 5.1,
        "disk_percent": 72.3,
        "uptime_hours": 168.5,
    },
    "indicators": [
        "Suspicious process: malware_proc.exe (PID: 3456)",
        "C2 Communication: 45.33.32.156:443",
        "Encoded PowerShell execution detected",
        "Multiple failed authentication attempts",
        "Data exfiltration pattern: 512KB+ outbound",
    ],
    "recommendations": [
        "Block IP 45.33.32.156 at firewall",
        "Isolate host 192.168.1.42 immediately",
        "Kill process PID 3456 (malware_proc.exe)",
        "Force credential reset for user: admin",
        "Enable enhanced logging on all systems",
    ],
    "confidence": "94%",
}

DEMO_INCIDENTS = [
    {
        "id": 1001,
        "type": "bruteforce",
        "threat_type": "bruteforce",
        "title": "SSH Brute Force Attack Detected",
        "description": "Multiple failed SSH login attempts from external IP",
        "severity": "high",
        "status": "open",
        "source_ip": "192.168.1.105",
    },
    {
        "id": 1002,
        "type": "ddos",
        "threat_type": "ddos",
        "title": "DDoS Attack Pattern Identified",
        "description": "Unusual traffic surge from multiple source IPs",
        "severity": "critical",
        "status": "open",
        "source_ip": "10.0.0.55",
    },
    {
        "id": 1003,
        "type": "sql_injection",
        "threat_type": "sql_injection",
        "title": "SQL Injection Attempt",
        "description": "Malicious SQL payload detected in web form",
        "severity": "high",
        "status": "resolved",
        "source_ip": "172.16.0.88",
    },
    {
        "id": 1004,
        "type": "malware",
        "threat_type": "malware",
        "title": "Malware Communication Detected",
        "description": "Suspicious outbound connection to known C2 server",
        "severity": "critical",
        "status": "investigating",
        "source_ip": "192.168.1.42",
    },
]

DEMO_EVENTS = [
    {
        "id": 2001,
        "type": "network_scan",
        "event_type": "network_scan",
        "source_ip": "192.168.1.105",
        "severity": "medium",
        "details": {"port": 22, "protocol": "TCP", "attempts": 15},
    },
    {
        "id": 2002,
        "type": "failed_login",
        "event_type": "failed_login",
        "source_ip": "10.0.0.55",
        "severity": "high",
        "details": {"username": "admin", "service": "ssh"},
    },
    {
        "id": 2003,
        "type": "suspicious_process",
        "event_type": "suspicious_process",
        "source_ip": "192.168.1.42",
        "severity": "critical",
        "details": {"process": "powershell.exe", "args": "-enc BASE64STRING"},
    },
]

DEMO_ML_STATUS = {
    "trained": True,
    "samples": 1847,
    "accuracy": 0.94,
    "anomalies_detected": 23,
    "model_version": "2.1.0",
}

DEMO_STATS = {
    "total_events": 247,
    "total_incidents": 12,
    "active_incidents": 4,
    "ml_flagged": 8,
    "resolved_today": 3,
    "critical_count": 2,
}

DEMO_GEMINI_SUMMARY = """⚠️ AI Summary (Gemini 2.0):

This incident shows characteristics of an advanced persistent threat (APT).
Key findings:
• Initial access via compromised credentials
• Lateral movement detected across 3 hosts
• Data staging observed before exfiltration attempt
• C2 beaconing pattern: 60-second intervals

Risk Level: HIGH
Immediate action required. Recommend network isolation and credential reset."""
