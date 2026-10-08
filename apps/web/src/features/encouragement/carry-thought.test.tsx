import { expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { EncouragementPanel } from '@/components/ui/encouragement-panel';

it('shows the carried thought in place of the text box', () => {
  renderWithProviders(
    <EncouragementPanel
      input={{ theme: 'care', language: 'en' }}
      thought="  God is near  "
      thoughtSaved
      savingThought={false}
      onThoughtChange={() => {}}
      onCarry={() => {}}
    />,
  );
  expect(screen.getByText('“God is near”')).toBeTruthy();
  expect(screen.getByRole('status').textContent).toBe('Your thought is saved');
  expect(screen.queryByRole('textbox')).toBeNull();
});
