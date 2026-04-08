interface DecayBarProps {
  score: number;
  isPinned: boolean;
}

export function DecayBar({ score, isPinned }: DecayBarProps) {
  const percent = Math.round(score * 100);
  const color = isPinned
    ? 'var(--accent)'
    : percent > 60
      ? 'var(--success)'
      : percent > 30
        ? 'var(--warning)'
        : 'var(--danger)';

  return (
    <div className="w-full">
      <div
        className="w-full h-1.5 rounded-full overflow-hidden"
        style={{ background: 'var(--bg-tertiary)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%`, background: color }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          {isPinned ? 'pinned' : `decay: ${percent}%`}
        </span>
      </div>
    </div>
  );
}
