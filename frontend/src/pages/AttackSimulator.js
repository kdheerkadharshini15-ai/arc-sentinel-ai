import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Target, Play, Zap, Activity, Brain } from 'lucide-react';

export default function AttackSimulator() {
  const { token } = useAuth();
  const [selectedAttack, setSelectedAttack] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [training, setTraining] = useState(false);
  const [message, setMessage] = useState('');

  const attacks = [
    { id: 'brute_force', name: 'Brute Force', description: 'Simulates multiple failed login attempts', icon: '🔐' },
    { id: 'port_scan', name: 'Port Scan', description: 'Simulates network port scanning activity', icon: '🔍' },
    { id: 'malware_detection', name: 'Malware Detection', description: 'Simulates malicious process execution', icon: '🦠' },
    { id: 'ddos', name: 'DDoS Attack', description: 'Simulates distributed denial of service', icon: '💥' },
    { id: 'sql_injection', name: 'SQL Injection', description: 'Simulates database injection attempt', icon: '💉' },
    { id: 'privilege_escalation', name: 'Privilege Escalation', description: 'Simulates unauthorized privilege elevation', icon: '⬆️' },
    { id: 'data_exfiltration', name: 'Data Exfiltration', description: 'Simulates unauthorized data transfer', icon: '📤' }
  ];

  const handleSimulate = async () => {
    if (!selectedAttack) return;
    setSimulating(true);
    setMessage('');
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/simulate/attack`,
        { attack_type: selectedAttack, target: '192.168.1.100' },
        config
      );
      setMessage(`✅ ${attacks.find(a => a.id === selectedAttack)?.name} simulation started`);
    } catch (err) {
      setMessage('❌ Simulation failed');
    } finally {
      setSimulating(false);
    }
  };

  const handleTrain = async () => {
    setTraining(true);
    setMessage('');
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/ml/train`, {}, config);
      if (res.data.error) {
        setMessage(`❌ ${res.data.error}`);
      } else {
        setMessage(`✅ ML model trained with ${res.data.samples} samples`);
      }
    } catch (err) {
      setMessage('❌ Training failed');
    } finally {
      setTraining(false);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Attack Simulator</h1>
        <p className="text-gray-400">Simulate security attacks and train ML detection models</p>
      </div>

      {/* ML Training */}
      <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Brain className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white mb-1">ML Model Training</h2>
              <p className="text-sm text-gray-400">Train Isolation Forest model on baseline telemetry data</p>
            </div>
          </div>
          <button
            data-testid="train-ml-button"
            onClick={handleTrain}
            disabled={training}
            className="flex items-center space-x-2 px-6 py-3 bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/20 transition-all disabled:opacity-50"
          >
            <Activity className="w-5 h-5" />
            <span>{training ? 'Training...' : 'Train Model'}</span>
          </button>
        </div>
      </div>

      {/* Attack Simulations */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Select Attack Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {attacks.map((attack) => (
            <button
              key={attack.id}
              data-testid={`attack-${attack.id}`}
              onClick={() => setSelectedAttack(attack.id)}
              className={`text-left bg-[#0f1419] border rounded-xl p-6 transition-all ${
                selectedAttack === attack.id
                  ? 'border-cyan-500/50 bg-cyan-500/5'
                  : 'border-[#1e293b] hover:border-cyan-500/30'
              }`}
            >
              <div className="text-3xl mb-3">{attack.icon}</div>
              <h3 className="text-lg font-bold text-white mb-2">{attack.name}</h3>
              <p className="text-sm text-gray-400">{attack.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Execute Button */}
      <div className="flex items-center space-x-4">
        <button
          data-testid="simulate-button"
          onClick={handleSimulate}
          disabled={!selectedAttack || simulating}
          className="flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-red-500/20 to-orange-500/20 text-orange-400 border border-orange-500/30 rounded-xl hover:from-red-500/30 hover:to-orange-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Zap className="w-5 h-5" />
          <span className="font-semibold">{simulating ? 'Simulating...' : 'Execute Simulation'}</span>
        </button>
        {message && (
          <div data-testid="simulation-message" className="text-sm text-gray-300 bg-[#0f1419] border border-[#2d3748] px-4 py-3 rounded-lg">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
