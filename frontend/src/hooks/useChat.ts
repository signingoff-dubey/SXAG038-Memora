import { chatApi } from '../api/client';
import { useMemoryStore } from '../store/memoryStore';
import { useState } from 'react';

export function useChat() {
  const [loading, setLoading] = useState(false);
  const {
    activeSessionId,
    createSession,
    sendMessageStream,
    exportChat,
  } = useMemoryStore();

  const sendMessage = async (
    text: string,
    dataUrls?: string[],
    b64Images?: string[],
  ) => {
    if (!text.trim() || loading) return;

    if (!activeSessionId) createSession();
    
    setLoading(true);
    try {
      await sendMessageStream(text, dataUrls);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return { sendMessage, loading, exportChat };
}
