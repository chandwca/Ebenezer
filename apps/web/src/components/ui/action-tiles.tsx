import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

export function ActionTiles({
  items,
}: {
  items: { to: string; icon: LucideIcon; label: string; hint?: string; emphasis?: boolean }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {items.map(({ to, icon: Icon, label, hint, emphasis }) => (
        <Link
          key={to}
          to={to}
          className={
            emphasis
              ? 'flex min-h-28 flex-col justify-between rounded-2xl bg-linear-to-br from-gold to-[#ff5e3a] p-5 text-gold-foreground shadow-[0_14px_30px_-12px_#ff7a3dcc] transition-[translate,box-shadow] hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold'
              : 'flex min-h-28 flex-col justify-between rounded-2xl border bg-card p-5 transition-colors hover:border-teal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold'
          }
        >
          <Icon size={24} aria-hidden="true" className={emphasis ? '' : 'text-teal'} />
          <span>
            <span className="block text-base font-semibold">{label}</span>
            {hint && <span className="mt-0.5 block text-xs leading-4 opacity-80">{hint}</span>}
          </span>
        </Link>
      ))}
    </div>
  );
}
