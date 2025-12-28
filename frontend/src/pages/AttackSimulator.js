import React, { useState } from 'react';
import { Zap, Activity, Brain, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { simulateAttack, ATTACK_METADATA, trainModel, getModelStatus } from '../services';
import { useToast } from '../hooks/use-toast';

export default function AttackSimulator() {
  const { toast } = useToast();
  const [selectedAttack, setSelectedAttack] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [training, setTraining] = useState(false);
  const [message, setMessage] = useState('');
  const [simulationResult, setSimulationResult] = useState(null);
  const [modelStatus, setModelStatus] = useState(null);

  const attacks = Object.entries(ATTACK_METADATA).map(([id, meta]) => ({
    id,
    name: meta.name,
    description: meta.description,
    icon: meta.icon
  }));

  const handleSimulate = async () => {
    if (!selectedAttack) return;
    setSimulating(true);
    setMessage('');
    setSimulationResult(null);
    
    try {
      const result = await simulateAttack(selectedAttack, { target: '192.168.1.100' });
      
      if (!result.error) {
        const attackName = ATTACK_METADATA[selectedAttack]?.name || selectedAttack;
        setMessage(`✅ ${attackName} simulation completed`);
        setSimulationResult(result);
        
        toast({
          title: 'Simulation Complete',
          description: `${result.chain_length || 0} events generated${result.incident_created ? ', incident created' : ''}`,
        });
      } else {
        setMessage(`❌ ${result.message}`);
        toast({
          title: 'Simulation Failed',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (err) {
      setMessage('❌ Simulation failed');
      toast({
        title: 'Error',
        description: 'Failed to execute simulation',
        variant: 'destructive',
      });
    } finally {
      setSimulating(false);
    }
  };

  const handleTrain = async () => {
    setTraining(true);
    setMessage('');
    
    try {
      const result = await trainModel();
      
      if (!result.error) {
        setMessage(`✅ ML model trained with ${result.samples || 0} samples`);
        setModelStatus(result);
        
        toast({
          title: 'Training Complete',
          description: `Model trained on ${result.samples} samples`,
        });
      } else {
        setMessage(`❌ ${result.message}`);
        toast({
          title: 'Training Failed',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (err) {
      setMessage('❌ Training failed');
      toast({
        title: 'Error',
        description: 'Failed to train model',
        variant: 'destructive',
      });
    } finally {
      setTraining(false);
    }
  };

  const handleCheckStatus = async () => {
    try {
      const status = await getModelStatus();
      if (!status.error) {
        setModelStatus(status);
      }
    } catch (err) {
      console.error('Failed to get model status:', err);
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
              {modelStatus && !modelStatus.error && (
                <div className="flex items-center space-x-4 mt-2 text-xs">
                  <span className="text-green-400">
                    <CheckCircle className="w-3 h-3 inline mr-1" />
                    {modelStatus.trained ? 'Trained' : 'Not trained'}
                  </span>
                  {modelStatus.samples && (
                    <span className="text-gray-400">{modelStatus.samples} samples</span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleCheckStatus}
              className="px-4 py-3 bg-[#1e293b] text-gray-400 rounded-lg hover:bg-[#2d3748] transition-all text-sm"
            >
              Check Status
            </button>
            <button
              data-testid="train-ml-button"
              onClick={handleTrain}
              disabled={training}
              className="flex items-center space-x-2 px-6 py-3 bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/20 transition-all disabled:opacity-50"
            >
              <Activity className={`w-5 h-5 ${training ? 'animate-pulse' : ''}`} />
              <span>{training ? 'Training...' : 'Train Model'}</span>
            </button>
          </div>
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

      {/* Execute Button and Results */}
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <button
            data-testid="simulate-button"
            onClick={handleSimulate}
            disabled={!selectedAttack || simulating}
            className="flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-red-500/20 to-orange-500/20 text-orange-400 border border-orange-500/30 rounded-xl hover:from-red-500/30 hover:to-orange-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Zap className={`w-5 h-5 ${simulating ? 'animate-pulse' : ''}`} />
            <span className="font-semibold">{simulating ? 'Simulating...' : 'Execute Simulation'}</span>
          </button>
          {message && (
            <div data-testid="simulation-message" className="text-sm text-gray-300 bg-[#0f1419] border border-[#2d3748] px-4 py-3 rounded-lg">
              {message}
            </div>
          )}
        </div>

        {/* Simulation Results */}
        {simulationResult && !simulationResult.error && (
          <div className="bg-[#0f1419] border border-[#1e293b] rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Simulation Results</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#1a1f2e] rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-cyan-400">{simulationResult.chain_length || 0}</div>
                <div className="text-xs text-gray-400 mt-1">Events Generated</div>
              </div>
              <div className="bg-[#1a1f2e] rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-white">{simulationResult.attack_type || '-'}</div>
                <div className="text-xs text-gray-400 mt-1">Attack Type</div>
              </div>
              <div className="bg-[#1a1f2e] rounded-lg p-4 text-center">
                {simulationResult.incident_created ? (
                  <CheckCircle className="w-8 h-8 text-green-400 mx-auto" />
                ) : (
                  <XCircle className="w-8 h-8 text-gray-500 mx-auto" />
                )}
                <div className="text-xs text-gray-400 mt-1">Incident Created</div>
              </div>
              <div className="bg-[#1a1f2e] rounded-lg p-4 text-center">
                {simulationResult.ml_flagged ? (
                  <AlertTriangle className="w-8 h-8 text-yellow-400 mx-auto" />
                ) : (
                  <CheckCircle className="w-8 h-8 text-gray-500 mx-auto" />
                )}
                <div className="text-xs text-gray-400 mt-1">ML Flagged</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
