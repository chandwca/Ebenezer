import * as React from 'react';
import { AuthProvider } from '@/features/auth/auth-provider';
import { beforeEach, it, expect, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { emptyReflection } from '@ebenezer/contracts';
import { db } from '@/db/database';
import { journal } from '@/db/repositories';
import { StoryPage } from '@/pages/story';
import { renderWithProviders } from '@/test/render';
const values = {
  ...emptyReflection,
  feel: 'grateful',
  ref: '1 Samuel 7:12',
  readConfirmed: true,
  learned: 'Help',
  memory: 'A friend visited',
  tone: 'bright',
};
beforeEach(async () => {
  await db.stones.clear();
  await db.drafts.clear();
});
/** Opens a stone from the tower by the memory at the end of its label. */
async function openStone(memory: string) {
  fireEvent.click(await screen.findByRole('button', { name: new RegExp(`· ${memory}$`) }));
  return screen.getByRole('dialog', { name: memory });
}

it('edits a stone without changing a draft and requires confirmation before deletion', async () => {
  const stone = await journal.saveStone(values);
  await journal.saveDraft(values, 2);
  renderWithProviders(
    <AuthProvider client={null}>
      <StoryPage />
    </AuthProvider>,
  );
  let dialog = await openStone(values.memory);
  fireEvent.click(within(dialog).getByRole('button', { name: `Edit: ${values.memory}` }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Where did God meet you?' }), {
    target: { value: 'A friend called' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  expect((await journal.getDraft())?.step).toBe(2);
  dialog = await openStone('A friend called');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Delete: A friend called' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
  expect((await journal.listStones())[0].id).toBe(stone.id);
  dialog = await openStone('A friend called');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Delete: A friend called' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
  await waitFor(async () => expect(await journal.listStones()).toHaveLength(0));
});

it('imports a backup through the shared file input and rejects malformed files without changes', async () => {
  await journal.saveStone(values);
  const backup = await journal.exportBackup();
  await db.stones.clear();
  renderWithProviders(
    <AuthProvider client={null}>
      <StoryPage />
    </AuthProvider>,
  );
  const input = screen.getByLabelText('Import backup');
  fireEvent.click(screen.getByText('Backups'));
  const valid = new File(['unused'], 'backup.json', {
    type: 'application/json',
  });
  Object.defineProperty(valid, 'text', {
    value: async () => JSON.stringify(backup),
  });
  fireEvent.change(input, { target: { files: [valid] } });
  await screen.findByText('Imported 1 stones. Skipped 0 existing stones.');
  await screen.findByRole('button', { name: new RegExp(`· ${values.memory}$`) });
  const invalid = new File(['broken'], 'broken.json', {
    type: 'application/json',
  });
  Object.defineProperty(invalid, 'text', { value: async () => 'broken' });
  fireEvent.change(input, { target: { files: [invalid] } });
  await screen.findByText(/Choose a valid Ebenezer journal backup/);
  expect(await journal.listStones()).toHaveLength(1);
});

it('downloads all local stones as a backup', async () => {
  await journal.saveStone(values);
  const createObjectURL = vi.fn(() => 'blob:test-backup');
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL = createObjectURL;
      static revokeObjectURL = vi.fn();
    },
  );
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  renderWithProviders(
    <AuthProvider client={null}>
      <StoryPage />
    </AuthProvider>,
  );
  fireEvent.click(screen.getByText('Backups'));
  await screen.findByRole('button', { name: new RegExp(`· ${values.memory}$`) });
  fireEvent.click(screen.getByRole('button', { name: 'Export journal' }));
  await screen.findByText('Backup download started.');
  expect(createObjectURL).toHaveBeenCalledOnce();
  expect(click).toHaveBeenCalledOnce();
  expect((await journal.exportBackup()).stones).toHaveLength(1);
});

it('opens existing stones in the default tower by keyboard and recalls the latest dated memory', async () => {
  const bright = await journal.saveStone(values);
  const hard = await journal.saveStone({
    ...values,
    tone: 'hard',
    ref: 'Psalm 61:2',
    memory: 'A lonely evening',
    prayer: 'Help me find a friend.',
  });
  const mixed = await journal.saveStone({
    ...values,
    tone: 'mixed',
    ref: '1 Peter 5:7',
    memory: 'A little hope',
    partner: 'Alex',
  });
  await db.stones.update(bright.id, { journalDate: '2026-10-01' });
  await db.stones.update(hard.id, { journalDate: '2026-10-03' });
  await db.stones.update(mixed.id, { journalDate: '2026-10-02' });
  renderWithProviders(
    <AuthProvider client={null}>
      <StoryPage />
    </AuthProvider>,
  );
  const tower = await screen.findByRole('group', {
    name: 'Your tower of remembrance, oldest stones at the bottom',
  });
  const buttons = within(tower).getAllByRole('button');
  expect(buttons.map((button) => button.getAttribute('aria-label')?.split(' · ').at(-1))).toEqual([
    'A friend visited',
    'A little hope',
    'A lonely evening',
  ]);
  fireEvent.keyDown(buttons[1], { key: 'Enter' });
  let dialog = screen.getByRole('dialog', { name: 'A little hope' });
  expect(within(dialog).getByText(/Casting all your care/)).toBeTruthy();
  expect(within(dialog).getByText('Alex')).toBeTruthy();
  fireEvent(dialog, new Event('cancel', { cancelable: true }));
  expect(screen.queryByRole('dialog')).toBeNull();
  fireEvent.keyDown(buttons[0], { key: ' ' });
  dialog = screen.getByRole('dialog', { name: 'A friend visited' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close memory' }));
  fireEvent.click(screen.getByRole('button', { name: 'I need to remember' }));
  dialog = screen.getByRole('dialog', { name: 'A lonely evening' });
  expect(within(dialog).getByText('Help me find a friend.')).toBeTruthy();
  expect(within(dialog).getByText(/when my heart is overwhelmed/)).toBeTruthy();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Delete: A lonely evening' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
  expect(await journal.listStones()).toHaveLength(3);
});
