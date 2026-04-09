import { useEffect, useRef, useState } from 'react';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { useChat } from '../../hooks/useChat';
import { useMemoryStore } from '../../store/memoryStore';
import { Brain, AlertTriangle, Cpu, Key, Download } from 'lucide-react';

export function ChatWindow() {
  const streamingResponse = useMemoryStore((s) => s.streamingResponse);
  const { sendMessage, loading, exportChat } = useChat();
  const messages = useMemoryStore((s) => s.messages);
  const activeSessionId = useMemoryStore((s) => s.activeSessionId);
  const installedModels = useMemoryStore((s) => s.installedModels);
  const customConfig = useMemoryStore((s) => s.customConfig);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [triggerModelSelector, setTriggerModelSelector] = useState(false);

  const noLLM = installedModels.length === 0 && !customConfig;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header with Export */}
      {!isEmpty && (
        <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--nm-shadow-dark)]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider opacity-60">Active Session</span>
          </div>
          <button
            onClick={() => exportChat()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'var(--nm-card)',
              color: 'var(--accent)',
              boxShadow: '2px 2px 5px var(--nm-shadow-dark), -2px -2px 5px var(--nm-shadow-light)',
            }}
          >
            <Download size={14} /> Export Chat
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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

        {streamingResponse && (
          <MessageBubble
            role="assistant"
            content={streamingResponse}
            isStreaming
          />
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

      {/* ── No LLM banner ── */}
      {noLLM && (
        <div
          className="mx-4 mb-3 rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
          style={{
            background: 'color-mix(in srgb, var(--warning) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--warning) 35%, transparent)',
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertTriangle size={16} className="flex-shrink-0" style={{ color: 'var(--warning)' }} />
            <div className="min-w-0">
              <p className="text-xs font-semibold" style={{ color: 'var(--warning)' }}>
                No LLM detected
              </p>
              <p className="text-[11px] leading-snug mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Install Ollama and pull a model, or connect a cloud API key.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => setTriggerModelSelector(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: 'color-mix(in srgb, var(--warning) 18%, transparent)',
                color: 'var(--warning)',
                border: '1px solid color-mix(in srgb, var(--warning) 40%, transparent)',
              }}
            >
              <Cpu size={11} /> Install model
            </button>
            <button
              onClick={() => setTriggerModelSelector(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: 'var(--accent)',
                color: '#fff',
              }}
            >
              <Key size={11} /> Add API key
            </button>
          </div>
        </div>
      )}

      <ChatInput
        onSend={sendMessage}
        disabled={loading || !activeSessionId}
        openModelSelector={triggerModelSelector}
        onModelSelectorOpened={() => setTriggerModelSelector(false)}
      />
    </div>
  );
}
