"""
A.R.C SENTINEL - WebSocket Connection Manager
==============================================
Manages real-time WebSocket connections for live event streaming
"""

from fastapi import WebSocket
from typing import List, Dict, Any
from datetime import datetime
import asyncio


class ConnectionManager:
    """Manages WebSocket connections for real-time updates"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self._lock = asyncio.Lock()
    
    async def connect(self, websocket: WebSocket):
        """Accept and register a new WebSocket connection"""
        await websocket.accept()
        async with self._lock:
            self.active_connections.append(websocket)
        print(f"[WS] New connection. Total: {len(self.active_connections)}")
    
    async def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection"""
        async with self._lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)
        print(f"[WS] Connection closed. Total: {len(self.active_connections)}")
    
    async def broadcast(self, message: Dict[str, Any], message_type: str = None):
        """
        Broadcast a structured message to all connected clients.
        
        Args:
            message: dict payload (can include 'type' and 'data' keys, or be wrapped)
            message_type: Optional override - "NEW_EVENT" | "NEW_INCIDENT" | "INCIDENT_RESOLVED"
        
        Payload format sent to clients:
        {
            "type": "NEW_EVENT" | "NEW_INCIDENT" | "INCIDENT_RESOLVED",
            "event": "NEW_EVENT" (uppercase alias),
            "data": {...},
            "timestamp": "ISO timestamp"
        }
        """
        if not self.active_connections:
            return
        
        # Build structured payload
        if message_type:
            # Wrap with explicit type
            payload = {
                "type": message_type.lower().replace("_", "_"),  # e.g., "new_event"
                "event": message_type.upper(),  # e.g., "NEW_EVENT"
                "data": message,
                "timestamp": datetime.utcnow().isoformat()
            }
        elif "type" in message and "data" in message:
            # Already structured, add timestamp and uppercase event
            payload = {
                **message,
                "event": message.get("type", "unknown").upper().replace("-", "_"),
                "timestamp": datetime.utcnow().isoformat()
            }
        else:
            # Raw message, wrap as NEW_EVENT
            payload = {
                "type": "new_event",
                "event": "NEW_EVENT",
                "data": message,
                "timestamp": datetime.utcnow().isoformat()
            }
        
        dead = []
        async with self._lock:
            for connection in list(self.active_connections):
                try:
                    await connection.send_json(payload)
                except Exception as e:
                    print(f"[WS] Error sending message: {e}")
                    dead.append(connection)
            
            # Clean up disconnected clients
            for conn in dead:
                try:
                    await conn.close()
                except Exception:
                    pass
                if conn in self.active_connections:
                    self.active_connections.remove(conn)
    
    async def send_personal(self, websocket: WebSocket, message: Dict[str, Any]):
        """Send a message to a specific client"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            print(f"[WS] Error sending personal message: {e}")
    
    @property
    def connection_count(self) -> int:
        """Get the number of active connections"""
        return len(self.active_connections)


# Global WebSocket manager instance
ws_manager = ConnectionManager()
