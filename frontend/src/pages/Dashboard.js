import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, Shield, TrendingUp, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function Dashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState({ total_events: 0, total_incidents: 0, active_incidents: 0, ml_flagged: 0 });
  const [events, setEvents] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    loadData();
    connectWebSocket();
    return () => ws?.close();
  }, []);

  const loadData = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [statsRes, eventsRes, incidentsRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/stats`, config),
        axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/events?limit=10`, config),
        axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/incidents`, config)
      ]);
      setStats(statsRes.data);
      setEvents(eventsRes.data.events || []);
      setIncidents(incidentsRes.data.incidents?.filter(i => i.status === 'active').slice(0, 5) || []);
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  const connectWebSocket = () => {
    const wsUrl = process.env.REACT_APP_BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');
    const socket = new WebSocket(`${wsUrl}/api/events/live`);
    
    socket.onopen = () => console.log('WebSocket connected');
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'new_event') {
        setEvents(prev => [data.data, ...prev.slice(0, 9)]);
        loadData();
      } else if (data.type === 'new_incident') {
        setIncidents(prev => [data.data, ...prev.slice(0, 4)]);
        loadData();
      }
    };
    socket.onerror = (err) => console.error('WebSocket error:', err);
    setWs(socket);
  };

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
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-gray-400">LIVE</span>
            </div>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {events.map((event, idx) => (
              <div key={event.id || idx} className="bg-[#1a1f2e] border border-[#2d3748] rounded-lg p-3 hover:border-cyan-500/30 transition-all">
                <div className="flex items-start justify-between mb-1">
                  <span className={`text-xs px-2 py-1 rounded ${getSeverityColor(event.severity)}`}>
                    {event.severity?.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500">{new Date(event.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="text-sm text-white font-medium">{event.type?.replace('_', ' ').toUpperCase()}</p>
                <p className="text-xs text-gray-400 mt-1">{event.source_ip}</p>
              </div>
            ))}
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
                <p className="text-sm text-white font-medium mb-1">{incident.type?.replace('_', ' ').toUpperCase()}</p>
                <p className="text-xs text-gray-400">{incident.description}</p>
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
