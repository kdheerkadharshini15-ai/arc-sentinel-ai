import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('arc_token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('arc_user') || 'null'));

  const login = async (email, password) => {
    const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/auth/login`, {
      email,
      password
    });
    setToken(response.data.token);
    setUser(response.data.user);
    localStorage.setItem('arc_token', response.data.token);
    localStorage.setItem('arc_user', JSON.stringify(response.data.user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('arc_token');
    localStorage.removeItem('arc_user');
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
