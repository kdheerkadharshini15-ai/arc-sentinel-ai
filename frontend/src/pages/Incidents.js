import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Shield, CheckCircle, XCircle, Eye, Clock } from 'lucide-react';

export default function Incidents() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);
  const [filter, setFilter] = useState('all');

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

  const filteredIncidents = incidents.filter(i => filter === 'all' || i.status === filter);

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
          <h1 className="text-3xl font-bold text-white mb-2">Incidents</h1>
          <p className="text-gray-400">Security incidents and threat responses</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            data-testid="status-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-[#0f1419] border border-[#2d3748] text-white rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4" data-testid="incidents-list">
        {filteredIncidents.map((incident, idx) => (
          <div key={incident.id || idx} className="bg-[#0f1419] border border-[#1e293b] rounded-xl p-6 hover:border-cyan-500/30 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getSeverityColor(incident.severity).replace('text-', 'bg-').replace('bg-', 'bg-').replace('/10', '/20')}`}>
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{incident.type?.replace('_', ' ').toUpperCase()}</h3>
                  <p className="text-sm text-gray-400">{incident.description}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`text-xs px-3 py-1 rounded-full border ${getSeverityColor(incident.severity)}`}>
                  {incident.severity?.toUpperCase()}
                </span>
                {incident.status === 'active' ? (
                  <span className="flex items-center text-xs text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/30">
                    <Clock className="w-3 h-3 mr-1" /> ACTIVE
                  </span>
                ) : (
                  <span className="flex items-center text-xs text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/30">
                    <CheckCircle className="w-3 h-3 mr-1" /> RESOLVED
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#2d3748]">
              <div className="text-sm text-gray-400">
                <span>Detected: </span>
                <span className="text-gray-300">{new Date(incident.timestamp).toLocaleString()}</span>
              </div>
              <button
                data-testid={`view-incident-${idx}`}
                onClick={() => navigate(`/incident/${incident.id}`)}
                className="flex items-center space-x-2 px-4 py-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/20 transition-all"
              >
                <Eye className="w-4 h-4" />
                <span>View Details</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
