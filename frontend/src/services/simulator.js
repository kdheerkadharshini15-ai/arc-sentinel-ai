/**
 * A.R.C SENTINEL - Simulator Service
 * ===================================
 * API calls for attack simulation
 */

import api, { handleApiError } from './api';

/**
 * Available attack types
 */
export const ATTACK_TYPES = {
  BRUTE_FORCE: 'bruteforce',
  PORT_SCAN: 'port_scan',
  MALWARE: 'malware',
  MALWARE_DETECTION: 'malware_detection',
  DDOS: 'ddos',
  SQL_INJECTION: 'sql_injection',
  PRIVILEGE_ESCALATION: 'privilege_escalation',
  EXFILTRATION: 'exfiltration',
  DATA_EXFILTRATION: 'data_exfiltration',
};

/**
 * Attack type metadata for UI
 */
export const ATTACK_METADATA = [
  {
    id: 'bruteforce',
    name: 'Brute Force',
    description: 'Simulates multiple failed login attempts',
    icon: '🔐',
    severity: 'high',
  },
  {
    id: 'port_scan',
    name: 'Port Scan',
    description: 'Simulates network port scanning activity',
    icon: '🔍',
    severity: 'medium',
  },
  {
    id: 'malware',
    name: 'Malware Detection',
    description: 'Simulates malicious process execution',
    icon: '🦠',
    severity: 'critical',
  },
  {
    id: 'ddos',
    name: 'DDoS Attack',
    description: 'Simulates distributed denial of service',
    icon: '💥',
    severity: 'critical',
  },
  {
    id: 'sql_injection',
    name: 'SQL Injection',
    description: 'Simulates database injection attempt',
    icon: '💉',
    severity: 'high',
  },
  {
    id: 'privilege_escalation',
    name: 'Privilege Escalation',
    description: 'Simulates unauthorized privilege elevation',
    icon: '⬆️',
    severity: 'critical',
  },
  {
    id: 'exfiltration',
    name: 'Data Exfiltration',
    description: 'Simulates unauthorized data transfer',
    icon: '📤',
    severity: 'high',
  },
];

/**
 * Simulate an attack
 * @param {string} attackType - Type of attack to simulate
 * @param {string} target - Target IP address (optional)
 * @returns {Promise<{ success: boolean, chain_length: number, events: array, incident_created: boolean, incident_id?: string } | { error: true, message: string }>}
 */
export async function simulateAttack(attackType, target = '192.168.1.100') {
  try {
    console.log('[Simulator] Sending attack:', attackType, 'to target:', target);
    const response = await api.post('/api/simulate/attack', {
      attack_type: attackType,
      target: target,
      intensity: 1
    });
    console.log('[Simulator] Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('[Simulator] Error:', error.response?.data || error.message);
    return handleApiError(error);
  }
}

/**
 * Get attack metadata by type
 * @param {string} attackType - Attack type ID
 * @returns {object | undefined}
 */
export function getAttackMetadata(attackType) {
  return ATTACK_METADATA.find(a => a.id === attackType);
}

export default {
  ATTACK_TYPES,
  ATTACK_METADATA,
  simulateAttack,
  getAttackMetadata,
};
