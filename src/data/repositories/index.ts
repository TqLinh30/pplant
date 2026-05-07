export type RepositoryWriteOptions = {
  now: Date;
};

export { createCategoryTopicRepository, type CategoryTopicRepository } from './category-topic.repository';
export { createPreferencesRepository, type PreferencesRepository } from './preferences.repository';
export { createWorkspaceRepository, type WorkspaceRepository } from './workspace.repository';
