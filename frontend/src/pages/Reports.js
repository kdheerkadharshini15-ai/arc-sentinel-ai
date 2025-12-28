import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Shield, Sparkles, RefreshCw, Cpu, Network } from 'lucide-react';
import { getAllReports, getForensicReport, getGeminiSummary, parseForensicData } from '../services';
import { useToast } from '../hooks/use-toast';

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

  const handleGenerateSummary = async (incidentId) => {
    setGeneratingSummary(incidentId);
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
