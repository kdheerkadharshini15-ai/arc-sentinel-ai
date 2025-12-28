/**
 * A.R.C SENTINEL - Reports Service
 * =================================
 * API calls for forensic reports
 */

import api, { handleApiError } from './api';

/**
 * Get forensic report for an incident
 * @param {string} incidentId - Incident ID
 * @returns {Promise<object | { error: true, message: string }>}
 */
export async function getForensicReport(incidentId) {
  try {
    const response = await api.get(`/api/forensics/${incidentId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Capture forensic snapshot for an incident
 * @param {string} incidentId - Incident ID
 * @returns {Promise<object | { error: true, message: string }>}
 */
export async function captureForensicSnapshot(incidentId) {
  try {
    const response = await api.post(`/api/forensics/${incidentId}/capture`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Get Gemini AI summary for an incident
 * @param {string} incidentId - Incident ID
 * @returns {Promise<{ incident_id: string, summary: string, generated_at: string } | { error: true, message: string }>}
 */
export async function getGeminiSummary(incidentId) {
  try {
    const response = await api.post(`/api/gemini/summarize/${incidentId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Get all reports (via incidents with forensic data)
 * @param {object} options - Query options
 * @param {number} options.page - Page number
 * @param {number} options.pageSize - Items per page
 * @returns {Promise<{ incidents: array } | { error: true, message: string }>}
 */
export async function getAllReports(options = {}) {
  try {
    const params = new URLSearchParams();
    if (options.page) params.append('page', options.page);
    if (options.pageSize) params.append('page_size', options.pageSize);

    const response = await api.get(`/api/incidents?${params.toString()}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Parse forensic data from report
 * @param {object} report - Forensic report object
 * @returns {{ processes: array, connections: array, summary: string }}
 */
export function parseForensicData(report) {
  if (!report || !report.forensic_data) {
    return { processes: [], connections: [], summary: '' };
  }

  let forensicData = report.forensic_data;
  
  // Parse if string
  if (typeof forensicData === 'string') {
    try {
      forensicData = JSON.parse(forensicData);
    } catch {
      return { processes: [], connections: [], summary: '' };
    }
  }

  return {
    processes: forensicData.processes || [],
    connections: forensicData.network_connections || forensicData.connections || [],
    summary: report.gemini_summary || forensicData.summary || '',
  };
}

/**
 * Get response action log
 * @param {number} limit - Number of actions to fetch
 * @returns {Promise<{ actions: array } | { error: true, message: string }>}
 */
export async function getResponseActionLog(limit = 50) {
  try {
    const response = await api.get(`/api/response/action-log?limit=${limit}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Get quarantined devices
 * @returns {Promise<object | { error: true, message: string }>}
 */
export async function getQuarantinedDevices() {
  try {
    const response = await api.get('/api/response/quarantined-devices');
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Get isolated processes
 * @returns {Promise<object | { error: true, message: string }>}
 */
export async function getIsolatedProcesses() {
  try {
    const response = await api.get('/api/response/isolated-processes');
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

export default {
  getForensicReport,
  captureForensicSnapshot,
  getGeminiSummary,
  getAllReports,
  parseForensicData,
  getResponseActionLog,
  getQuarantinedDevices,
  getIsolatedProcesses,
};
