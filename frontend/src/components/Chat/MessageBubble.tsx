interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  images?: string[];   // data URLs
}

export function MessageBubble({ role, content, images }: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className="max-w-[76%] rounded-2xl overflow-hidden"
        style={{
          borderBottomRightRadius: isUser ? 6 : 16,
          borderBottomLeftRadius: isUser ? 16 : 6,
          boxShadow: isUser
            ? '-4px -4px 10px rgba(255,255,255,0.08), 4px 4px 12px rgba(0,0,0,0.4)'
            : '-5px -5px 12px var(--nm-shadow-light), 5px 5px 12px var(--nm-shadow-dark)',
          background: isUser ? 'var(--accent)' : 'var(--nm-card)',
        }}
      >
        {/* Images grid */}
        {images && images.length > 0 && (
          <div
            className={`grid gap-0.5 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}
          >
            {images.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`attachment ${i + 1}`}
                className="w-full object-cover max-h-56"
                style={{ display: 'block' }}
              />
            ))}
          </div>
        )}

        {/* Text */}
        <p
          className="px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
          style={{ color: isUser ? '#fff' : 'var(--text-primary)' }}
        >
          {content}
        </p>
      </div>
    </div>
  );
}
