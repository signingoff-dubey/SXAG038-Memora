import { useEffect, useRef, useState } from 'react';
import { X, User, Save, CheckCircle2, AlertCircle, Loader2, FileText, Trash2, BarChart2, Zap, Settings2, Activity } from 'lucide-react';
import axios from 'axios';
import { contextApi } from '../../api/client';
import { useMemoryStore } from '../../store/memoryStore';

interface SettingsModalProps {
  onClose: () => void;
}

type Tab = 'profile' | 'analytics' | 'system';

interface HealthStatus {
  status?: string;
  error?: string;
  ollama?: {
    connected: boolean;
    error?: string | null;
    base_url?: string;
    model?: string;
  };
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { 
    userProfile, setUserProfile, clearAllHistory, memories,
    isDemoMode, setDemoMode
  } = useMemoryStore();
  const [confirmClear, setConfirmClear] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  // ── Analytics derived values ──────────────────────────────────────────────
  const totalMemories   = memories.length;
  const pinned          = memories.filter((m) => m.is_pinned).length;
  const sessionOnly     = memories.filter((m) => m.is_session_only).length;
  const conflicts       = memories.filter((m) => (m.contradiction_with?.length ?? 0) > 0).length;
  const avgImportance   = totalMemories
    ? (memories.reduce((s, m) => s + m.importance, 0) / totalMemories).toFixed(1)
    : '—';
  const avgDecay        = totalMemories
    ? (memories.reduce((s, m) => s + m.decay_score, 0) / totalMemories * 100).toFixed(0)
    : '—';
  const topMemories     = [...memories].sort((a, b) => b.importance - a.importance).slice(0, 3);

  const [draft, setDraft]       = useState(userProfile);
  const [saving, setSaving]     = useState(false);
  const [status, setStatus]     = useState<'idle' | 'saved' | 'error'>('idle');
  
  const [threshold, setThreshold] = useState(3.0);
  const [updatingThreshold, setUpdatingThreshold] = useState(false);

  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const textareaRef             = useRef<HTMLTextAreaElement>(null);

  // Focus textarea on open
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSave = async () => {
    setSaving(true);
    setStatus('idle');
    try {
      await contextApi.save('default', draft);
      setUserProfile(draft);   // update localStorage too
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2500);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    } finally {
      setSaving(false);
    }
  };

  const checkConnectivity = async () => {
    setCheckingHealth(true);
    try {
      // Always hit local backend directly — Ollama only exists locally.
      // Bypass the API interceptor to avoid Netlify's /api/* → 404 redirect.
      const resp = await axios.get('http://127.0.0.1:8000/api/health', { timeout: 4000 });
      setHealthStatus(resp.data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to reach backend';
      setHealthStatus({ error: msg });
    } finally {
      setCheckingHealth(false);
    }
  };

  const fetchConfig = async () => {
    const { configApi } = await import('../../api/client');
    const resp = await configApi.get();
    if (resp.data) {
      setThreshold(resp.data.importance_threshold);
    }
  };

  const updateThreshold = async (val: number) => {
    setThreshold(val);
    setUpdatingThreshold(true);
    const { configApi } = await import('../../api/client');
    try {
      await configApi.update({ importance_threshold: val });
    } finally {
      setUpdatingThreshold(false);
    }
  };

  // Check health and config on system tab open
  useEffect(() => {
    if (activeTab === 'system') {
      checkConnectivity();
      fetchConfig();
    }
  }, [activeTab]);

  const hasChanges = draft !== userProfile;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-[540px] max-w-[95vw] rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg nm-btn" style={{ color: 'var(--accent)' }}>
              <User size={16} />
            </div>
            <span className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
              Settings
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Tab switcher */}
            <div
              className="flex rounded-xl overflow-hidden nm-inset"
              style={{ padding: 3 }}
            >
              {(['profile', 'analytics', 'system'] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold transition-all capitalize"
                  style={{
                    background: activeTab === tab ? 'var(--accent)' : 'transparent',
                    color: activeTab === tab ? '#fff' : 'var(--text-muted)',
                  }}
                >
                  {tab === 'profile' ? <User size={11} /> : tab === 'analytics' ? <BarChart2 size={11} /> : <AlertCircle size={11} />}
                  {tab}
                </button>
              ))}
            </div>
            <div className="w-[1px] h-4 bg-[var(--border)] mx-1" />
            <button 
              onClick={() => setDemoMode(!isDemoMode)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-bold transition-all ${isDemoMode ? 'bg-[var(--danger)] text-white shadow-lg' : 'nm-btn text-[var(--text-muted)]'}`}
              title="Toggle Demo Mode (Mock data and UI badges)"
            >
              <Zap size={10} /> {isDemoMode ? 'DEMO ACTIVE' : 'DEMO MODE'}
            </button>
            <button onClick={onClose} className="nm-btn p-1.5 rounded-lg transition-all" style={{ color: 'var(--text-muted)' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── System Tab ── */}
        {activeTab === 'system' && (
          <div className="px-6 py-5 space-y-5">
            <div>
              <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
                📡 Connectivity Diagnostics
              </p>
              
              <div className="space-y-3">
                {/* Backend Status */}
                <div className="flex items-center justify-between p-3 rounded-xl nm-inset">
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Local Backend</span>
                  {checkingHealth ? (
                    <Loader2 size={12} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
                  ) : healthStatus && !healthStatus.error ? (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--success)' }}>
                      <CheckCircle2 size={12} /> Running
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--danger)' }}>
                      <AlertCircle size={12} /> Offline
                    </span>
                  )}
                </div>

                {/* Ollama Status */}
                <div className="p-3 rounded-xl nm-inset space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Ollama Node</span>
                    {checkingHealth ? (
                      <Loader2 size={12} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
                    ) : healthStatus?.ollama?.connected ? (
                      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--success)' }}>
                        <CheckCircle2 size={12} /> Reachable
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--danger)' }}>
                        <AlertCircle size={12} /> Offline
                      </span>
                    )}
                  </div>
                  
                  {healthStatus?.ollama?.error && (
                    <p className="text-[10px] leading-relaxed" style={{ color: 'var(--danger)' }}>
                      {healthStatus.ollama.error}
                    </p>
                  )}

                  <div className="pt-1 flex items-center justify-between opacity-60">
                    <span className="text-[9px] font-mono tabular-nums">{healthStatus?.ollama?.base_url || 'Checking...'}</span>
                    <button 
                      onClick={checkConnectivity}
                      disabled={checkingHealth}
                      className="text-[9px] font-bold hover:underline"
                      style={{ color: 'var(--accent)' }}
                    >
                      Refresh
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Parameters */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Settings2 size={14} style={{ color: 'var(--accent)' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>AI Curation Parameters</span>
              </div>
              
              <div className="p-4 rounded-xl nm-inset space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>Importance Threshold</label>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[var(--bg-tertiary)]" style={{ color: 'var(--accent)' }}>{threshold.toFixed(1)}</span>
                  </div>
                  <input 
                    type="range"
                    min={1}
                    max={9}
                    step={0.5}
                    value={threshold}
                    onChange={(e) => updateThreshold(parseFloat(e.target.value))}
                    className="w-full h-1.5 rounded-full cursor-pointer accent-[var(--accent)]"
                  />
                  <p className="text-[9px] opacity-60 leading-relaxed">
                    Higher values mean only very significant facts are remembered. Lower values capture more detail (and noise).
                  </p>
                </div>
              </div>
            </div>

            {/* Cloud Sync Help */}
            <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2">
                <AlertCircle size={14} style={{ color: 'var(--warning)' }} />
                <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Using Local Models with Netlify?</span>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Netlify servers cannot see your laptop's <code>localhost</code>. To use your system's GPU from the cloud, you must use a tunnel like <strong>Ngrok</strong>.
              </p>
              <a 
                href="#" 
                onClick={(e) => { e.preventDefault(); alert("Open CLOUD_SYNC_GUIDE.md in your project root for step-by-step instructions!"); }}
                className="inline-block text-[11px] font-bold hover:underline"
                style={{ color: 'var(--accent)' }}
              >
                Read Cloud Sync Guide →
              </a>
            </div>
          </div>
        )}

        {/* ── Analytics Tab ── */}
        {activeTab === 'analytics' && (
          <div className="px-6 py-5 space-y-4">
            {/* Stat grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total memories', value: totalMemories },
                { label: 'Pinned', value: pinned },
                { label: 'Conflicts', value: conflicts },
                { label: 'Session-only', value: sessionOnly },
                { label: 'Avg importance', value: avgImportance },
                { label: 'Avg health', value: totalMemories ? `${avgDecay}%` : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl p-3 nm-inset text-center">
                  <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--accent)' }}>{value}</p>
                  <p className="text-[10px] mt-0.5 font-medium" style={{ color: 'var(--text-muted)' }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Health Visualizer (Simulated since recharts might be missing) */}
            <div>
              <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
                Memory Health over Time
              </p>
              <div className="h-32 flex items-end justify-between gap-1 nm-inset p-3 rounded-2xl relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                  <Activity size={80} />
                </div>
                {[65, 78, 82, 75, 90, 85, 92, 95, 88, 96, 94, 98].map((val, i) => (
                  <div 
                    key={i} 
                    className="flex-1 bg-[var(--accent)] rounded-t-sm transition-all duration-700" 
                    style={{ height: `${val}%`, opacity: 0.3 + (val/100)*0.7 }}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-2 px-1">
                <span className="text-[9px] opacity-40 uppercase">12 Weeks ago</span>
                <span className="text-[9px] opacity-40 uppercase">Current</span>
              </div>
            </div>

            {/* Top memories */}
            {topMemories.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Top memories by importance
                </p>
                <div className="space-y-2">
                  {topMemories.map((m) => (
                    <div key={m.id} className="flex items-start gap-2 p-2.5 rounded-xl nm-inset">
                      <span
                        className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                        style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)' }}
                      >
                        {m.importance.toFixed(1)}
                      </span>
                      <p className="text-xs leading-snug line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                        {m.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {totalMemories === 0 && (
              <p className="text-center text-xs py-6" style={{ color: 'var(--text-muted)' }}>
                No memories yet. Start chatting to build your memory profile.
              </p>
            )}
          </div>
        )}

        {/* ── Profile Tab ── */}
        {activeTab === 'profile' && (
        <div className="px-6 py-5 space-y-5">

          {/* Who Am I section */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText size={14} style={{ color: 'var(--accent)' }} />
              <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Who am I?
              </label>
            </div>
            <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Tell Cortex about yourself — your name, profession, interests, preferences, or anything
              you want the AI to always keep in mind. This is saved to{' '}
              <code
                className="px-1 py-0.5 rounded text-[11px]"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--accent)' }}
              >
                data/context_default.json
              </code>{' '}
              and injected into every conversation.
            </p>

            <textarea
              ref={textareaRef}
              rows={7}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`e.g. My name is Kabir. I'm a software developer who loves building AI tools. I prefer concise, technical answers. I'm currently working on a memory-aware AI assistant called Cortex...`}
              className="w-full px-4 py-3 rounded-2xl text-sm nm-input resize-none transition-all leading-relaxed"
              style={{ color: 'var(--text-primary)' }}
            />

            <div className="flex items-center justify-between mt-2">
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {draft.length} characters
              </span>

              {/* Status badge */}
              {status === 'saved' && (
                <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--success)' }}>
                  <CheckCircle2 size={13} />
                  Saved to context file
                </span>
              )}
              {status === 'error' && (
                <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--danger)' }}>
                  <AlertCircle size={13} />
                  Save failed — is the backend running?
                </span>
              )}
            </div>
          </div>

          {/* Info box */}
          <div
            className="rounded-xl px-4 py-3 text-xs leading-relaxed"
            style={{
              background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
              border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)',
              color: 'var(--text-secondary)',
            }}
          >
            <strong style={{ color: 'var(--accent)' }}>How context works:</strong>
            {' '}Your profile is combined with retrieved memories into a system prompt before every reply.
            Memories are auto-extracted from your conversations and stored in the vector database.
            Together they make Cortex genuinely context-aware.
          </div>

          {/* Danger zone */}
          <div
            className="rounded-xl px-4 py-3 space-y-3"
            style={{
              border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)',
              background: 'color-mix(in srgb, var(--danger) 5%, transparent)',
            }}
          >
            <p className="text-xs font-semibold" style={{ color: 'var(--danger)' }}>
              Danger Zone
            </p>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                  Clear all chat history
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Permanently deletes all sessions and messages from localStorage.
                </p>
              </div>

              {!confirmClear ? (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all nm-btn"
                  style={{ color: 'var(--danger)' }}
                >
                  <Trash2 size={12} />
                  Clear
                </button>
              ) : (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="px-3 py-1.5 rounded-lg text-xs nm-btn"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      clearAllHistory();
                      setConfirmClear(false);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                    style={{ background: 'var(--danger)' }}
                  >
                    Yes, clear
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* ── Footer (profile tab only) ── */}
        {activeTab === 'profile' && (
        <div
          className="flex items-center justify-end gap-3 px-6 py-4"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm transition-all nm-btn"
            style={{ color: 'var(--text-secondary)' }}
          >
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
            style={{
              background: 'var(--accent)',
              boxShadow: hasChanges && !saving
                ? '-3px -3px 8px var(--nm-shadow-light), 3px 3px 8px var(--nm-shadow-dark)'
                : 'none',
            }}
          >
            {saving
              ? <Loader2 size={14} className="animate-spin" />
              : <Save size={14} />
            }
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </div>
        )}
      </div>
    </div>
  );
}
