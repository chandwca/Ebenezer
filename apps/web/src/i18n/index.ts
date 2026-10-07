import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources } from './resources';

export const languages = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
] as const;
export type Language = (typeof languages)[number]['code'];
export const LANGUAGE_KEY = 'ebenezer.language';
export const isLanguage = (value: unknown): value is Language => value === 'en' || value === 'es';

export function initialLanguage(): Language {
  try {
    const stored = localStorage.getItem(LANGUAGE_KEY);
    if (isLanguage(stored)) return stored;
  } catch {
    /* Language switching works even when storage is blocked. */
  }
  return 'en';
}

export const i18n = createInstance();
i18n.use(initReactI18next);
i18n.on('languageChanged', (language) => {
  const supported = isLanguage(language) ? language : 'en';
  document.documentElement.lang = supported;
  document.documentElement.dir = 'ltr';
  try {
    localStorage.setItem(LANGUAGE_KEY, supported);
  } catch {
    /* In-memory preference remains usable. */
  }
});
void i18n.init({
  initAsync: false,
  resources,
  lng: initialLanguage(),
  fallbackLng: 'en',
  supportedLngs: ['en', 'es'],
  defaultNS: 'common',
  ns: ['common', 'today', 'settings', 'journal', 'community', 'errors', 'bible', 'account'],
  interpolation: { escapeValue: false }, // React escapes rendered text.
  react: { useSuspense: false },
});
