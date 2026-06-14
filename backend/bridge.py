"""Mission Control Bridge - connects to OpenClaw Proxy API."""
import os
import asyncio
import logging
import time
from typing import Optional
import httpx

logger = logging.getLogger("mission-control.bridge")


class OpenClawBridge:
    def __init__(self):
        self.gateway_url: Optional[str] = None
        self.api_key: Optional[str] = None
        self.connected: bool = False
        self.last_sync: Optional[float] = None
        self.latency_ms: int = 0
        self._client: Optional[httpx.AsyncClient] = None

    async def configure(self, gateway_url: str, api_key: str = ""):
        self.gateway_url = gateway_url.rstrip("/")
        self.api_key = api_key
        self.connected = False
        if self._client:
            await self._client.aclose()
        self._client = httpx.AsyncClient(timeout=15.0)
        await self.test_connection()

    async def test_connection(self) -> dict:
        if not self.gateway_url:
            return {"connected": False, "error": "No gateway URL configured"}
        try:
            start = time.monotonic()
            headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
            resp = await self._client.get(f"{self.gateway_url}/health", headers=headers)
            elapsed = int((time.monotonic() - start) * 1000)
            self.latency_ms = elapsed
            if resp.status_code == 200:
                self.connected = True
                self.last_sync = time.time()
                return {"connected": True, "latency_ms": elapsed, "gateway_url": self.gateway_url}
            else:
                self.connected = False
                return {"connected": False, "error": f"Status {resp.status_code}"}
        except Exception as e:
            self.connected = False
            return {"connected": False, "error": str(e)}

    async def _get(self, path: str) -> Optional[dict]:
        if not self._client or not self.gateway_url:
            return None
        try:
            headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
            resp = await self._client.get(f"{self.gateway_url}{path}", headers=headers)
            if resp.status_code == 200:
                return resp.json()
            return None
        except:
            return None

    async def _post(self, path: str, data: dict = None) -> Optional[dict]:
        if not self._client or not self.gateway_url:
            return None
        try:
            headers = {"Content-Type": "application/json"}
            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"
            resp = await self._client.post(f"{self.gateway_url}{path}", json=data, headers=headers)
            if resp.status_code in (200, 201):
                return resp.json()
            return None
        except:
            return None

    async def get_sessions(self) -> list:
        data = await self._get("/api/sessions")
        return data if isinstance(data, list) else []

    async def get_status(self) -> dict:
        return await self._get("/api/status") or {"status": "unknown"}

    async def send_message(self, session_key: str, message: str) -> dict:
        return await self._post(f"/api/sessions/{session_key}/message", {"content": message}) or {"error": "Failed"}

    def get_connection_info(self) -> dict:
        return {
            "connected": self.connected,
            "gateway_url": self.gateway_url,
            "latency_ms": self.latency_ms,
            "last_sync": self.last_sync,
            "has_api_key": bool(self.api_key),
        }


bridge = OpenClawBridge()
