import { expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { EncouragementPanel } from '@/components/ui/encouragement-panel';

it('turns a carried thought into ways to hold it through the day, and lets her change it', () => {
  const onThoughtChange = vi.fn();
  renderWithProviders(
    <EncouragementPanel
      input={{ theme: 'care', language: 'en' }}
      thought="  God is near  "
      thoughtSaved
      savingThought={false}
      onThoughtChange={onThoughtChange}
      onCarry={() => {}}
    />,
  );
  expect(screen.getByText('“God is near”')).toBeTruthy();
  expect(screen.getByText(/Tonight, we’ll bring it back/)).toBeTruthy();
  expect(screen.getByRole('status').textContent).toBe('Your thought is saved');
  expect(screen.queryByRole('textbox')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Change my thought' }));
  expect(onThoughtChange).toHaveBeenCalledWith('  God is near  ');
});
