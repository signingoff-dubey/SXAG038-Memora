import { useEffect, useRef, useState } from 'react';
import { X, User, Save, CheckCircle2, AlertCircle, Loader2, FileText, Trash2, BarChart2 } from 'lucide-react';
import { contextApi } from '../../api/client';
import { useMemoryStore } from '../../store/memoryStore';

interface SettingsModalProps {
  onClose: () => void;
}

type Tab = 'profile' | 'analytics' | 'system';

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { userProfile, setUserProfile, clearAllHistory, memories } = useMemoryStore();
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
  const [healthStatus, setHealthStatus] = useState<any>(null);
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
      // Use the base axios instance to hit /api/health
      const resp = await contextApi.getHealth(); 
      setHealthStatus(resp.data);
    } catch (e: any) {
      setHealthStatus({ error: e.message || 'Failed to reach backend' });
    } finally {
      setCheckingHealth(false);
    }
  };

  // Check health on system tab open
  useEffect(() => {
    if (activeTab === 'system') checkConnectivity();
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
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all capitalize"
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
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Cloud Backend</span>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-green-500">
                    <CheckCircle2 size={12} /> Connected
                  </span>
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

        {/* ── Profile Tab ── */}
        {activeTab !== 'analytics' && (
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
              Tell Memora about yourself — your name, profession, interests, preferences, or anything
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
              placeholder={`e.g. My name is Kabir. I'm a software developer who loves building AI tools. I prefer concise, technical answers. I'm currently working on a memory-aware AI assistant called Memora...`}
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
            Together they make Memora genuinely context-aware.
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
