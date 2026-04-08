import { useEffect, useRef } from 'react';
import { useMemoryStore } from '../store/memoryStore';
import type { MemoryData } from '../api/client';

interface WSMessage {
  event: string;
  data: MemoryData | { id: string } | { memory_a: MemoryData; memory_b: MemoryData };
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<number>();
  const { addMemory, updateMemory, removeMemory } = useMemoryStore();

  useEffect(() => {
    let attempt = 0;

    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws/memories`);
      wsRef.current = ws;

      ws.onopen = () => {
        attempt = 0;
      };

      ws.onmessage = (event) => {
        const msg: WSMessage = JSON.parse(event.data);
        switch (msg.event) {
          case 'memory_created':
            addMemory(msg.data as MemoryData);
            break;
          case 'memory_updated':
            updateMemory(msg.data as MemoryData);
            break;
          case 'memory_deleted':
            removeMemory((msg.data as { id: string }).id);
            break;
          case 'contradiction_detected': {
            const cd = msg.data as { memory_a: MemoryData; memory_b: MemoryData };
            updateMemory(cd.memory_a);
            updateMemory(cd.memory_b);
            break;
          }
        }
      };

      ws.onclose = () => {
        attempt++;
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
        reconnectTimer.current = window.setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      wsRef.current?.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [addMemory, updateMemory, removeMemory]);
}
