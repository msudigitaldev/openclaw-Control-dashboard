"""Mission Control backend API tests."""
import json
import os
import time

import pytest
import requests
import websocket  # websocket-client

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://agent-ops-29.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = "admin@mission.control"
ADMIN_PASSWORD = "password123"


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- Auth ----------
class TestAuth:
    def test_login_success(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "access_token" in data and isinstance(data["access_token"], str) and len(data["access_token"]) > 20
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == ADMIN_EMAIL

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_me_without_token(self):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code in (401, 403)

    def test_me_with_token(self, auth):
        r = requests.get(f"{API}/auth/me", headers=auth, timeout=15)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL


# ---------- Agents ----------
class TestAgents:
    def test_list_agents_unauth(self):
        r = requests.get(f"{API}/agents", timeout=15)
        assert r.status_code in (401, 403)

    def test_list_agents(self, auth):
        r = requests.get(f"{API}/agents", headers=auth, timeout=15)
        assert r.status_code == 200
        agents = r.json()
        assert isinstance(agents, list) and len(agents) >= 4
        ids = {a["id"] for a in agents}
        for needed in {"agent-main", "agent-research", "agent-writer", "agent-coder"}:
            assert needed in ids
        a0 = next(a for a in agents if a["id"] == "agent-main")
        for k in ("name", "model", "status", "current_task", "tokens_used", "cost", "color"):
            assert k in a0

    def test_agent_logs(self, auth):
        r = requests.get(f"{API}/agents/agent-main/logs", headers=auth, timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_agent_message(self, auth):
        r = requests.post(f"{API}/agents/agent-main/message", json={"content": "hello"}, headers=auth, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True

    def test_agent_kill_sets_idle(self, auth):
        # spawn a throwaway agent so we don't permanently mark agent-main idle
        spawn = requests.post(f"{API}/agents/spawn", json={"name": "TEST_kill", "model": "test-model"}, headers=auth, timeout=15)
        assert spawn.status_code == 200
        new_id = spawn.json()["id"]
        kill = requests.post(f"{API}/agents/{new_id}/kill", headers=auth, timeout=15)
        assert kill.status_code == 200
        assert kill.json().get("ok") is True
        # Verify status idle
        agents = requests.get(f"{API}/agents", headers=auth, timeout=15).json()
        target = next((a for a in agents if a["id"] == new_id), None)
        assert target is not None
        assert target["status"] == "idle"

    def test_agent_spawn(self, auth):
        r = requests.post(f"{API}/agents/spawn", json={"name": "TEST_Spawn", "model": "test-model"}, headers=auth, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["id"].startswith("agent-")
        assert data["name"] == "TEST_Spawn"


# ---------- Tasks ----------
class TestTasks:
    def test_list_tasks(self, auth):
        r = requests.get(f"{API}/tasks", headers=auth, timeout=15)
        assert r.status_code == 200
        tasks = r.json()
        assert isinstance(tasks, list) and len(tasks) >= 5
        statuses = {t["status"] for t in tasks}
        # at least covers multiple statuses
        assert statuses & {"queued", "in_progress", "completed", "failed"}

    def test_create_get_delete_task(self, auth):
        payload = {"title": "TEST_task_create", "agent_id": "agent-main", "priority": "high"}
        c = requests.post(f"{API}/tasks", json=payload, headers=auth, timeout=15)
        assert c.status_code == 200
        task = c.json()
        assert task["status"] == "queued"
        assert task["progress"] == 0
        assert task["title"] == payload["title"]
        assert "id" in task
        tid = task["id"]

        g = requests.get(f"{API}/tasks/{tid}", headers=auth, timeout=15)
        assert g.status_code == 200
        assert g.json()["title"] == payload["title"]

        d1 = requests.delete(f"{API}/tasks/{tid}", headers=auth, timeout=15)
        assert d1.status_code == 200
        assert d1.json().get("ok") is True
        d2 = requests.delete(f"{API}/tasks/{tid}", headers=auth, timeout=15)
        assert d2.status_code == 404


# ---------- Metrics ----------
class TestMetrics:
    def test_metrics_summary(self, auth):
        r = requests.get(f"{API}/metrics/summary", headers=auth, timeout=15)
        assert r.status_code == 200
        data = r.json()
        for k in ("active_tasks", "online_agents", "system_health", "tokens_total", "cost_total", "tasks_completed", "tasks_failed"):
            assert k in data

    def test_metrics_tokens_week(self, auth):
        r = requests.get(f"{API}/metrics/tokens", params={"range": "week"}, headers=auth, timeout=15)
        assert r.status_code == 200
        out = r.json()
        assert isinstance(out, list) and len(out) == 7
        assert "date" in out[0]
        # at least one agent token entry
        token_keys = [k for k in out[0].keys() if k != "date"]
        assert len(token_keys) >= 1

    def test_metrics_tokens_month(self, auth):
        r = requests.get(f"{API}/metrics/tokens", params={"range": "month"}, headers=auth, timeout=15)
        assert r.status_code == 200
        assert len(r.json()) == 30

    def test_metrics_cost(self, auth):
        r = requests.get(f"{API}/metrics/cost", params={"range": "week"}, headers=auth, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) >= 4
        for entry in data:
            assert "name" in entry and "value" in entry and "color" in entry

    def test_metrics_latency(self, auth):
        r = requests.get(f"{API}/metrics/latency", params={"range": "week"}, headers=auth, timeout=15)
        assert r.status_code == 200
        out = r.json()
        assert isinstance(out, list) and len(out) == 7
        for e in out:
            assert {"date", "p50", "p95", "p99"} <= set(e.keys())


# ---------- WebSocket ----------
class TestWebSocket:
    def test_ws_connect_and_snapshot(self):
        ws_url = BASE_URL.replace("https://", "wss://").replace("http://", "ws://") + "/api/ws"
        ws = websocket.create_connection(ws_url, timeout=15)
        try:
            ws.settimeout(10)
            msg = ws.recv()
            data = json.loads(msg)
            assert data.get("type") == "snapshot"
            assert "agents" in data and "tasks" in data
            # Try to receive a broadcast within ~6s
            seen_types = {data["type"]}
            end = time.time() + 8
            while time.time() < end and len(seen_types) < 2:
                try:
                    nxt = ws.recv()
                    seen_types.add(json.loads(nxt).get("type"))
                except Exception:
                    break
            # We expect at least one of the simulator broadcast types
            assert seen_types & {"agent.status", "task.progress", "log.entry", "metrics.update", "snapshot"}
        finally:
            ws.close()
