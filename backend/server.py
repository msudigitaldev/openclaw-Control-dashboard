"""Mission Control Dashboard - FastAPI backend with WebSocket simulator."""
import os
import json
import asyncio
import random
import uuid
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, WebSocket, WebSocketDisconnect, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel, Field

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

SECRET_KEY = os.environ.get("JWT_SECRET", "mission-control-dev-secret-change-me")
JWT_ALG = "HS256"
TOKEN_TTL_HOURS = 24

ADMIN_EMAIL = "admin@mission.control"
ADMIN_PASSWORD = "password123"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("mission-control")

app = FastAPI(title="Mission Control API")
api = APIRouter(prefix="/api")
bearer = HTTPBearer(auto_error=False)


# ------------------- Auth -------------------
class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


def create_token(sub: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": sub, "iat": now, "exp": now + timedelta(hours=TOKEN_TTL_HOURS)}
    return jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALG)


def auth_required(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)):
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, SECRET_KEY, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    if payload.get("sub") != ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Forbidden")
    return {"email": payload["sub"]}


@api.post("/auth/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    if body.email != ADMIN_EMAIL or body.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(ADMIN_EMAIL)
    return TokenResponse(
        access_token=token,
        user={"email": ADMIN_EMAIL, "name": "Mission Commander", "role": "admin"},
    )


@api.get("/auth/me")
async def me(user=Depends(auth_required)):
    return {"email": user["email"], "name": "Mission Commander", "role": "admin"}


# ------------------- Simulated State -------------------
STATUSES = ["active", "idle", "thinking", "error"]
PRIORITIES = ["low", "medium", "high"]
TASK_STATUSES = ["queued", "in_progress", "completed", "failed"]

AGENTS = [
    {
        "id": "agent-main",
        "name": "Agent-Main",
        "model": "xiaomi/mimo-v2-pro",
        "status": "active",
        "current_task": "Orchestrating sub-agents",
        "tokens_used": 184230,
        "cost": 4.82,
        "uptime_seconds": 14523,
        "success_rate": 98.4,
        "avg_latency_ms": 412,
        "color": "#3b82f6",
    },
    {
        "id": "agent-research",
        "name": "Agent-Research",
        "model": "gpt-4o",
        "status": "thinking",
        "current_task": "Scraping arxiv for transformer papers",
        "tokens_used": 92840,
        "cost": 2.31,
        "uptime_seconds": 8221,
        "success_rate": 96.1,
        "avg_latency_ms": 680,
        "color": "#10b981",
    },
    {
        "id": "agent-writer",
        "name": "Agent-Writer",
        "model": "claude-3.5-sonnet",
        "status": "active",
        "current_task": "Drafting technical brief #4421",
        "tokens_used": 56120,
        "cost": 1.68,
        "uptime_seconds": 6420,
        "success_rate": 99.2,
        "avg_latency_ms": 522,
        "color": "#f59e0b",
    },
    {
        "id": "agent-coder",
        "name": "Agent-Coder",
        "model": "deepseek-coder",
        "status": "idle",
        "current_task": "Awaiting dispatch",
        "tokens_used": 134902,
        "cost": 0.92,
        "uptime_seconds": 12030,
        "success_rate": 94.7,
        "avg_latency_ms": 318,
        "color": "#ef4444",
    },
]

TASKS = [
    {"id": str(uuid.uuid4()), "title": "Summarise Q4 earnings call", "agent_id": "agent-research", "status": "in_progress", "priority": "high", "progress": 64, "created_at": datetime.now(timezone.utc).isoformat(), "log": []},
    {"id": str(uuid.uuid4()), "title": "Generate landing page copy", "agent_id": "agent-writer", "status": "in_progress", "priority": "medium", "progress": 41, "created_at": datetime.now(timezone.utc).isoformat(), "log": []},
    {"id": str(uuid.uuid4()), "title": "Refactor websocket handler", "agent_id": "agent-coder", "status": "queued", "priority": "medium", "progress": 0, "created_at": datetime.now(timezone.utc).isoformat(), "log": []},
    {"id": str(uuid.uuid4()), "title": "Audit dependency tree", "agent_id": "agent-coder", "status": "queued", "priority": "low", "progress": 0, "created_at": datetime.now(timezone.utc).isoformat(), "log": []},
    {"id": str(uuid.uuid4()), "title": "Deploy v2.1 to staging", "agent_id": "agent-main", "status": "completed", "priority": "high", "progress": 100, "created_at": datetime.now(timezone.utc).isoformat(), "log": []},
    {"id": str(uuid.uuid4()), "title": "Crawl competitor pricing", "agent_id": "agent-research", "status": "completed", "priority": "medium", "progress": 100, "created_at": datetime.now(timezone.utc).isoformat(), "log": []},
    {"id": str(uuid.uuid4()), "title": "Mailbox triage script", "agent_id": "agent-coder", "status": "failed", "priority": "low", "progress": 27, "created_at": datetime.now(timezone.utc).isoformat(), "log": []},
]

LOG_BUFFER = []  # list of recent log entries
MAX_LOG = 300

LOG_TEMPLATES = [
    "INIT  > spawning context window",
    "INFO  > token stream open",
    "DEBUG > tool_call: web_search(\"{q}\")",
    "DEBUG > tool_call: code_exec(...)",
    "INFO  > received {n} tokens",
    "WARN  > rate limit approaching ({p}%)",
    "INFO  > task checkpoint saved",
    "DEBUG > planning step {s}/{t}",
    "INFO  > sub-agent dispatched -> {a}",
    "ERROR > network blip, retrying in {r}s",
    "INFO  > response cached",
    "DEBUG > evaluating intent confidence={c}",
]


def make_log_entry(agent_id: str | None = None) -> dict:
    if agent_id is None:
        agent_id = random.choice(AGENTS)["id"]
    tmpl = random.choice(LOG_TEMPLATES)
    msg = tmpl.format(
        q=random.choice(["transformer scaling", "vector db comparison", "react virtual dom"]),
        n=random.randint(8, 240),
        p=random.randint(55, 92),
        s=random.randint(1, 5),
        t=random.randint(5, 8),
        a=random.choice([a["name"] for a in AGENTS]),
        r=random.randint(1, 4),
        c=round(random.uniform(0.55, 0.99), 2),
    )
    return {
        "id": str(uuid.uuid4()),
        "agent_id": agent_id,
        "message": msg,
        "level": "INFO" if "INFO" in msg else ("WARN" if "WARN" in msg else ("ERROR" if "ERROR" in msg else "DEBUG")),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ------------------- Endpoints -------------------
@api.get("/agents")
async def list_agents(_=Depends(auth_required)):
    return AGENTS


@api.get("/agents/{agent_id}")
async def get_agent(agent_id: str, _=Depends(auth_required)):
    for a in AGENTS:
        if a["id"] == agent_id:
            return a
    raise HTTPException(404, "Agent not found")


@api.get("/agents/{agent_id}/logs")
async def agent_logs(agent_id: str, _=Depends(auth_required)):
    return [l for l in LOG_BUFFER if l["agent_id"] == agent_id][-80:]


class MessageBody(BaseModel):
    content: str


@api.post("/agents/{agent_id}/message")
async def send_message(agent_id: str, body: MessageBody, _=Depends(auth_required)):
    agent = next((a for a in AGENTS if a["id"] == agent_id), None)
    if not agent:
        raise HTTPException(404, "Agent not found")
    entry = {
        "id": str(uuid.uuid4()),
        "agent_id": agent_id,
        "level": "INFO",
        "message": f"COMMANDER > {body.content}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    LOG_BUFFER.append(entry)
    return {"ok": True, "agent_id": agent_id, "delivered_at": entry["timestamp"]}


@api.post("/agents/{agent_id}/kill")
async def kill_agent(agent_id: str, _=Depends(auth_required)):
    agent = next((a for a in AGENTS if a["id"] == agent_id), None)
    if not agent:
        raise HTTPException(404, "Agent not found")
    agent["status"] = "idle"
    agent["current_task"] = "Terminated by commander"
    LOG_BUFFER.append({
        "id": str(uuid.uuid4()),
        "agent_id": agent_id,
        "level": "ERROR",
        "message": f"KILL  > agent terminated",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True}


class SpawnBody(BaseModel):
    name: str
    model: str


@api.post("/agents/spawn")
async def spawn_agent(body: SpawnBody, _=Depends(auth_required)):
    new = {
        "id": f"agent-{uuid.uuid4().hex[:6]}",
        "name": body.name,
        "model": body.model,
        "status": "active",
        "current_task": "Initialising context",
        "tokens_used": 0,
        "cost": 0.0,
        "uptime_seconds": 0,
        "success_rate": 100.0,
        "avg_latency_ms": 0,
        "color": random.choice(["#3b82f6", "#10b981", "#f59e0b", "#a855f7"]),
    }
    AGENTS.append(new)
    return new


@api.get("/tasks")
async def list_tasks(_=Depends(auth_required)):
    return TASKS


class TaskCreate(BaseModel):
    title: str
    agent_id: str
    priority: str = "medium"


@api.post("/tasks")
async def create_task(body: TaskCreate, _=Depends(auth_required)):
    task = {
        "id": str(uuid.uuid4()),
        "title": body.title,
        "agent_id": body.agent_id,
        "status": "queued",
        "priority": body.priority,
        "progress": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "log": [],
    }
    TASKS.append(task)
    return task


@api.delete("/tasks/{task_id}")
async def delete_task(task_id: str, _=Depends(auth_required)):
    global TASKS
    before = len(TASKS)
    TASKS = [t for t in TASKS if t["id"] != task_id]
    if len(TASKS) == before:
        raise HTTPException(404, "Task not found")
    return {"ok": True}


@api.get("/tasks/{task_id}")
async def get_task(task_id: str, _=Depends(auth_required)):
    task = next((t for t in TASKS if t["id"] == task_id), None)
    if not task:
        raise HTTPException(404, "Task not found")
    return task


@api.get("/metrics/summary")
async def metrics_summary(_=Depends(auth_required)):
    active = sum(1 for a in AGENTS if a["status"] in ("active", "thinking"))
    active_tasks = sum(1 for t in TASKS if t["status"] == "in_progress")
    completed = sum(1 for t in TASKS if t["status"] == "completed")
    failed = sum(1 for t in TASKS if t["status"] == "failed")
    total_tokens = sum(a["tokens_used"] for a in AGENTS)
    total_cost = round(sum(a["cost"] for a in AGENTS), 2)
    health = 100 - failed * 6 - (0 if active else 20)
    return {
        "active_tasks": active_tasks,
        "online_agents": active,
        "total_agents": len(AGENTS),
        "system_health": max(0, min(100, health)),
        "tokens_total": total_tokens,
        "cost_total": total_cost,
        "tasks_completed": completed,
        "tasks_failed": failed,
        "avg_latency_ms": round(sum(a["avg_latency_ms"] for a in AGENTS) / max(1, len(AGENTS))),
    }


@api.get("/metrics/tokens")
async def metrics_tokens(range_: str = Query("week", alias="range"), _=Depends(auth_required)):
    days = 7 if range_ == "week" else 30
    out = []
    base = datetime.now(timezone.utc).date()
    for i in range(days):
        d = base - timedelta(days=days - 1 - i)
        entry = {"date": d.isoformat()}
        for a in AGENTS[:4]:
            entry[a["name"]] = random.randint(8000, 60000)
        out.append(entry)
    return out


@api.get("/metrics/cost")
async def metrics_cost(range_: str = Query("week", alias="range"), _=Depends(auth_required)):
    return [
        {"name": a["name"], "value": round(a["cost"] + random.uniform(0, 0.5), 2), "color": a["color"]}
        for a in AGENTS
    ]


@api.get("/metrics/latency")
async def metrics_latency(range_: str = Query("week", alias="range"), _=Depends(auth_required)):
    days = 7 if range_ == "week" else 30
    out = []
    base = datetime.now(timezone.utc).date()
    for i in range(days):
        d = base - timedelta(days=days - 1 - i)
        out.append({
            "date": d.isoformat(),
            "p50": random.randint(200, 500),
            "p95": random.randint(500, 1200),
            "p99": random.randint(900, 1800),
        })
    return out


@api.get("/")
async def root():
    return {"service": "mission-control", "status": "online"}


# ------------------- WebSocket simulator -------------------
class WSManager:
    def __init__(self):
        self.connections: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.connections.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.connections:
            self.connections.remove(ws)

    async def broadcast(self, message: dict):
        dead = []
        text = json.dumps(message)
        for ws in self.connections:
            try:
                await ws.send_text(text)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = WSManager()


async def simulator_loop():
    """Tick simulated state and broadcast updates every 2-3s."""
    while True:
        await asyncio.sleep(random.uniform(2.0, 3.0))

        # Tick agents
        for a in AGENTS:
            if a["status"] == "idle" and random.random() < 0.15:
                a["status"] = random.choice(["active", "thinking"])
                a["current_task"] = random.choice([
                    "Parsing user intent",
                    "Running embedding search",
                    "Generating output stream",
                    "Calling tool: code_exec",
                ])
            elif a["status"] != "idle":
                a["tokens_used"] += random.randint(80, 1200)
                a["cost"] = round(a["cost"] + random.uniform(0.001, 0.04), 4)
                a["uptime_seconds"] += int(random.uniform(2, 3))
                a["avg_latency_ms"] = max(120, a["avg_latency_ms"] + random.randint(-30, 30))
                if random.random() < 0.05:
                    a["status"] = random.choice(["active", "thinking", "idle"])

        # Tick tasks
        for t in TASKS:
            if t["status"] == "in_progress":
                t["progress"] = min(100, t["progress"] + random.randint(2, 9))
                if t["progress"] >= 100:
                    t["status"] = "completed" if random.random() > 0.08 else "failed"
            elif t["status"] == "queued" and random.random() < 0.18:
                t["status"] = "in_progress"
                t["progress"] = max(t["progress"], 5)

        # Log entries
        new_logs = [make_log_entry() for _ in range(random.randint(1, 3))]
        LOG_BUFFER.extend(new_logs)
        if len(LOG_BUFFER) > MAX_LOG:
            del LOG_BUFFER[: len(LOG_BUFFER) - MAX_LOG]

        # Broadcast
        await manager.broadcast({
            "type": "agent.status",
            "agents": AGENTS,
        })
        await manager.broadcast({
            "type": "task.progress",
            "tasks": TASKS,
        })
        for entry in new_logs:
            await manager.broadcast({"type": "log.entry", "log": entry})

        # Metrics tick
        await manager.broadcast({
            "type": "metrics.update",
            "metrics": {
                "active_tasks": sum(1 for t in TASKS if t["status"] == "in_progress"),
                "online_agents": sum(1 for a in AGENTS if a["status"] in ("active", "thinking")),
                "tokens_total": sum(a["tokens_used"] for a in AGENTS),
                "cost_total": round(sum(a["cost"] for a in AGENTS), 2),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        })


@app.websocket("/api/ws")
async def ws_endpoint(websocket: WebSocket):
    """WebSocket endpoint (no auth on handshake to keep simple; could verify token in query)."""
    await manager.connect(websocket)
    try:
        # Send initial snapshot
        await websocket.send_text(json.dumps({"type": "snapshot", "agents": AGENTS, "tasks": TASKS}))
        while True:
            # Keep connection alive; accept pings/messages
            msg = await websocket.receive_text()
            try:
                data = json.loads(msg)
                if data.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)


# ------------------- App wiring -------------------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    asyncio.create_task(simulator_loop())
    logger.info("Mission Control simulator started")
