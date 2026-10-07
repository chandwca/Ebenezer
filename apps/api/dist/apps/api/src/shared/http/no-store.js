/** Personal responses must never be stored by browsers, proxies or the service worker. */
export async function noStore(_request, reply) {
    reply.header('Cache-Control', 'no-store');
}
