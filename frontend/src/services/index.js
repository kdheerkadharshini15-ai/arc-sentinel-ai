/**
 * A.R.C SENTINEL - Services Index
 * ================================
 * Central export for all services
 */

// API Client
export { default as api, handleApiError, apiRequest } from './api';

// Authentication
export {
  login,
  signup,
  logout,
  getToken,
  getRefreshToken,
  getUser,
  isAuthenticated,
  refreshAccessToken,
  resetPassword,
  getCurrentUser,
} from './auth';

// Events
export {
  getEvents,
  getEventById,
  getRecentEvents,
  getMlFlaggedEvents,
  getCriticalEvents,
} from './events';

// Incidents
export {
  getIncidents,
  getIncidentById,
  createIncident,
  updateIncident,
  resolveIncident,
  investigateIncident,
  getActiveIncidents,
  getIncidentMetrics,
} from './incidents';

// Reports
export {
  getForensicReport,
  captureForensicSnapshot,
  getGeminiSummary,
  getAllReports,
  parseForensicData,
  getResponseActionLog,
  getQuarantinedDevices,
  getIsolatedProcesses,
} from './reports';

// Simulator
export {
  ATTACK_TYPES,
  ATTACK_METADATA,
  simulateAttack,
  getAttackMetadata,
} from './simulator';

// ML
export {
  getModelStatus,
  trainModel,
  predictAnomaly,
  formatMlScore,
  getAnomalyLevel,
} from './ml';

// WebSocket
export {
  connectWebSocket,
  closeWebSocket,
  getWebSocketState,
  isWebSocketConnected,
  sendWebSocketMessage,
} from './websocket';
