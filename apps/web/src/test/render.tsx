import * as React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

type Options = Omit<RenderOptions, 'wrapper'> & { route?: string };

// Renders inside the providers every screen needs. i18n is the app-wide instance and is
// reset to English before each test in setup.ts.
export function renderWithProviders(
  ui: React.ReactElement,
  { route = '/', ...options }: Options = {},
) {
  function Providers({ children }: { children: React.ReactNode }) {
    return <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>;
  }
  return render(ui, { wrapper: Providers, ...options });
}
