import type { FastifyReply } from 'fastify';

/** Personal responses must never be stored by browsers, proxies or the service worker. */
export async function noStore(_request: unknown, reply: FastifyReply) {
  reply.header('Cache-Control', 'no-store');
}
