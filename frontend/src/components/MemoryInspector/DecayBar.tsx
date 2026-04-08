interface DecayBarProps {
  score: number;
  isPinned: boolean;
}

export function DecayBar({ score, isPinned }: DecayBarProps) {
  const pct = Math.round(Math.max(0, Math.min(1, score)) * 100);
  const color =
    isPinned         ? 'var(--accent)' :
    pct > 60         ? 'var(--success)' :
    pct > 30         ? 'var(--warning)' :
                       'var(--danger)';

  return (
    <div className="w-full">
      <div
        className="w-full h-1.5 rounded-full nm-inset overflow-hidden"
      >
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          {isPinned ? 'pinned — never decays' : `decay: ${pct}%`}
        </span>
      </div>
    </div>
  );
}
