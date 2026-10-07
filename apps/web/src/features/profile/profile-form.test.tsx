import * as React from 'react';
import { beforeEach, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { ProfileForm } from './profile-form';
import { db } from '@/db/database';
import { renderWithProviders } from '@/test/render';

beforeEach(async () => {
  await db.preferences.clear();
});

it('reuses FormBuilder validation and restores preferences after remounting', async () => {
  const view = renderWithProviders(<ProfileForm />);
  await waitFor(() =>
    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(
      false,
    ),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(await screen.findAllByText('This field is required.')).toHaveLength(2);
  fireEvent.change(screen.getByRole('textbox', { name: 'What should we call you?' }), {
    target: { value: 'Alex' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'Where do you live now?' }), {
    target: { value: 'Berlin' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  await screen.findByText('Preferences saved on this device.');
  view.unmount();
  renderWithProviders(<ProfileForm />);
  await waitFor(() =>
    expect(
      (screen.getByRole('textbox', { name: 'What should we call you?' }) as HTMLInputElement).value,
    ).toBe('Alex'),
  );
  expect(
    (screen.getByRole('textbox', { name: 'Where do you live now?' }) as HTMLInputElement).value,
  ).toBe('Berlin');
});
