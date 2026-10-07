import * as React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { App } from '@/App';
import { db } from '@/db/database';
import { i18n } from '@/i18n';
import { renderWithProviders } from '@/test/render';

beforeEach(async () => {
  vi.stubGlobal('scrollTo', vi.fn());
  await db.preferences.clear();
  await db.stones.clear();
});
function mount(path = '/') {
  return renderWithProviders(<App />, { route: path });
}

it('opens a standalone entry, saves the optional profile, and bypasses onboarding after reopening', async () => {
  const view = mount();
  await screen.findByRole('heading', { name: 'Welcome to Ebenezer.' });
  expect(screen.queryByRole('navigation')).toBeNull();
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(screen.queryByText('Foundation preview')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /Use my name and city/ }));
  await screen.findByRole('textbox', { name: 'What should we call you?' });
  fireEvent.change(screen.getByRole('textbox', { name: 'What should we call you?' }), {
    target: { value: 'Alex' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'Where do you live now?' }), {
    target: { value: 'Melbourne' },
  });
  await act(async () => {
    await i18n.changeLanguage('es');
  });
  expect(
    (screen.getAllByRole('textbox') as HTMLInputElement[]).map((input) => input.value),
  ).toEqual(['Alex', 'Melbourne']);
  await act(async () => {
    await i18n.changeLanguage('en');
  });
  fireEvent.click(screen.getByRole('button', { name: 'Enter my space' }));
  await screen.findByRole('heading', { name: /Good (morning|afternoon|evening), Alex/ });
  expect(screen.queryByRole('heading', { name: 'Welcome to Ebenezer.' })).toBeNull();
  view.unmount();
  mount();
  await screen.findByRole('heading', { name: /Good (morning|afternoon|evening), Alex/ });
  expect(JSON.parse(String((await db.preferences.get('profile'))?.value)).city).toBe('Melbourne');
});

it('allows exploring without a profile and remembers the choice', async () => {
  const view = mount();
  fireEvent.click(await screen.findByRole('button', { name: /Just look around/ }));
  await screen.findByRole('heading', { name: /^Good (morning|afternoon|evening)$/ });
  await waitFor(async () =>
    expect((await db.preferences.get('onboardingComplete'))?.value).toBe(true),
  );
  view.unmount();
  mount();
  await screen.findByRole('heading', { name: /^Good (morning|afternoon|evening)$/ });
  expect(screen.queryByRole('heading', { name: 'Welcome to Ebenezer.' })).toBeNull();
});

it('keeps deep links accessible and provides a welcome preview for returning users', async () => {
  const view = mount('/bible-search');
  await screen.findByRole('heading', { name: 'Tell us what’s on your heart.' });
  view.unmount();
  await db.preferences.put({ key: 'onboardingComplete', value: true });
  mount('/welcome');
  await screen.findByRole('heading', { name: 'Welcome to Ebenezer.' });
});

it('offers an account path that returns to the welcome after Google sign-in', async () => {
  mount();
  fireEvent.click(await screen.findByRole('button', { name: /Create an account/ }));
  await screen.findByRole('heading', { name: 'Walk together with others.' });
  fireEvent.click(screen.getByRole('button', { name: 'Back' }));
  await screen.findByRole('heading', { name: 'Welcome to Ebenezer.' });
  expect(screen.getByRole('group', { name: 'How would you like to begin?' })).toBeTruthy();
});
