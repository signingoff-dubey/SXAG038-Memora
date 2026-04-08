from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from services.broadcaster import manager

router = APIRouter()


@router.websocket("/ws/memories")
async def memory_websocket(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
