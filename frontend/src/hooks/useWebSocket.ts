import { useEffect, useRef, useCallback } from 'react';
import { useMemoryStore } from '../store/memoryStore';
import type { MemoryData } from '../api/client';

interface WSMessage {
  event: string;
  data: MemoryData | { id: string } | { memory_a: MemoryData; memory_b: MemoryData };
}

export function useWebSocket(userId: string = 'default') {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addMemory = useMemoryStore((state) => state.addMemory);
  const updateMemory = useMemoryStore((state) => state.updateMemory);
  const removeMemory = useMemoryStore((state) => state.removeMemory);

  const connect = useCallback(() => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);

    const isLocal = localStorage.getItem('memora-local-backend') === 'true';
    let wsUrl: string;

    if (isLocal) {
      wsUrl = `ws://127.0.0.1:8000/ws/memories?user_id=${encodeURIComponent(userId)}`;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      let wsHost = window.location.host;
      let apiUrl = (import.meta as any).env.VITE_API_URL;
      if (apiUrl && typeof apiUrl === 'string') {
        apiUrl = apiUrl.replace(/\/$/, '');
        if (apiUrl.startsWith('http')) {
          wsHost = apiUrl.replace(/^https?:\/\//, '');
        }
      }
      wsUrl = `${protocol}//${wsHost}/ws/memories?user_id=${encodeURIComponent(userId)}`;
    }

    console.log('[WebSocket] Connecting to:', wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => { console.log('WebSocket connected'); };

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

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      const delay = Math.min(1000 * Math.pow(2, 1), 30000);
      reconnectTimer.current = setTimeout(connect, delay);
    };
  }, [userId, addMemory, updateMemory, removeMemory]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);
}
