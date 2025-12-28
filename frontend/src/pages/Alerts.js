import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Filter, RefreshCw } from 'lucide-react';
import { getEvents } from '../services';

export default function Alerts() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getEvents({
        pageSize: 200,
        severity: severityFilter !== 'all' ? severityFilter : undefined,
        eventType: typeFilter !== 'all' ? typeFilter : undefined,
      });

      if (!result.error && result.events) {
        setEvents(result.events);
      }
    } catch (err) {
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  }, [severityFilter, typeFilter]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

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
          <h1 className="text-3xl font-bold text-white mb-2">Alerts & Telemetry</h1>
          <p className="text-gray-400">All security events and telemetry data</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadEvents}
            disabled={loading}
            className="p-2 bg-[#0f1419] border border-[#2d3748] rounded-lg text-gray-400 hover:text-white hover:border-cyan-500 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Filter className="w-5 h-5 text-gray-400" />
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

      <div className="bg-[#0f1419] border border-[#1e293b] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#1a1f2e] border-b border-[#2d3748]">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">Timestamp</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">Type</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">Source IP</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">Severity</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">Details</th>
              </tr>
            </thead>
            <tbody data-testid="events-table">
              {events.length > 0 ? (
                events.map((event, idx) => (
                  <tr key={event.id || idx} className="border-b border-[#1e293b] hover:bg-[#1a1f2e] transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {new Date(event.timestamp || event.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-white font-medium">
                      {(event.type || event.event_type)?.replace('_', ' ').toUpperCase()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300 font-mono">{event.source_ip}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-3 py-1 rounded-full border ${getSeverityColor(event.severity)}`}>
                        {event.severity?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {typeof event.details === 'object' 
                        ? JSON.stringify(event.details).slice(0, 50) 
                        : String(event.details || '').slice(0, 50)}...
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    {loading ? 'Loading...' : 'No events yet. Use Attack Simulator to generate events.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
