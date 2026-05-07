import type { PplantDatabase } from '@/data/db/client';
import type { RepositoryWriteOptions } from '@/data/repositories';
import { createAppError } from '@/domain/common/app-error';
import type { EntityId } from '@/domain/common/ids';
import { err, ok, type AppResult } from '@/domain/common/result';
import {
  parseBudgetRulesRow,
  parseSavingsGoalRow,
  type BudgetRulesRow,
  type SavingsGoalRow,
} from '@/domain/budgets/schemas';
import type {
  BudgetRules,
  SaveBudgetRulesInput,
  SaveSavingsGoalInput,
  SavingsGoal,
} from '@/domain/budgets/types';
import type { WorkspaceId } from '@/domain/workspace/types';

export type BudgetPlanningRepository = {
  loadBudgetRules(workspaceId: WorkspaceId): Promise<AppResult<BudgetRules | null>>;
  saveBudgetRules(
    input: SaveBudgetRulesInput,
    options: RepositoryWriteOptions,
  ): Promise<AppResult<BudgetRules>>;
  listSavingsGoals(
    workspaceId: WorkspaceId,
    options?: { includeArchived?: boolean },
  ): Promise<AppResult<SavingsGoal[]>>;
  findSavingsGoal(workspaceId: WorkspaceId, id: EntityId): Promise<AppResult<SavingsGoal | null>>;
  createSavingsGoal(
    input: SaveSavingsGoalInput,
    options: RepositoryWriteOptions,
  ): Promise<AppResult<SavingsGoal>>;
  updateSavingsGoal(
    input: SaveSavingsGoalInput,
    options: RepositoryWriteOptions,
  ): Promise<AppResult<SavingsGoal>>;
};

const budgetSelectSql = `
SELECT
  workspace_id AS workspaceId,
  monthly_budget_amount_minor AS monthlyBudgetAmountMinor,
  currency_code AS currencyCode,
  reset_day_source AS resetDaySource,
  rollover_policy AS rolloverPolicy,
  over_budget_behavior AS overBudgetBehavior,
  created_at AS createdAt,
  updated_at AS updatedAt
FROM budgets
`;

const savingsGoalSelectSql = `
SELECT
  id,
  workspace_id AS workspaceId,
  name,
  target_amount_minor AS targetAmountMinor,
  current_amount_minor AS currentAmountMinor,
  currency_code AS currencyCode,
  target_date AS targetDate,
  created_at AS createdAt,
  updated_at AS updatedAt,
  archived_at AS archivedAt
FROM savings_goals
`;

function parseSavingsGoalRows(rows: SavingsGoalRow[]): AppResult<SavingsGoal[]> {
  const goals: SavingsGoal[] = [];

  for (const row of rows) {
    const parsed = parseSavingsGoalRow(row);

    if (!parsed.ok) {
      return parsed;
    }

    goals.push(parsed.value);
  }

  return ok(goals);
}

export function createBudgetPlanningRepository(database: PplantDatabase): BudgetPlanningRepository {
  return {
    async createSavingsGoal(input, { now }) {
      try {
        const timestamp = now.toISOString();

        database.$client.runSync(
          `INSERT INTO savings_goals
            (id, workspace_id, name, target_amount_minor, current_amount_minor, currency_code, target_date, created_at, updated_at, archived_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          input.id,
          input.workspaceId,
          input.name,
          input.targetAmountMinor,
          input.currentAmountMinor,
          input.currencyCode,
          input.targetDate ?? null,
          timestamp,
          timestamp,
          input.archivedAt ?? null,
        );

        return parseSavingsGoalRow({
          archivedAt: input.archivedAt ?? null,
          createdAt: timestamp,
          currencyCode: input.currencyCode,
          currentAmountMinor: input.currentAmountMinor,
          id: input.id,
          name: input.name,
          targetAmountMinor: input.targetAmountMinor,
          targetDate: input.targetDate ?? null,
          updatedAt: timestamp,
          workspaceId: input.workspaceId,
        });
      } catch (cause) {
        return err(createAppError('unavailable', 'Local savings goal data could not be saved.', 'retry', cause));
      }
    },

    async findSavingsGoal(workspaceId, id) {
      try {
        const row = database.$client.getFirstSync<SavingsGoalRow>(
          `${savingsGoalSelectSql}
           WHERE workspace_id = ? AND id = ?
           LIMIT 1`,
          workspaceId,
          id,
        );

        if (!row) {
          return ok(null);
        }

        return parseSavingsGoalRow(row);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local savings goal data could not be loaded.', 'retry', cause));
      }
    },

    async listSavingsGoals(workspaceId, { includeArchived = false } = {}) {
      try {
        const archivedClause = includeArchived ? '' : 'AND archived_at IS NULL';
        const rows = database.$client.getAllSync<SavingsGoalRow>(
          `${savingsGoalSelectSql}
           WHERE workspace_id = ? ${archivedClause}
           ORDER BY target_date IS NULL ASC, target_date ASC, created_at ASC, id ASC`,
          workspaceId,
        );

        return parseSavingsGoalRows(rows);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local savings goal data could not be loaded.', 'retry', cause));
      }
    },

    async loadBudgetRules(workspaceId) {
      try {
        const row = database.$client.getFirstSync<BudgetRulesRow>(
          `${budgetSelectSql}
           WHERE workspace_id = ?
           LIMIT 1`,
          workspaceId,
        );

        if (!row) {
          return ok(null);
        }

        return parseBudgetRulesRow(row);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local budget rules could not be loaded.', 'retry', cause));
      }
    },

    async saveBudgetRules(input, { now }) {
      try {
        const existing = database.$client.getFirstSync<BudgetRulesRow>(
          `${budgetSelectSql}
           WHERE workspace_id = ?
           LIMIT 1`,
          input.workspaceId,
        );
        const timestamp = now.toISOString();

        if (existing) {
          database.$client.runSync(
            `UPDATE budgets
             SET monthly_budget_amount_minor = ?,
                 currency_code = ?,
                 reset_day_source = ?,
                 rollover_policy = ?,
                 over_budget_behavior = ?,
                 updated_at = ?
             WHERE workspace_id = ?`,
            input.monthlyBudgetAmountMinor,
            input.currencyCode,
            input.resetDaySource,
            input.rolloverPolicy,
            input.overBudgetBehavior,
            timestamp,
            input.workspaceId,
          );
        } else {
          database.$client.runSync(
            `INSERT INTO budgets
              (workspace_id, monthly_budget_amount_minor, currency_code, reset_day_source, rollover_policy, over_budget_behavior, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            input.workspaceId,
            input.monthlyBudgetAmountMinor,
            input.currencyCode,
            input.resetDaySource,
            input.rolloverPolicy,
            input.overBudgetBehavior,
            timestamp,
            timestamp,
          );
        }

        return parseBudgetRulesRow({
          createdAt: existing?.createdAt ?? timestamp,
          currencyCode: input.currencyCode,
          monthlyBudgetAmountMinor: input.monthlyBudgetAmountMinor,
          overBudgetBehavior: input.overBudgetBehavior,
          resetDaySource: input.resetDaySource,
          rolloverPolicy: input.rolloverPolicy,
          updatedAt: timestamp,
          workspaceId: input.workspaceId,
        });
      } catch (cause) {
        return err(createAppError('unavailable', 'Local budget rules could not be saved.', 'retry', cause));
      }
    },

    async updateSavingsGoal(input, { now }) {
      try {
        const existing = await this.findSavingsGoal(input.workspaceId as WorkspaceId, input.id as EntityId);

        if (!existing.ok) {
          return existing;
        }

        if (!existing.value || existing.value.archivedAt !== null) {
          return err(createAppError('not_found', 'Savings goal was not found.', 'edit'));
        }

        const timestamp = now.toISOString();

        database.$client.runSync(
          `UPDATE savings_goals
           SET name = ?,
               target_amount_minor = ?,
               current_amount_minor = ?,
               currency_code = ?,
               target_date = ?,
               updated_at = ?
           WHERE workspace_id = ? AND id = ? AND archived_at IS NULL`,
          input.name,
          input.targetAmountMinor,
          input.currentAmountMinor,
          input.currencyCode,
          input.targetDate ?? null,
          timestamp,
          input.workspaceId,
          input.id,
        );

        return parseSavingsGoalRow({
          archivedAt: existing.value.archivedAt,
          createdAt: existing.value.createdAt,
          currencyCode: input.currencyCode,
          currentAmountMinor: input.currentAmountMinor,
          id: input.id,
          name: input.name,
          targetAmountMinor: input.targetAmountMinor,
          targetDate: input.targetDate ?? null,
          updatedAt: timestamp,
          workspaceId: input.workspaceId,
        });
      } catch (cause) {
        return err(createAppError('unavailable', 'Local savings goal data could not be saved.', 'retry', cause));
      }
    },
  };
}
