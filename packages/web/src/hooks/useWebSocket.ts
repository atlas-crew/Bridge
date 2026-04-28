import { useEffect, useRef } from 'react';
import { useLabStore } from '@/store/useLabStore';
import type { ServerEvent } from '@bridge/shared';

const MIN_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

function resolveWsUrl(): string {
  if (typeof window === 'undefined') return 'ws://localhost:4200';
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const attempts = useRef(0);
  const dispatchEvent = useLabStore((s) => s.dispatchEvent);
  const setWsConnected = useLabStore((s) => s.setWsConnected);

  useEffect(() => {
    function connect() {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      const ws = new WebSocket(resolveWsUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        attempts.current = 0;

        // Subscribe to logs once services are loaded
        const subscribe = () => {
          const serviceIds = Array.from(useLabStore.getState().services.keys());
          if (serviceIds.length > 0) {
            ws.send(JSON.stringify({
              type: 'SUBSCRIBE_LOGS',
              payload: { serviceIds },
            }));
            return true;
          }
          return false;
        };

        if (!subscribe()) {
          const unsub = useLabStore.subscribe((state, prevState) => {
            if (state.services.size > 0 && prevState.services.size === 0) {
              if (subscribe()) unsub();
            }
          });
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg: ServerEvent = JSON.parse(event.data);
          dispatchEvent(msg);
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        wsRef.current = null;
        scheduleReconnect();
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    function scheduleReconnect() {
      const delay = Math.min(
        MIN_RECONNECT_DELAY * Math.pow(2, attempts.current),
        MAX_RECONNECT_DELAY,
      );
      attempts.current++;
      reconnectTimer.current = setTimeout(connect, delay);
    }

    // Listen for outbound commands from the store
    function handleSend(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(detail));
      }
    }

    window.addEventListener('ws:send', handleSend);
    connect();

    return () => {
      window.removeEventListener('ws:send', handleSend);
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [dispatchEvent, setWsConnected]);
}
