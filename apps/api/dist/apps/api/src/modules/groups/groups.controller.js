import { z } from 'zod';
import { createGroupSchema, groupInviteSchema, groupRoleChangeSchema } from '@ebenezer/contracts';
import { authContext } from '../../shared/http/auth.js';
import { parseInput } from '../../shared/http/validate.js';
import { createGroupsService } from './groups.service.js';
const groupParams = z.object({ id: z.uuid() });
const memberParams = z.object({ id: z.uuid(), userId: z.uuid() });
export function createGroupsController(repositoryFor) {
    const serviceFor = (request) => createGroupsService(repositoryFor(authContext(request)));
    return {
        async list(request) {
            return { groups: await serviceFor(request).list() };
        },
        async create(request, reply) {
            const values = parseInput(createGroupSchema, request.body);
            reply.code(201);
            return { group: await serviceFor(request).create(values) };
        },
        async update(request) {
            const { id } = parseInput(groupParams, request.params);
            const values = parseInput(createGroupSchema, request.body);
            return { group: await serviceFor(request).update(id, values) };
        },
        async remove(request, reply) {
            const { id } = parseInput(groupParams, request.params);
            await serviceFor(request).remove(id);
            return reply.code(204).send();
        },
        async join(request) {
            const { id } = parseInput(groupParams, request.params);
            return { group: await serviceFor(request).join(id) };
        },
        async leave(request, reply) {
            const { id } = parseInput(groupParams, request.params);
            await serviceFor(request).leave(id);
            return reply.code(204).send();
        },
        async members(request) {
            const { id } = parseInput(groupParams, request.params);
            return { members: await serviceFor(request).members(id) };
        },
        async invite(request, reply) {
            const { id } = parseInput(groupParams, request.params);
            const { userId } = parseInput(groupInviteSchema, request.body);
            await serviceFor(request).invite(id, userId);
            return reply.code(204).send();
        },
        async setRole(request, reply) {
            const { id, userId } = parseInput(memberParams, request.params);
            const { role } = parseInput(groupRoleChangeSchema, request.body);
            await serviceFor(request).setRole(id, userId, role);
            return reply.code(204).send();
        },
        async removeMember(request, reply) {
            const { id, userId } = parseInput(memberParams, request.params);
            await serviceFor(request).removeMember(id, userId);
            return reply.code(204).send();
        },
    };
}
