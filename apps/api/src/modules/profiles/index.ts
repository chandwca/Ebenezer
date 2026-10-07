// Public surface of the profiles module. Other modules import only from here.
export { registerProfileRoutes } from './profiles.routes.js';
export type {
  ProfileRow,
  ProfilesRepository,
  ProfilesRepositoryFactory,
} from './profiles.types.js';
