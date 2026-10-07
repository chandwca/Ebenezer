import { cn } from '@/lib/utils';

const tints = [
  'bg-secondary text-secondary-foreground',
  'bg-gold/25 text-foreground',
  'bg-primary text-primary-foreground',
  'bg-muted text-foreground',
] as const;

/** Initials avatar; the tint is stable for a name so people are easy to recognize. */
export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toLocaleUpperCase())
    .join('');
  const tint = tints[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % tints.length];
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid shrink-0 place-items-center rounded-full font-semibold',
        size === 'md' ? 'size-11 text-sm' : 'size-9 text-xs',
        tint,
      )}
    >
      {initials}
    </span>
  );
}
