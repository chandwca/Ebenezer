import type { EncouragementRequest } from '@ebenezer/contracts';

export function weatherCategory(code: number): EncouragementRequest['weather'] | undefined {
  if (code === 0 || code === 1) return 'clear';
  if ([2, 3, 45, 48].includes(code)) return 'cloudy';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
  if ([95, 96, 99].includes(code)) return 'storm';
}

export async function cityWeather(city: string, signal: AbortSignal) {
  const geo = new URL('https://geocoding-api.open-meteo.com/v1/search');
  geo.searchParams.set('name', city);
  geo.searchParams.set('count', '1');
  const found = await fetch(geo, { signal });
  if (!found.ok) throw new Error('Weather unavailable');
  const locations = await found.json();
  const place = locations.results?.[0];
  if (!place || !Number.isFinite(place.latitude) || !Number.isFinite(place.longitude))
    throw new Error('City unavailable');
  const forecast = new URL('https://api.open-meteo.com/v1/forecast');
  forecast.searchParams.set('latitude', String(place.latitude));
  forecast.searchParams.set('longitude', String(place.longitude));
  forecast.searchParams.set('current', 'weather_code');
  const response = await fetch(forecast, { signal });
  if (!response.ok) throw new Error('Weather unavailable');
  const data = await response.json();
  const category = weatherCategory(data.current?.weather_code);
  if (!category) throw new Error('Weather unavailable');
  return { category, place: [place.name, place.admin1, place.country].filter(Boolean).join(', ') };
}
