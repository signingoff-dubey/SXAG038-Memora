import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { useChat } from '../../hooks/useChat';
import { useMemoryStore } from '../../store/memoryStore';
import { Brain } from 'lucide-react';

export function ChatWindow() {
  const { sendMessage, loading } = useChat();
  const chatMessages = useMemoryStore((s) => s.chatMessages);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        {chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-40">
            <Brain size={48} />
            <p className="text-lg font-medium">Memora</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Start a conversation. I'll remember what matters.
            </p>
          </div>
        )}
        {chatMessages.map((msg, i) => (
          <MessageBubble key={i} role={msg.role} content={msg.content} />
        ))}
        {loading && (
          <div className="flex justify-start mb-3">
            <div
              className="px-4 py-3 rounded-2xl text-sm"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
            >
              <span className="animate-pulse">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <ChatInput onSend={sendMessage} disabled={loading} />
    </div>
  );
}
