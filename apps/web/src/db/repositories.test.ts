import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { emptyReflection } from '@ebenezer/contracts';
import { JournalDatabase } from './database';
import { journalRepository, REFLECTION_DRAFT } from './repositories';

const databases: JournalDatabase[] = [];
function setup() {
  const database = new JournalDatabase(`test-${crypto.randomUUID()}`);
  databases.push(database);
  return { database, repo: journalRepository(database) };
}
const values = {
  ...emptyReflection,
  feel: 'grateful',
  ref: '1 Samuel 7:12',
  readConfirmed: true,
  learned: 'God helped me.',
  memory: 'A friend checked in.',
  tone: 'bright',
};
afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.delete()));
});

describe('local journal persistence', () => {
  it('restores a draft and a saved stone after closing and reopening the database', async () => {
    const { database, repo } = setup();
    await repo.saveDraft(values, 3);
    database.close();
    await database.open();
    expect((await repo.getDraft())?.step).toBe(3);
    const stone = await repo.saveStone(values);
    expect(await repo.getDraft()).toBeUndefined();
    expect(await database.outbox.count()).toBe(0);
    database.close();
    await database.open();
    expect((await repo.listStones())[0].id).toBe(stone.id);
    expect((await repo.listStones())[0].syncState).toBe('local');
  });

  it('atomically queues account-scoped changes and rejects unauthenticated sync requests', async () => {
    const { database, repo } = setup();
    await expect(repo.saveStone(values, { sync: true })).rejects.toThrow('require an account');
    const stone = await repo.saveStone(values, { accountId: 'account-a', sync: true });
    expect(await repo.listStones()).toHaveLength(0);
    expect(await repo.listStones('account-a')).toHaveLength(1);
    expect((await database.outbox.toArray())[0]).toMatchObject({
      accountId: 'account-a',
      entityId: stone.id,
      action: 'save_stone',
    });
    await expect(repo.deleteStone(stone.id, 'account-b')).rejects.toThrow('mismatch');
    await repo.deleteStone(stone.id, 'account-a');
    expect(await repo.listStones('account-a')).toHaveLength(0);
    expect((await database.stones.get(stone.id))?.deletedAt).toBeTruthy();
    expect(await database.outbox.count()).toBe(2);
  });

  it('rolls back the stone and retains the draft when outbox storage fails', async () => {
    const { database, repo } = setup();
    await repo.saveDraft(values, 5);
    database.outbox.hook('creating', () => {
      throw new Error('storage full');
    });
    await expect(repo.saveStone(values, { accountId: 'account-a', sync: true })).rejects.toThrow(
      'storage full',
    );
    expect(await database.stones.count()).toBe(0);
    expect(await database.outbox.count()).toBe(0);
    expect((await repo.getDraft())?.id).toBe(REFLECTION_DRAFT);
  });

  it('stores preferences and deletes local records without queuing cloud work', async () => {
    const { database, repo } = setup();
    await repo.setPreference('theme', 'dark');
    expect((await repo.getPreference('theme'))?.value).toBe('dark');
    const stone = await repo.saveStone(values);
    await repo.deleteStone(stone.id);
    expect(await database.stones.count()).toBe(0);
    expect(await database.outbox.count()).toBe(0);
  });

  it('upgrades the v1 schema without losing existing journal records', async () => {
    const { database, repo } = setup();
    const old = new Dexie(database.name);
    old.version(1).stores({
      stones: 'id, accountId, journalDate, updatedAt, syncState',
      drafts: 'id, updatedAt',
      preferences: 'key',
      outbox: 'id, accountId, entityId, createdAt',
      syncMetadata: 'key',
    });
    await old.table('stones').put({
      ...values,
      id: 'existing',
      accountId: 'local',
      journalDate: '2026-10-05',
      createdAt: '2026-10-05T12:00:00Z',
      updatedAt: '2026-10-05T12:00:00Z',
      version: 0,
      syncState: 'local',
    });
    old.close();
    await database.open();
    expect(database.verno).toBe(3);
    expect((await repo.listStones())[0].id).toBe('existing');
  });
});

it('edits without removing an unfinished reflection and preserves identity and dates', async () => {
  const { repo } = setup();
  const original = await repo.saveStone(values);
  await repo.saveDraft({ ...values, memory: 'Unfinished' }, 4);
  const edited = await repo.saveStone(
    { ...values, memory: 'Updated' },
    { id: original.id, preserveDraft: true },
  );
  expect(edited).toMatchObject({
    id: original.id,
    createdAt: original.createdAt,
    journalDate: original.journalDate,
    memory: 'Updated',
  });
  expect((await repo.getDraft())?.values.memory).toBe('Unfinished');
});

it('round-trips backups locally without duplicates or overwriting later edits', async () => {
  const source = setup();
  const target = setup();
  const stone = await source.repo.saveStone(values);
  const backup = await source.repo.exportBackup();
  expect(await target.repo.importBackup(backup)).toEqual({ imported: 1, skipped: 0 });
  await target.repo.saveStone(
    { ...values, memory: 'Newer edit' },
    { id: stone.id, preserveDraft: true },
  );
  expect(await target.repo.importBackup(backup)).toEqual({ imported: 0, skipped: 1 });
  expect((await target.repo.listStones())[0].memory).toBe('Newer edit');
  expect(await target.database.outbox.count()).toBe(0);
});

it('round-trips mixed feelings and free-text check-ins alongside older single-feeling stones', async () => {
  const source = setup();
  const target = setup();
  await source.repo.saveStone(values);
  const mixed = await source.repo.saveStone({
    ...values,
    feel: 'lonely',
    feelings: ['lonely', 'hopeful'],
    checkIn: 'I miss home, but a friend called.',
  });
  const words = await source.repo.saveStone({
    ...values,
    feel: '',
    feelings: [],
    checkIn: 'I cannot quite name this feeling.',
  });
  await expect(
    source.repo.saveStone({ ...values, feel: '', feelings: [], checkIn: '   ' }),
  ).rejects.toThrow();
  await target.repo.importBackup(await source.repo.exportBackup());
  const stones = await target.repo.listStones();
  expect(stones).toHaveLength(3);
  expect(stones.find((stone) => stone.id === mixed.id)).toMatchObject({
    feelings: ['lonely', 'hopeful'],
    checkIn: 'I miss home, but a friend called.',
  });
  expect(stones.find((stone) => stone.id === words.id)?.checkIn).toBe(
    'I cannot quite name this feeling.',
  );
  expect(stones.find((stone) => stone.id !== mixed.id && stone.id !== words.id)?.feel).toBe(
    'grateful',
  );
});

it('rejects invalid backups before writing and rolls back partial imports on storage failure', async () => {
  const source = setup();
  const target = setup();
  await source.repo.saveStone(values);
  await source.repo.saveStone(values);
  const backup = await source.repo.exportBackup();
  await expect(target.repo.importBackup({ ...backup, version: 99 })).rejects.toThrow();
  await expect(
    target.repo.importBackup({
      ...backup,
      stones: [backup.stones[0], { ...backup.stones[1], journalDate: '2026-02-30' }],
    }),
  ).rejects.toThrow();
  expect(await target.database.stones.count()).toBe(0);
  let count = 0;
  const fail = () => {
    if (++count === 2) throw new Error('Storage full');
  };
  target.database.stones.hook('creating', fail);
  await expect(target.repo.importBackup(backup)).rejects.toThrow('Storage full');
  target.database.stones.hook('creating').unsubscribe(fail);
  expect(await target.database.stones.count()).toBe(0);
});
