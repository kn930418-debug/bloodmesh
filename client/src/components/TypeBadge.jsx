import { isRare } from '../lib/compat.js';
import { cn } from '../lib/format.js';

export default function TypeBadge({ group, className }) {
  return (
    <span
      className={cn(
        'chip font-display',
        isRare(group)
          ? 'border-amber-400/50 bg-amber-400/10 text-amber-300'
          : 'border-blood-500/40 bg-blood-500/10 text-blood-400',
        className
      )}
      title={isRare(group) ? 'Rare group' : undefined}
    >
      <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current">
        <path d="M12 2C12 2 5 10.2 5 14.5C5 18.6 8.1 22 12 22C15.9 22 19 18.6 19 14.5C19 10.2 12 2 12 2Z" />
      </svg>
      {group}
      {isRare(group) && <span className="text-[9px] uppercase tracking-widest opacity-80">rare</span>}
    </span>
  );
}
