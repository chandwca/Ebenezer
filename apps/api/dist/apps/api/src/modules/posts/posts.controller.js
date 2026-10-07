import { z } from 'zod';
import { createCommentSchema, createPostSchema, createPrayerLinkSchema, feedQuerySchema, reportPostSchema, updatePostSchema, } from '@ebenezer/contracts';
import { authContext } from '../../shared/http/auth.js';
import { parseInput } from '../../shared/http/validate.js';
import { createPostsService } from './posts.service.js';
const idParams = z.object({ id: z.uuid() });
export function createPostsController(repositoryFor) {
    const serviceFor = (request) => createPostsService(repositoryFor(authContext(request)));
    const noContent = (reply) => reply.code(204).send();
    return {
        async feed(request) {
            return serviceFor(request).feed(parseInput(feedQuerySchema, request.query));
        },
        async create(request, reply) {
            const post = parseInput(createPostSchema, request.body);
            reply.code(201);
            return { post: await serviceFor(request).create(post) };
        },
        async update(request) {
            const { id } = parseInput(idParams, request.params);
            const { body } = parseInput(updatePostSchema, request.body);
            return { post: await serviceFor(request).update(id, body) };
        },
        async withdraw(request, reply) {
            const { id } = parseInput(idParams, request.params);
            await serviceFor(request).withdraw(id);
            return noContent(reply);
        },
        async pray(request) {
            const { id } = parseInput(idParams, request.params);
            return { post: await serviceFor(request).setPrayer(id, true) };
        },
        async unpray(request) {
            const { id } = parseInput(idParams, request.params);
            return { post: await serviceFor(request).setPrayer(id, false) };
        },
        async report(request, reply) {
            const { id } = parseInput(idParams, request.params);
            const { reason, detail } = parseInput(reportPostSchema, request.body);
            await serviceFor(request).report(id, reason, detail);
            return noContent(reply);
        },
        async comments(request) {
            const { id } = parseInput(idParams, request.params);
            return { comments: await serviceFor(request).comments(id) };
        },
        async addComment(request, reply) {
            const { id } = parseInput(idParams, request.params);
            const { body } = parseInput(createCommentSchema, request.body);
            reply.code(201);
            return { comment: await serviceFor(request).addComment(id, body) };
        },
        async deleteComment(request, reply) {
            const { id } = parseInput(idParams, request.params);
            await serviceFor(request).deleteComment(id);
            return noContent(reply);
        },
        async createPrayerLink(request, reply) {
            const { id } = parseInput(idParams, request.params);
            const { label, days } = parseInput(createPrayerLinkSchema, request.body);
            reply.code(201);
            return { link: await serviceFor(request).createPrayerLink(id, label, days) };
        },
        async revokePrayerLink(request, reply) {
            const { id } = parseInput(idParams, request.params);
            await serviceFor(request).revokePrayerLink(id);
            return noContent(reply);
        },
    };
}
