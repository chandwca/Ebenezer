import { useTranslation } from 'react-i18next';
import { PageHeading } from '@/components/ui/page-heading';
import { TogetherBoard } from '@/features/community/together-board';

export function TogetherPage() {
  const { t } = useTranslation('community');
  return (
    <>
      <PageHeading title={t('title')} />
      <TogetherBoard />
    </>
  );
}
