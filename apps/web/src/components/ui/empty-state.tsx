import { Link } from 'react-router-dom';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import { Badge } from './badge';
import { Button } from './button';
import { Card } from './card';

export function EmptyState({
  icon: Icon,
  title,
  description,
  badge,
  action,
  to,
  onAction,
  headingLevel = 2,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  badge?: string;
  action: string;
  headingLevel?: 1 | 2;
} & ({ to: string; onAction?: never } | { to?: never; onAction: () => void })) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  return (
    <Card className="flex min-h-72 flex-col items-center justify-center text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-secondary text-teal">
        <Icon size={25} aria-hidden="true" />
      </span>
      <Heading className="mt-5 font-display text-xl font-semibold tracking-tight">{title}</Heading>
      {description && (
        <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      )}
      {badge && (
        <Badge variant="secondary" className="mt-5">
          {badge}
        </Badge>
      )}
      {onAction ? (
        <Button variant="outline" className="mt-6" onClick={onAction}>
          {action}
        </Button>
      ) : (
        <Button asChild variant="outline" className="mt-6">
          <Link to={to}>
            {action}
            <ArrowRight />
          </Link>
        </Button>
      )}
    </Card>
  );
}
