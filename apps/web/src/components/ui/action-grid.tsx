import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

export function ActionGrid({
  title,
  items,
}: {
  title: string;
  items: { to: string; icon: LucideIcon; title: string; text: string }[];
}) {
  return (
    <section className="mt-9">
      <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {items.map(({ to, icon: Icon, title: heading, text }) => (
          <Link
            key={to}
            to={to}
            className="group rounded-2xl border bg-card p-5 transition-colors hover:border-teal"
          >
            <Icon size={21} className="text-teal" aria-hidden="true" />
            <h3 className="mt-4 text-sm font-semibold">{heading}</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
