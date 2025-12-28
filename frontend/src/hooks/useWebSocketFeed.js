/**
 * A.R.C SENTINEL - WebSocket Feed Hook
 * =====================================
 * React hook for real-time WebSocket data
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { connectWebSocket, closeWebSocket, isWebSocketConnected } from '../services/websocket';

/**
 * Custom hook for WebSocket feed
 * @param {object} options - Hook options
 * @param {boolean} options.autoConnect - Auto-connect on mount (default: true)
 * @param {Function} options.onNewIncident - Callback for new incidents
 * @param {Function} options.onCriticalAlert - Callback for critical alerts
 * @param {Function} options.onIncidentResolved - Callback for resolved incidents
 * @param {Function} options.onDeviceQuarantined - Callback for quarantined devices
 * @param {Function} options.onAnyMessage - Callback for any message
 * @returns {{ 
 *   connected: boolean, 
 *   messages: array, 
 *   lastMessage: object | null, 
 *   connect: Function, 
 *   disconnect: Function,
 *   clearMessages: Function 
 * }}
 */
export function useWebSocketFeed(options = {}) {
  const {
    autoConnect = true,
    onNewIncident,
    onCriticalAlert,
    onIncidentResolved,
    onDeviceQuarantined,
    onAnyMessage,
  } = options;

  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [lastMessage, setLastMessage] = useState(null);

  // Use refs for callbacks to avoid re-connecting on callback change
  const callbacksRef = useRef({
    onNewIncident,
    onCriticalAlert,
    onIncidentResolved,
    onDeviceQuarantined,
    onAnyMessage,
  });

  // Update refs when callbacks change
  useEffect(() => {
    callbacksRef.current = {
      onNewIncident,
      onCriticalAlert,
      onIncidentResolved,
      onDeviceQuarantined,
      onAnyMessage,
    };
  }, [onNewIncident, onCriticalAlert, onIncidentResolved, onDeviceQuarantined, onAnyMessage]);

  // Message handler
  const handleMessage = useCallback((data) => {
    const messageWithTimestamp = {
      ...data,
      receivedAt: new Date().toISOString(),
    };

    // Update state
    setLastMessage(messageWithTimestamp);
    setMessages((prev) => [messageWithTimestamp, ...prev].slice(0, 100)); // Keep last 100

    // Call type-specific callbacks
    const callbacks = callbacksRef.current;

    if (callbacks.onAnyMessage) {
      callbacks.onAnyMessage(data);
    }

    switch (data.type) {
      case 'new_incident':
        if (callbacks.onNewIncident) {
          callbacks.onNewIncident(data.data);
        }
        break;
      case 'critical_alert':
        if (callbacks.onCriticalAlert) {
          callbacks.onCriticalAlert(data.data);
        }
        break;
      case 'incident_resolved':
        if (callbacks.onIncidentResolved) {
          callbacks.onIncidentResolved(data.data);
        }
        break;
      case 'device_quarantined':
        if (callbacks.onDeviceQuarantined) {
          callbacks.onDeviceQuarantined(data.data);
        }
        break;
      default:
        break;
    }
  }, []);

  // Connect handler
  const handleConnect = useCallback(() => {
    setConnected(true);
  }, []);

  // Connect function
  const connect = useCallback(() => {
    connectWebSocket(handleMessage, handleConnect);
  }, [handleMessage, handleConnect]);

  // Disconnect function
  const disconnect = useCallback(() => {
    closeWebSocket();
    setConnected(false);
  }, []);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    setLastMessage(null);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Check connection status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setConnected(isWebSocketConnected());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    connected,
    messages,
    lastMessage,
    connect,
    disconnect,
    clearMessages,
  };
}

export default useWebSocketFeed;
