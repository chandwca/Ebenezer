import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../../shared/errors/api-error.js';
import { createFakeProfilesRepository } from './profiles.repository.fake.js';
import { createProfilesService } from './profiles.service.js';

const alice = '11111111-1111-4111-8111-111111111111';
const rejectsWith = (status: number, code: string) => (error: unknown) =>
  error instanceof ApiError && error.status === status && error.code === code;

test('reading a profile that does not exist yet asks the person to create one', async () => {
  const { repository } = createFakeProfilesRepository();
  await assert.rejects(
    createProfilesService(repository, alice).getOwn(),
    rejectsWith(404, 'profile_not_found'),
  );
});

test('the first update needs both a display name and a handle', async () => {
  const { repository, rows } = createFakeProfilesRepository();
  const service = createProfilesService(repository, alice);
  for (const input of [{ displayName: 'Alice' }, { handle: 'alice' }]) {
    await assert.rejects(service.updateOwn(input), rejectsWith(400, 'profile_incomplete'));
  }
  assert.equal(rows.size, 0);
  const created = await service.updateOwn({ displayName: 'Alice', handle: 'alice' });
  assert.deepEqual(
    { id: created.id, displayName: created.displayName, handle: created.handle },
    { id: alice, displayName: 'Alice', handle: 'alice' },
  );
});

test('later updates change only the fields that were supplied', async () => {
  const { repository, rows } = createFakeProfilesRepository();
  const service = createProfilesService(repository, alice);
  await service.updateOwn({ displayName: 'Alice', handle: 'alice' });
  const renamed = await service.updateOwn({ displayName: 'Alicia' });
  assert.equal(renamed.displayName, 'Alicia');
  assert.equal(renamed.handle, 'alice');
  assert.equal(rows.get(alice)?.handle, 'alice');
});

test('a profile removed between read and write is reported as not found', async () => {
  const { repository, rows } = createFakeProfilesRepository();
  const service = createProfilesService(repository, alice);
  await service.updateOwn({ displayName: 'Alice', handle: 'alice' });
  const findOwn = repository.findOwn;
  repository.findOwn = async (id) => {
    const row = await findOwn(id);
    rows.delete(id);
    return row;
  };
  await assert.rejects(
    service.updateOwn({ displayName: 'Alicia' }),
    rejectsWith(404, 'profile_not_found'),
  );
});

test('rows are mapped to the API shape without leaking column names', async () => {
  const { repository } = createFakeProfilesRepository('2026-10-06T12:00:00.000Z');
  const profile = await createProfilesService(repository, alice).updateOwn({
    displayName: 'Alice',
    handle: 'alice',
  });
  assert.deepEqual(Object.keys(profile).sort(), [
    'createdAt',
    'displayName',
    'handle',
    'id',
    'updatedAt',
  ]);
});
