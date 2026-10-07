import { reflectionSchema, type ReflectionValues } from '@ebenezer/contracts';
import { backupSchema } from './backup';
import { db, type JournalDatabase, type Stone } from './database';

export const REFLECTION_DRAFT = 'local:reflection';
export const LOCAL_ACCOUNT = 'local';

export function journalRepository(database: JournalDatabase = db) {
  return {
    getDraft: () => database.drafts.get(REFLECTION_DRAFT),
    saveDraft: (values: ReflectionValues, step: number) =>
      database.drafts.put({
        id: REFLECTION_DRAFT,
        values,
        step,
        updatedAt: new Date().toISOString(),
      }),
    async saveStone(
      values: ReflectionValues,
      options: { accountId?: string; sync?: boolean; id?: string; preserveDraft?: boolean } = {},
    ) {
      const parsed = reflectionSchema.parse(values);
      const accountId = options.accountId ?? LOCAL_ACCOUNT;
      if (options.sync && accountId === LOCAL_ACCOUNT)
        throw new Error('Cloud operations require an account.');
      const now = new Date();
      const iso = now.toISOString();
      const id = options.id ?? crypto.randomUUID();
      const journalDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10);
      return database.transaction(
        'rw',
        database.stones,
        database.outbox,
        database.drafts,
        async () => {
          const previous = await database.stones.get(id);
          if (previous && (previous.accountId !== accountId || previous.deletedAt))
            throw new Error('Account mismatch.');
          if (options.id && !previous) throw new Error('Stone no longer exists.');
          const stone: Stone = {
            ...parsed,
            id,
            accountId,
            journalDate: previous?.journalDate ?? journalDate,
            createdAt: previous?.createdAt ?? iso,
            updatedAt: iso,
            version: previous?.version ?? 0,
            syncState: options.sync ? 'pending' : 'local',
          };
          await database.stones.put(stone);
          if (options.sync)
            await database.outbox.add({
              id: crypto.randomUUID(),
              accountId,
              entityId: id,
              action: 'save_stone',
              baseVersion: stone.version,
              payload: stone,
              createdAt: iso,
            });
          if (!options.preserveDraft) await database.drafts.delete(REFLECTION_DRAFT);
          return stone;
        },
      );
    },
    async deleteStone(id: string, accountId = LOCAL_ACCOUNT) {
      return database.transaction('rw', database.stones, database.outbox, async () => {
        const stone = await database.stones.get(id);
        if (!stone || stone.accountId !== accountId) throw new Error('Account mismatch.');
        if (stone.syncState === 'local') {
          await database.stones.delete(id);
          return;
        }
        const deletedAt = new Date().toISOString();
        const deleted: Stone = { ...stone, deletedAt, updatedAt: deletedAt, syncState: 'pending' };
        await database.stones.put(deleted);
        await database.outbox.add({
          id: crypto.randomUUID(),
          accountId,
          entityId: id,
          action: 'delete_stone',
          baseVersion: stone.version,
          payload: deleted,
          createdAt: deletedAt,
        });
      });
    },
    listStones: async (accountId = LOCAL_ACCOUNT) =>
      (await database.stones.where('accountId').equals(accountId).toArray())
        .filter((stone) => !stone.deletedAt)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    async exportBackup() {
      const stones = await this.listStones();
      return backupSchema.parse({
        format: 'ebenezer-journal',
        version: 1,
        exportedAt: new Date().toISOString(),
        stones: stones.map(({ id, journalDate, createdAt, updatedAt, ...values }) => ({
          ...reflectionSchema.parse(values),
          id,
          journalDate,
          createdAt,
          updatedAt,
        })),
      });
    },
    async importBackup(input: unknown) {
      const backup = backupSchema.parse(input);
      return database.transaction('rw', database.stones, async () => {
        let imported = 0;
        for (const stone of backup.stones) {
          // Existing IDs are never overwritten, including other accounts and tombstones.
          if (await database.stones.get(stone.id)) continue;
          await database.stones.add({
            ...stone,
            accountId: LOCAL_ACCOUNT,
            version: 0,
            syncState: 'local',
          });
          imported++;
        }
        return { imported, skipped: backup.stones.length - imported };
      });
    },
    setPreference: (key: string, value: string | boolean) =>
      database.preferences.put({ key, value }),
    getPreference: (key: string) => database.preferences.get(key),
  };
}
export const journal = journalRepository();
