import type { Database } from '../../database/database.types.js';
import type { AuthContext } from '../../shared/supabase/auth-gateway.js';

export type ProfileRow = Database['ebenezer_api']['Tables']['profiles']['Row'];
export type ProfileChanges = Pick<
  Database['ebenezer_api']['Tables']['profiles']['Update'],
  'display_name' | 'handle'
>;
export interface ProfilesRepository {
  findOwn(actorId: string): Promise<ProfileRow | null>;
  createOwn(actorId: string, fields: { display_name: string; handle: string }): Promise<ProfileRow>;
  updateOwn(actorId: string, fields: ProfileChanges): Promise<ProfileRow | null>;
}
export type ProfilesRepositoryFactory = (context: AuthContext) => ProfilesRepository;
