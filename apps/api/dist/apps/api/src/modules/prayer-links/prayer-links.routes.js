import { noStore } from '../../shared/http/no-store.js';
import { rateLimit } from '../../shared/http/rate-limit.js';
import { createPrayerLinksController } from './prayer-links.controller.js';
/** The only routes that work without an account; the token is the whole credential. */
export function registerPrayerLinkRoutes(app, repositoryFor) {
    const controller = createPrayerLinksController(repositoryFor);
    const options = { onRequest: rateLimit({ max: 30, windowMs: 60_000 }), onSend: noStore };
    app.get('/public/prayer-links/:token', options, controller.open);
    app.post('/public/prayer-links/:token/prayers', options, controller.answer);
}
