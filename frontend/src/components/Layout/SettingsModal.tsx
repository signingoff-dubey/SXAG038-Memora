import { useEffect, useRef, useState } from 'react';
import { X, User, Save, CheckCircle2, AlertCircle, Loader2, FileText, Trash2 } from 'lucide-react';
import { contextApi } from '../../api/client';
import { useMemoryStore } from '../../store/memoryStore';

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { userProfile, setUserProfile, clearAllHistory } = useMemoryStore();
  const [confirmClear, setConfirmClear] = useState(false);

  const [draft, setDraft]       = useState(userProfile);
  const [saving, setSaving]     = useState(false);
  const [status, setStatus]     = useState<'idle' | 'saved' | 'error'>('idle');
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
            <div
              className="p-1.5 rounded-lg nm-btn"
              style={{ color: 'var(--accent)' }}
            >
              <User size={16} />
            </div>
            <span className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
              Settings
            </span>
          </div>
          <button
            onClick={onClose}
            className="nm-btn p-1.5 rounded-lg transition-all"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Body ── */}
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

        {/* ── Footer ── */}
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
      </div>
    </div>
  );
}
