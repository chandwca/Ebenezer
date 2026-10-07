import { z } from 'zod';
import { connectionSchema, personSearchResultSchema } from '@ebenezer/contracts';
import type { PeopleRepository } from './people.types.js';

export function createPeopleService(repository: PeopleRepository) {
  return {
    async search(query: string) {
      return z.array(personSearchResultSchema).parse(await repository.search(query));
    },
    async listConnections() {
      return z.array(connectionSchema).parse(await repository.listConnections());
    },
    async request(userId: string) {
      return connectionSchema.parse(await repository.request(userId));
    },
    /** Declining removes the request, so there is no connection to return. */
    async respond(connectionId: string, accept: boolean) {
      return connectionSchema.nullable().parse(await repository.respond(connectionId, accept));
    },
    remove: (connectionId: string) => repository.remove(connectionId),
  };
}
