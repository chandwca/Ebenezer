import { z } from 'zod';
import { connectionSchema, personSearchResultSchema } from '@ebenezer/contracts';
export function createPeopleService(repository) {
    return {
        async search(query) {
            return z.array(personSearchResultSchema).parse(await repository.search(query));
        },
        async listConnections() {
            return z.array(connectionSchema).parse(await repository.listConnections());
        },
        async request(userId) {
            return connectionSchema.parse(await repository.request(userId));
        },
        /** Declining removes the request, so there is no connection to return. */
        async respond(connectionId, accept) {
            return connectionSchema.nullable().parse(await repository.respond(connectionId, accept));
        },
        remove: (connectionId) => repository.remove(connectionId),
    };
}
