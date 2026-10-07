import { z } from 'zod';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { createGroupSchema, groupInviteSchema, groupRoleChangeSchema } from '@ebenezer/contracts';
import { authContext } from '../../shared/http/auth.js';
import { parseInput } from '../../shared/http/validate.js';
import { createGroupsService } from './groups.service.js';
import type { GroupsRepositoryFactory } from './groups.types.js';

const groupParams = z.object({ id: z.uuid() });
const memberParams = z.object({ id: z.uuid(), userId: z.uuid() });

export function createGroupsController(repositoryFor: GroupsRepositoryFactory) {
  const serviceFor = (request: FastifyRequest) =>
    createGroupsService(repositoryFor(authContext(request)));
  return {
    async list(request: FastifyRequest) {
      return { groups: await serviceFor(request).list() };
    },
    async create(request: FastifyRequest, reply: FastifyReply) {
      const values = parseInput(createGroupSchema, request.body);
      reply.code(201);
      return { group: await serviceFor(request).create(values) };
    },
    async update(request: FastifyRequest) {
      const { id } = parseInput(groupParams, request.params);
      const values = parseInput(createGroupSchema, request.body);
      return { group: await serviceFor(request).update(id, values) };
    },
    async remove(request: FastifyRequest, reply: FastifyReply) {
      const { id } = parseInput(groupParams, request.params);
      await serviceFor(request).remove(id);
      return reply.code(204).send();
    },
    async join(request: FastifyRequest) {
      const { id } = parseInput(groupParams, request.params);
      return { group: await serviceFor(request).join(id) };
    },
    async leave(request: FastifyRequest, reply: FastifyReply) {
      const { id } = parseInput(groupParams, request.params);
      await serviceFor(request).leave(id);
      return reply.code(204).send();
    },
    async members(request: FastifyRequest) {
      const { id } = parseInput(groupParams, request.params);
      return { members: await serviceFor(request).members(id) };
    },
    async invite(request: FastifyRequest, reply: FastifyReply) {
      const { id } = parseInput(groupParams, request.params);
      const { userId } = parseInput(groupInviteSchema, request.body);
      await serviceFor(request).invite(id, userId);
      return reply.code(204).send();
    },
    async setRole(request: FastifyRequest, reply: FastifyReply) {
      const { id, userId } = parseInput(memberParams, request.params);
      const { role } = parseInput(groupRoleChangeSchema, request.body);
      await serviceFor(request).setRole(id, userId, role);
      return reply.code(204).send();
    },
    async removeMember(request: FastifyRequest, reply: FastifyReply) {
      const { id, userId } = parseInput(memberParams, request.params);
      await serviceFor(request).removeMember(id, userId);
      return reply.code(204).send();
    },
  };
}
