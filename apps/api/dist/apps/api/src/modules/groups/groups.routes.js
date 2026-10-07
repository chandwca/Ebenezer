import { requireAuth } from '../../shared/http/auth.js';
import { noStore } from '../../shared/http/no-store.js';
import { createGroupsController } from './groups.controller.js';
import { createGroupsRepository } from './groups.repository.js';
export function registerGroupRoutes(app, gateway, repositoryFor = (context) => createGroupsRepository(context.client)) {
    const controller = createGroupsController(repositoryFor);
    const options = { onRequest: requireAuth(gateway), onSend: noStore };
    app.get('/groups', options, controller.list);
    app.post('/groups', options, controller.create);
    app.patch('/groups/:id', options, controller.update);
    app.delete('/groups/:id', options, controller.remove);
    // Joining an open group or accepting an invitation; leaving or declining.
    app.put('/groups/:id/membership', options, controller.join);
    app.delete('/groups/:id/membership', options, controller.leave);
    app.get('/groups/:id/members', options, controller.members);
    app.post('/groups/:id/members', options, controller.invite);
    app.patch('/groups/:id/members/:userId', options, controller.setRole);
    app.delete('/groups/:id/members/:userId', options, controller.removeMember);
}
