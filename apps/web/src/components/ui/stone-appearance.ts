import type { ReflectionValues } from '@ebenezer/contracts';

/** What stone UI needs to display; storage records with extra fields fit as they are. */
export type StoneItem = ReflectionValues & { id: string; journalDate: string; createdAt: string };

export const stoneColors = {
  bright: { fill: 'var(--stone-bright)', text: 'var(--gold-foreground)' },
  mixed: { fill: 'var(--stone-mixed)', text: '#FFFFFF' },
  hard: { fill: 'var(--stone-hard)', text: '#FFFFFF' },
};
