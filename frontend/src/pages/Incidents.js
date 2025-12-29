import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, CheckCircle, XCircle, Eye, Clock, RefreshCw } from 'lucide-react';
import { getIncidents, resolveIncident as resolveIncidentApi } from '../services';
import { useToast } from '../hooks/use-toast';
import { DEMO_MODE } from '../constants';

export default function Incidents() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [resolvingId, setResolvingId] = useState(null);

  const loadIncidents = useCallback(async () => {
    // DEMO MODE: Load only from localStorage (populated by simulator)
    if (DEMO_MODE) {
      let storedIncidents = JSON.parse(localStorage.getItem('arc_demo_incidents') || '[]');
      
      // Apply filters
      if (statusFilter !== 'all') {
        storedIncidents = storedIncidents.filter(i => i.status === statusFilter || 
          (statusFilter === 'open' && i.status === 'active'));
      }
      if (severityFilter !== 'all') {
        storedIncidents = storedIncidents.filter(i => i.severity === severityFilter);
      }
      
      setIncidents(storedIncidents);
      return;
    }
    
    setLoading(true);
    try {
      const result = await getIncidents({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        severity: severityFilter !== 'all' ? severityFilter : undefined,
        pageSize: 100,
      });

      if (!result.error && result.incidents) {
        setIncidents(result.incidents);
      }
    } catch (err) {
      console.error('Error loading incidents:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, severityFilter]);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  const handleResolve = async (incidentId) => {
    setResolvingId(incidentId);
    
    // DEMO MODE: Update locally
    if (DEMO_MODE) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update in localStorage
      const stored = JSON.parse(localStorage.getItem('arc_demo_incidents') || '[]');
      const updated = stored.map(i => i.id === incidentId ? { ...i, status: 'resolved' } : i);
      localStorage.setItem('arc_demo_incidents', JSON.stringify(updated));
      
      // Update local state
      setIncidents(prev => prev.map(i => i.id === incidentId ? { ...i, status: 'resolved' } : i));
      
      toast({
        title: 'Incident Resolved',
        description: 'The incident has been successfully resolved.',
      });
      setResolvingId(null);
      return;
    }
    
    try {
      const result = await resolveIncidentApi(incidentId, 'Resolved via dashboard');
      
      if (!result.error) {
        toast({
          title: 'Incident Resolved',
          description: 'The incident has been successfully resolved.',
        });
        loadIncidents(); // Refresh list
      } else {
        toast({
          title: 'Error',
          description: result.message || 'Failed to resolve incident',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to resolve incident',
        variant: 'destructive',
      });
    } finally {
      setResolvingId(null);
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
          <h1 className="text-3xl font-bold text-white mb-2">Incidents</h1>
          <p className="text-gray-400">Security incidents and threat responses</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadIncidents}
            disabled={loading}
            className="p-2 bg-[#0f1419] border border-[#2d3748] rounded-lg text-gray-400 hover:text-white hover:border-cyan-500 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <select
            data-testid="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0f1419] border border-[#2d3748] text-white rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
          </select>
          <select
            data-testid="severity-filter"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-[#0f1419] border border-[#2d3748] text-white rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4" data-testid="incidents-list">
        {incidents.length > 0 ? (
          incidents.map((incident, idx) => (
            <div key={incident.id || idx} className="bg-[#0f1419] border border-[#1e293b] rounded-xl p-6 hover:border-cyan-500/30 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getSeverityColor(incident.severity).replace('text-', 'bg-').replace('bg-', 'bg-').replace('/10', '/20')}`}>
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{incident.title || (incident.type || incident.threat_type)?.replace('_', ' ').toUpperCase()}</h3>
                    <p className="text-sm text-gray-400">{incident.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`text-xs px-3 py-1 rounded-full border ${getSeverityColor(incident.severity)}`}>
                    {incident.severity?.toUpperCase()}
                  </span>
                  {incident.status === 'open' || incident.status === 'active' ? (
                    <span className="flex items-center text-xs text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/30">
                      <Clock className="w-3 h-3 mr-1" /> OPEN
                    </span>
                  ) : incident.status === 'investigating' ? (
                    <span className="flex items-center text-xs text-yellow-400 bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/30">
                      <Clock className="w-3 h-3 mr-1" /> INVESTIGATING
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
                  <span className="text-gray-300">{new Date(incident.timestamp || incident.created_at).toLocaleString()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {(incident.status === 'open' || incident.status === 'active') && (
                    <button
                      onClick={() => handleResolve(incident.id)}
                      disabled={resolvingId === incident.id}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/20 transition-all disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{resolvingId === incident.id ? 'Resolving...' : 'Resolve'}</span>
                    </button>
                  )}
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
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-400">
            {loading ? 'Loading...' : 'No incidents yet. Use Attack Simulator to generate incidents.'}
          </div>
        )}
      </div>
    </div>
  );
}
