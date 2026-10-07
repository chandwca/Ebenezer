import bibleEn from '@/locales/en/bible.json';
import bibleEs from '@/locales/es/bible.json';
import commonEn from '@/locales/en/common.json';
import todayEn from '@/locales/en/today.json';
import settingsEn from '@/locales/en/settings.json';
import journalEn from '@/locales/en/journal.json';
import communityEn from '@/locales/en/community.json';
import errorsEn from '@/locales/en/errors.json';
import wordEn from '@/locales/en/word.json';
import commonEs from '@/locales/es/common.json';
import todayEs from '@/locales/es/today.json';
import settingsEs from '@/locales/es/settings.json';
import journalEs from '@/locales/es/journal.json';
import communityEs from '@/locales/es/community.json';
import errorsEs from '@/locales/es/errors.json';
import wordEs from '@/locales/es/word.json';
import accountEn from '@/locales/en/account.json';
import accountEs from '@/locales/es/account.json';

// Static imports deliberately keep all supported translations in the app bundle.
export const resources = {
  en: {
    account: accountEn,
    bible: bibleEn,
    common: commonEn,
    today: todayEn,
    settings: settingsEn,
    journal: journalEn,
    community: communityEn,
    errors: errorsEn,
    word: wordEn,
  },
  es: {
    account: accountEs,
    bible: bibleEs,
    common: commonEs,
    today: todayEs,
    settings: settingsEs,
    journal: journalEs,
    community: communityEs,
    errors: errorsEs,
    word: wordEs,
  },
};
