import { useTranslation } from 'react-i18next';
import { Alert } from './alert';

export function LoadingState() {
  const { t } = useTranslation('journal');
  return <Alert variant="info">{t('status.loading')}</Alert>;
}
