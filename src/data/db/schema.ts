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

export const schema = {
  budgets,
  categories,
  moneyRecords,
  moneyRecordTopics,
  savingsGoals,
  schemaMigrations,
  topics,
  userPreferences,
  workspaces,
};

export type DatabaseSchema = typeof schema;
