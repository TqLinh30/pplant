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

export const schema = {
  schemaMigrations,
  userPreferences,
  workspaces,
};

export type DatabaseSchema = typeof schema;
