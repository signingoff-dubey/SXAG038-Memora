import { useState } from 'react';
import { chatApi } from '../api/client';
import { useMemoryStore } from '../store/memoryStore';

export function useChat() {
  const [loading, setLoading] = useState(false);
  const { addChatMessage, sessionId, setSessionId } = useMemoryStore();

  const sendMessage = async (message: string) => {
    if (!message.trim() || loading) return;

    addChatMessage({ role: 'user', content: message });
    setLoading(true);

    try {
      const { data } = await chatApi.send({
        message,
        session_id: sessionId ?? undefined,
      });

      if (!sessionId) setSessionId(data.session_id);

      addChatMessage({
        role: 'assistant',
        content: data.response,
        memoriesUsed: data.memories_used,
      });
    } catch (err) {
      addChatMessage({
        role: 'assistant',
        content: 'Error: Could not reach the server. Is the backend running?',
      });
    } finally {
      setLoading(false);
    }
  };

  return { sendMessage, loading };
}
