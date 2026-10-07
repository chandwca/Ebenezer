import type { LucideIcon } from 'lucide-react';
import { Badge } from './badge';
import { Card } from './card';

export function FeatureCard({
  icon: Icon,
  title,
  description,
  steps,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  steps: string[];
}) {
  return (
    <Card className="bg-secondary/45">
      <span className="inline-flex size-11 items-center justify-center rounded-xl bg-secondary text-teal">
        <Icon size={21} aria-hidden="true" />
      </span>
      <h2 className="mt-5 font-display text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        {steps.map((step, index) => (
          <Badge variant="outline" key={index}>
            {index + 1} · {step}
          </Badge>
        ))}
      </div>
    </Card>
  );
}
