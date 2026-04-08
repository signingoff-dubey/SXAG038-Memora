import { AlertTriangle } from 'lucide-react';

interface ConflictBadgeProps {
  count: number;
}

export function ConflictBadge({ count }: ConflictBadgeProps) {
  if (!count) return null;
  return (
    <span
      className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold"
      style={{
        background: 'color-mix(in srgb, var(--danger) 18%, transparent)',
        color: 'var(--danger)',
        border: '1px solid color-mix(in srgb, var(--danger) 35%, transparent)',
      }}
    >
      <AlertTriangle size={9} />
      conflict
    </span>
  );
}
