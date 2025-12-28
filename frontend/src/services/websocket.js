/**
 * A.R.C SENTINEL - WebSocket Service
 * ===================================
 * Real-time WebSocket connection for live alerts
 */

const WS_URL = process.env.REACT_APP_WS_URL || 
  (process.env.REACT_APP_API_URL || 'http://localhost:8000')
    .replace('https://', 'wss://')
    .replace('http://', 'ws://');

let socket = null;
let reconnectTimeout = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY_BASE = 1000; // Base delay in ms

/**
 * Connect to WebSocket server
 * @param {Function} onMessageHandler - Callback for incoming messages
 * @param {Function} onConnectHandler - Callback when connected
 * @param {Function} onErrorHandler - Callback for errors
 * @returns {WebSocket}
 */
export function connectWebSocket(onMessageHandler, onConnectHandler = null, onErrorHandler = null) {
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
 * @returns {'connecting' | 'open' | 'closing' | 'closed' | 'none'}
 */
export function getWebSocketState() {
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
 * @returns {boolean}
 */
export function isWebSocketConnected() {
  return socket && socket.readyState === WebSocket.OPEN;
}

/**
 * Send message through WebSocket
 * @param {object} data - Data to send
 * @returns {boolean} - Whether message was sent
 */
export function sendWebSocketMessage(data) {
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
