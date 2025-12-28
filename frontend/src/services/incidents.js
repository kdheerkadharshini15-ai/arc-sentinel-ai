/**
 * A.R.C SENTINEL - Incidents Service
 * ===================================
 * API calls for incident management
 */

import api, { handleApiError } from './api';

/**
 * Get incidents with optional filtering and pagination
 * @param {object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.pageSize - Items per page (default: 50)
 * @param {string} options.status - Filter by status (open, investigating, resolved)
 * @param {string} options.severity - Filter by severity
 * @param {string} options.threatType - Filter by threat type
 * @returns {Promise<{ incidents: array, total: number, summary: object } | { error: true, message: string }>}
 */
export async function getIncidents(options = {}) {
  try {
    const params = new URLSearchParams();

    if (options.page) params.append('page', options.page);
    if (options.pageSize) params.append('page_size', options.pageSize);
    if (options.status && options.status !== 'all') params.append('status', options.status);
    if (options.severity && options.severity !== 'all') params.append('severity', options.severity);
    if (options.threatType && options.threatType !== 'all') params.append('threat_type', options.threatType);

    const response = await api.get(`/api/incidents?${params.toString()}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Get a single incident by ID
 * @param {string} incidentId - Incident ID
 * @returns {Promise<object | { error: true, message: string }>}
 */
export async function getIncidentById(incidentId) {
  try {
    const response = await api.get(`/api/incidents/${incidentId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Create a new incident manually
 * @param {object} incident - Incident data
 * @param {string} incident.title - Incident title
 * @param {string} incident.description - Incident description
 * @param {string} incident.severity - Severity level
 * @param {string} incident.threatType - Type of threat
 * @param {string} incident.sourceIp - Source IP address
 * @returns {Promise<object | { error: true, message: string }>}
 */
export async function createIncident(incident) {
  try {
    const response = await api.post('/api/incidents', {
      title: incident.title,
      description: incident.description,
      severity: incident.severity,
      threat_type: incident.threatType,
      source_ip: incident.sourceIp,
      status: 'open',
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Update an incident
 * @param {string} incidentId - Incident ID
 * @param {object} updates - Fields to update
 * @returns {Promise<object | { error: true, message: string }>}
 */
export async function updateIncident(incidentId, updates) {
  try {
    const response = await api.patch(`/api/incidents/${incidentId}`, updates);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Resolve an incident
 * @param {string} incidentId - Incident ID
 * @param {string} resolution - Resolution notes
 * @param {string} notes - Additional notes
 * @returns {Promise<object | { error: true, message: string }>}
 */
export async function resolveIncident(incidentId, resolution, notes = '') {
  try {
    const response = await api.post(`/api/incidents/${incidentId}/resolve`, {
      resolution,
      notes,
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Start investigation on an incident
 * @param {string} incidentId - Incident ID
 * @returns {Promise<object | { error: true, message: string }>}
 */
export async function investigateIncident(incidentId) {
  try {
    const response = await api.post(`/api/incidents/${incidentId}/investigate`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Get active incidents
 * @param {number} limit - Number of incidents to fetch
 * @returns {Promise<{ incidents: array } | { error: true, message: string }>}
 */
export async function getActiveIncidents(limit = 10) {
  return getIncidents({ status: 'open', pageSize: limit });
}

/**
 * Get incident metrics/summary
 * @returns {Promise<{ total_events: number, total_incidents: number, active_incidents: number, ml_flagged: number } | { error: true, message: string }>}
 */
export async function getIncidentMetrics() {
  try {
    const response = await api.get('/api/incidents');
    const { summary } = response.data;
    
    return {
      total_events: summary?.total_events || 0,
      total_incidents: summary?.total_incidents || 0,
      active_incidents: summary?.active_incidents || 0,
      ml_flagged: summary?.ml_flagged || 0,
    };
  } catch (error) {
    return handleApiError(error);
  }
}

export default {
  getIncidents,
  getIncidentById,
  createIncident,
  updateIncident,
  resolveIncident,
  investigateIncident,
  getActiveIncidents,
  getIncidentMetrics,
};
