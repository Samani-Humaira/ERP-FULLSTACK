from collections import defaultdict
from fastapi import WebSocket


class ConnectionManager:

    def __init__(self):
        self.active_connections = defaultdict(list)

    async def connect(
        self,
        project_id: str,
        websocket: WebSocket
    ):
        await websocket.accept()

        self.active_connections[project_id].append(
            websocket
        )

    def disconnect(
        self,
        project_id: str,
        websocket: WebSocket
    ):
        if websocket in self.active_connections[project_id]:
            self.active_connections[project_id].remove(
                websocket
            )

    async def broadcast(
        self,
        project_id: str,
        message: dict
    ):
        dead_connections = []

        for websocket in self.active_connections[project_id]:

            try:
                await websocket.send_json(message)

            except Exception:
                dead_connections.append(websocket)

        for websocket in dead_connections:
            self.disconnect(
                project_id,
                websocket
            )


manager = ConnectionManager()