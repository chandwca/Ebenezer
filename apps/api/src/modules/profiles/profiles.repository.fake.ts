import { ApiError } from '../../shared/errors/api-error.js';
import type { ProfileRow, ProfilesRepository } from './profiles.types.js';

/** In-memory stand-in for tests; mirrors the unique-handle rule enforced by PostgreSQL. */
export function createFakeProfilesRepository(timestamp = '2026-10-06T12:00:00.000Z') {
  const rows = new Map<string, ProfileRow>();
  const handleTaken = (handle: string, ownerId?: string) =>
    [...rows.values()].some((row) => row.id !== ownerId && row.handle === handle);
  const conflict = () =>
    new ApiError(409, 'profile_conflict', 'This handle or profile already exists.');
  const repository: ProfilesRepository = {
    async findOwn(id) {
      return rows.get(id) ?? null;
    },
    async createOwn(id, fields) {
      if (handleTaken(fields.handle)) throw conflict();
      const row = { id, ...fields, created_at: timestamp, updated_at: timestamp };
      rows.set(id, row);
      return row;
    },
    async updateOwn(id, fields) {
      const old = rows.get(id);
      if (!old) return null;
      if (fields.handle && handleTaken(fields.handle, id)) throw conflict();
      const row = { ...old, ...fields };
      rows.set(id, row);
      return row;
    },
  };
  return { repository, rows };
}
