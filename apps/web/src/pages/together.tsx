import { useTranslation } from 'react-i18next';
import { PageHeading } from '@/components/ui/page-heading';
import { TogetherBoard } from '@/features/community/together-board';
import { ContentLayout } from '@/components/ui/content-layout';

export function TogetherPage() {
  const { t } = useTranslation('community');
  return (
    <ContentLayout layout="spacious">
      <PageHeading eyebrow={t('eyebrow')} title={t('title')} description={t('description')} />
      <TogetherBoard />
    </ContentLayout>
  );
}
