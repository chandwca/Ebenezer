import { cloudProfileResponseSchema, updateCloudProfileSchema } from '@ebenezer/contracts';
import type { FastifyRequest } from 'fastify';
import { authContext } from '../../shared/http/auth.js';
import { ApiError } from '../../shared/errors/api-error.js';
import { createProfilesService } from './profiles.service.js';
import type { ProfilesRepositoryFactory } from './profiles.types.js';

export function createProfilesController(repositoryFor: ProfilesRepositoryFactory) {
  function serviceFor(request: FastifyRequest) {
    const context = authContext(request);
    return createProfilesService(repositoryFor(context), context.actorId);
  }
  return {
    async getOwn(request: FastifyRequest) {
      return cloudProfileResponseSchema.parse({ profile: await serviceFor(request).getOwn() });
    },
    async updateOwn(request: FastifyRequest) {
      const input = updateCloudProfileSchema.safeParse(request.body);
      if (!input.success)
        throw new ApiError(400, 'invalid_request', 'Check the profile fields and try again.');
      return cloudProfileResponseSchema.parse({
        profile: await serviceFor(request).updateOwn(input.data),
      });
    },
  };
}
