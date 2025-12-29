/**
 * A.R.C SENTINEL - API Client Configuration
 * ==========================================
 * Axios instance with interceptors for authentication and error handling
 * DEMO MODE: Returns hardcoded responses when enabled
 */

import axios from 'axios';
import { 
  DEMO_MODE, 
  DEMO_CONFIG,
  DEMO_INCIDENTS, 
  DEMO_EVENTS, 
  DEMO_STATS, 
  DEMO_FORENSIC_REPORT,
  DEMO_ML_STATUS 
} from '../constants';

// Base URL - use same origin in production (combined frontend+backend deployment)
const BASE_URL = process.env.REACT_APP_API_URL || (
  process.env.NODE_ENV === 'production' 
    ? '' // Same origin - no base URL needed
    : 'http://localhost:8000'
);

// Demo mode mock responses
const DEMO_MOCKS = {
  // Incidents
  '/api/incidents': { incidents: DEMO_INCIDENTS, total: DEMO_INCIDENTS.length },
  '/api/incidents/active': { incidents: DEMO_INCIDENTS.filter(i => i.status === 'open' || i.status === 'investigating'), total: 3 },
  '/api/incidents/metrics': DEMO_STATS,
  
  // Events
  '/api/events': { events: DEMO_EVENTS, total: DEMO_EVENTS.length },
  '/api/events/recent': { events: DEMO_EVENTS.slice(0, 10) },
  '/api/events/critical': { events: DEMO_EVENTS.filter(e => e.severity === 'critical') },
  '/api/events/ml-flagged': { events: DEMO_EVENTS.slice(0, 5), total: 5 },
  
  // ML
  '/api/ml/status': DEMO_ML_STATUS,
  '/api/ml/train': { success: true, trained: true, samples: 1847, message: 'Model trained successfully', accuracy: 0.94 },
  '/api/ml/predict': { is_anomaly: true, anomaly_score: 0.87, confidence: 0.92 },
  
  // Reports / Forensics
  '/api/reports': { incidents: DEMO_INCIDENTS },
  '/api/forensics': DEMO_FORENSIC_REPORT,
  
  // Simulator
  '/api/simulate': { 
    success: true, 
    attack_type: 'bruteforce',
    chain_length: 12,
    events_generated: 12,
    incident_created: true,
    incident_id: Date.now(),
    ml_flagged: true,
  },
  
  // Auth
  '/api/auth/login': { 
    access_token: 'demo_token_' + Date.now(), 
    refresh_token: 'demo_refresh_' + Date.now(),
    user: { id: 1, email: 'demo@arcsentinel.io', role: 'admin' }
  },
  '/api/auth/signup': { message: 'Account created successfully', user: { email: 'demo@arcsentinel.io' } },
  '/api/auth/refresh': { access_token: 'demo_token_refreshed_' + Date.now(), refresh_token: 'demo_refresh_' + Date.now() },
  '/api/auth/logout': { success: true },
  
  // Health
  '/health': { status: 'healthy', demo_mode: true },
  '/api/health': { status: 'healthy', demo_mode: true },
};

/**
 * Get mock response for a given URL path
 */
function getDemoResponse(url, method = 'get', data = null) {
  // Extract path from URL
  const path = url.replace(BASE_URL, '').split('?')[0];
  
  // Dynamic responses based on path patterns
  if (path.match(/\/api\/incidents\/\d+\/resolve/)) {
    return { success: true, message: 'Incident resolved', status: 'resolved' };
  }
  if (path.match(/\/api\/incidents\/\d+\/investigate/)) {
    return { success: true, message: 'Investigation started', status: 'investigating' };
  }
  if (path.match(/\/api\/incidents\/\d+\/forensics/)) {
    return DEMO_FORENSIC_REPORT;
  }
  if (path.match(/\/api\/incidents\/\d+\/gemini/)) {
    return { 
      summary: DEMO_FORENSIC_REPORT.summary,
      generated_at: new Date().toISOString(),
      confidence: '94%'
    };
  }
  if (path.match(/\/api\/incidents\/\d+/)) {
    const id = parseInt(path.split('/').pop());
    const incident = DEMO_INCIDENTS.find(i => i.id === id) || DEMO_INCIDENTS[0];
    return { ...incident, forensics: DEMO_FORENSIC_REPORT };
  }
  if (path.match(/\/api\/events\/\d+/)) {
    const id = parseInt(path.split('/').pop());
    return DEMO_EVENTS.find(e => e.id === id) || DEMO_EVENTS[0];
  }
  
  // Simulator with attack type
  if (path === '/api/simulate/attack' || path.includes('/simulate')) {
    const attackType = data?.attack_type || data?.type || 'bruteforce';
    return {
      success: true,
      attack_type: attackType,
      chain_length: Math.floor(Math.random() * 10) + 5,
      events_generated: Math.floor(Math.random() * 15) + 8,
      incident_created: true,
      incident_id: Date.now(),
      ml_flagged: true,
      source_ip: data?.source_ip || '192.168.1.' + Math.floor(Math.random() * 255),
    };
  }
  
  // Check static mocks
  for (const [mockPath, response] of Object.entries(DEMO_MOCKS)) {
    if (path === mockPath || path.startsWith(mockPath)) {
      return response;
    }
  }
  
  // Default success response
  return { success: true, demo_mode: true };
}

/**
 * Create a mock axios response
 */
function createMockResponse(data, status = 200) {
  return {
    data,
    status,
    statusText: 'OK',
    headers: { 'x-demo-mode': 'true' },
    config: {},
  };
}

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 30 seconds for attack simulations
  headers: {
    'Content-Type': 'application/json',
  },
});

// DEMO MODE: Intercept all requests and return mock data
if (DEMO_MODE) {
  console.log('🟡 A.R.C SENTINEL running in DEMO MODE - All API calls return hardcoded data');
  
  api.interceptors.request.use(
    async (config) => {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, DEMO_CONFIG.MOCK_DELAY));
      
      // Get mock response
      const mockData = getDemoResponse(config.url, config.method, config.data);
      
      // Throw a custom "response" that will be caught by response interceptor
      const error = new Error('DEMO_MODE_INTERCEPT');
      error.config = config;
      error.response = createMockResponse(mockData);
      error.isDemo = true;
      
      return Promise.reject(error);
    },
    (error) => Promise.reject(error)
  );
  
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      // If this is our demo intercept, return the mock response
      if (error.isDemo && error.response) {
        return Promise.resolve(error.response);
      }
      // Otherwise, still return a mock to prevent crashes
      console.warn('[DEMO MODE] Request failed, returning fallback mock:', error.config?.url);
      return Promise.resolve(createMockResponse({ success: true, demo_mode: true, fallback: true }));
    }
  );
}

// Standard mode interceptors (only if not in demo mode)
if (!DEMO_MODE) {
  // Request interceptor - attach JWT token
  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('arc_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor - handle errors
  api.interceptors.response.use(
    (response) => {
      return response;
    },
    async (error) => {
      const originalRequest = error.config;

      // Handle 401 Unauthorized
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        // Try to refresh token
        const refreshToken = localStorage.getItem('arc_refresh_token');
        if (refreshToken) {
          try {
            const response = await axios.post(`${BASE_URL}/api/auth/refresh`, {
              refresh_token: refreshToken,
            });

            const { access_token, refresh_token: newRefreshToken } = response.data;

            localStorage.setItem('arc_token', access_token);
            localStorage.setItem('arc_refresh_token', newRefreshToken);

            originalRequest.headers.Authorization = `Bearer ${access_token}`;
            return api(originalRequest);
          } catch (refreshError) {
            // Refresh failed - logout
            handleLogout();
            return Promise.reject(refreshError);
          }
        } else {
          // No refresh token - logout
          handleLogout();
        }
      }

      return Promise.reject(error);
    }
  );
}

// Logout helper
function handleLogout() {
  localStorage.removeItem('arc_token');
  localStorage.removeItem('arc_refresh_token');
  localStorage.removeItem('arc_user');
  window.location.href = '/login';
}

/**
 * Standardized error handler
 * @param {Error} error - Axios error object
 * @returns {{ error: true, message: string, status?: number }}
 */
export function handleApiError(error) {
  if (error.response) {
    // Server responded with error
    return {
      error: true,
      message: error.response.data?.detail || error.response.data?.message || 'Request failed',
      status: error.response.status,
    };
  } else if (error.request) {
    // Request made but no response
    return {
      error: true,
      message: 'Network error - server not responding',
    };
  } else {
    // Request setup error
    return {
      error: true,
      message: error.message || 'An unexpected error occurred',
    };
  }
}

/**
 * API request wrapper with error handling
 * @param {Function} requestFn - Async function that makes the API call
 * @returns {Promise<{ data?: any, error?: true, message?: string }>}
 */
export async function apiRequest(requestFn) {
  try {
    const response = await requestFn();
    return { data: response.data };
  } catch (error) {
    return handleApiError(error);
  }
}

export default api;
