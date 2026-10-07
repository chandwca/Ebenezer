import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { EncouragementPanel } from './encouragement-panel';
import { emptyReflection, scriptureSnapshotSchema } from '@ebenezer/contracts';
import { backupSchema } from '@/db/backup';

describe('YouVersion Scripture display', () => {
  it('retains provider attribution through a journal backup and rejects an unattributed BSB snapshot', () => {
    const scripture = {
      reference: 'Psalm 117:1',
      text: 'Fixture Bible text.',
      translation: 'BSB',
      provider: 'youversion',
      attribution: 'Fixture publisher attribution.',
      sourceUrl: 'https://www.bible.com/bible/3034/PSA.117.BSB',
      context: '',
      firstVerse: 1,
      lastVerse: 1,
      inputKey: 'local',
      chapter: {
        book: 'Psalm',
        chapter: 117,
        verses: [{ number: 1, text: 'Fixture Bible text.' }],
      },
    };
    const backup = {
      format: 'ebenezer-journal',
      version: 1,
      exportedAt: '2026-10-07T12:00:00Z',
      stones: [
        {
          ...emptyReflection,
          feel: 'hopeful',
          ref: scripture.reference,
          scripture,
          readConfirmed: true,
          stood: 'Love',
          memory: 'Remember',
          tone: 'bright',
          id: 'b5aeb090-e9f3-4e60-868d-7ba8beb3ef2b',
          journalDate: '2026-10-07',
          createdAt: '2026-10-07T12:00:00Z',
          updatedAt: '2026-10-07T12:00:00Z',
        },
      ],
    };
    const restored = backupSchema.parse(JSON.parse(JSON.stringify(backup)));
    expect(restored.stones[0].scripture?.attribution).toBe(scripture.attribution);
    expect(restored.stones[0].scripture?.provider).toBe('youversion');
    expect(
      scriptureSnapshotSchema.safeParse({ ...scripture, attribution: undefined }).success,
    ).toBe(false);
  });
  it('shows the supplied attribution and opens the matching BSB chapter', () => {
    renderWithProviders(
      <EncouragementPanel
        input={{ theme: 'care', language: 'en' }}
        result={{
          scripture: {
            reference: 'Psalm 117:1',
            text: 'Fixture Bible text.',
            translation: 'BSB',
            provider: 'youversion',
            attribution: 'Fixture publisher attribution.',
            sourceUrl: 'https://www.bible.com/bible/3034/PSA.117.BSB',
          },
          encouragement: {
            message: 'Pause here.',
            prayer: 'Jesus, guide me.',
            question: 'What stands out?',
          },
          source: 'prepared',
        }}
        thought=""
        thoughtSaved={false}
        savingThought={false}
        onThoughtChange={() => {}}
        onCarry={() => {}}
      />,
    );
    expect(screen.getByText('Scripture from YouVersion')).toBeTruthy();
    expect(screen.getByText(/Fixture publisher attribution/)).toBeTruthy();
    expect(screen.getByRole('link').getAttribute('href')).toBe(
      'https://www.bible.com/bible/3034/PSA.117.BSB',
    );
  });
});
