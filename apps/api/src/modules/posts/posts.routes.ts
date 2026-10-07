import type { FastifyInstance } from 'fastify';
import type { AuthGateway } from '../../shared/supabase/auth-gateway.js';
import { requireAuth } from '../../shared/http/auth.js';
import { noStore } from '../../shared/http/no-store.js';
import { createPostsController } from './posts.controller.js';
import { createPostsRepository } from './posts.repository.js';
import type { PostsRepositoryFactory } from './posts.types.js';

export function registerPostRoutes(
  app: FastifyInstance,
  gateway: AuthGateway | undefined,
  repositoryFor: PostsRepositoryFactory = (context) => createPostsRepository(context.client),
) {
  const controller = createPostsController(repositoryFor);
  const options = { onRequest: requireAuth(gateway), onSend: noStore };
  app.get('/feed', options, controller.feed);
  app.post('/posts', options, controller.create);
  app.patch('/posts/:id', options, controller.update);
  app.delete('/posts/:id', options, controller.withdraw);
  app.put('/posts/:id/prayer', options, controller.pray);
  app.delete('/posts/:id/prayer', options, controller.unpray);
  app.post('/posts/:id/reports', options, controller.report);
  app.get('/posts/:id/comments', options, controller.comments);
  app.post('/posts/:id/comments', options, controller.addComment);
  app.delete('/comments/:id', options, controller.deleteComment);
  app.post('/posts/:id/prayer-links', options, controller.createPrayerLink);
  app.delete('/prayer-links/:id', options, controller.revokePrayerLink);
}
