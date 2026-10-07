import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = join(root, 'supabase/tests/database');
const directory = mkdtempSync(join(tmpdir(), 'ebenezer-db-tests-'));

try {
  for (const name of readdirSync(source)
    .filter((name) => name.endsWith('.sql'))
    .sort()) {
    // The CLI mounts test files, not their sibling migrations. Bundle the actual
    // migration into the rehearsal without maintaining a duplicate SQL copy.
    const sql = readFileSync(join(source, name), 'utf8').replace(/^\\ir (.+)$/gm, (_, relative) => {
      const migration = resolve(source, relative.trim());
      if (
        !migration.startsWith(join(root, 'supabase/migrations') + '/') ||
        !migration.endsWith('.sql')
      ) {
        throw new Error('Database tests may include only project migration SQL.');
      }
      return readFileSync(migration, 'utf8');
    });
    writeFileSync(join(directory, name), sql);
  }
  const result = spawnSync('pnpm', ['exec', 'supabase', 'test', 'db', '--local', directory], {
    cwd: root,
    stdio: 'inherit',
  });
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(directory, { recursive: true, force: true });
}
