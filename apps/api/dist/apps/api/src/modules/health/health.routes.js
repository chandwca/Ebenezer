import { healthSchema } from '@ebenezer/contracts';
export function registerHealthRoutes(app) {
    app.get('/health', () => healthSchema.parse({ status: 'ok', service: 'ebenezer-api' }));
}
