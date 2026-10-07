import { z } from 'zod';
import { connectionRequestSchema, peopleSearchQuerySchema, respondConnectionSchema, } from '@ebenezer/contracts';
import { authContext } from '../../shared/http/auth.js';
import { parseInput } from '../../shared/http/validate.js';
import { createPeopleService } from './people.service.js';
const idParams = z.object({ id: z.uuid() });
export function createPeopleController(repositoryFor) {
    const serviceFor = (request) => createPeopleService(repositoryFor(authContext(request)));
    return {
        async search(request) {
            const { q } = parseInput(peopleSearchQuerySchema, request.query);
            return { people: await serviceFor(request).search(q) };
        },
        async listConnections(request) {
            return { connections: await serviceFor(request).listConnections() };
        },
        async request(request, reply) {
            const { userId } = parseInput(connectionRequestSchema, request.body);
            reply.code(201);
            return { connection: await serviceFor(request).request(userId) };
        },
        async respond(request) {
            const { id } = parseInput(idParams, request.params);
            const { accept } = parseInput(respondConnectionSchema, request.body);
            return { connection: await serviceFor(request).respond(id, accept) };
        },
        async remove(request, reply) {
            const { id } = parseInput(idParams, request.params);
            await serviceFor(request).remove(id);
            return reply.code(204).send();
        },
    };
}
