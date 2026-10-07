import { z } from 'zod';
import { communityGroupSchema, groupMemberSchema, } from '@ebenezer/contracts';
export function createGroupsService(repository) {
    return {
        async list() {
            return z.array(communityGroupSchema).parse(await repository.list());
        },
        async create(values) {
            return communityGroupSchema.parse(await repository.create(values));
        },
        async update(groupId, values) {
            return communityGroupSchema.parse(await repository.update(groupId, values));
        },
        remove: (groupId) => repository.remove(groupId),
        async join(groupId) {
            return communityGroupSchema.parse(await repository.join(groupId));
        },
        leave: (groupId) => repository.leave(groupId),
        async members(groupId) {
            return z.array(groupMemberSchema).parse(await repository.members(groupId));
        },
        invite: (groupId, userId) => repository.invite(groupId, userId),
        setRole: (groupId, userId, role) => repository.setRole(groupId, userId, role),
        removeMember: (groupId, userId) => repository.removeMember(groupId, userId),
    };
}
