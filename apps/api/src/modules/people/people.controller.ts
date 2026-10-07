import { z } from 'zod';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  connectionRequestSchema,
  peopleSearchQuerySchema,
  respondConnectionSchema,
} from '@ebenezer/contracts';
import { authContext } from '../../shared/http/auth.js';
import { parseInput } from '../../shared/http/validate.js';
import { createPeopleService } from './people.service.js';
import type { PeopleRepositoryFactory } from './people.types.js';

const idParams = z.object({ id: z.uuid() });

export function createPeopleController(repositoryFor: PeopleRepositoryFactory) {
  const serviceFor = (request: FastifyRequest) =>
    createPeopleService(repositoryFor(authContext(request)));
  return {
    async search(request: FastifyRequest) {
      const { q } = parseInput(peopleSearchQuerySchema, request.query);
      return { people: await serviceFor(request).search(q) };
    },
    async listConnections(request: FastifyRequest) {
      return { connections: await serviceFor(request).listConnections() };
    },
    async request(request: FastifyRequest, reply: FastifyReply) {
      const { userId } = parseInput(connectionRequestSchema, request.body);
      reply.code(201);
      return { connection: await serviceFor(request).request(userId) };
    },
    async respond(request: FastifyRequest) {
      const { id } = parseInput(idParams, request.params);
      const { accept } = parseInput(respondConnectionSchema, request.body);
      return { connection: await serviceFor(request).respond(id, accept) };
    },
    async remove(request: FastifyRequest, reply: FastifyReply) {
      const { id } = parseInput(idParams, request.params);
      await serviceFor(request).remove(id);
      return reply.code(204).send();
    },
  };
}
