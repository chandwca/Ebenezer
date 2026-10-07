import { useTranslation } from 'react-i18next';
import { Compass } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

export function NotFoundPage() {
  const { t } = useTranslation(['common', 'errors']);
  return (
    <EmptyState
      headingLevel={1}
      icon={Compass}
      title={t('errors:notFound')}
      action={t('common:returnToday')}
      to="/"
    />
  );
}
