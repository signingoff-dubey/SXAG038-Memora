import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useMemoryStore } from '../../store/memoryStore';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  images?: string[];   // data URLs
  isStreaming?: boolean;
  memoriesUsed?: string[];
}

function CodeBlock({ language, children, theme }: { language: string; children: string; theme: 'dark' | 'light' }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative rounded-xl overflow-hidden my-2" style={{ fontSize: 13 }}>
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-3 py-1.5"
        style={{
          background: theme === 'dark' ? '#1e1e2e' : '#f0f0f5',
          borderBottom: '1px solid rgba(128,128,128,0.15)',
        }}
      >
        <span className="text-[10px] font-mono font-semibold opacity-60">
          {language || 'code'}
        </span>
        <button
          onClick={copy}
          className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded transition-opacity hover:opacity-80"
          style={{ color: copied ? 'var(--success)' : 'var(--text-muted)' }}
        >
          {copied ? <Check size={10} /> : <Copy size={10} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={theme === 'dark' ? oneDark : oneLight}
        customStyle={{ margin: 0, borderRadius: 0, fontSize: 13 }}
        showLineNumbers={children.split('\n').length > 4}
        lineNumberStyle={{ opacity: 0.4, minWidth: '2.5em' }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}

export function MessageBubble({ role, content, images, isStreaming, memoriesUsed }: MessageBubbleProps) {
  const isUser = role === 'user';
  const theme = useMemoryStore((s) => s.theme);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className="max-w-[78%] rounded-2xl overflow-hidden"
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
          <div className={`grid gap-0.5 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
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

        {/* Text / Markdown */}
        <div
          className="px-4 py-3 text-sm leading-relaxed"
          style={{ color: isUser ? '#fff' : 'var(--text-primary)' }}
        >
          {isUser ? (
            // User messages: plain pre-wrap (no markdown needed)
            <p className="whitespace-pre-wrap">{content}</p>
          ) : (
            // Assistant messages: full markdown + code highlighting
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Code blocks
                code({ node, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const isBlock = !props.ref && String(children).includes('\n');
                  if (isBlock || match) {
                    return (
                      <CodeBlock language={match?.[1] || ''} theme={theme}>
                        {String(children).replace(/\n$/, '')}
                      </CodeBlock>
                    );
                  }
                  // Inline code
                  return (
                    <code
                      className="px-1.5 py-0.5 rounded text-[12px] font-mono"
                      style={{
                        background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                        color: 'var(--accent)',
                        border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
                      }}
                    >
                      {children}
                    </code>
                  );
                },
                // Headings
                h1: ({ children }) => <h1 className="text-lg font-bold mt-3 mb-1" style={{ color: 'var(--text-primary)' }}>{children}</h1>,
                h2: ({ children }) => <h2 className="text-base font-bold mt-2 mb-1" style={{ color: 'var(--text-primary)' }}>{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-1" style={{ color: 'var(--text-secondary)' }}>{children}</h3>,
                // Lists
                ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 my-1.5 ml-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 my-1.5 ml-2">{children}</ol>,
                li: ({ children }) => <li className="text-sm leading-relaxed">{children}</li>,
                // Paragraphs
                p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                // Blockquote
                blockquote: ({ children }) => (
                  <blockquote
                    className="border-l-4 pl-3 my-2 italic"
                    style={{ borderColor: 'var(--accent)', color: 'var(--text-secondary)' }}
                  >
                    {children}
                  </blockquote>
                ),
                // Tables (GFM)
                table: ({ children }) => (
                  <div className="overflow-x-auto my-2">
                    <table className="text-xs border-collapse w-full">{children}</table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="px-2 py-1 text-left font-semibold" style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)', borderBottom: '1px solid var(--border)' }}>
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-2 py-1" style={{ borderBottom: '1px solid var(--border)' }}>{children}</td>
                ),
                // Horizontal rule
                hr: () => <hr className="my-3" style={{ borderColor: 'var(--border)' }} />,
                // Strong / em
                strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                em: ({ children }) => <em className="italic opacity-90">{children}</em>,
                // Links
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--accent)' }}>
                    {children}
                  </a>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          )}

          {isStreaming && (
            <span className="inline-block w-1.5 h-4 ml-1 bg-[var(--accent)] animate-pulse align-middle" />
          )}

          {!isUser && !isStreaming && memoriesUsed && memoriesUsed.length > 0 && (
            <div className="mt-2 pt-2 border-t border-[var(--nm-shadow-dark)] opacity-40 hover:opacity-100 transition-opacity">
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] uppercase font-bold tracking-tight">Recalled:</span>
                {memoriesUsed.map(id => (
                  <span key={id} className="text-[10px] bg-[var(--nm-shadow-dark)] px-1.5 py-0.5 rounded">
                    memory:{id.slice(0, 4)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
