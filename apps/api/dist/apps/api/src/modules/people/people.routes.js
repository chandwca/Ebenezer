import { requireAuth } from '../../shared/http/auth.js';
import { noStore } from '../../shared/http/no-store.js';
import { createPeopleController } from './people.controller.js';
import { createPeopleRepository } from './people.repository.js';
export function registerPeopleRoutes(app, gateway, repositoryFor = (context) => createPeopleRepository(context.client)) {
    const controller = createPeopleController(repositoryFor);
    const options = { onRequest: requireAuth(gateway), onSend: noStore };
    app.get('/people/search', options, controller.search);
    app.get('/connections', options, controller.listConnections);
    app.post('/connections', options, controller.request);
    app.patch('/connections/:id', options, controller.respond);
    app.delete('/connections/:id', options, controller.remove);
}
