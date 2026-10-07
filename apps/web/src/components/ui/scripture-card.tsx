import { Link } from 'react-router-dom';
import { BookOpen, ChevronRight } from 'lucide-react';
import { Button } from './button';
import { Card } from './card';

export function ScriptureCard({
  title,
  quote,
  reference,
  note,
  description,
  action,
  to,
  language,
}: {
  title: string;
  quote: string;
  reference: string;
  note: string;
  description: string;
  action: string;
  to: string;
  language: string;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-teal">{title}</span>
        <BookOpen size={19} className="text-muted-foreground" aria-hidden="true" />
      </div>
      <blockquote lang={language} className="my-6 font-serif text-2xl leading-relaxed">
        {quote}
      </blockquote>
      <p lang={language} className="text-sm font-semibold text-teal">
        {reference}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
      <Button asChild variant="ghost" className="mt-4 px-0">
        <Link to={to}>
          {action}
          <ChevronRight />
        </Link>
      </Button>
    </Card>
  );
}
