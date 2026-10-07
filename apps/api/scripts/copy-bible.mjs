import { copyFile, mkdir } from 'node:fs/promises';
const directory = new URL('../dist/apps/api/src/shared/bible/', import.meta.url);
await mkdir(directory, { recursive: true });
await copyFile(
  new URL('../../web/data/bible/full.json', import.meta.url),
  new URL('full-bible.json', directory),
);
