import { z } from 'zod';
import { answerPrayerLinkSchema, prayerTokenSchema } from '@ebenezer/contracts';
import { ApiError } from '../../shared/errors/api-error.js';
import { parseInput } from '../../shared/http/validate.js';
import { createPrayerLinksService } from './prayer-links.service.js';
const tokenParams = z.object({ token: prayerTokenSchema });
export function createPrayerLinksController(repositoryFor) {
    const service = () => {
        if (!repositoryFor)
            throw new ApiError(503, 'supabase_not_configured', 'Prayer links are not configured.');
        return createPrayerLinksService(repositoryFor());
    };
    // A malformed token gets the same reply as an unknown one.
    const tokenFrom = (request) => {
        const parsed = tokenParams.safeParse(request.params);
        if (!parsed.success)
            throw new ApiError(404, 'not_found', 'This prayer link isn’t available.');
        return parsed.data.token;
    };
    return {
        async open(request) {
            return { request: await service().open(tokenFrom(request)) };
        },
        async answer(request) {
            const token = tokenFrom(request);
            const { note } = parseInput(answerPrayerLinkSchema, request.body);
            return { request: await service().answer(token, note || undefined) };
        },
    };
}
