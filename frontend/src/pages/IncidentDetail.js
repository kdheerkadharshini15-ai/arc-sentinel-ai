import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Shield, CheckCircle, ArrowLeft, FileText, Activity } from 'lucide-react';

export default function IncidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [incident, setIncident] = useState(null);
  const [report, setReport] = useState(null);
  const [notes, setNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    loadIncident();
  }, [id]);

  const loadIncident = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [incidentRes, reportRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/incident/${id}`, config),
        axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/report/${id}`, config).catch(() => ({ data: null }))
      ]);
      setIncident(incidentRes.data);
      setReport(reportRes.data);
    } catch (err) {
      console.error('Error loading incident:', err);
    }
  };

  const handleResolve = async () => {
    setResolving(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/incident/${id}/resolve`, 
        { resolution_notes: notes },
        config
      );
      navigate('/incidents');
    } catch (err) {
      console.error('Error resolving incident:', err);
    } finally {
      setResolving(false);
    }
  };

  if (!incident) return <div className="p-8 text-white">Loading...</div>;

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
          <div className="flex items-center space-x-3 mb-6">
            <FileText className="w-6 h-6 text-cyan-400" />
            <h2 className="text-xl font-bold text-white">Forensic Report</h2>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">System Information</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-1">CPU Usage</p>
                  <p className="text-lg text-white font-semibold">{report.forensic_data?.system_info?.cpu_percent?.toFixed(1)}%</p>
                </div>
                <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-1">Memory Usage</p>
                  <p className="text-lg text-white font-semibold">{report.forensic_data?.system_info?.memory_percent?.toFixed(1)}%</p>
                </div>
                <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-1">Active Processes</p>
                  <p className="text-lg text-white font-semibold">{report.forensic_data?.processes?.length || 0}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Suspicious Indicators</h3>
              <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-lg p-4 space-y-2">
                {report.forensic_data?.suspicious_indicators?.map((indicator, idx) => (
                  <div key={idx} className="flex items-center space-x-2 text-sm text-gray-300">
                    <Activity className="w-4 h-4 text-orange-400" />
                    <span>{indicator}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Recommended Actions</h3>
              <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-lg p-4 space-y-2">
                {report.forensic_data?.recommended_actions?.map((action, idx) => (
                  <div key={idx} className="flex items-center space-x-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-cyan-400" />
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
