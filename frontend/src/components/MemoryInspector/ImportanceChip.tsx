interface ImportanceChipProps {
  score: number;
}

export function ImportanceChip({ score }: ImportanceChipProps) {
  const color =
    score >= 8 ? 'var(--accent)' :
    score >= 5 ? 'var(--warning)' :
                 'var(--text-muted)';

  return (
    <span
      className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide"
      style={{
        background: `color-mix(in srgb, ${color} 18%, transparent)`,
        color,
        border: `1px solid color-mix(in srgb, ${color} 35%, transparent)`,
      }}
    >
      importance: {Math.round(score)}
    </span>
  );
}
