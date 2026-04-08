import { chatApi } from '../api/client';
import { useMemoryStore } from '../store/memoryStore';
import { useState } from 'react';

export function useChat() {
  const [loading, setLoading] = useState(false);
  const {
    activeSessionId,
    createSession,
    addMessage,
    updateSessionMeta,
    selectedModel,
    customConfig,
  } = useMemoryStore();

  /**
   * @param text      Message text
   * @param dataUrls  Optional array of data URLs (data:image/...;base64,...) for display
   * @param b64Images Optional array of raw base64 strings to send to the backend
   */
  const sendMessage = async (
    text: string,
    dataUrls?: string[],
    b64Images?: string[],
  ) => {
    if (!text.trim() || loading) return;

    let sessionId = activeSessionId;
    if (!sessionId) sessionId = createSession();

    // Store message with data URLs so bubbles can display them
    addMessage({ role: 'user', content: text, images: dataUrls });
    updateSessionMeta(sessionId, text);
    setLoading(true);

    try {
      const { data } = await chatApi.send({
        message: text,
        session_id: sessionId,
        model: customConfig ? customConfig.modelName : selectedModel,
        custom_base_url: customConfig?.baseUrl,
        custom_api_key: customConfig?.apiKey,
        images: b64Images?.length ? b64Images : undefined,
      });

      addMessage({
        role: 'assistant',
        content: data.response,
        memoriesUsed: data.memories_used,
      });
    } catch (err: unknown) {
      let msg = 'Could not reach the server. Is the backend running?';
      if (err && typeof err === 'object') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const e = err as any;
        if (e.response) {
          // Axios error with a response from the server
          const data = e.response.data;
          const detail = data?.detail ?? data?.message ?? data?.error;
          if (typeof detail === 'string') {
            msg = detail;
          } else if (typeof detail === 'object') {
            msg = JSON.stringify(detail);
          } else if (typeof data === 'string') {
            msg = data;
          } else {
            msg = `Server error (HTTP ${e.response.status})`;
          }
        } else if (e.message) {
          // Network error, timeout, etc.
          msg = e.message;
        }
      }
      addMessage({ role: 'assistant', content: `⚠ ${msg}` });
    } finally {
      setLoading(false);
    }
  };

  return { sendMessage, loading };
}
