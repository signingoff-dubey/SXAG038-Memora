import { Clock, Plus, Activity, Zap } from 'lucide-react';
import type { MemoryData } from '../../api/client';

interface MemoryTimelineProps {
  memories: MemoryData[];
}

export function MemoryTimeline({ memories }: MemoryTimelineProps) {
  // Sort by created_at descending
  const sorted = [...memories].sort((a, b) => 
    new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );

  const getEventIcon = (count: number) => {
    if (count > 10) return <Zap size={10} className="text-yellow-500" />;
    if (count > 0) return <Activity size={10} className="text-blue-500" />;
    return <Plus size={10} className="text-green-500" />;
  };

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-gradient-to-b before:from-[var(--accent)] before:to-transparent before:opacity-30">
      {sorted.slice(0, 15).map((mem, i) => (
        <div key={mem.id} className="relative animate-in slide-in-from-left-4 duration-300" style={{ delay: `${i * 50}ms` }}>
          {/* Dot */}
          <div 
            className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full border-2 border-[var(--bg-primary)] shadow-sm"
            style={{ background: 'var(--accent)' }}
          />
          
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-[10px] font-bold opacity-50 uppercase tracking-wider">
              <Clock size={10} />
              {new Date(mem.created_at || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
            
            <div 
              className="p-3 rounded-2xl text-xs font-medium leading-relaxed"
              style={{ 
                background: 'var(--nm-card)',
                boxShadow: 'inset 2px 2px 5px var(--nm-shadow-dark), inset -2px -2px 5px var(--nm-shadow-light)'
              }}
            >
              "{mem.content}"
              <div className="mt-2 flex items-center gap-3 text-[9px] opacity-60">
                <span className="flex items-center gap-1">
                  {getEventIcon(mem.access_count)}
                  {mem.access_count} accesses
                </span>
                <span className="flex items-center gap-1">
                  ★ {mem.importance.toFixed(1)} importance
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}

      {sorted.length > 15 && (
        <p className="text-[10px] text-center opacity-40 italic py-2">
          ... and {sorted.length - 15} more events
        </p>
      )}

      {sorted.length === 0 && (
        <div className="text-center py-10 opacity-40">
          <Clock size={32} className="mx-auto mb-2 opacity-20" />
          <p className="text-sm">No memory events yet</p>
        </div>
      )}
    </div>
  );
}
