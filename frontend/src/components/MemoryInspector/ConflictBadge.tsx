import { AlertTriangle } from 'lucide-react';

interface ConflictBadgeProps {
  conflictIds: string[];
}

export function ConflictBadge({ conflictIds }: ConflictBadgeProps) {
  if (!conflictIds.length) return null;

  return (
    <div
      className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium"
      style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)' }}
    >
      <AlertTriangle size={10} />
      <span>{conflictIds.length} conflict{conflictIds.length > 1 ? 's' : ''}</span>
    </div>
  );
}
