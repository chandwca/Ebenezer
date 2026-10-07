import { it, expect, vi } from 'vitest';
import { cityWeather, weatherCategory } from './weather';
it('maps documented weather codes and refuses unknown categories', () => {
  expect(weatherCategory(61)).toBe('rain');
  expect(weatherCategory(95)).toBe('storm');
  expect(weatherCategory(73)).toBe('snow');
  expect(weatherCategory(999)).toBeUndefined();
});
it('looks up a city and returns only broad weather with a visible resolved place', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          results: [
            {
              name: 'Columbus',
              admin1: 'Ohio',
              country: 'United States',
              latitude: 40,
              longitude: -83,
            },
          ],
        }),
      ),
    )
    .mockResolvedValueOnce(new Response(JSON.stringify({ current: { weather_code: 61 } })));
  vi.stubGlobal('fetch', fetch);
  expect(await cityWeather('Columbus', new AbortController().signal)).toEqual({
    category: 'rain',
    place: 'Columbus, Ohio, United States',
  });
  expect(String(fetch.mock.calls[0][0])).toContain('name=Columbus');
});
it('missing city results fail rather than inventing weather', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}')));
  await expect(cityWeather('Unknown', new AbortController().signal)).rejects.toThrow(
    'City unavailable',
  );
});
