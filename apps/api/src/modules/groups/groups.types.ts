import type { CreateGroupValues } from '@ebenezer/contracts';
import type { AuthContext } from '../../shared/supabase/auth-gateway.js';

/** Raw JSON from the database functions; the service validates it against the contracts. */
export interface GroupsRepository {
  list(): Promise<unknown>;
  create(values: CreateGroupValues): Promise<unknown>;
  update(groupId: string, values: CreateGroupValues): Promise<unknown>;
  remove(groupId: string): Promise<void>;
  join(groupId: string): Promise<unknown>;
  leave(groupId: string): Promise<void>;
  members(groupId: string): Promise<unknown>;
  invite(groupId: string, userId: string): Promise<void>;
  setRole(groupId: string, userId: string, role: 'admin' | 'member'): Promise<void>;
  removeMember(groupId: string, userId: string): Promise<void>;
}
export type GroupsRepositoryFactory = (context: AuthContext) => GroupsRepository;
