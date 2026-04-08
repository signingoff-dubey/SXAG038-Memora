import json
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[WebSocket, str] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[websocket] = user_id

    def disconnect(self, websocket: WebSocket):
        self.active_connections.pop(websocket, None)

    async def broadcast_to_user(self, user_id: str, event: str, data: dict):
        message = json.dumps({"event": event, "data": data})
        dead = []
        for conn, conn_user_id in self.active_connections.items():
            if conn_user_id == user_id:
                try:
                    await conn.send_text(message)
                except Exception:
                    dead.append(conn)
        for conn in dead:
            self.active_connections.pop(conn, None)

    async def broadcast(self, event: str, data: dict):
        message = json.dumps({"event": event, "data": data})
        dead = []
        for conn in list(self.active_connections.keys()):
            try:
                await conn.send_text(message)
            except Exception:
                dead.append(conn)
        for conn in dead:
            self.active_connections.pop(conn, None)


manager = ConnectionManager()
