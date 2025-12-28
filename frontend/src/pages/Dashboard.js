import React, { useState, useEffect, useCallback } from 'react';
import { Activity, AlertTriangle, Shield, TrendingUp, Eye } from 'lucide-react';
import { getIncidentMetrics, getRecentEvents, getActiveIncidents } from '../services';
import { useWebSocketFeed } from '../hooks/useWebSocketFeed';

export default function Dashboard() {
  const [stats, setStats] = useState({
    total_events: 0,
    total_incidents: 0,
    active_incidents: 0,
    ml_flagged: 0,
  });
  const [events, setEvents] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load dashboard data (non-blocking)
  const loadData = useCallback(async () => {
    try {
      // Fire all requests in parallel - don't block UI
      const [metricsResult, eventsResult, incidentsResult] = await Promise.allSettled([
        getIncidentMetrics(),
        getRecentEvents(10),
        getActiveIncidents(5),
      ]);

      if (metricsResult.status === 'fulfilled' && !metricsResult.value.error) {
        setStats(metricsResult.value);
      }

      if (eventsResult.status === 'fulfilled' && !eventsResult.value.error && eventsResult.value.events) {
        setEvents(eventsResult.value.events);
      }

      if (incidentsResult.status === 'fulfilled' && !incidentsResult.value.error && incidentsResult.value.incidents) {
        setIncidents(incidentsResult.value.incidents.filter(i => i.status === 'open' || i.status === 'active').slice(0, 5));
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  }, []);

  // WebSocket handlers
  const handleNewIncident = useCallback((incident) => {
    setIncidents((prev) => [incident, ...prev].slice(0, 5));
    loadData(); // Refresh metrics
  }, [loadData]);

  const handleCriticalAlert = useCallback((data) => {
    console.log('Critical Alert:', data);
    loadData(); // Refresh metrics
  }, [loadData]);

  // Connect WebSocket
  const { connected } = useWebSocketFeed({
    autoConnect: true,
    onNewIncident: handleNewIncident,
    onCriticalAlert: handleCriticalAlert,
    onAnyMessage: () => loadData(), // Refresh on any message
  });

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className="bg-[#0f1419] border border-[#1e293b] rounded-xl p-6 hover:border-cyan-500/30 transition-all">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">{label}</p>
          <p className="text-3xl font-bold text-white" data-testid={`stat-${label.toLowerCase().replace(/ /g, '-')}`}>{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-500/10';
      case 'high': return 'text-orange-400 bg-orange-500/10';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10';
      default: return 'text-gray-400 bg-gray-500/10';
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">SOC Dashboard</h1>
        <p className="text-gray-400">Real-time security operations center monitoring</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Activity} label="Total Events" value={stats.total_events} color="bg-cyan-500/10 text-cyan-400" />
        <StatCard icon={Shield} label="Total Incidents" value={stats.total_incidents} color="bg-blue-500/10 text-blue-400" />
        <StatCard icon={AlertTriangle} label="Active Incidents" value={stats.active_incidents} color="bg-orange-500/10 text-orange-400" />
        <StatCard icon={TrendingUp} label="ML Flagged" value={stats.ml_flagged} color="bg-purple-500/10 text-purple-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Events */}
        <div className="bg-[#0f1419] border border-[#1e293b] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Live Event Feed</h2>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-xs text-gray-400">{connected ? 'LIVE' : 'DISCONNECTED'}</span>
            </div>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {events.length > 0 ? events.map((event, idx) => (
              <div key={event.id || idx} className="bg-[#1a1f2e] border border-[#2d3748] rounded-lg p-3 hover:border-cyan-500/30 transition-all">
                <div className="flex items-start justify-between mb-1">
                  <span className={`text-xs px-2 py-1 rounded ${getSeverityColor(event.severity)}`}>
                    {event.severity?.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500">{new Date(event.timestamp || event.created_at).toLocaleTimeString()}</span>
                </div>
                <p className="text-sm text-white font-medium">{(event.type || event.event_type)?.replace('_', ' ').toUpperCase()}</p>
                <p className="text-xs text-gray-400 mt-1">{event.source_ip}</p>
              </div>
            )) : (
              <p className="text-gray-500 text-center py-8">No events yet</p>
            )}
          </div>
        </div>

        {/* Active Incidents */}
        <div className="bg-[#0f1419] border border-[#1e293b] rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Active Incidents</h2>
          <div className="space-y-3">
            {incidents.length > 0 ? incidents.map((incident, idx) => (
              <div key={incident.id || idx} className="bg-[#1a1f2e] border border-[#2d3748] rounded-lg p-4 hover:border-cyan-500/30 transition-all">
                <div className="flex items-start justify-between mb-2">
                  <span className={`text-xs px-2 py-1 rounded ${getSeverityColor(incident.severity)}`}>
                    {incident.severity?.toUpperCase()}
                  </span>
                  <a href={`/incident/${incident.id}`} className="text-cyan-400 hover:text-cyan-300">
                    <Eye className="w-4 h-4" />
                  </a>
                </div>
                <p className="text-sm text-white font-medium mb-1">{(incident.type || incident.threat_type)?.replace('_', ' ').toUpperCase()}</p>
                <p className="text-xs text-gray-400">{incident.description || incident.title}</p>
              </div>
            )) : (
              <p className="text-gray-500 text-center py-8">No active incidents</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
