"""
Ygy WebSocket server — real-time game events, leaderboard updates,
and achievement notifications via Redis pub/sub.
Runs on port 8001 (separate from the main FastAPI API on 8000).
"""
import asyncio
import json
import logging
import os
from typing import Dict

import redis.asyncio as redis
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ygy.ws")

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
WS_PORT = int(os.getenv("WS_PORT", "8001"))
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:80").split(",")

app = FastAPI(title="Ygy WebSocket Server", docs_url=None, redoc_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConnectionManager:
    def __init__(self) -> None:
        # user_id -> WebSocket
        self.active: Dict[int, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: int) -> None:
        await websocket.accept()
        self.active[user_id] = websocket
        logger.info("User %d connected (total=%d)", user_id, len(self.active))

    def disconnect(self, user_id: int) -> None:
        self.active.pop(user_id, None)
        logger.info("User %d disconnected (total=%d)", user_id, len(self.active))

    async def send(self, user_id: int, payload: dict) -> None:
        ws = self.active.get(user_id)
        if ws:
            try:
                await ws.send_json(payload)
            except Exception as exc:
                logger.warning("Send to %d failed: %s", user_id, exc)
                self.disconnect(user_id)

    async def broadcast(self, payload: dict) -> None:
        dead: list[int] = []
        for uid, ws in list(self.active.items()):
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(uid)
        for uid in dead:
            self.disconnect(uid)


manager = ConnectionManager()

# Redis clients — one for normal operations, one dedicated to pub/sub
_redis_client: redis.Redis | None = None
_pubsub_task: asyncio.Task | None = None


async def get_redis() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    return _redis_client


async def pubsub_listener() -> None:
    """Subscribe to ygy:events channel and forward messages to connected clients."""
    r = await get_redis()
    pubsub = r.pubsub()
    await pubsub.subscribe("ygy:events")
    logger.info("Subscribed to ygy:events")
    async for message in pubsub.listen():
        if message["type"] != "message":
            continue
        try:
            data = json.loads(message["data"])
            target_user = data.get("user_id")
            if target_user is not None:
                await manager.send(int(target_user), data)
            else:
                # broadcast to all (e.g. global leaderboard update)
                await manager.broadcast(data)
        except (json.JSONDecodeError, ValueError) as exc:
            logger.warning("Bad pubsub message: %s — %s", message["data"], exc)


@app.on_event("startup")
async def startup() -> None:
    global _pubsub_task
    _pubsub_task = asyncio.create_task(pubsub_listener())


@app.on_event("shutdown")
async def shutdown() -> None:
    global _pubsub_task, _redis_client
    if _pubsub_task:
        _pubsub_task.cancel()
    if _redis_client:
        await _redis_client.aclose()


@app.get("/health")
async def health() -> dict:
    r = await get_redis()
    try:
        await r.ping()
        redis_ok = True
    except Exception:
        redis_ok = False
    return {
        "status": "healthy" if redis_ok else "degraded",
        "redis": redis_ok,
        "connections": len(manager.active),
    }


@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int) -> None:
    await manager.connect(websocket, user_id)
    r = await get_redis()
    # Mark user as online
    await r.setex(f"online:{user_id}", 120, "1")
    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")

            if action == "ping":
                await manager.send(user_id, {"type": "pong", "user_id": user_id})

            elif action == "game_start":
                game_type = data.get("game_type", "unknown")
                await r.publish(
                    "ygy:events",
                    json.dumps({"type": "game_started", "user_id": user_id, "game_type": game_type}),
                )

            elif action == "score_update":
                score = data.get("score", 0)
                game_type = data.get("game_type", "unknown")
                # Update live leaderboard in Redis sorted set
                await r.zadd(f"leaderboard:{game_type}", {str(user_id): score})
                # Broadcast to all connected users
                await r.publish(
                    "ygy:events",
                    json.dumps({"type": "leaderboard_update", "game_type": game_type, "user_id": user_id, "score": score}),
                )

            elif action == "get_leaderboard":
                game_type = data.get("game_type", "memory_matrix")
                top = await r.zrevrange(f"leaderboard:{game_type}", 0, 9, withscores=True)
                await manager.send(user_id, {
                    "type": "leaderboard",
                    "game_type": game_type,
                    "entries": [{"user_id": uid, "score": int(score)} for uid, score in top],
                })

            # Refresh online TTL on any message
            await r.setex(f"online:{user_id}", 120, "1")

    except WebSocketDisconnect:
        manager.disconnect(user_id)
        await r.delete(f"online:{user_id}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("websocket_server:app", host="0.0.0.0", port=WS_PORT, log_level="info")
