import { z } from 'zod';
import {
  communityGroupSchema,
  groupMemberSchema,
  type CreateGroupValues,
} from '@ebenezer/contracts';
import type { GroupsRepository } from './groups.types.js';

export function createGroupsService(repository: GroupsRepository) {
  return {
    async list() {
      return z.array(communityGroupSchema).parse(await repository.list());
    },
    async create(values: CreateGroupValues) {
      return communityGroupSchema.parse(await repository.create(values));
    },
    async update(groupId: string, values: CreateGroupValues) {
      return communityGroupSchema.parse(await repository.update(groupId, values));
    },
    remove: (groupId: string) => repository.remove(groupId),
    async join(groupId: string) {
      return communityGroupSchema.parse(await repository.join(groupId));
    },
    leave: (groupId: string) => repository.leave(groupId),
    async members(groupId: string) {
      return z.array(groupMemberSchema).parse(await repository.members(groupId));
    },
    invite: (groupId: string, userId: string) => repository.invite(groupId, userId),
    setRole: (groupId: string, userId: string, role: 'admin' | 'member') =>
      repository.setRole(groupId, userId, role),
    removeMember: (groupId: string, userId: string) => repository.removeMember(groupId, userId),
  };
}
