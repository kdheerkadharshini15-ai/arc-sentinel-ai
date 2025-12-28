/**
 * A.R.C SENTINEL - API Client Configuration
 * ==========================================
 * Axios instance with interceptors for authentication and error handling
 */

import axios from 'axios';

// Base URL from environment
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 3000,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
