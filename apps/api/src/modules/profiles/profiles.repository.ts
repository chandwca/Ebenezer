import type { UserScopedSupabaseClient } from '../../shared/supabase/client-types.js';
import { databaseError as throwDatabaseError } from '../../shared/errors/database-error.js';
import type { ProfilesRepository } from './profiles.types.js';

function databaseError(error: { code: string }): never {
  throwDatabaseError(error, {
    uniqueViolation: {
      code: 'profile_conflict',
      message: 'This handle or profile already exists.',
    },
    checkViolation: { code: 'invalid_profile', message: 'The profile fields are invalid.' },
    insufficientPrivilege: {
      code: 'forbidden',
      message: 'You cannot perform this profile operation.',
    },
    unavailable: {
      code: 'database_unavailable',
      message: 'Profile storage is unavailable. Please try again.',
    },
  });
}

export function createProfilesRepository(client: UserScopedSupabaseClient): ProfilesRepository {
  const columns = 'id, display_name, handle, created_at, updated_at';
  return {
    async findOwn(actorId) {
      const { data, error } = await client
        .from('profiles')
        .select(columns)
        .eq('id', actorId)
        .maybeSingle();
      if (error) databaseError(error);
      return data;
    },
    async createOwn(actorId, fields) {
      const { data, error } = await client
        .from('profiles')
        .insert({ id: actorId, ...fields })
        .select(columns)
        .single();
      if (error) databaseError(error);
      return data;
    },
    async updateOwn(actorId, fields) {
      const { data, error } = await client
        .from('profiles')
        .update(fields)
        .eq('id', actorId)
        .select(columns)
        .maybeSingle();
      if (error) databaseError(error);
      return data;
    },
  };
}
