from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from services.broadcaster import manager

router = APIRouter()


@router.websocket("/ws/memories")
async def memory_websocket(
    websocket: WebSocket, user_id: str = Query(default="default")
):
    await manager.connect(websocket, user_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
