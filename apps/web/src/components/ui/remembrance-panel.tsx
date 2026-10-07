import { useTranslation } from 'react-i18next';
import { Heart, Leaf } from 'lucide-react';
import type { JourneySummaryResponse } from '@ebenezer/contracts';
import { Button } from './button';
import { Card } from './card';
export function RemembrancePanel({
  busy,
  result,
  consent,
}: {
  busy: boolean;
  result?: JourneySummaryResponse;
  language: string;
  consent?: { label: string; note: string; onRequest: () => void };
}) {
  const { t } = useTranslation('journal');
  return (
    <Card
      className="mb-6 border-teal/15 bg-secondary/40 p-6 sm:p-8"
      role="region"
      aria-label={t('summary.title')}
    >
      <div className="flex items-center gap-2 text-teal">
        <Leaf size={18} aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-widest">
          {t('summary.eyebrow')}
        </span>
      </div>
      <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
        {t('summary.title')}
      </h2>
      <div aria-live="polite" className="mt-4 max-w-3xl">
        <p className="text-base leading-8">
          {result?.reflection.message ?? t('summary.localMessage')}
        </p>
        {result && (
          <p className="mt-4 text-sm font-medium text-teal">{result.reflection.question}</p>
        )}
        {result?.source === 'ai' && (
          <p className="mt-3 text-xs text-muted-foreground">{t('summary.aiNote')}</p>
        )}
        {busy && (
          <p role="status" className="mt-3 text-sm text-muted-foreground">
            {t('summary.gathering')}
          </p>
        )}
      </div>
      {consent && (
        <div className="mt-5 grid justify-items-start gap-2">
          <Button variant="outline" onClick={consent.onRequest}>
            {consent.label}
          </Button>
          <p className="text-xs leading-5 text-muted-foreground">{consent.note}</p>
        </div>
      )}
      <div className="mt-5 flex items-center gap-2 border-t border-teal/10 pt-4 text-sm text-muted-foreground">
        <Heart size={16} aria-hidden="true" />
        <span>{t('summary.revisit')}</span>
      </div>
    </Card>
  );
}
