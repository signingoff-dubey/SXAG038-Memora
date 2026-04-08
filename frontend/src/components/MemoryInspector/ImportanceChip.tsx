interface ImportanceChipProps {
  score: number;
}

export function ImportanceChip({ score }: ImportanceChipProps) {
  const color =
    score >= 8
      ? 'var(--accent)'
      : score >= 5
        ? 'var(--warning)'
        : 'var(--text-muted)';

  return (
    <span
      className="px-2 py-0.5 rounded text-[10px] font-bold"
      style={{ background: `${color}22`, color }}
    >
      {score.toFixed(1)}
    </span>
  );
}
