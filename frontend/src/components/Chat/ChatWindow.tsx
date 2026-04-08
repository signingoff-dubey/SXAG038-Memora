import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { useChat } from '../../hooks/useChat';
import { useMemoryStore } from '../../store/memoryStore';
import { Brain } from 'lucide-react';

export function ChatWindow() {
  const { sendMessage, loading } = useChat();
  const messages = useMemoryStore((s) => s.messages);
  const activeSessionId = useMemoryStore((s) => s.activeSessionId);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-40 select-none">
            <div className="nm-card p-5 rounded-3xl">
              <Brain size={44} style={{ color: 'var(--accent)' }} />
            </div>
            <p className="text-xl font-bold">Memora</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Start a conversation. I'll remember what matters.
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <MessageBubble
              key={`${msg.timestamp}-${i}`}
              role={msg.role}
              content={msg.content}
              images={msg.images}
            />
          ))
        )}

        {loading && (
          <div className="flex justify-start mb-3">
            <div
              className="px-4 py-3 rounded-2xl text-sm"
              style={{
                background: 'var(--nm-card)',
                color: 'var(--text-muted)',
                borderBottomLeftRadius: 4,
                boxShadow: '-4px -4px 10px var(--nm-shadow-light), 4px 4px 10px var(--nm-shadow-dark)',
              }}
            >
              <span className="animate-pulse">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <ChatInput
        onSend={sendMessage}
        disabled={loading || !activeSessionId}
      />
    </div>
  );
}
