import { useTranslation } from 'react-i18next';
import { languages, isLanguage } from '@/i18n';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

export function LanguageSelect({ id, className }: { id: string; className?: string }) {
  const { t, i18n } = useTranslation('settings');
  return (
    <Select
      value={i18n.resolvedLanguage ?? 'en'}
      onValueChange={(value) => {
        if (isLanguage(value)) void i18n.changeLanguage(value);
      }}
    >
      <SelectTrigger id={id} aria-label={t('language.label')} className={cn('min-w-28', className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {languages.map(({ code, label }) => (
          <SelectItem key={code} value={code}>
            <span lang={code}>{label}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
