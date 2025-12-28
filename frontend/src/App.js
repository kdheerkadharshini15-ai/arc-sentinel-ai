import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Alerts from './pages/Alerts';
import Incidents from './pages/Incidents';
import IncidentDetail from './pages/IncidentDetail';
import Reports from './pages/Reports';
import AttackSimulator from './pages/AttackSimulator';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';
import './App.css';

function PrivateRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <PrivateRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/alerts" element={
            <PrivateRoute>
              <Layout>
                <Alerts />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/incidents" element={
            <PrivateRoute>
              <Layout>
                <Incidents />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/incident/:id" element={
            <PrivateRoute>
              <Layout>
                <IncidentDetail />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/reports" element={
            <PrivateRoute>
              <Layout>
                <Reports />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/simulator" element={
            <PrivateRoute>
              <Layout>
                <AttackSimulator />
              </Layout>
            </PrivateRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
