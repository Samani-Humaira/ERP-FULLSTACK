import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set, Any
from app.auth.jwt_handler import decode_access_token

logger = logging.getLogger(__name__)

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        # project_id -> set of websockets
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # project_id -> user presence map user_id -> info
        self.presence: Dict[str, Dict[str, Any]] = {}
        # websocket -> (project_id, user_id)
        self.ws_user: Dict[WebSocket, tuple[str, str]] = {}

    async def connect(self, project_id: str, websocket: WebSocket):
        await websocket.accept()
        conns = self.active_connections.setdefault(project_id, set())
        conns.add(websocket)

    def disconnect(self, project_id: str, websocket: WebSocket):
        conns = self.active_connections.get(project_id)
        if conns and websocket in conns:
            conns.remove(websocket)
        if websocket in self.ws_user:
            try:
                del self.ws_user[websocket]
            except KeyError:
                pass

    async def broadcast(self, project_id: str, message: dict, exclude_ws: WebSocket | None = None):
        conns = self.active_connections.get(project_id, set()).copy()
        data = json.dumps(message)
        for conn in conns:
            if exclude_ws is not None and conn == exclude_ws:
                continue
            try:
                await conn.send_text(data)
            except Exception:
                logger.exception("Failed to send ws message")


manager = ConnectionManager()


@router.websocket("/ws/projects/{project_id}/edit")
async def project_edit_ws(websocket: WebSocket, project_id: str):
    # Expect initial join message with user_id and full_name
    await manager.connect(project_id, websocket)
    # validate token passed as query param
    token = websocket.query_params.get('token')
    user_payload = None
    if token:
        user_payload = decode_access_token(token)
    # NOTE: allow connections without a valid token for development/testing.
    # In that case the client must send a 'join' message with user_id/full_name.
    user_id = None
    try:
        while True:
            text = await websocket.receive_text()
            try:
                payload = json.loads(text)
            except Exception:
                continue

            typ = payload.get("type")
            if typ == "join":
                # prefer token-provided identity when available, otherwise use client-provided
                user_id = (user_payload.get('sub') if user_payload else None) or payload.get("user_id")
                full_name = (user_payload.get('full_name') if user_payload else None) or payload.get("full_name")
                # register presence
                pres = manager.presence.setdefault(project_id, {})
                pres[user_id] = {"user_id": user_id, "full_name": full_name, "active_section": payload.get("active_section")}
                manager.ws_user[websocket] = (project_id, user_id)
                await manager.broadcast(project_id, {"type": "presence", "presence": list(pres.values())})

            elif typ == "leave":
                user_id = payload.get("user_id")
                pres = manager.presence.get(project_id, {})
                if user_id in pres:
                    del pres[user_id]
                await manager.broadcast(project_id, {"type": "presence", "presence": list(pres.values())})


            elif typ == "delta":
                # broadcast editor delta to all participants except sender to avoid echo
                pl = payload.get("payload") or {}
                await manager.broadcast(project_id, {"type": "delta", "payload": pl}, exclude_ws=websocket)

            elif typ == 'y-update':
                # relay Yjs updates (base64 string) to all other clients
                update_b64 = payload.get('update')
                await manager.broadcast(project_id, {"type": "y-update", "update": update_b64}, exclude_ws=websocket)

            elif typ == 'comment_created':
                pl = payload.get('payload')
                # broadcast comment created to others
                await manager.broadcast(project_id, {"type": "comment_created", "payload": pl}, exclude_ws=websocket)

            elif typ == 'member_added':
                pl = payload.get('payload')
                await manager.broadcast(project_id, {"type": "member_added", "payload": pl}, exclude_ws=websocket)

            elif typ == "cursor":
                # presence update for active section / cursor
                user_id = payload.get("user_id")
                pres = manager.presence.setdefault(project_id, {})
                info = pres.get(user_id, {})
                info.update({"active_section": payload.get("active_section"), "cursor": payload.get("cursor")})
                pres[user_id] = info
                await manager.broadcast(project_id, {"type": "presence", "presence": list(pres.values())})

            else:
                # unknown message types are rebroadcast raw
                await manager.broadcast(project_id, {"type": "message", "raw": payload})

    except WebSocketDisconnect:
        manager.disconnect(project_id, websocket)
        # remove presence entry if we had a user_id
        if user_id:
            pres = manager.presence.get(project_id, {})
            if user_id in pres:
                del pres[user_id]
            await manager.broadcast(project_id, {"type": "presence", "presence": list(pres.values())})
