export type Song = { title: string; artist: string };

/** Confirms an AI-suggested song exists before it is shown; returns the catalog's own spelling. */
export interface SongCatalog {
  verify(candidate: Song): Promise<Song | undefined>;
}

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const words = (value: string) =>
  new Set(
    normalize(value)
      .split(' ')
      .filter((word) => word.length > 2),
  );

/** True when the titles match and the artists share a name, e.g. "Bethel Music" ~ "Bethel Music & Jenn Johnson". */
export function sameSong(candidate: Song, found: Song) {
  const title = normalize(candidate.title);
  const foundTitle = normalize(found.title);
  if (!title || !(foundTitle === title || foundTitle.startsWith(`${title} `))) return false;
  // Hymns are recorded by many artists; the title is enough, and the performer is shown.
  if (/\b(hymn|traditional)\b/.test(normalize(candidate.artist))) return true;
  const artist = words(candidate.artist);
  return [...words(found.artist)].some((word) => artist.has(word));
}

// Apple's public iTunes Search API: no key, nothing personal is sent (only title and artist).
export function createItunesCatalog(request: typeof fetch = fetch): SongCatalog {
  return {
    async verify(candidate) {
      const url = new URL('https://itunes.apple.com/search');
      url.searchParams.set('term', `${candidate.title} ${candidate.artist}`);
      url.searchParams.set('media', 'music');
      url.searchParams.set('entity', 'song');
      url.searchParams.set('limit', '15');
      const response = await request(url, { signal: AbortSignal.timeout(3000) });
      if (!response.ok) throw new Error('Song catalog unavailable');
      const data = (await response.json()) as {
        results?: { trackName?: unknown; artistName?: unknown }[];
      };
      for (const item of data.results ?? []) {
        if (typeof item.trackName !== 'string' || typeof item.artistName !== 'string') continue;
        const found = {
          title: item.trackName.slice(0, 120),
          artist: item.artistName.slice(0, 120),
        };
        if (sameSong(candidate, found)) return found;
      }
      return undefined;
    },
  };
}
