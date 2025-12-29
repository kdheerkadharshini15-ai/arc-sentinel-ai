/**
 * A.R.C SENTINEL - WebSocket Service
 * ===================================
 * Real-time WebSocket connection for live alerts
 * DEMO MODE: Simulates WebSocket events locally
 */

import { DEMO_MODE, DEMO_CONFIG } from '../constants';

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';

// Log the WebSocket URL for debugging
console.log('[WebSocket] URL configured:', WS_URL);

let socket = null;
let reconnectTimeout = null;
let reconnectAttempts = 0;
let demoInterval = null;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY_BASE = 1000; // Base delay in ms

// Demo mode message handler
let demoMessageHandler = null;
let demoConnectHandler = null;

// Demo mode event generator
function generateDemoEvent() {
  const eventTypes = [
    { type: 'new_incident', data: { id: Date.now(), type: 'bruteforce', severity: 'high', source_ip: '192.168.1.' + Math.floor(Math.random() * 255) } },
    { type: 'critical_alert', data: { id: Date.now(), message: 'Critical threat detected', severity: 'critical', source_ip: '10.0.0.' + Math.floor(Math.random() * 255) } },
    { type: 'telemetry', data: { cpu: Math.floor(Math.random() * 100), memory: Math.floor(Math.random() * 100), connections: Math.floor(Math.random() * 50) } },
    { type: 'ml_detection', data: { anomaly_score: (Math.random() * 0.5 + 0.5).toFixed(2), confidence: (Math.random() * 0.3 + 0.7).toFixed(2) } },
  ];
  return eventTypes[Math.floor(Math.random() * eventTypes.length)];
}

/**
 * Connect to WebSocket server (or simulate in demo mode)
 */
export function connectWebSocket(onMessageHandler, onConnectHandler = null, onErrorHandler = null) {
  // DEMO MODE: Simulate WebSocket with local events
  if (DEMO_MODE) {
    console.warn('🟡 [WebSocket] DEMO MODE - Simulating WebSocket events locally');
    
    demoMessageHandler = onMessageHandler;
    demoConnectHandler = onConnectHandler;
    
    // Simulate connection success
    setTimeout(() => {
      if (onConnectHandler) {
        onConnectHandler();
      }
    }, 100);
    
    // Start generating demo events
    if (demoInterval) {
      clearInterval(demoInterval);
    }
    
    demoInterval = setInterval(() => {
      if (demoMessageHandler) {
        const event = generateDemoEvent();
        console.log('[WebSocket DEMO] Generated event:', event.type);
        demoMessageHandler(event);
      }
    }, DEMO_CONFIG.ALERT_INTERVAL);
    
    // Return a mock socket object
    return {
      readyState: 1, // WebSocket.OPEN
      close: () => {
        if (demoInterval) {
          clearInterval(demoInterval);
          demoInterval = null;
        }
      },
      send: (data) => console.log('[WebSocket DEMO] Send:', data),
    };
  }
  // Close existing connection
  if (socket && socket.readyState !== WebSocket.CLOSED) {
    socket.close();
  }

  // Clear any pending reconnect
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  const wsEndpoint = `${WS_URL}/ws`;
  console.log('[WebSocket] Connecting to:', wsEndpoint);

  socket = new WebSocket(wsEndpoint);

  socket.onopen = () => {
    console.log('[WebSocket] Connected');
    reconnectAttempts = 0; // Reset on successful connection
    if (onConnectHandler) {
      onConnectHandler();
    }
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('[WebSocket] Message received:', data.type);
      if (onMessageHandler) {
        onMessageHandler(data);
      }
    } catch (error) {
      console.error('[WebSocket] Failed to parse message:', error);
    }
  };

  socket.onerror = (error) => {
    console.error('[WebSocket] Error:', error);
    if (onErrorHandler) {
      onErrorHandler(error);
    }
  };

  socket.onclose = (event) => {
    console.log('[WebSocket] Closed:', event.code, event.reason);
    
    // Attempt reconnection with exponential backoff
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = RECONNECT_DELAY_BASE * Math.pow(2, reconnectAttempts);
      console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
      
      reconnectTimeout = setTimeout(() => {
        reconnectAttempts++;
        connectWebSocket(onMessageHandler, onConnectHandler, onErrorHandler);
      }, delay);
    } else {
      console.error('[WebSocket] Max reconnection attempts reached');
    }
  };

  return socket;
}

/**
 * Close WebSocket connection
 */
export function closeWebSocket() {
  // DEMO MODE: Clear interval
  if (DEMO_MODE) {
    if (demoInterval) {
      clearInterval(demoInterval);
      demoInterval = null;
    }
    console.log('[WebSocket DEMO] Connection closed');
    return;
  }

  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  if (socket) {
    // Prevent auto-reconnect
    reconnectAttempts = MAX_RECONNECT_ATTEMPTS;
    socket.close();
    socket = null;
  }

  console.log('[WebSocket] Connection closed');
}

/**
 * Get current WebSocket connection state
 */
export function getWebSocketState() {
  if (DEMO_MODE) return 'open';
  if (!socket) return 'none';
  
  switch (socket.readyState) {
    case WebSocket.CONNECTING:
      return 'connecting';
    case WebSocket.OPEN:
      return 'open';
    case WebSocket.CLOSING:
      return 'closing';
    case WebSocket.CLOSED:
      return 'closed';
    default:
      return 'none';
  }
}

/**
 * Check if WebSocket is connected
 */
export function isWebSocketConnected() {
  if (DEMO_MODE) return true;
  return socket && socket.readyState === WebSocket.OPEN;
}

/**
 * Send message through WebSocket
 */
export function sendWebSocketMessage(data) {
  if (DEMO_MODE) {
    console.log('[WebSocket DEMO] Message sent:', data);
    return true;
  }
  
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(data));
    return true;
  }
  console.warn('[WebSocket] Cannot send message - not connected');
  return false;
}

export default {
  connectWebSocket,
  closeWebSocket,
  getWebSocketState,
  isWebSocketConnected,
  sendWebSocketMessage,
};
