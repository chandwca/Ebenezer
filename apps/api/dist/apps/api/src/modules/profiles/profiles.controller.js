import { cloudProfileResponseSchema, updateCloudProfileSchema } from '@ebenezer/contracts';
import { authContext } from '../../shared/http/auth.js';
import { ApiError } from '../../shared/errors/api-error.js';
import { createProfilesService } from './profiles.service.js';
export function createProfilesController(repositoryFor) {
    function serviceFor(request) {
        const context = authContext(request);
        return createProfilesService(repositoryFor(context), context.actorId);
    }
    return {
        async getOwn(request) {
            return cloudProfileResponseSchema.parse({ profile: await serviceFor(request).getOwn() });
        },
        async updateOwn(request) {
            const input = updateCloudProfileSchema.safeParse(request.body);
            if (!input.success)
                throw new ApiError(400, 'invalid_request', 'Check the profile fields and try again.');
            return cloudProfileResponseSchema.parse({
                profile: await serviceFor(request).updateOwn(input.data),
            });
        },
    };
}
