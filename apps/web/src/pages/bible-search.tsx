import { useTranslation } from 'react-i18next';
import { PageHeading } from '@/components/ui/page-heading';
import { BibleSearchForm } from '@/features/bible-search/search-form';
export function BibleSearchPage() {
  const { t } = useTranslation('bible');
  return (
    <>
      <PageHeading eyebrow={t('eyebrow')} title={t('title')} description={t('description')} />
      <BibleSearchForm />
    </>
  );
}
