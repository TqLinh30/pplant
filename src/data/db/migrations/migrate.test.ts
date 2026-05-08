import {
  budgetPlanningMigrationId,
  categoryTopicMigrationId,
  migrateDatabase,
  moneyRecordCorrectionsMigrationId,
  moneyRecordsMigrationId,
  preferencesMigrationId,
  recurringMoneyMigrationId,
  taskRecurrenceMigrationId,
  tasksMigrationId,
  workEntriesMigrationId,
  workspaceMigrationId,
  type MigrationClient,
} from './migrate';

class FakeMigrationClient implements MigrationClient {
  readonly executedSql: string[] = [];
  readonly appliedMigrations = new Set<string>();
  failOnExec = false;

  execSync(source: string): void {
    if (this.failOnExec) {
      throw new Error('sqlite unavailable');
    }

    this.executedSql.push(source);
  }

  getFirstSync<T>(_source: string, ...params: unknown[]): T | null {
    const [migrationId] = params;

    if (typeof migrationId === 'string' && this.appliedMigrations.has(migrationId)) {
      return { id: migrationId } as T;
    }

    return null;
  }

  runSync(_source: string, ...params: unknown[]): unknown {
    const [migrationId] = params;

    if (typeof migrationId === 'string') {
      this.appliedMigrations.add(migrationId);
    }

    return { changes: 1 };
  }
}

const fixedNow = new Date('2026-05-08T00:00:00.000Z');

describe('local database migrations', () => {
  it('applies local migrations once and tracks them', async () => {
    const client = new FakeMigrationClient();

    const firstRun = await migrateDatabase({ $client: client }, fixedNow);
    const secondRun = await migrateDatabase({ $client: client }, fixedNow);

    expect(firstRun).toEqual({
      ok: true,
      value: {
        applied: 10,
        appliedMigrations: [
          workspaceMigrationId,
          preferencesMigrationId,
          categoryTopicMigrationId,
          budgetPlanningMigrationId,
          moneyRecordsMigrationId,
          moneyRecordCorrectionsMigrationId,
          recurringMoneyMigrationId,
          workEntriesMigrationId,
          tasksMigrationId,
          taskRecurrenceMigrationId,
        ],
      },
    });
    expect(secondRun).toEqual({
      ok: true,
      value: {
        applied: 0,
        appliedMigrations: [],
      },
    });
    expect(client.appliedMigrations.has(workspaceMigrationId)).toBe(true);
    expect(client.appliedMigrations.has(preferencesMigrationId)).toBe(true);
    expect(client.appliedMigrations.has(categoryTopicMigrationId)).toBe(true);
    expect(client.appliedMigrations.has(budgetPlanningMigrationId)).toBe(true);
    expect(client.appliedMigrations.has(moneyRecordsMigrationId)).toBe(true);
    expect(client.appliedMigrations.has(moneyRecordCorrectionsMigrationId)).toBe(true);
    expect(client.appliedMigrations.has(recurringMoneyMigrationId)).toBe(true);
    expect(client.appliedMigrations.has(workEntriesMigrationId)).toBe(true);
    expect(client.appliedMigrations.has(tasksMigrationId)).toBe(true);
    expect(client.appliedMigrations.has(taskRecurrenceMigrationId)).toBe(true);
    expect(client.executedSql.join('\n')).toContain('CREATE TABLE IF NOT EXISTS workspaces');
    expect(client.executedSql.join('\n')).toContain('CREATE TABLE IF NOT EXISTS user_preferences');
    expect(client.executedSql.join('\n')).toContain('CREATE TABLE IF NOT EXISTS categories');
    expect(client.executedSql.join('\n')).toContain('CREATE TABLE IF NOT EXISTS topics');
    expect(client.executedSql.join('\n')).toContain('CREATE TABLE IF NOT EXISTS budgets');
    expect(client.executedSql.join('\n')).toContain('CREATE TABLE IF NOT EXISTS savings_goals');
    expect(client.executedSql.join('\n')).toContain('CREATE TABLE IF NOT EXISTS money_records');
    expect(client.executedSql.join('\n')).toContain('CREATE TABLE IF NOT EXISTS money_record_topics');
    expect(client.executedSql.join('\n')).toContain('ALTER TABLE money_records ADD COLUMN user_corrected_at TEXT');
    expect(client.executedSql.join('\n')).toContain('CREATE TABLE IF NOT EXISTS recurrence_rules');
    expect(client.executedSql.join('\n')).toContain('CREATE TABLE IF NOT EXISTS recurrence_rule_topics');
    expect(client.executedSql.join('\n')).toContain('CREATE TABLE IF NOT EXISTS recurrence_exceptions');
    expect(client.executedSql.join('\n')).toContain('ALTER TABLE money_records ADD COLUMN recurrence_rule_id TEXT');
    expect(client.executedSql.join('\n')).toContain('ALTER TABLE money_records ADD COLUMN recurrence_occurrence_date TEXT');
    expect(client.executedSql.join('\n')).toContain('CREATE TABLE IF NOT EXISTS work_entries');
    expect(client.executedSql.join('\n')).toContain('CREATE TABLE IF NOT EXISTS work_entry_topics');
    expect(client.executedSql.join('\n')).toContain('CREATE TABLE IF NOT EXISTS tasks');
    expect(client.executedSql.join('\n')).toContain('CREATE TABLE IF NOT EXISTS task_topics');
    expect(client.executedSql.join('\n')).toContain('CREATE TABLE IF NOT EXISTS task_recurrence_rules');
    expect(client.executedSql.join('\n')).toContain('CREATE TABLE IF NOT EXISTS task_recurrence_topics');
    expect(client.executedSql.join('\n')).toContain('CREATE TABLE IF NOT EXISTS task_recurrence_exceptions');
    expect(client.executedSql.join('\n')).toContain('CREATE TABLE IF NOT EXISTS task_recurrence_completions');
    expect(client.executedSql.join('\n')).toContain('idx_categories_workspace_active_order');
    expect(client.executedSql.join('\n')).toContain('idx_topics_workspace_active_order');
    expect(client.executedSql.join('\n')).toContain('idx_savings_goals_workspace_active_target_date');
    expect(client.executedSql.join('\n')).toContain('idx_money_records_workspace_date_kind');
    expect(client.executedSql.join('\n')).toContain('idx_money_record_topics_workspace_topic');
    expect(client.executedSql.join('\n')).toContain('idx_recurrence_rules_workspace_owner_active');
    expect(client.executedSql.join('\n')).toContain('idx_recurrence_exceptions_rule_date');
    expect(client.executedSql.join('\n')).toContain('idx_money_records_recurrence_occurrence');
    expect(client.executedSql.join('\n')).toContain('idx_work_entries_workspace_date');
    expect(client.executedSql.join('\n')).toContain('idx_work_entry_topics_entry');
    expect(client.executedSql.join('\n')).toContain('idx_tasks_workspace_state_deadline');
    expect(client.executedSql.join('\n')).toContain('idx_task_topics_workspace_topic');
    expect(client.executedSql.join('\n')).toContain('idx_task_recurrence_rules_workspace_active');
    expect(client.executedSql.join('\n')).toContain('idx_task_recurrence_exceptions_rule_date_action');
    expect(client.executedSql.join('\n')).toContain('idx_task_recurrence_completions_rule_date');
    expect(client.executedSql.join('\n')).not.toContain('DROP TABLE');
  });

  it('preserves already applied migrations and only runs missing ones', async () => {
    const client = new FakeMigrationClient();
    client.appliedMigrations.add(workspaceMigrationId);

    const result = await migrateDatabase({ $client: client }, fixedNow);

    expect(result).toEqual({
      ok: true,
      value: {
        applied: 9,
        appliedMigrations: [
          preferencesMigrationId,
          categoryTopicMigrationId,
          budgetPlanningMigrationId,
          moneyRecordsMigrationId,
          moneyRecordCorrectionsMigrationId,
          recurringMoneyMigrationId,
          workEntriesMigrationId,
          tasksMigrationId,
          taskRecurrenceMigrationId,
        ],
      },
    });
    expect(client.executedSql.join('\n')).not.toContain('CREATE TABLE IF NOT EXISTS workspaces');
    expect(client.executedSql.join('\n')).toContain('CREATE TABLE IF NOT EXISTS user_preferences');
    expect(client.executedSql.join('\n')).toContain('CREATE TABLE IF NOT EXISTS categories');
    expect(client.executedSql.join('\n')).toContain('CREATE TABLE IF NOT EXISTS budgets');
    expect(client.executedSql.join('\n')).toContain('CREATE TABLE IF NOT EXISTS money_records');
    expect(client.executedSql.join('\n')).toContain('CREATE TABLE IF NOT EXISTS recurrence_rules');
    expect(client.executedSql.join('\n')).toContain('CREATE TABLE IF NOT EXISTS work_entries');
    expect(client.executedSql.join('\n')).toContain('CREATE TABLE IF NOT EXISTS tasks');
    expect(client.executedSql.join('\n')).toContain('CREATE TABLE IF NOT EXISTS task_recurrence_rules');
  });

  it('returns a retryable local error when migration setup fails', async () => {
    const client = new FakeMigrationClient();
    client.failOnExec = true;

    const result = await migrateDatabase({ $client: client }, fixedNow);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('unavailable');
      expect(result.error.recovery).toBe('retry');
    }
  });

  it('returns a retryable local error when the default database cannot open', async () => {
    const result = await migrateDatabase(undefined, fixedNow, () => {
      throw new Error('sqlite open failed');
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('unavailable');
      expect(result.error.recovery).toBe('retry');
    }
  });
});
