import * as React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { useTranslation } from 'react-i18next';
import { i18n, initialLanguage, LANGUAGE_KEY } from './index';
import { resources } from './resources';
import { db } from '@/db/database';
import { App } from '@/App';
import { LanguageSelect } from '@/components/ui/language-select';
import { Input } from '@/components/ui/input';
import { renderWithProviders } from '@/test/render';

function leafKeys(object: object, prefix = ''): string[] {
  return Object.entries(object)
    .flatMap(([key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return typeof value === 'object' ? leafKeys(value, path) : [path];
    })
    .sort();
}

// Integration fixture for the upcoming forms: same shared input, stable component,
// and app-wide i18n instance. No locale key or page reload may reset entered text.
function FormFixture() {
  const { t } = useTranslation(['journal', 'errors']);
  const [value, setValue] = React.useState('');
  return (
    <>
      <label htmlFor="memory">{t('form.memoryLabel')}</label>
      <Input
        id="memory"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={t('form.memoryPlaceholder')}
      />
      {!value && <p role="alert">{t('errors:required')}</p>}
      <LanguageSelect id="form-language" />
    </>
  );
}

async function selectSpanish(trigger: HTMLElement) {
  fireEvent.keyDown(trigger, { key: 'ArrowDown' });
  const option = await screen.findByRole('option', { name: 'Español' });
  fireEvent.click(option);
  await waitFor(() => expect(document.documentElement.lang).toBe('es'));
}

beforeEach(async () => {
  localStorage.clear();
  await db.preferences.put({ key: 'onboardingComplete', value: true });
  if (!HTMLElement.prototype.scrollIntoView) HTMLElement.prototype.scrollIntoView = () => {};
  vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
  vi.stubGlobal('scrollTo', vi.fn());
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false })),
  );
});

describe('bundled language support', () => {
  it('provides identical, nonempty translation keys in English and Spanish', () => {
    expect(leafKeys(resources.es)).toEqual(leafKeys(resources.en));
    for (const language of ['en', 'es'] as const) {
      for (const namespace of Object.values(resources[language])) {
        for (const key of leafKeys(namespace)) {
          const value = key
            .split('.')
            .reduce<unknown>(
              (result, part) => (result as Record<string, unknown>)[part],
              namespace,
            );
          expect(typeof value).toBe('string');
          expect(value).not.toBe('');
        }
      }
    }
  });

  it('updates the screen, document title, and accessibility labels without resetting theme or route', async () => {
    renderWithProviders(<App />, { route: '/settings' });
    await screen.findByRole('heading', { level: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark' }));
    await selectSpanish(screen.getAllByRole('combobox')[0]);
    expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe(
      'Tus preferencias.',
    );
    expect(screen.getByRole('navigation', { name: 'Navegación principal' })).toBeTruthy();
    expect(screen.getAllByRole('combobox', { name: 'Idioma de la aplicación' })).toHaveLength(2);
    expect(document.title).toBe('Ajustes · Ebenezer');
    expect(document.documentElement.lang).toBe('es');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem(LANGUAGE_KEY)).toBe('es');
  });

  it('translates every routed screen, action, and not-found error', async () => {
    await act(async () => {
      await i18n.changeLanguage('es');
    });
    for (const [route, heading] of [
      ['/', /^(Buenos días|Buenas tardes|Buenas noches)$/],
      ['/reflection', 'Recorre el camino.'],
      ['/story', 'Hasta aquí me ha ayudado el Señor.'],
      ['/community', '¿Quién caminará contigo?'],
      ['/missing', 'Este camino no existe.'],
    ] as const) {
      renderWithProviders(<App />, { route });
      expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeTruthy();
      if (route === '/') {
        expect(
          screen.getByRole('link', { name: 'Comenzar la reflexión de esta noche' }),
        ).toBeTruthy();
        expect(screen.getByRole('heading', { name: 'Una Palabra para hoy' })).toBeTruthy();
        expect(screen.getByText(/^“.+”$/, { selector: 'blockquote' }).getAttribute('lang')).toBe(
          'en',
        );
      }
      cleanup();
    }
  });

  it('retains entered input and the same input node while labels, placeholders, and errors translate', async () => {
    renderWithProviders(<FormFixture />);
    expect(screen.getByRole('alert').textContent).toBe('This field is required.');
    const input = screen.getByRole('textbox', {
      name: 'Where did God meet you?',
    }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'My unfinished reflection' } });
    await selectSpanish(screen.getByRole('combobox'));
    const translated = screen.getByRole('textbox', {
      name: '¿Dónde te encontraste con Dios?',
    }) as HTMLInputElement;
    expect(translated).toBe(input);
    expect(translated.value).toBe('My unfinished reflection');
    expect(translated.placeholder).toBe('Hoy Dios…');
    fireEvent.change(translated, { target: { value: '' } });
    expect(screen.getByRole('alert').textContent).toBe('Este campo es obligatorio.');
  });

  it('restores supported preferences and handles invalid preferences and blocked storage', async () => {
    localStorage.setItem(LANGUAGE_KEY, 'es');
    expect(initialLanguage()).toBe('es');
    localStorage.setItem(LANGUAGE_KEY, 'unsupported');
    expect(initialLanguage()).toBe('en');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(initialLanguage()).toBe('en');
    await act(async () => {
      await i18n.changeLanguage('es');
    });
    expect(i18n.t('navigation.today')).toBe('Hoy');
  });

  it('falls back to English when a Spanish translation is unavailable', () => {
    i18n.addResource('en', 'common', 'fallbackTest', 'English fallback');
    expect(i18n.t('fallbackTest', { lng: 'es' })).toBe('English fallback');
  });
});
