import { useState, useEffect, useRef, useCallback } from 'react';

export interface YgyWSMessage {
  type: 'analytics_update' | 'leaderboard_update' | 'achievement_unlocked' | 'pong' | string;
  payload?: unknown;
  timestamp?: string;
}

interface UseYgyWebSocketResult {
  lastMessage: YgyWSMessage | null;
  readyState: number; // WebSocket.CONNECTING | OPEN | CLOSING | CLOSED
  sendMessage: (data: object) => void;
}

const MIN_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;

function getWsBaseUrl(): string {
  const envUrl = (import.meta as unknown as { env: Record<string, string> }).env
    ?.VITE_WS_BASE_URL;
  if (envUrl) return envUrl;
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = window.location.hostname;
  return `${proto}://${host}:8001`;
}

export function useYgyWebSocket(userId: string | number | null): UseYgyWebSocketResult {
  const [lastMessage, setLastMessage] = useState<YgyWSMessage | null>(null);
  const [readyState, setReadyState] = useState<number>(WebSocket.CLOSED);

  const wsRef = useRef<WebSocket | null>(null);
  const backoffRef = useRef<number>(MIN_BACKOFF_MS);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  const connect = useCallback(() => {
    if (!userId || unmountedRef.current) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    const url = `${getWsBaseUrl()}/api/ws/${userId}`;
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      return;
    }

    wsRef.current = ws;
    setReadyState(WebSocket.CONNECTING);

    ws.onopen = () => {
      if (unmountedRef.current) { ws.close(); return; }
      backoffRef.current = MIN_BACKOFF_MS;
      setReadyState(WebSocket.OPEN);
      ws.send(JSON.stringify({ action: 'ping' }));
    };

    ws.onmessage = (event) => {
      try {
        const msg: YgyWSMessage = JSON.parse(event.data as string);
        setLastMessage(msg);
      } catch {
        // non-JSON frame — ignore
      }
    };

    ws.onclose = () => {
      if (unmountedRef.current) return;
      setReadyState(WebSocket.CLOSED);
      wsRef.current = null;
      // Exponential back-off reconnect
      const delay = backoffRef.current;
      backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS);
      reconnectTimer.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [userId]);

  useEffect(() => {
    unmountedRef.current = false;
    connect();
    return () => {
      unmountedRef.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on intentional close
        wsRef.current.close();
        wsRef.current = null;
      }
      setReadyState(WebSocket.CLOSED);
    };
  }, [connect]);

  const sendMessage = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { lastMessage, readyState, sendMessage };
}
