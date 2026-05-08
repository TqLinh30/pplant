import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const schemaMigrations = sqliteTable('schema_migrations', {
  id: text('id').primaryKey(),
  appliedAt: text('applied_at').notNull(),
});

export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  schemaVersion: integer('schema_version').notNull().default(1),
});

export const userPreferences = sqliteTable('user_preferences', {
  workspaceId: text('workspace_id').primaryKey(),
  currencyCode: text('currency_code').notNull(),
  locale: text('locale').notNull(),
  monthlyBudgetResetDay: integer('monthly_budget_reset_day').notNull(),
  defaultHourlyWageMinor: integer('default_hourly_wage_minor').notNull(),
  defaultHourlyWageCurrencyCode: text('default_hourly_wage_currency_code').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  archivedAt: text('archived_at'),
});

export const topics = sqliteTable('topics', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  archivedAt: text('archived_at'),
});

export const budgets = sqliteTable('budgets', {
  workspaceId: text('workspace_id').primaryKey(),
  monthlyBudgetAmountMinor: integer('monthly_budget_amount_minor').notNull(),
  currencyCode: text('currency_code').notNull(),
  resetDaySource: text('reset_day_source').notNull(),
  rolloverPolicy: text('rollover_policy').notNull(),
  overBudgetBehavior: text('over_budget_behavior').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const savingsGoals = sqliteTable('savings_goals', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull(),
  name: text('name').notNull(),
  targetAmountMinor: integer('target_amount_minor').notNull(),
  currentAmountMinor: integer('current_amount_minor').notNull(),
  currencyCode: text('currency_code').notNull(),
  targetDate: text('target_date'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  archivedAt: text('archived_at'),
});

export const moneyRecords = sqliteTable('money_records', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull(),
  kind: text('kind').notNull(),
  amountMinor: integer('amount_minor').notNull(),
  currencyCode: text('currency_code').notNull(),
  localDate: text('local_date').notNull(),
  categoryId: text('category_id'),
  merchantOrSource: text('merchant_or_source'),
  note: text('note'),
  source: text('source').notNull(),
  sourceOfTruth: text('source_of_truth').notNull(),
  userCorrectedAt: text('user_corrected_at'),
  recurrenceRuleId: text('recurrence_rule_id'),
  recurrenceOccurrenceDate: text('recurrence_occurrence_date'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
});

export const moneyRecordTopics = sqliteTable('money_record_topics', {
  moneyRecordId: text('money_record_id').notNull(),
  topicId: text('topic_id').notNull(),
  workspaceId: text('workspace_id').notNull(),
  createdAt: text('created_at').notNull(),
});

export const recurrenceRules = sqliteTable('recurrence_rules', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull(),
  ownerKind: text('owner_kind').notNull(),
  frequency: text('frequency').notNull(),
  startsOnLocalDate: text('starts_on_local_date').notNull(),
  endsOnLocalDate: text('ends_on_local_date'),
  lastGeneratedLocalDate: text('last_generated_local_date'),
  pausedAt: text('paused_at'),
  stoppedAt: text('stopped_at'),
  deletedAt: text('deleted_at'),
  moneyKind: text('money_kind').notNull(),
  amountMinor: integer('amount_minor').notNull(),
  currencyCode: text('currency_code').notNull(),
  categoryId: text('category_id'),
  merchantOrSource: text('merchant_or_source'),
  note: text('note'),
  source: text('source').notNull(),
  sourceOfTruth: text('source_of_truth').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const recurrenceRuleTopics = sqliteTable('recurrence_rule_topics', {
  recurrenceRuleId: text('recurrence_rule_id').notNull(),
  topicId: text('topic_id').notNull(),
  workspaceId: text('workspace_id').notNull(),
  createdAt: text('created_at').notNull(),
});

export const recurrenceExceptions = sqliteTable('recurrence_exceptions', {
  id: text('id').primaryKey(),
  recurrenceRuleId: text('recurrence_rule_id').notNull(),
  workspaceId: text('workspace_id').notNull(),
  occurrenceLocalDate: text('occurrence_local_date').notNull(),
  action: text('action').notNull(),
  moneyRecordId: text('money_record_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const workEntries = sqliteTable('work_entries', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull(),
  entryMode: text('entry_mode').notNull(),
  localDate: text('local_date').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  startedAtLocalDate: text('started_at_local_date'),
  startedAtLocalTime: text('started_at_local_time'),
  endedAtLocalDate: text('ended_at_local_date'),
  endedAtLocalTime: text('ended_at_local_time'),
  breakMinutes: integer('break_minutes').notNull(),
  paid: integer('paid').notNull(),
  wageMinorPerHour: integer('wage_minor_per_hour').notNull(),
  wageCurrencyCode: text('wage_currency_code').notNull(),
  wageSource: text('wage_source').notNull(),
  earnedIncomeMinor: integer('earned_income_minor').notNull(),
  categoryId: text('category_id'),
  note: text('note'),
  source: text('source').notNull(),
  sourceOfTruth: text('source_of_truth').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
});

export const workEntryTopics = sqliteTable('work_entry_topics', {
  workEntryId: text('work_entry_id').notNull(),
  topicId: text('topic_id').notNull(),
  workspaceId: text('workspace_id').notNull(),
  createdAt: text('created_at').notNull(),
});

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull(),
  title: text('title').notNull(),
  notes: text('notes'),
  state: text('state').notNull(),
  priority: text('priority').notNull(),
  deadlineLocalDate: text('deadline_local_date'),
  completedAt: text('completed_at'),
  categoryId: text('category_id'),
  source: text('source').notNull(),
  sourceOfTruth: text('source_of_truth').notNull(),
  userCorrectedAt: text('user_corrected_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
});

export const taskTopics = sqliteTable('task_topics', {
  taskId: text('task_id').notNull(),
  topicId: text('topic_id').notNull(),
  workspaceId: text('workspace_id').notNull(),
  createdAt: text('created_at').notNull(),
});

export const schema = {
  budgets,
  categories,
  moneyRecords,
  moneyRecordTopics,
  recurrenceExceptions,
  recurrenceRules,
  recurrenceRuleTopics,
  savingsGoals,
  schemaMigrations,
  tasks,
  taskTopics,
  topics,
  userPreferences,
  workEntries,
  workEntryTopics,
  workspaces,
};

export type DatabaseSchema = typeof schema;
