import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, CheckCircle, ArrowLeft, FileText, Activity, RefreshCw, Sparkles } from 'lucide-react';
import { getIncidentById, resolveIncident } from '../services/incidents';
import { getForensicReport, getGeminiSummary, parseForensicData } from '../services/reports';
import { useToast } from '../hooks/use-toast';
import { DEMO_MODE, DEMO_FORENSIC_REPORT } from '../constants';

export default function IncidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [incident, setIncident] = useState(null);
  const [report, setReport] = useState(null);
  const [forensicData, setForensicData] = useState(null);
  const [notes, setNotes] = useState('');
  const [resolving, setResolving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  const loadIncident = useCallback(async () => {
    setLoading(true);
    
    // DEMO MODE: Load from localStorage only
    if (DEMO_MODE) {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Find incident in localStorage
      const storedIncidents = JSON.parse(localStorage.getItem('arc_demo_incidents') || '[]');
      const foundIncident = storedIncidents.find(i => String(i.id) === String(id));
      
      if (!foundIncident) {
        setLoading(false);
        return;
      }
      
      setIncident({
        ...foundIncident,
        timestamp: foundIncident.timestamp || foundIncident.created_at || new Date().toISOString(),
      });
      
      // Set forensic report from stored data or generate fresh
      const storedForensics = foundIncident.forensics || DEMO_FORENSIC_REPORT;
      setReport({
        forensic_data: {
          system_info: storedForensics.system_info,
          suspicious_indicators: storedForensics.indicators,
          recommended_actions: storedForensics.recommendations,
          processes: storedForensics.processes,
          connections: storedForensics.connections,
        }
      });
      
      setForensicData({
        processes: (storedForensics.processes || []).map(p => ({
          pid: p.pid,
          name: p.name,
          cpu: p.cpu || p.cpu_percent,
        })),
        connections: (storedForensics.connections || []).map(c => ({
          laddr: c.laddr || c.local_address,
          raddr: c.raddr || c.remote_address,
          status: c.status,
        })),
        summary: storedForensics.summary || '',
      });
      
      setLoading(false);
      return;
    }
    
    try {
      const [incidentRes, reportRes] = await Promise.all([
        getIncidentById(id),
        getForensicReport(id)
      ]);
      
      if (!incidentRes.error) {
        setIncident(incidentRes);
      }
      
      if (!reportRes.error) {
        setReport(reportRes);
        setForensicData(parseForensicData(reportRes));
      }
    } catch (err) {
      console.error('Error loading incident:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadIncident();
  }, [loadIncident]);

  const handleResolve = async () => {
    setResolving(true);
    
    // DEMO MODE: Resolve locally
    if (DEMO_MODE) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update localStorage
      const stored = JSON.parse(localStorage.getItem('arc_demo_incidents') || '[]');
      const updated = stored.map(i => String(i.id) === String(id) ? { ...i, status: 'resolved' } : i);
      localStorage.setItem('arc_demo_incidents', JSON.stringify(updated));
      
      toast({
        title: 'Incident Resolved',
        description: 'The incident has been marked as resolved.',
      });
      navigate('/incidents');
      setResolving(false);
      return;
    }
    
    try {
      const result = await resolveIncident(id, notes);
      
      if (!result.error) {
        toast({
          title: 'Incident Resolved',
          description: 'The incident has been marked as resolved.',
        });
        navigate('/incidents');
      } else {
        toast({
          title: 'Error',
          description: result.message || 'Failed to resolve incident',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Error resolving incident:', err);
      toast({
        title: 'Error',
        description: 'Failed to resolve incident',
        variant: 'destructive',
      });
    } finally {
      setResolving(false);
    }
  };

  // Generate dynamic AI summary based on incident data
  const generateAISummary = (inc, forensics) => {
    const threatName = (inc.type || inc.threat_type || 'unknown').replace('_', ' ');
    const severity = inc.severity || 'high';
    const source = inc.source_ip || 'unknown source';
    
    const summaries = {
      bruteforce: `🔴 CRITICAL SECURITY ALERT - BRUTE FORCE ATTACK

A sophisticated brute force authentication attack has been detected originating from ${source}. The attack shows systematic password guessing patterns targeting user accounts.

**Attack Characteristics:**
- Multiple failed login attempts detected in rapid succession
- Targeting SSH/RDP and web application authentication
- Attack velocity: ~500 attempts per minute
- Dictionary-based attack pattern identified

**Risk Assessment:** ${severity.toUpperCase()}
The attacker appears to be using a credential stuffing technique with leaked password databases. Immediate action is required to prevent unauthorized access.

**AI Recommendation:** Enable account lockouts, block source IP at firewall, and enable multi-factor authentication for all affected accounts.`,

      ddos: `🔴 NETWORK THREAT DETECTED - DDoS ATTACK

A Distributed Denial of Service attack has been identified targeting your infrastructure from ${source} and associated botnet nodes.

**Attack Characteristics:**
- Traffic volume: 2.5 Gbps sustained flood
- Attack type: SYN flood with amplification
- Targeted services: HTTP/HTTPS endpoints
- Duration: Active and ongoing

**Risk Assessment:** ${severity.toUpperCase()}
Infrastructure stability is compromised. Service degradation detected across multiple endpoints.

**AI Recommendation:** Enable rate limiting, activate CDN/DDoS protection, and consider upstream filtering via ISP coordination.`,

      sql_injection: `🔴 APPLICATION SECURITY BREACH - SQL INJECTION

SQL injection attack detected from ${source} targeting database-connected web applications.

**Attack Characteristics:**
- Malicious SQL payloads in HTTP parameters
- Attempting to extract sensitive database records
- Union-based and error-based injection techniques observed
- Targeting user authentication and data tables

**Risk Assessment:** ${severity.toUpperCase()}
Potential data breach in progress. Database integrity may be compromised.

**AI Recommendation:** Block source IP immediately, review WAF rules, patch vulnerable application code, and audit database for unauthorized access.`,

      malware: `🔴 ENDPOINT THREAT DETECTED - MALWARE EXECUTION

Malware activity has been detected on the monitored endpoint, originating from activity related to ${source}.

**Attack Characteristics:**
- Suspicious process execution detected
- Outbound C2 communication attempts
- File system modifications in system directories
- Persistence mechanism installation attempted

**Risk Assessment:** ${severity.toUpperCase()}
Host compromise confirmed. Lateral movement risk is high.

**AI Recommendation:** Isolate affected host immediately, terminate malicious processes, run full EDR scan, and check for persistence mechanisms.`,

      exfiltration: `🔴 DATA SECURITY ALERT - DATA EXFILTRATION

Unauthorized data transfer detected from internal systems to external destination ${source}.

**Attack Characteristics:**
- Large volume outbound data transfer detected
- Unusual port/protocol usage for data egress
- Encryption used to evade detection
- Targeting sensitive business data directories

**Risk Assessment:** ${severity.toUpperCase()}
Confirmed data breach. Sensitive information may have been compromised.

**AI Recommendation:** Block destination IP/domain immediately, identify scope of leaked data, preserve logs for forensic analysis, and prepare breach notification.`,

      privilege_escalation: `🔴 ACCESS CONTROL BREACH - PRIVILEGE ESCALATION

Unauthorized privilege escalation detected involving ${source} and local system accounts.

**Attack Characteristics:**
- Exploitation of local vulnerability for elevated access
- Admin/root privilege obtained by non-privileged user
- Suspicious sudo/admin group modifications
- System configuration changes detected

**Risk Assessment:** ${severity.toUpperCase()}
Full system compromise possible. Attacker has elevated access to critical resources.

**AI Recommendation:** Revoke elevated privileges immediately, reset all affected credentials, audit recent admin actions, and review group memberships.`,
    };

    return summaries[inc.type] || summaries[inc.threat_type] || `🔴 SECURITY INCIDENT DETECTED

A ${threatName} security incident has been detected with ${severity} severity, originating from ${source}.

**Incident Summary:**
The A.R.C. SENTINEL ML engine has flagged this activity as malicious with ${inc.confidence || '95%'} confidence. Automated forensic collection has gathered system state, process information, and network connection data.

**Risk Assessment:** ${severity.toUpperCase()}
Immediate investigation and response recommended.

**AI Recommendation:** Follow incident response procedures, isolate affected systems if needed, and preserve evidence for forensic analysis.`;
  };

  const handleGenerateSummary = async () => {
    setGeneratingSummary(true);
    
    // DEMO MODE: Generate dynamic summary based on incident
    if (DEMO_MODE) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const summary = generateAISummary(incident, forensicData);
      setForensicData(prev => ({
        ...prev,
        summary: summary,
      }));
      
      // Also update localStorage with the summary
      const stored = JSON.parse(localStorage.getItem('arc_demo_incidents') || '[]');
      const updated = stored.map(i => {
        if (String(i.id) === String(id)) {
          return { ...i, forensics: { ...i.forensics, summary: summary } };
        }
        return i;
      });
      localStorage.setItem('arc_demo_incidents', JSON.stringify(updated));
      
      toast({
        title: 'AI Summary Generated',
        description: 'Gemini analysis complete.',
      });
      setGeneratingSummary(false);
      return;
    }
    
    try {
      const result = await getGeminiSummary(id);
      
      if (!result.error) {
        toast({
          title: 'AI Summary Generated',
          description: 'Gemini analysis complete.',
        });
        // Reload to get updated data
        loadIncident();
      } else {
        toast({
          title: 'Error',
          description: result.message || 'Failed to generate summary',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to generate AI summary',
        variant: 'destructive',
      });
    } finally {
      setGeneratingSummary(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
        <p>Loading incident details...</p>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="p-8 text-center text-gray-400">
        <p>Incident not found</p>
        <button
          onClick={() => navigate('/incidents')}
          className="mt-4 text-cyan-400 hover:text-cyan-300"
        >
          Back to Incidents
        </button>
      </div>
    );
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'high': return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };

  return (
    <div className="p-8 space-y-6">
      <button
        data-testid="back-button"
        onClick={() => navigate('/incidents')}
        className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Incidents</span>
      </button>

      <div className="bg-[#0f1419] border border-[#1e293b] rounded-xl p-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${getSeverityColor(incident.severity).replace('text-', 'bg-').replace('bg-', 'bg-').replace('/10', '/20')}`}>
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">{incident.type?.replace('_', ' ').toUpperCase()}</h1>
              <p className="text-gray-400">{incident.description}</p>
            </div>
          </div>
          <span className={`text-xs px-4 py-2 rounded-full border ${getSeverityColor(incident.severity)}`}>
            {incident.severity?.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">Status</p>
            <p className="text-white font-semibold" data-testid="incident-status">{incident.status?.toUpperCase()}</p>
          </div>
          <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">Detected</p>
            <p className="text-white font-semibold">{new Date(incident.timestamp).toLocaleString()}</p>
          </div>
        </div>

        {incident.status === 'active' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Resolution Notes</label>
              <textarea
                data-testid="resolution-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full bg-[#1a1f2e] border border-[#2d3748] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                placeholder="Enter resolution notes..."
              />
            </div>
            <button
              data-testid="resolve-button"
              onClick={handleResolve}
              disabled={resolving}
              className="flex items-center space-x-2 px-6 py-3 bg-green-500/10 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/20 transition-all disabled:opacity-50"
            >
              <CheckCircle className="w-5 h-5" />
              <span>{resolving ? 'Resolving...' : 'Resolve Incident'}</span>
            </button>
          </div>
        )}
      </div>

      {report && (
        <div className="bg-[#0f1419] border border-[#1e293b] rounded-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <FileText className="w-6 h-6 text-cyan-400" />
              <h2 className="text-xl font-bold text-white">Forensic Report</h2>
            </div>
            <button
              onClick={handleGenerateSummary}
              disabled={generatingSummary}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/20 transition-all disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${generatingSummary ? 'animate-pulse' : ''}`} />
              <span>{generatingSummary ? 'Generating...' : 'AI Summary'}</span>
            </button>
          </div>

          {/* Gemini AI Summary */}
          {forensicData?.summary && (
            <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2 mb-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-purple-400">AI Analysis</span>
              </div>
              <p className="text-sm text-gray-300 whitespace-pre-wrap">{forensicData.summary}</p>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">System Information</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-1">CPU Usage</p>
                  <p className="text-lg text-white font-semibold">{report.forensic_data?.system_info?.cpu_percent?.toFixed(1) || 0}%</p>
                </div>
                <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-1">Memory Usage</p>
                  <p className="text-lg text-white font-semibold">{report.forensic_data?.system_info?.memory_percent?.toFixed(1) || 0}%</p>
                </div>
                <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-1">Active Processes</p>
                  <p className="text-lg text-white font-semibold">{forensicData?.processes?.length || 0}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Suspicious Indicators</h3>
              <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-lg p-4 space-y-2">
                {report.forensic_data?.suspicious_indicators?.length > 0 ? (
                  report.forensic_data.suspicious_indicators.map((indicator, idx) => (
                    <div key={idx} className="flex items-center space-x-2 text-sm text-gray-300">
                      <Activity className="w-4 h-4 text-orange-400" />
                      <span>{indicator}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No suspicious indicators detected</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Recommended Actions</h3>
              <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-lg p-4 space-y-2">
                {report.forensic_data?.recommended_actions?.length > 0 ? (
                  report.forensic_data.recommended_actions.map((action, idx) => (
                    <div key={idx} className="flex items-center space-x-2 text-sm text-gray-300">
                      <CheckCircle className="w-4 h-4 text-cyan-400" />
                      <span>{action}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No recommended actions</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
