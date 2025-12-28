/**
 * A.R.C SENTINEL - ML Service
 * ============================
 * API calls for machine learning operations
 */

import api, { handleApiError } from './api';

/**
 * Get ML model status
 * @returns {Promise<{ trained: boolean, feature_count: number, samples_trained: number, last_trained: string } | { error: true, message: string }>}
 */
export async function getModelStatus() {
  try {
    const response = await api.get('/api/ml/status');
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Train the ML model
 * @returns {Promise<{ success: boolean, samples: number, message: string } | { error: true, message: string }>}
 */
export async function trainModel() {
  try {
    const response = await api.post('/api/ml/train');
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Predict anomaly for event data
 * @param {object} eventData - Event data to analyze
 * @param {string} eventData.event_type - Type of event
 * @param {string} eventData.severity - Event severity
 * @param {string} eventData.source_ip - Source IP address
 * @param {number} eventData.destination_port - Destination port
 * @param {number} eventData.bytes_transferred - Bytes transferred
 * @param {object} eventData.details - Additional details
 * @returns {Promise<{ is_anomaly: boolean, score: number, confidence: number } | { error: true, message: string }>}
 */
export async function predictAnomaly(eventData) {
  try {
    const response = await api.post('/api/ml/predict', {
      event_type: eventData.event_type || eventData.eventType,
      severity: eventData.severity,
      source_ip: eventData.source_ip || eventData.sourceIp,
      destination_port: eventData.destination_port || eventData.destinationPort,
      bytes_transferred: eventData.bytes_transferred || eventData.bytesTransferred,
      timestamp: eventData.timestamp || new Date().toISOString(),
      details: eventData.details || {},
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Format ML score as percentage
 * @param {number} score - Raw ML score (0-1)
 * @returns {string} - Formatted percentage
 */
export function formatMlScore(score) {
  if (typeof score !== 'number') return 'N/A';
  return `${(score * 100).toFixed(1)}%`;
}

/**
 * Get anomaly level from score
 * @param {number} score - ML anomaly score (0-1)
 * @returns {'normal' | 'warning' | 'critical'}
 */
export function getAnomalyLevel(score) {
  if (score >= 0.8) return 'critical';
  if (score >= 0.6) return 'warning';
  return 'normal';
}

export default {
  getModelStatus,
  trainModel,
  predictAnomaly,
  formatMlScore,
  getAnomalyLevel,
};
