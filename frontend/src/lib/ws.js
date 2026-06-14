import { useEffect, useRef, useState, useCallback } from "react";
import { BACKEND_URL } from "@/lib/api";

/**
 * useMissionWebSocket
 * Connects to /api/ws, auto-reconnects, and surfaces parsed events.
 */
export default function useMissionWebSocket(onEvent) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    // If no BACKEND_URL (production), use current origin
    let url;
    if (BACKEND_URL) {
      url = BACKEND_URL.replace(/^http/, "ws") + "/api/ws";
    } else {
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      url = proto + "//" + window.location.host + "/api/ws";
    }
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;
      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        setTimeout(connect, 2500);
      };
      ws.onerror = () => {
        try { ws.close(); } catch (_) {}
      };
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (onEventRef.current) onEventRef.current(data);
        } catch (_) {}
      };
    } catch (_) {
      setTimeout(connect, 2500);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      try { wsRef.current && wsRef.current.close(); } catch (_) {}
    };
  }, [connect]);

  return { connected };
}
