export type RepositoryWriteOptions = {
  now: Date;
};

export { createPreferencesRepository, type PreferencesRepository } from './preferences.repository';
export { createWorkspaceRepository, type WorkspaceRepository } from './workspace.repository';
