/**
 * A.R.C SENTINEL - Global Constants
 * ==================================
 * Demo mode toggle and configuration
 */

// 🚨 DEMO MODE: Set to TRUE for hackathon presentation
// When true, all backend calls return hardcoded data
// Set to FALSE for production with real backend
export const DEMO_MODE = process.env.REACT_APP_DEMO_MODE === 'true' || false;

// Demo data configuration
export const DEMO_CONFIG = {
  // Simulated delay (ms) for mock API calls
  MOCK_DELAY: 300,
  
  // Auto-generate alert interval (ms)
  ALERT_INTERVAL: 5000,
  
  // Dashboard refresh interval (ms)
  DASHBOARD_REFRESH: 10000,
};

// Demo incidents - empty, populated by simulator
export const DEMO_INCIDENTS = [];

// Demo events - empty, populated by simulator
export const DEMO_EVENTS = [];

// Demo forensic report data
export const DEMO_FORENSIC_REPORT = {
  summary: `⚠️ AI ANALYSIS (Gemini):

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

CONFIDENCE SCORE: 94%`,
  processes: [
    { pid: 1234, name: 'cmd.exe', cpu: 2.5, memory: 15.2, status: 'running', username: 'SYSTEM' },
    { pid: 5678, name: 'powershell.exe', cpu: 8.1, memory: 45.6, status: 'running', username: 'admin' },
    { pid: 9012, name: 'svchost.exe', cpu: 0.3, memory: 12.1, status: 'running', username: 'SYSTEM' },
    { pid: 3456, name: 'malware_proc.exe', cpu: 15.2, memory: 88.4, status: 'running', username: 'guest' },
    { pid: 7890, name: 'chrome.exe', cpu: 5.4, memory: 234.5, status: 'running', username: 'admin' },
    { pid: 2345, name: 'ssh.exe', cpu: 0.8, memory: 8.2, status: 'running', username: 'admin' },
  ],
  connections: [
    { laddr: '192.168.1.42:52341', raddr: '45.33.32.156:443', status: 'ESTABLISHED', process: 'malware_proc.exe' },
    { laddr: '192.168.1.42:22', raddr: '10.0.0.55:49152', status: 'ESTABLISHED', process: 'ssh.exe' },
    { laddr: '192.168.1.42:49200', raddr: '8.8.8.8:53', status: 'TIME_WAIT', process: 'svchost.exe' },
    { laddr: '192.168.1.42:443', raddr: null, status: 'LISTENING', process: 'httpd.exe' },
    { laddr: '192.168.1.42:3389', raddr: null, status: 'LISTENING', process: 'rdpclip.exe' },
  ],
  system_info: {
    cpu_percent: 45.2,
    memory_percent: 68.5,
    memory_total_gb: 16.0,
    memory_available_gb: 5.1,
    disk_percent: 72.3,
    uptime_hours: 168.5,
  },
  indicators: [
    'Suspicious process: malware_proc.exe (PID: 3456)',
    'C2 Communication: 45.33.32.156:443',
    'Encoded PowerShell execution detected',
    'Multiple failed authentication attempts',
    'Data exfiltration pattern: 512KB+ outbound',
  ],
  recommendations: [
    'Block IP 45.33.32.156 at firewall',
    'Isolate host 192.168.1.42 immediately',
    'Kill process PID 3456 (malware_proc.exe)',
    'Force credential reset for user: admin',
    'Enable enhanced logging on all systems',
    'Scan network for lateral movement',
  ],
};

// Demo dashboard stats - starts at zero, updates from localStorage
export const DEMO_STATS = {
  total_events: 0,
  total_incidents: 0,
  active_incidents: 0,
  ml_flagged: 0,
  resolved_today: 0,
  critical_count: 0,
};

// Demo ML model status - starts untrained
export const DEMO_ML_STATUS = {
  trained: false,
  samples: 0,
  accuracy: 0,
  last_trained: null,
  anomalies_detected: 0,
  model_version: '1.0.0',
};
