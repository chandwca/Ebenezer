import { useTranslation } from 'react-i18next';
import { ChevronDown, Download } from 'lucide-react';
import { usePwa } from '@/pwa/use-pwa';
import { Alert } from './alert';
import { Button } from './button';
export function PwaStatus() {
  const { t } = useTranslation('common');
  const pwa = usePwa();
  return (
    <div className="mb-6 grid gap-3">
      {!pwa.online && <Alert variant="info">{t('pwa.offline')}</Alert>}
      {pwa.ready && (
        <p role="status" className="text-xs text-muted-foreground">
          {t('pwa.ready')}
        </p>
      )}
      {pwa.failed && <Alert>{t('pwa.failed')}</Alert>}
      {pwa.waiting && (
        <Alert variant="info">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>{t('pwa.updateNote')}</p>
            <Button disabled={pwa.busy} onClick={() => void pwa.update()}>
              {t('pwa.update')}
            </Button>
          </div>
        </Alert>
      )}
      {!pwa.installed && (
        <details className="group/install justify-self-start text-sm text-muted-foreground">
          <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-2 rounded-full border border-border/80 bg-card px-3.5 text-xs font-medium transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
            <Download aria-hidden="true" className="size-3.5 text-teal" />
            {t('pwa.installTitle')}
            <ChevronDown
              aria-hidden="true"
              className="size-3.5 transition-transform group-open/install:rotate-180 motion-reduce:transition-none"
            />
          </summary>
          <p className="my-3 max-w-xl leading-6">{t('pwa.installHelp')}</p>
          {pwa.install && (
            <Button onClick={() => void pwa.installApp().catch(() => undefined)}>
              {t('pwa.install')}
            </Button>
          )}
        </details>
      )}
    </div>
  );
}
