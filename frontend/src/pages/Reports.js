import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FileText, Shield, Download } from 'lucide-react';

export default function Reports() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/incidents`, config);
      setIncidents(res.data.incidents || []);
    } catch (err) {
      console.error('Error loading incidents:', err);
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
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Forensic Reports</h1>
        <p className="text-gray-400">Case summaries and forensic analysis</p>
      </div>

      <div className="grid grid-cols-1 gap-4" data-testid="reports-list">
        {incidents.map((incident, idx) => (
          <div key={incident.id || idx} className="bg-[#0f1419] border border-[#1e293b] rounded-xl p-6 hover:border-cyan-500/30 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">
                    {incident.type?.replace('_', ' ').toUpperCase()} - Report
                  </h3>
                  <p className="text-sm text-gray-400">{incident.description}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className={`text-xs px-3 py-1 rounded-full border ${getSeverityColor(incident.severity)}`}>
                      {incident.severity?.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(incident.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              <button
                data-testid={`view-report-${idx}`}
                onClick={() => navigate(`/incident/${incident.id}`)}
                className="flex items-center space-x-2 px-4 py-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/20 transition-all"
              >
                <Shield className="w-4 h-4" />
                <span>View Report</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
