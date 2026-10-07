import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { FormBuilder, type FormField } from '@/components/ui/form-builder';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { ContentLayout } from '@/components/ui/content-layout';
import { BibleResults, BibleChapterReader } from '@/components/ui/bible-results';
import type { SearchResult, WorkerResponse } from '@/lib/bible/types';
import { createBibleSearchWorker } from '@/lib/bible/worker-client';
const schema = z.object({
  query: z.string().trim().min(3, 'bible:required').max(2000, 'bible:tooLong'),
  strategy: z.enum(['context', 'scripture', 'full']),
});
type Values = z.infer<typeof schema>;
const fields: FormField<Values>[] = [
  {
    name: 'query',
    type: 'textarea',
    labelKey: 'bible:query',
    placeholderKey: 'bible:placeholder',
    descriptionKey: 'bible:privacy',
  },
  {
    name: 'strategy',
    type: 'select',
    labelKey: 'bible:strategy',
    choices: [
      { value: 'context', labelKey: 'bible:withContext' },
      { value: 'scripture', labelKey: 'bible:scriptureOnly' },
      { value: 'full', labelKey: 'bible:fullBible' },
    ],
  },
];
export function BibleSearchForm() {
  const { t } = useTranslation('bible');
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { query: '', strategy: 'context' },
  });
  const selectedStrategy = form.watch('strategy');
  const [submittedStrategy, setSubmittedStrategy] = React.useState<Values['strategy']>('context');
  const worker = React.useRef<Worker | undefined>(undefined);
  const requestId = React.useRef(0);
  const [phase, setPhase] = React.useState<
    'idle' | 'loading' | 'downloading' | 'searching' | 'done' | 'error'
  >('idle');
  const [percent, setPercent] = React.useState<number>();
  const [error, setError] = React.useState('setup');
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [reading, setReading] = React.useState<SearchResult>();
  const [submittedQuery, setSubmittedQuery] = React.useState('');
  const [elapsedMs, setElapsedMs] = React.useState(0);
  const [offlineReady, setOfflineReady] = React.useState(false);
  const busy = ['loading', 'downloading', 'searching'].includes(phase);
  React.useEffect(() => () => worker.current?.terminate(), []);
  function cancel() {
    requestId.current++;
    worker.current?.terminate();
    worker.current = undefined;
    setPhase('idle');
  }
  function search(values: Values) {
    setSubmittedQuery(values.query);
    setSubmittedStrategy(values.strategy);
    setResults([]);
    setReading(undefined);
    setPercent(undefined);
    setPhase('loading');
    try {
      if (!worker.current) {
        worker.current = createBibleSearchWorker();
        worker.current.onmessage = (event: MessageEvent<WorkerResponse>) => {
          const message = event.data;
          if (message.id !== requestId.current) return;
          if (message.type === 'progress') {
            setPhase(message.phase);
            setPercent(message.percent);
          } else if (message.type === 'error') {
            setError(message.code);
            setPhase('error');
          } else {
            setResults(message.results);
            setElapsedMs(message.elapsedMs);
            setOfflineReady(message.offlineReady);
            setPhase('done');
          }
        };
        worker.current.onerror = () => {
          worker.current?.terminate();
          worker.current = undefined;
          setError('setup');
          setPhase('error');
        };
      }
      worker.current.postMessage({ ...values, id: ++requestId.current });
    } catch {
      setError('setup');
      setPhase('error');
    }
  }
  return (
    <ContentLayout>
      <Alert variant="info">{t(selectedStrategy === 'full' ? 'fullNote' : 'sampleNote')}</Alert>
      <Card>
        <FormBuilder form={form} fields={fields} onSubmit={search}>
          <Alert variant="info">
            {t('downloadNote')} {selectedStrategy === 'full' && t('fullDownload')}
          </Alert>
          <ContentLayout>
            <Button type="submit" disabled={busy}>
              {t('search')}
            </Button>
            {busy && (
              <Button variant="outline" onClick={cancel}>
                {t('cancel')}
              </Button>
            )}
          </ContentLayout>
        </FormBuilder>
      </Card>
      {busy && (
        <Alert variant="info">
          {t(phase)}
          {phase === 'downloading' && percent !== undefined ? ` ${percent}%` : ''}
        </Alert>
      )}
      {phase === 'error' && <Alert>{t(`errors.${error}`)}</Alert>}
      {phase === 'done' && (
        <Alert variant="success">
          {t(
            submittedStrategy === 'full'
              ? 'fullBible'
              : submittedStrategy === 'context'
                ? 'withContext'
                : 'scriptureOnly',
          )}
          . {t('elapsed', { ms: elapsedMs })} {t(offlineReady ? 'offlineReady' : 'notCached')}
        </Alert>
      )}
      {!!results.length && <Alert variant="info">{t('interpretation')}</Alert>}
      {reading ? (
        <BibleChapterReader result={reading} onClose={() => setReading(undefined)} />
      ) : (
        <BibleResults results={results} query={submittedQuery} onRead={setReading} />
      )}
    </ContentLayout>
  );
}
