import type { FastifyInstance } from 'fastify';
import { healthSchema } from '@ebenezer/contracts';

export function registerHealthRoutes(app: FastifyInstance) {
  app.get('/health', () => healthSchema.parse({ status: 'ok', service: 'ebenezer-api' }));
}
