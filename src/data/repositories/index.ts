export type RepositoryWriteOptions = {
  now: Date;
};

export { createBudgetPlanningRepository, type BudgetPlanningRepository } from './budget-planning.repository';
export { createCategoryTopicRepository, type CategoryTopicRepository } from './category-topic.repository';
export { createDiagnosticsRepository, type DiagnosticsRepository } from './diagnostics.repository';
export { createMoneyRecordRepository, type MoneyRecordRepository } from './money-records.repository';
export { createPreferencesRepository, type PreferencesRepository } from './preferences.repository';
export { createRecurrenceRuleRepository, type RecurrenceRuleRepository } from './recurrence-rules.repository';
export { createReminderRepository, type ReminderRepository } from './reminders.repository';
export { createTaskRepository, type TaskRepository } from './tasks.repository';
export { createTaskRecurrenceRepository, type TaskRecurrenceRepository } from './task-recurrence.repository';
export { createWorkEntryRepository, type WorkEntryRepository } from './work-entries.repository';
export { createWorkspaceRepository, type WorkspaceRepository } from './workspace.repository';
