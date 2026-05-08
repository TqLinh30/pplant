import { openPplantDatabase } from '@/data/db/client';
import { createAppError } from '@/domain/common/app-error';
import { err, ok, type AppResult } from '@/domain/common/result';

export type MigrationReport = {
  applied: number;
  appliedMigrations: string[];
};

export type MigrationClient = {
  execSync(source: string): void;
  getFirstSync<T>(source: string, ...params: unknown[]): T | null;
  runSync(source: string, ...params: unknown[]): unknown;
};

export type MigrationDatabase = {
  $client: MigrationClient;
};

export type OpenMigrationDatabase = () => MigrationDatabase;

export const workspaceMigrationId = '001_create_local_workspace';
export const preferencesMigrationId = '002_create_user_preferences';
export const categoryTopicMigrationId = '003_create_categories_topics';
export const budgetPlanningMigrationId = '004_create_budgets_savings_goals';
export const moneyRecordsMigrationId = '005_create_money_records';
export const moneyRecordCorrectionsMigrationId = '006_add_money_record_corrections';
export const recurringMoneyMigrationId = '007_create_recurring_money_rules';

const createMigrationTrackingTableSql = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY NOT NULL,
  applied_at TEXT NOT NULL
);
`;

const workspaceMigrationSql = `
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1
);
`;

const preferencesMigrationSql = `
CREATE TABLE IF NOT EXISTS user_preferences (
  workspace_id TEXT PRIMARY KEY NOT NULL,
  currency_code TEXT NOT NULL,
  locale TEXT NOT NULL,
  monthly_budget_reset_day INTEGER NOT NULL,
  default_hourly_wage_minor INTEGER NOT NULL,
  default_hourly_wage_currency_code TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

const categoryTopicMigrationSql = `
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_categories_workspace_active_order
  ON categories (workspace_id, archived_at, sort_order);

CREATE INDEX IF NOT EXISTS idx_categories_workspace_name_active
  ON categories (workspace_id, archived_at, name);

CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_topics_workspace_active_order
  ON topics (workspace_id, archived_at, sort_order);

CREATE INDEX IF NOT EXISTS idx_topics_workspace_name_active
  ON topics (workspace_id, archived_at, name);
`;

const budgetPlanningMigrationSql = `
CREATE TABLE IF NOT EXISTS budgets (
  workspace_id TEXT PRIMARY KEY NOT NULL,
  monthly_budget_amount_minor INTEGER NOT NULL,
  currency_code TEXT NOT NULL,
  reset_day_source TEXT NOT NULL,
  rollover_policy TEXT NOT NULL,
  over_budget_behavior TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS savings_goals (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  target_amount_minor INTEGER NOT NULL,
  current_amount_minor INTEGER NOT NULL,
  currency_code TEXT NOT NULL,
  target_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_savings_goals_workspace_active_target_date
  ON savings_goals (workspace_id, archived_at, target_date);

CREATE INDEX IF NOT EXISTS idx_savings_goals_workspace_active_name
  ON savings_goals (workspace_id, archived_at, name);
`;

const moneyRecordsMigrationSql = `
CREATE TABLE IF NOT EXISTS money_records (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  amount_minor INTEGER NOT NULL,
  currency_code TEXT NOT NULL,
  local_date TEXT NOT NULL,
  category_id TEXT,
  merchant_or_source TEXT,
  note TEXT,
  source TEXT NOT NULL,
  source_of_truth TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_money_records_workspace_date_kind
  ON money_records (workspace_id, deleted_at, local_date, kind);

CREATE INDEX IF NOT EXISTS idx_money_records_workspace_category_date
  ON money_records (workspace_id, category_id, deleted_at, local_date);

CREATE TABLE IF NOT EXISTS money_record_topics (
  money_record_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (money_record_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_money_record_topics_workspace_topic
  ON money_record_topics (workspace_id, topic_id);

CREATE INDEX IF NOT EXISTS idx_money_record_topics_record
  ON money_record_topics (money_record_id);
`;

const moneyRecordCorrectionsMigrationSql = `
ALTER TABLE money_records ADD COLUMN user_corrected_at TEXT;
`;

const recurringMoneyMigrationSql = `
CREATE TABLE IF NOT EXISTS recurrence_rules (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL,
  owner_kind TEXT NOT NULL,
  frequency TEXT NOT NULL,
  starts_on_local_date TEXT NOT NULL,
  ends_on_local_date TEXT,
  last_generated_local_date TEXT,
  paused_at TEXT,
  stopped_at TEXT,
  deleted_at TEXT,
  money_kind TEXT NOT NULL,
  amount_minor INTEGER NOT NULL,
  currency_code TEXT NOT NULL,
  category_id TEXT,
  merchant_or_source TEXT,
  note TEXT,
  source TEXT NOT NULL,
  source_of_truth TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_recurrence_rules_workspace_owner_active
  ON recurrence_rules (workspace_id, owner_kind, deleted_at, paused_at, stopped_at);

CREATE INDEX IF NOT EXISTS idx_recurrence_rules_workspace_due
  ON recurrence_rules (workspace_id, deleted_at, paused_at, stopped_at, starts_on_local_date);

CREATE TABLE IF NOT EXISTS recurrence_rule_topics (
  recurrence_rule_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (recurrence_rule_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_recurrence_rule_topics_rule
  ON recurrence_rule_topics (recurrence_rule_id);

CREATE TABLE IF NOT EXISTS recurrence_exceptions (
  id TEXT PRIMARY KEY NOT NULL,
  recurrence_rule_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  occurrence_local_date TEXT NOT NULL,
  action TEXT NOT NULL,
  money_record_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_recurrence_exceptions_rule_date
  ON recurrence_exceptions (recurrence_rule_id, occurrence_local_date);

ALTER TABLE money_records ADD COLUMN recurrence_rule_id TEXT;
ALTER TABLE money_records ADD COLUMN recurrence_occurrence_date TEXT;

CREATE INDEX IF NOT EXISTS idx_money_records_recurrence_occurrence
  ON money_records (workspace_id, recurrence_rule_id, recurrence_occurrence_date, deleted_at);
`;

const migrations = [
  {
    id: workspaceMigrationId,
    sql: workspaceMigrationSql,
  },
  {
    id: preferencesMigrationId,
    sql: preferencesMigrationSql,
  },
  {
    id: categoryTopicMigrationId,
    sql: categoryTopicMigrationSql,
  },
  {
    id: budgetPlanningMigrationId,
    sql: budgetPlanningMigrationSql,
  },
  {
    id: moneyRecordsMigrationId,
    sql: moneyRecordsMigrationSql,
  },
  {
    id: moneyRecordCorrectionsMigrationId,
    sql: moneyRecordCorrectionsMigrationSql,
  },
  {
    id: recurringMoneyMigrationId,
    sql: recurringMoneyMigrationSql,
  },
] as const;

function hasMigration(client: MigrationClient, migrationId: string): boolean {
  return client.getFirstSync<{ id: string }>(
    'SELECT id FROM schema_migrations WHERE id = ? LIMIT 1',
    migrationId,
  ) !== null;
}

function recordMigration(client: MigrationClient, migrationId: string, now: Date): void {
  client.runSync('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)', migrationId, now.toISOString());
}

export async function migrateDatabase(
  database?: MigrationDatabase,
  now: Date = new Date(),
  openDatabase: OpenMigrationDatabase = openPplantDatabase,
): Promise<AppResult<MigrationReport>> {
  try {
    const client = (database ?? openDatabase()).$client;
    const appliedMigrations: string[] = [];

    client.execSync(createMigrationTrackingTableSql);

    for (const migration of migrations) {
      if (hasMigration(client, migration.id)) {
        continue;
      }

      client.execSync(migration.sql);
      recordMigration(client, migration.id, now);
      appliedMigrations.push(migration.id);
    }

    return ok({
      applied: appliedMigrations.length,
      appliedMigrations,
    });
  } catch (cause) {
    return err(
      createAppError(
        'unavailable',
        'Local data could not be prepared. Please try again.',
        'retry',
        cause,
      ),
    );
  }
}
