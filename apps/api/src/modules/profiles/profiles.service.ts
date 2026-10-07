import type { CloudProfile, UpdateCloudProfile } from '@ebenezer/contracts';
import { ApiError } from '../../shared/errors/api-error.js';
import type { ProfileRow, ProfilesRepository } from './profiles.types.js';

function toProfile(row: ProfileRow): CloudProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    handle: row.handle,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createProfilesService(repository: ProfilesRepository, actorId: string) {
  return {
    async getOwn() {
      const row = await repository.findOwn(actorId);
      if (!row) throw new ApiError(404, 'profile_not_found', 'Create your profile to get started.');
      return toProfile(row);
    },
    async updateOwn(input: UpdateCloudProfile) {
      const existing = await repository.findOwn(actorId);
      if (!existing) {
        if (input.displayName === undefined || input.handle === undefined) {
          throw new ApiError(
            400,
            'profile_incomplete',
            'Your first profile needs a display name and handle.',
          );
        }
        return toProfile(
          await repository.createOwn(actorId, {
            display_name: input.displayName,
            handle: input.handle,
          }),
        );
      }
      // PATCH writes only supplied fields, not a stale copy of the entire row.
      const fields = {
        ...(input.displayName !== undefined ? { display_name: input.displayName } : {}),
        ...(input.handle !== undefined ? { handle: input.handle } : {}),
      };
      const row = await repository.updateOwn(actorId, fields);
      if (!row)
        throw new ApiError(404, 'profile_not_found', 'Your profile is no longer available.');
      return toProfile(row);
    },
  };
}
