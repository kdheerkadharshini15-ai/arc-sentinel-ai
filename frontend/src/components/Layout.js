import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, AlertTriangle, Activity, FileText, Target, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const location = useLocation();
  const { logout } = useAuth();

  const navItems = [
    { path: '/', icon: Activity, label: 'Dashboard' },
    { path: '/alerts', icon: AlertTriangle, label: 'Alerts' },
    { path: '/incidents', icon: Shield, label: 'Incidents' },
    { path: '/reports', icon: FileText, label: 'Reports' },
    { path: '/simulator', icon: Target, label: 'Simulator' }
  ];

  return (
    <div className="flex h-screen bg-[#0a0f1a]">
      {/* Sidebar */}
      <div className="w-64 bg-[#0f1419] border-r border-[#1e293b] flex flex-col">
        <div className="p-6 border-b border-[#1e293b]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">A.R.C SENTINEL</h1>
              <p className="text-xs text-gray-500">Automated Response & Forensics</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.label.toLowerCase()}`}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#1e293b]">
          <button
            data-testid="logout-button"
            onClick={logout}
            className="flex items-center space-x-3 px-4 py-3 w-full rounded-lg text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
