import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, Key, X, Check, Loader2 } from 'lucide-react';
import { modelsApi, type OllamaModel } from '../../api/client';
import { useMemoryStore } from '../../store/memoryStore';
import { modelSupportsVision } from '../../utils/visionModels';

// Popular models with their pull commands
const POPULAR_MODELS = [
  { name: 'qwen2.5-coder:7b', label: 'Qwen 2.5 Coder 7B',   size: '4.7 GB', vision: false },
  { name: 'llama3.2:3b',      label: 'Llama 3.2 3B',        size: '2.0 GB', vision: false },
  { name: 'llama3.1:8b',      label: 'Llama 3.1 8B',        size: '4.7 GB', vision: false },
  { name: 'mistral:7b',       label: 'Mistral 7B',           size: '4.1 GB', vision: false },
  { name: 'gemma2:9b',        label: 'Gemma 2 9B',           size: '5.4 GB', vision: false },
  { name: 'phi4:14b',         label: 'Phi-4 14B',            size: '8.9 GB', vision: false },
  { name: 'deepseek-r1:7b',   label: 'DeepSeek R1 7B',       size: '4.7 GB', vision: false },
  { name: 'llava:7b',         label: 'LLaVA 7B 👁',          size: '4.7 GB', vision: true  },
  { name: 'llava:13b',        label: 'LLaVA 13B 👁',         size: '8.0 GB', vision: true  },
  { name: 'llama3.2-vision',  label: 'Llama 3.2 Vision 👁',  size: '7.9 GB', vision: true  },
  { name: 'moondream',        label: 'Moondream 👁',          size: '1.7 GB', vision: true  },
];

interface CustomApiModalProps {
  onClose: () => void;
  onSave: (cfg: { baseUrl: string; apiKey: string; modelName: string }) => void;
  initial: { baseUrl: string; apiKey: string; modelName: string } | null;
}

function CustomApiModal({ onClose, onSave, initial }: CustomApiModalProps) {
  const [baseUrl, setBaseUrl] = useState(initial?.baseUrl ?? 'https://api.openai.com/v1');
  const [apiKey, setApiKey] = useState(initial?.apiKey ?? '');
  const [modelName, setModelName] = useState(initial?.modelName ?? 'gpt-4o-mini');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div
        className="w-[420px] rounded-2xl p-6 shadow-2xl"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Key size={18} style={{ color: 'var(--accent)' }} />
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Custom API</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70">
            <X size={16} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          Connect any OpenAI-compatible API (OpenAI, Together, Groq, etc.)
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Base URL
            </label>
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Model name
            </label>
            <input
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="gpt-4o-mini"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
          <button
            onClick={() => { if (baseUrl && apiKey && modelName) onSave({ baseUrl, apiKey, modelName }); }}
            disabled={!baseUrl || !apiKey || !modelName}
            className="flex-1 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            Save & use
          </button>
        </div>
      </div>
    </div>
  );
}

interface DownloadPopupProps {
  modelName: string;
  onClose: () => void;
}

function DownloadPopup({ modelName, onClose }: DownloadPopupProps) {
  const [copied, setCopied] = useState(false);
  const cmd = `ollama pull ${modelName}`;

  const copy = () => {
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div
        className="w-[400px] rounded-2xl p-6 shadow-2xl"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Download size={18} style={{ color: 'var(--warning)' }} />
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Model not installed</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70">
            <X size={16} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{modelName}</span> is not installed locally.
          Run this command in your terminal to download it:
        </p>

        <div
          className="flex items-center justify-between px-4 py-3 rounded-xl font-mono text-sm mb-4"
          style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
        >
          <span>{cmd}</span>
          <button
            onClick={copy}
            className="ml-3 p-1.5 rounded hover:opacity-70 transition-opacity"
            style={{ color: copied ? 'var(--success)' : 'var(--text-muted)' }}
          >
            {copied ? <Check size={14} /> : <span style={{ fontSize: 12 }}>Copy</span>}
          </button>
        </div>

        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          After downloading, refresh the model list to use it.
        </p>

        <button
          onClick={onClose}
          className="w-full mt-4 py-2 rounded-lg text-sm"
          style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

export function ModelSelector() {
  const { selectedModel, customConfig, installedModels, setSelectedModel, setCustomConfig, setInstalledModels } = useMemoryStore();
  const [open, setOpen] = useState(false);
  const [availableModels, setAvailableModels] = useState<OllamaModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [downloadTarget, setDownloadTarget] = useState<string | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const { data } = await modelsApi.list();
      setAvailableModels(data.models);
      // Keep the global store in sync for auto-select logic
      setInstalledModels(data.models.map((m) => m.name));
    } catch {
      setAvailableModels([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen((v) => !v);
    if (!open) fetchModels();
  };

  // isInstalled uses live fetch results when available, falls back to store data
  const isInstalled = (name: string) =>
    availableModels.length > 0
      ? availableModels.some((m) => m.name === name)
      : installedModels.includes(name);

  const selectModel = (name: string) => {
    if (!isInstalled(name)) {
      setDownloadTarget(name);
      setOpen(false);
      return;
    }
    setSelectedModel(name);
    setCustomConfig(null);
    setOpen(false);
  };

  const displayLabel = customConfig
    ? `Custom: ${customConfig.modelName}`
    : selectedModel;

  const selectedIsInstalled = customConfig ? true : isInstalled(selectedModel);
  const allSuggested = POPULAR_MODELS.map((m) => m.name);
  const extraInstalled = availableModels.filter((m) => !allSuggested.includes(m.name));

  return (
    <>
      <div ref={dropRef} className="relative">
        {/* ── Trigger button ── */}
        <button
          onClick={handleOpen}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)',
            border: `1px solid ${selectedIsInstalled ? 'color-mix(in srgb, var(--success) 40%, var(--border))' : 'var(--border)'}`,
          }}
        >
          {/* green dot when installed */}
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: selectedIsInstalled ? 'var(--success)' : 'var(--text-muted)', opacity: selectedIsInstalled ? 1 : 0.4 }}
          />
          <span className="max-w-[140px] truncate">{displayLabel}</span>
          {loading ? <Loader2 size={12} className="animate-spin" /> : <ChevronDown size={12} />}
        </button>

        {open && (
          <div
            className="absolute bottom-full mb-2 left-0 w-80 rounded-xl shadow-2xl z-40 overflow-hidden"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>
                Local models (Ollama)
              </p>
              {loading && <Loader2 size={11} className="animate-spin" style={{ color: 'var(--text-muted)' }} />}
            </div>

            <div className="max-h-64 overflow-y-auto">
              {POPULAR_MODELS.map((m) => {
                const installed = isInstalled(m.name);
                const active    = selectedModel === m.name && !customConfig;
                return (
                  <button
                    key={m.name}
                    onClick={() => selectModel(m.name)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors"
                    style={{
                      background: active
                        ? 'color-mix(in srgb, var(--accent) 12%, transparent)'
                        : installed
                          ? 'color-mix(in srgb, var(--success) 4%, transparent)'
                          : 'transparent',
                    }}
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      {/* installed/offline dot */}
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: installed ? 'var(--success)' : 'var(--border)' }}
                      />
                      <div>
                        <div className="text-sm font-medium leading-tight"
                          style={{ color: active ? 'var(--accent)' : 'var(--text-primary)' }}>
                          {m.label}
                        </div>
                        <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{m.name}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                      {installed ? (
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                          style={{
                            background: 'color-mix(in srgb, var(--success) 18%, transparent)',
                            color: 'var(--success)',
                            border: '1px solid color-mix(in srgb, var(--success) 35%, transparent)',
                          }}
                        >
                          <span className="w-1 h-1 rounded-full inline-block" style={{ background: 'var(--success)' }} />
                          installed
                        </span>
                      ) : (
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                        >
                          {m.size} ↓
                        </span>
                      )}
                      {active && <Check size={12} style={{ color: 'var(--accent)' }} />}
                    </div>
                  </button>
                );
              })}

              {extraInstalled.length > 0 && (
                <div className="px-3 pt-2 pb-1" style={{ borderTop: '1px solid var(--border)' }}>
                  <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Other installed
                  </p>
                </div>
              )}

              {extraInstalled.map((m) => {
                const active   = selectedModel === m.name && !customConfig;
                const isVision = modelSupportsVision(m.name, false);
                return (
                  <button
                    key={m.name}
                    onClick={() => selectModel(m.name)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors"
                    style={{
                      background: active
                        ? 'color-mix(in srgb, var(--accent) 12%, transparent)'
                        : 'color-mix(in srgb, var(--success) 4%, transparent)',
                    }}
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--success)' }} />
                      <div className="text-sm font-medium" style={{ color: active ? 'var(--accent)' : 'var(--text-primary)' }}>
                        {m.name}{isVision ? ' 👁' : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                        style={{
                          background: 'color-mix(in srgb, var(--success) 18%, transparent)',
                          color: 'var(--success)',
                          border: '1px solid color-mix(in srgb, var(--success) 35%, transparent)',
                        }}
                      >
                        <span className="w-1 h-1 rounded-full inline-block" style={{ background: 'var(--success)' }} />
                        installed
                      </span>
                      {active && <Check size={12} style={{ color: 'var(--accent)' }} />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="border-t" style={{ borderColor: 'var(--border)' }}>
              <button
                onClick={() => { setOpen(false); setShowCustomModal(true); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:opacity-80 transition-opacity"
                style={{ color: customConfig ? 'var(--accent)' : 'var(--text-secondary)' }}
              >
                <Key size={13} />
                <span className="text-sm">Custom API key…</span>
                {customConfig && <Check size={12} className="ml-auto" style={{ color: 'var(--success)' }} />}
              </button>
            </div>
          </div>
        )}
      </div>

      {showCustomModal && (
        <CustomApiModal
          initial={customConfig}
          onClose={() => setShowCustomModal(false)}
          onSave={(cfg) => {
            setCustomConfig(cfg);
            setSelectedModel(cfg.modelName);
            setShowCustomModal(false);
          }}
        />
      )}

      {downloadTarget && (
        <DownloadPopup
          modelName={downloadTarget}
          onClose={() => setDownloadTarget(null)}
        />
      )}
    </>
  );
}
