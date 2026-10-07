import type { AuthContext } from '../../shared/supabase/auth-gateway.js';

/** Raw JSON from the database functions; the service validates it against the contracts. */
export interface PeopleRepository {
  search(query: string): Promise<unknown>;
  listConnections(): Promise<unknown>;
  request(userId: string): Promise<unknown>;
  respond(connectionId: string, accept: boolean): Promise<unknown>;
  remove(connectionId: string): Promise<void>;
}
export type PeopleRepositoryFactory = (context: AuthContext) => PeopleRepository;
