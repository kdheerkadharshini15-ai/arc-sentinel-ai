import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Shield, Sparkles, RefreshCw, Cpu, Network } from 'lucide-react';
import { getAllReports, getForensicReport, getGeminiSummary, parseForensicData } from '../services';
import { useToast } from '../hooks/use-toast';
import { DEMO_MODE, DEMO_FORENSIC_REPORT } from '../constants';

export default function Reports() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [forensicData, setForensicData] = useState(null);
  const [loadingForensics, setLoadingForensics] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(null);

  const loadIncidents = useCallback(async () => {
    // DEMO MODE: Load only from localStorage (populated by simulator)
    if (DEMO_MODE) {
      const storedIncidents = JSON.parse(localStorage.getItem('arc_demo_incidents') || '[]');
      setIncidents(storedIncidents);
      return;
    }
    
    setLoading(true);
    try {
      const result = await getAllReports({ pageSize: 100 });

      if (!result.error && result.incidents) {
        setIncidents(result.incidents);
      }
    } catch (err) {
      console.error('Error loading incidents:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  const handleViewReport = async (incident) => {
    setSelectedReport(incident);
    setLoadingForensics(true);
    
    // DEMO MODE: Use forensics data stored with the incident
    if (DEMO_MODE) {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Use the forensics stored with this specific incident
      const storedForensics = incident.forensics || DEMO_FORENSIC_REPORT;
      
      setForensicData({
        processes: (storedForensics.processes || DEMO_FORENSIC_REPORT.processes).map(p => ({
          pid: p.pid,
          name: p.name,
          cpu: p.cpu || p.cpu_percent,
        })),
        connections: (storedForensics.connections || DEMO_FORENSIC_REPORT.connections).map(c => ({
          laddr: c.laddr || c.local_address,
          raddr: c.raddr || c.remote_address,
          status: c.status,
        })),
        summary: storedForensics.summary || '',
        system_info: storedForensics.system_info || DEMO_FORENSIC_REPORT.system_info,
        indicators: storedForensics.indicators || DEMO_FORENSIC_REPORT.indicators,
        recommendations: storedForensics.recommendations || DEMO_FORENSIC_REPORT.recommendations,
      });
      setLoadingForensics(false);
      return;
    }
    
    try {
      const report = await getForensicReport(incident.id);
      if (!report.error) {
        const parsed = parseForensicData(report);
        setForensicData(parsed);
      } else {
        setForensicData({ processes: [], connections: [], summary: '' });
      }
    } catch (err) {
      console.error('Error loading forensic report:', err);
      setForensicData({ processes: [], connections: [], summary: '' });
    } finally {
      setLoadingForensics(false);
    }
  };

  // Generate dynamic AI summary based on incident data
  const generateAISummary = (inc) => {
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
Immediate action is required to prevent unauthorized access.

**AI Recommendation:** Enable account lockouts, block source IP at firewall, and enable multi-factor authentication for all affected accounts.`,

      ddos: `🔴 NETWORK THREAT DETECTED - DDoS ATTACK

A Distributed Denial of Service attack has been identified targeting your infrastructure from ${source} and associated botnet nodes.

**Attack Characteristics:**
- Traffic volume: 2.5 Gbps sustained flood
- Attack type: SYN flood with amplification
- Targeted services: HTTP/HTTPS endpoints

**Risk Assessment:** ${severity.toUpperCase()}
Infrastructure stability is compromised.

**AI Recommendation:** Enable rate limiting, activate CDN/DDoS protection, and consider upstream filtering.`,

      sql_injection: `🔴 APPLICATION SECURITY BREACH - SQL INJECTION

SQL injection attack detected from ${source} targeting database-connected web applications.

**Attack Characteristics:**
- Malicious SQL payloads in HTTP parameters
- Attempting to extract sensitive database records
- Union-based and error-based injection techniques observed

**Risk Assessment:** ${severity.toUpperCase()}
Potential data breach in progress.

**AI Recommendation:** Block source IP immediately, review WAF rules, patch vulnerable application code.`,

      malware: `🔴 ENDPOINT THREAT DETECTED - MALWARE EXECUTION

Malware activity has been detected on the monitored endpoint, originating from activity related to ${source}.

**Attack Characteristics:**
- Suspicious process execution detected
- Outbound C2 communication attempts
- File system modifications in system directories

**Risk Assessment:** ${severity.toUpperCase()}
Host compromise confirmed.

**AI Recommendation:** Isolate affected host immediately, terminate malicious processes, run full EDR scan.`,

      exfiltration: `🔴 DATA SECURITY ALERT - DATA EXFILTRATION

Unauthorized data transfer detected from internal systems to external destination ${source}.

**Attack Characteristics:**
- Large volume outbound data transfer detected
- Unusual port/protocol usage for data egress
- Encryption used to evade detection

**Risk Assessment:** ${severity.toUpperCase()}
Confirmed data breach.

**AI Recommendation:** Block destination IP/domain immediately, identify scope of leaked data, preserve logs for forensic analysis.`,

      privilege_escalation: `🔴 ACCESS CONTROL BREACH - PRIVILEGE ESCALATION

Unauthorized privilege escalation detected involving ${source} and local system accounts.

**Attack Characteristics:**
- Exploitation of local vulnerability for elevated access
- Admin/root privilege obtained by non-privileged user
- System configuration changes detected

**Risk Assessment:** ${severity.toUpperCase()}
Full system compromise possible.

**AI Recommendation:** Revoke elevated privileges immediately, reset all affected credentials, audit recent admin actions.`,
    };

    return summaries[inc.type] || summaries[inc.threat_type] || `🔴 SECURITY INCIDENT DETECTED

A ${threatName} security incident has been detected with ${severity} severity, originating from ${source}.

**Incident Summary:**
The A.R.C. SENTINEL ML engine has flagged this activity as malicious with ${inc.confidence || '95%'} confidence.

**Risk Assessment:** ${severity.toUpperCase()}
Immediate investigation and response recommended.

**AI Recommendation:** Follow incident response procedures, isolate affected systems if needed, and preserve evidence for forensic analysis.`;
  };

  const handleGenerateSummary = async (incidentId) => {
    setGeneratingSummary(incidentId);
    
    // DEMO MODE: Generate dynamic summary based on incident
    if (DEMO_MODE) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const summary = generateAISummary(selectedReport);
      setForensicData(prev => ({
        ...prev,
        summary: summary,
      }));
      
      // Also update localStorage with the summary
      const stored = JSON.parse(localStorage.getItem('arc_demo_incidents') || '[]');
      const updated = stored.map(i => {
        if (String(i.id) === String(incidentId)) {
          return { ...i, forensics: { ...i.forensics, summary: summary } };
        }
        return i;
      });
      localStorage.setItem('arc_demo_incidents', JSON.stringify(updated));
      
      // Update incident in local state
      setIncidents(prev => prev.map(i => {
        if (String(i.id) === String(incidentId)) {
          return { ...i, forensics: { ...i.forensics, summary: summary } };
        }
        return i;
      }));
      
      // Update selected report
      if (selectedReport?.id === incidentId) {
        setSelectedReport(prev => ({ ...prev, forensics: { ...prev.forensics, summary: summary } }));
      }
      
      toast({
        title: 'AI Summary Generated',
        description: 'Gemini analysis complete.',
      });
      setGeneratingSummary(null);
      return;
    }
    
    try {
      const result = await getGeminiSummary(incidentId);
      
      if (!result.error) {
        toast({
          title: 'AI Summary Generated',
          description: 'Gemini analysis complete.',
        });
        // Refresh forensic data
        if (selectedReport?.id === incidentId) {
          handleViewReport(selectedReport);
        }
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
      setGeneratingSummary(null);
    }
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Forensic Reports</h1>
          <p className="text-gray-400">Case summaries and forensic analysis</p>
        </div>
        <button
          onClick={loadIncidents}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-[#1e293b] text-gray-300 rounded-lg hover:bg-[#2d3748] transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Incidents List */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Incidents ({incidents.length})</h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {incidents.map((incident, idx) => (
                <div 
                  key={incident.id || idx} 
                  className={`bg-[#0f1419] border rounded-xl p-4 cursor-pointer transition-all ${
                    selectedReport?.id === incident.id 
                      ? 'border-cyan-500' 
                      : 'border-[#1e293b] hover:border-cyan-500/30'
                  }`}
                  onClick={() => handleViewReport(incident)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-white truncate">
                        {incident.type?.replace('_', ' ').toUpperCase()}
                      </h3>
                      <p className="text-xs text-gray-400 truncate">{incident.description}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${getSeverityColor(incident.severity)}`}>
                          {incident.severity?.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(incident.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {incidents.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {loading ? 'Loading...' : 'No incidents yet. Use Attack Simulator first.'}
                </div>
              )}
            </div>
          </div>

          {/* Forensic Details Panel */}
          <div className="bg-[#0f1419] border border-[#1e293b] rounded-xl p-6">
            {!selectedReport ? (
              <div className="text-center py-12 text-gray-500">
                <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select an incident to view forensic details</p>
              </div>
            ) : loadingForensics ? (
              <div className="text-center py-12 text-gray-400">Loading forensic data...</div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">
                    {selectedReport.type?.replace('_', ' ').toUpperCase()}
                  </h2>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleGenerateSummary(selectedReport.id)}
                      disabled={generatingSummary === selectedReport.id}
                      className="flex items-center space-x-2 px-3 py-1.5 bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/20 transition-all disabled:opacity-50 text-sm"
                    >
                      <Sparkles className={`w-4 h-4 ${generatingSummary === selectedReport.id ? 'animate-pulse' : ''}`} />
                      <span>AI Summary</span>
                    </button>
                    <button
                      onClick={() => navigate(`/incident/${selectedReport.id}`)}
                      className="flex items-center space-x-2 px-3 py-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/20 transition-all text-sm"
                    >
                      <Shield className="w-4 h-4" />
                      <span>Full Report</span>
                    </button>
                  </div>
                </div>

                {/* Gemini Summary */}
                {forensicData?.summary && (
                  <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span className="text-sm font-medium text-purple-400">AI Analysis</span>
                    </div>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{forensicData.summary}</p>
                  </div>
                )}

                {/* Processes */}
                {forensicData?.processes?.length > 0 && (
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <Cpu className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm font-medium text-white">Processes ({forensicData.processes.length})</span>
                    </div>
                    <div className="bg-[#1a1f2e] rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-[#0d1117] sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-gray-400">PID</th>
                            <th className="px-3 py-2 text-left text-gray-400">Name</th>
                            <th className="px-3 py-2 text-left text-gray-400">CPU%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {forensicData.processes.slice(0, 10).map((proc, i) => (
                            <tr key={i} className="border-t border-[#1e293b]">
                              <td className="px-3 py-2 text-gray-300">{proc.pid}</td>
                              <td className="px-3 py-2 text-gray-300">{proc.name}</td>
                              <td className="px-3 py-2 text-gray-300">{proc.cpu?.toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Network Connections */}
                {forensicData?.connections?.length > 0 && (
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <Network className="w-4 h-4 text-green-400" />
                      <span className="text-sm font-medium text-white">Network ({forensicData.connections.length})</span>
                    </div>
                    <div className="bg-[#1a1f2e] rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-[#0d1117] sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-gray-400">Local</th>
                            <th className="px-3 py-2 text-left text-gray-400">Remote</th>
                            <th className="px-3 py-2 text-left text-gray-400">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {forensicData.connections.slice(0, 10).map((conn, i) => (
                            <tr key={i} className="border-t border-[#1e293b]">
                              <td className="px-3 py-2 text-gray-300">{conn.laddr}</td>
                              <td className="px-3 py-2 text-gray-300">{conn.raddr || '-'}</td>
                              <td className="px-3 py-2 text-gray-300">{conn.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {!forensicData?.processes?.length && !forensicData?.connections?.length && !forensicData?.summary && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No forensic data available</p>
                    <p className="text-xs mt-1">Click "AI Summary" to generate analysis</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
    </div>
  );
}
