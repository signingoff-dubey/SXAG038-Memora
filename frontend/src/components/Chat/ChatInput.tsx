import { useRef, useState } from 'react';
import { ImagePlus, Send, X, AlertCircle } from 'lucide-react';
import { ModelSelector } from '../Layout/ModelSelector';
import { useMemoryStore } from '../../store/memoryStore';
import { modelSupportsVision, VISION_MODEL_EXAMPLES } from '../../utils/visionModels';

interface AttachedImage {
  dataUrl: string;   // for display + sending to Ollama via data URL
  b64: string;       // raw base64 only (for OpenAI format)
  name: string;
}

interface ChatInputProps {
  onSend: (text: string, dataUrls?: string[], b64Images?: string[]) => void;
  disabled: boolean;
  /** When true, the model selector dropdown opens automatically */
  openModelSelector?: boolean;
  onModelSelectorOpened?: () => void;
}

export function ChatInput({ onSend, disabled, openModelSelector, onModelSelectorOpened }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [images, setImages] = useState<AttachedImage[]>([]);
  const [visionWarning, setVisionWarning] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const { selectedModel, customConfig } = useMemoryStore();

  const isVisionCapable = modelSupportsVision(
    customConfig ? customConfig.modelName : selectedModel,
    !!customConfig,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !images.length) || disabled) return;
    onSend(
      input.trim() || '(image)',
      images.map((i) => i.dataUrl),
      images.map((i) => i.b64),
    );
    setInput('');
    setImages([]);
    // Refocus after submission
    setTimeout(() => textAreaRef.current?.focus(), 0);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const handleMediaClick = () => {
    if (!isVisionCapable) {
      setVisionWarning(true);
      setTimeout(() => setVisionWarning(false), 4000);
      return;
    }
    fileRef.current?.click();
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const b64 = dataUrl.split(',')[1];
        setImages((prev) => [...prev, { dataUrl, b64, name: file.name }]);
      };
      reader.readAsDataURL(file);
    });
    // Reset so same file can be picked again
    e.target.value = '';
  };

  const removeImage = (idx: number) =>
    setImages((prev) => prev.filter((_, i) => i !== idx));

  const canSend = !disabled && (input.trim().length > 0 || images.length > 0);

  return (
    <div className="flex-shrink-0 p-4" style={{ borderTop: '1px solid var(--border)' }}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">

        {/* ── Image previews ── */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {images.map((img, idx) => (
              <div key={idx} className="relative group">
                <img
                  src={img.dataUrl}
                  alt={img.name}
                  className="h-16 w-16 object-cover rounded-xl nm-card"
                />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute -top-1.5 -right-1.5 nm-btn rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={11} style={{ color: 'var(--danger)' }} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Vision warning banner ── */}
        {visionWarning && (
          <div
            className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs leading-snug"
            style={{
              background: 'color-mix(in srgb, var(--warning) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--warning) 30%, transparent)',
              color: 'var(--warning)',
            }}
          >
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <span>
              <strong>{customConfig ? customConfig.modelName : selectedModel}</strong> doesn't support image input.
              Switch to a vision-capable model like{' '}
              <span className="font-mono">{VISION_MODEL_EXAMPLES.slice(0, 3).join(', ')}</span>.
            </span>
          </div>
        )}

        {/* ── Textarea ── */}
        <textarea
          ref={textAreaRef}
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
          disabled={disabled}
          autoCapitalize="sentences"
          spellCheck="true"
          className="w-full px-4 py-3 rounded-2xl text-sm nm-input resize-none transition-all"
          style={{ color: 'var(--text-primary)' }}
        />

        {/* ── Bottom toolbar ── */}
        <div className="flex items-center gap-2">
          {/* + media button */}
          <button
            type="button"
            onClick={handleMediaClick}
            className="nm-btn p-2.5 rounded-xl flex items-center justify-center transition-all"
            title={isVisionCapable ? 'Attach image' : 'Model does not support images'}
            style={{ color: isVisionCapable ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            <ImagePlus size={16} />
          </button>

          {/* Hidden file input */}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            multiple
            className="hidden"
            onChange={handleFiles}
          />

          <ModelSelector forceOpen={openModelSelector} onForceOpenHandled={onModelSelectorOpened} />

          <button
            type="submit"
            disabled={!canSend}
            className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-40"
            style={{
              background: 'var(--accent)',
              boxShadow: canSend
                ? '-3px -3px 8px var(--nm-shadow-light), 3px 3px 8px var(--nm-shadow-dark)'
                : 'none',
            }}
          >
            <Send size={14} />
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
