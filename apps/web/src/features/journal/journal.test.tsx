import * as React from 'react';
import { AuthProvider } from '@/features/auth/auth-provider';
import { beforeEach, it, expect } from 'vitest';
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
