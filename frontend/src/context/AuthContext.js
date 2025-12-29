import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { DEMO_MODE } from '../constants';

const AuthContext = createContext();

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('arc_token'));
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('arc_refresh_token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('arc_user') || 'null'));
  const [loading, setLoading] = useState(false);

  // Signup with email verification
  const signup = async (email, password) => {
    // DEMO MODE: Accept any signup
    if (DEMO_MODE) {
      return { message: 'Account created successfully', user: { email } };
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/signup`, {
        email,
        password
      });
      return response.data; // { message, user, email_confirmation_required }
    } finally {
      setLoading(false);
    }
  };

  // Login with Supabase Auth
  const login = async (email, password) => {
    // DEMO MODE: Accept any credentials
    if (DEMO_MODE) {
      const demoToken = 'demo_token_' + Date.now();
      const demoRefresh = 'demo_refresh_' + Date.now();
      const demoUser = { id: 1, email: email || 'demo@arcsentinel.io', role: 'admin' };
      
      setToken(demoToken);
      setRefreshToken(demoRefresh);
      setUser(demoUser);
      
      localStorage.setItem('arc_token', demoToken);
      localStorage.setItem('arc_refresh_token', demoRefresh);
      localStorage.setItem('arc_user', JSON.stringify(demoUser));
      
      return { access_token: demoToken, refresh_token: demoRefresh, user: demoUser };
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password
      });
      
      const { access_token, refresh_token, user: userData } = response.data;
      
      setToken(access_token);
      setRefreshToken(refresh_token);
      setUser(userData);
      
      localStorage.setItem('arc_token', access_token);
      localStorage.setItem('arc_refresh_token', refresh_token);
      localStorage.setItem('arc_user', JSON.stringify(userData));
      
      return response.data;
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = useCallback(async () => {
    try {
      if (token) {
        await axios.post(
          `${API_URL}/api/auth/logout`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    } catch (error) {
      // Ignore logout errors
    } finally {
      setToken(null);
      setRefreshToken(null);
      setUser(null);
      localStorage.removeItem('arc_token');
      localStorage.removeItem('arc_refresh_token');
      localStorage.removeItem('arc_user');
    }
  }, [token]);

  // Refresh access token
  const refresh = useCallback(async () => {
    if (!refreshToken) return false;
    
    try {
      const response = await axios.post(`${API_URL}/api/auth/refresh`, {
        refresh_token: refreshToken
      });
      
      const { access_token, refresh_token: newRefreshToken } = response.data;
      
      setToken(access_token);
      setRefreshToken(newRefreshToken);
      
      localStorage.setItem('arc_token', access_token);
      localStorage.setItem('arc_refresh_token', newRefreshToken);
      
      return true;
    } catch (error) {
      // Refresh failed, clear tokens
      setToken(null);
      setRefreshToken(null);
      setUser(null);
      localStorage.removeItem('arc_token');
      localStorage.removeItem('arc_refresh_token');
      localStorage.removeItem('arc_user');
      return false;
    }
  }, [refreshToken]);

  // Request password reset
  const resetPassword = async (email) => {
    const response = await axios.post(`${API_URL}/api/auth/reset-password`, {
      email
    });
    return response.data;
  };

  // Setup axios interceptor for token refresh
  useEffect(() => {
    let isRefreshing = false;
    
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // If 401 and not already retrying, try to refresh token (but only once)
        if (error.response?.status === 401 && !originalRequest._retry && refreshToken && !isRefreshing) {
          originalRequest._retry = true;
          isRefreshing = true;
          
          try {
            const refreshed = await refresh();
            isRefreshing = false;
            
            if (refreshed) {
              originalRequest.headers.Authorization = `Bearer ${localStorage.getItem('arc_token')}`;
              return axios(originalRequest);
            }
          } catch (refreshError) {
            isRefreshing = false;
            // Clear tokens on refresh failure to prevent loops
            localStorage.removeItem('arc_token');
            localStorage.removeItem('arc_refresh_token');
            localStorage.removeItem('arc_user');
          }
        }
        
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [refresh, refreshToken]);

  const value = {
    token,
    refreshToken,
    user,
    loading,
    signup,
    login,
    logout,
    refresh,
    resetPassword,
    isAuthenticated: !!token
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
