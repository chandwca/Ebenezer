import { useTranslation } from 'react-i18next';

export function ScriptureCredit({
  attribution,
  provider,
}: {
  attribution?: string;
  provider?: 'youversion';
}) {
  const { t } = useTranslation('common');
  if (!attribution) return null;
  return (
    <p className="mt-3 text-xs leading-5 text-muted-foreground">
      {provider === 'youversion' && (
        <span className="block font-semibold">{t('scriptureProvider')}</span>
      )}
      {attribution}
    </p>
  );
}
