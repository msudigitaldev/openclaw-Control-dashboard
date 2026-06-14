"""
OpenClaw API Proxy - runs on user's server alongside OpenClaw.
Connects to OpenClaw gateway locally and exposes REST API for Mission Control Dashboard.
"""
import os
import json
import asyncio
import logging
import time
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import jwt

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("openclaw-proxy")

app = FastAPI(title="OpenClaw API Proxy")

# CORS - allow Mission Control Dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth
API_KEY = os.environ.get("OPENCLAW_API_KEY", "oc_v4ZJFQDnQgnSR9semIxRrRCmh_3EUwLp6GY7q9FCff4")
bearer = HTTPBearer(auto_error=False)


def verify_auth(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)):
    if creds and creds.credentials == API_KEY:
        return True
    raise HTTPException(status_code=401, detail="Invalid API key")


def run_openclaw_cmd(args: list) -> str:
    """Run openclaw CLI command and return output."""
    try:
        result = subprocess.run(
            ["openclaw"] + args,
            capture_output=True, text=True, timeout=15
        )
        return result.stdout + result.stderr
    except Exception as e:
        return str(e)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "openclaw-proxy"}


@app.get("/api/status")
async def get_status(_=Depends(verify_auth)):
    """Get OpenClaw status."""
    output = run_openclaw_cmd(["status"])
    return {
        "status": "running",
        "raw": output[:2000],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/sessions")
async def list_sessions(_=Depends(verify_auth)):
    """List OpenClaw sessions by reading the sessions file."""
    sessions_file = Path.home() / ".openclaw" / "agents" / "main" / "sessions" / "sessions.json"
    if not sessions_file.exists():
        # Try alternative path
        sessions_file = Path("/home/openclaw/.openclaw/agents/main/sessions/sessions.json")

    sessions = []
    if sessions_file.exists():
        try:
            with open(sessions_file) as f:
                data = json.load(f)
                if isinstance(data, list):
                    sessions = data
                elif isinstance(data, dict):
                    sessions = list(data.values()) if not isinstance(list(data.values())[0], str) else [data]
        except Exception as e:
            logger.error(f"Error reading sessions: {e}")

    # Parse sessions into agent format
    agents = []
    for i, s in enumerate(sessions):
        if isinstance(s, dict):
            key = s.get("key", f"session-{i}")
            agents.append({
                "id": key,
                "name": s.get("label", key.split(":")[-1] if ":" in key else key),
                "model": s.get("model", "unknown"),
                "kind": s.get("kind", "direct"),
                "status": "active",
                "current_task": "Active session",
                "tokens_used": 0,
                "cost": 0.0,
            })

    return agents


@app.get("/api/agents")
async def list_agents(_=Depends(verify_auth)):
    """List agents (alias for sessions)."""
    return await list_sessions(_)


@app.get("/api/metrics/summary")
async def metrics_summary(_=Depends(verify_auth)):
    """Get metrics summary."""
    return {
        "active_tasks": 0,
        "online_agents": 1,
        "total_agents": 1,
        "system_health": 100,
        "tokens_total": 0,
        "cost_total": 0.0,
        "tasks_completed": 0,
        "tasks_failed": 0,
        "avg_latency_ms": 50,
    }


@app.get("/api/metrics/tokens")
async def metrics_tokens(range: str = Query("week"), _=Depends(verify_auth)):
    return []


@app.get("/api/metrics/cost")
async def metrics_cost(range: str = Query("week"), _=Depends(verify_auth)):
    return []


@app.get("/api/metrics/latency")
async def metrics_latency(range: str = Query("week"), _=Depends(verify_auth)):
    return []


@app.get("/api/tasks")
async def list_tasks(_=Depends(verify_auth)):
    return []


@app.post("/api/bridge/test")
async def bridge_test(_=Depends(verify_auth)):
    """Test connection to OpenClaw."""
    start = time.monotonic()
    output = run_openclaw_cmd(["status"])
    elapsed = int((time.monotonic() - start) * 1000)

    is_running = "OpenClaw" in output and "error" not in output.lower()[:100]
    return {
        "connected": is_running,
        "latency_ms": elapsed,
        "gateway_url": "local",
        "version": "detected from CLI",
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 9090))
    uvicorn.run(app, host="0.0.0.0", port=port)
