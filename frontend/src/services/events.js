/**
 * A.R.C SENTINEL - Events Service
 * ================================
 * API calls for security events
 */

import api, { handleApiError } from './api';

/**
 * Get events with optional filtering and pagination
 * @param {object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.pageSize - Items per page (default: 50)
 * @param {string} options.severity - Filter by severity (low, medium, high, critical)
 * @param {string} options.eventType - Filter by event type
 * @param {string} options.sourceIp - Filter by source IP
 * @param {boolean} options.mlFlagged - Filter by ML flagged events
 * @param {string} options.startDate - Filter by start date (ISO string)
 * @param {string} options.endDate - Filter by end date (ISO string)
 * @returns {Promise<{ events: array, total: number, page: number, page_size: number } | { error: true, message: string }>}
 */
export async function getEvents(options = {}) {
  try {
    const params = new URLSearchParams();

    if (options.page) params.append('page', options.page);
    if (options.pageSize) params.append('page_size', options.pageSize);
    if (options.severity && options.severity !== 'all') params.append('severity', options.severity);
    if (options.eventType && options.eventType !== 'all') params.append('event_type', options.eventType);
    if (options.sourceIp) params.append('source_ip', options.sourceIp);
    if (options.mlFlagged !== undefined) params.append('ml_flagged', options.mlFlagged);
    if (options.startDate) params.append('start_date', options.startDate);
    if (options.endDate) params.append('end_date', options.endDate);

    const response = await api.get(`/api/events?${params.toString()}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Get a single event by ID
 * @param {string} eventId - Event ID
 * @returns {Promise<object | { error: true, message: string }>}
 */
export async function getEventById(eventId) {
  try {
    const response = await api.get(`/api/events/${eventId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Get recent events for dashboard feed
 * @param {number} limit - Number of events to fetch (default: 10)
 * @returns {Promise<{ events: array } | { error: true, message: string }>}
 */
export async function getRecentEvents(limit = 10) {
  return getEvents({ pageSize: limit, page: 1 });
}

/**
 * Get ML-flagged events
 * @param {number} limit - Number of events to fetch
 * @returns {Promise<{ events: array } | { error: true, message: string }>}
 */
export async function getMlFlaggedEvents(limit = 50) {
  return getEvents({ mlFlagged: true, pageSize: limit });
}

/**
 * Get critical/high severity events
 * @param {number} limit - Number of events to fetch
 * @returns {Promise<{ events: array } | { error: true, message: string }>}
 */
export async function getCriticalEvents(limit = 50) {
  try {
    const [critical, high] = await Promise.all([
      getEvents({ severity: 'critical', pageSize: limit }),
      getEvents({ severity: 'high', pageSize: limit }),
    ]);

    const events = [
      ...(critical.events || []),
      ...(high.events || []),
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return { events: events.slice(0, limit) };
  } catch (error) {
    return handleApiError(error);
  }
}

export default {
  getEvents,
  getEventById,
  getRecentEvents,
  getMlFlaggedEvents,
  getCriticalEvents,
};
