/**
 * A.R.C SENTINEL - Authentication Service
 * ========================================
 * Handles login, logout, token management
 */

import api, { handleApiError } from './api';

const TOKEN_KEY = 'arc_token';
const REFRESH_TOKEN_KEY = 'arc_refresh_token';
const USER_KEY = 'arc_user';

/**
 * Login with email and password
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<{ access_token: string, refresh_token: string, user: object } | { error: true, message: string }>}
 */
export async function login(email, password) {
  try {
    const response = await api.post('/api/auth/login', { email, password });
    const { access_token, refresh_token, user } = response.data;

    // Store tokens
    localStorage.setItem(TOKEN_KEY, access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));

    return { access_token, refresh_token, user };
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Register new user
 * @param {string} email 
 * @param {string} password 
 * @param {string} fullName 
 * @returns {Promise<{ message: string, user: object } | { error: true, message: string }>}
 */
export async function signup(email, password, fullName = '') {
  try {
    const response = await api.post('/api/auth/signup', {
      email,
      password,
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Logout user
 * @returns {Promise<void>}
 */
export async function logout() {
  try {
    const token = getToken();
    if (token) {
      await api.post('/api/auth/logout');
    }
  } catch (error) {
    // Ignore logout errors
    console.warn('Logout error:', error);
  } finally {
    // Clear local storage
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

/**
 * Get current access token
 * @returns {string | null}
 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Get refresh token
 * @returns {string | null}
 */
export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Get current user data
 * @returns {object | null}
 */
export function getUser() {
  const userStr = localStorage.getItem(USER_KEY);
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export function isAuthenticated() {
  const token = getToken();
  return !!token;
}

/**
 * Refresh access token
 * @returns {Promise<{ access_token: string, refresh_token: string } | { error: true, message: string }>}
 */
export async function refreshAccessToken() {
  try {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      return { error: true, message: 'No refresh token available' };
    }

    const response = await api.post('/api/auth/refresh', {
      refresh_token: refreshToken,
    });

    const { access_token, refresh_token } = response.data;

    localStorage.setItem(TOKEN_KEY, access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);

    return { access_token, refresh_token };
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Request password reset
 * @param {string} email 
 * @returns {Promise<{ message: string } | { error: true, message: string }>}
 */
export async function resetPassword(email) {
  try {
    const response = await api.post('/api/auth/reset-password', { email });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Get current user profile from API
 * @returns {Promise<object | { error: true, message: string }>}
 */
export async function getCurrentUser() {
  try {
    const response = await api.get('/api/auth/me');
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

export default {
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
};
