import type { PplantDatabase } from '@/data/db/client';
import { localWorkspaceId } from '@/domain/workspace/types';

import { createBudgetPlanningRepository } from './budget-planning.repository';

type BudgetRow = {
  createdAt: string;
  currencyCode: string;
  monthlyBudgetAmountMinor: number;
  overBudgetBehavior: string;
  resetDaySource: string;
  rolloverPolicy: string;
  updatedAt: string;
  workspaceId: string;
};

type GoalRow = {
  archivedAt: string | null;
  createdAt: string;
  currencyCode: string;
  currentAmountMinor: number;
  id: string;
  name: string;
  targetAmountMinor: number;
  targetDate: string | null;
  updatedAt: string;
  workspaceId: string;
};

class FakeBudgetPlanningClient {
  budgetRows: BudgetRow[] = [];
  readonly executedSql: string[] = [];
  goalRows: GoalRow[] = [];

  getAllSync<T>(source: string, ...params: unknown[]): T[] {
    this.executedSql.push(source);
    const [workspaceId] = params;
    const activeOnly = source.includes('archived_at IS NULL');

    return this.goalRows
      .filter((row) => row.workspaceId === workspaceId)
      .filter((row) => !activeOnly || row.archivedAt === null) as T[];
  }

  getFirstSync<T>(source: string, ...params: unknown[]): T | null {
    this.executedSql.push(source);
    const [workspaceId, id] = params;

    if (source.includes('FROM budgets')) {
      return (this.budgetRows.find((row) => row.workspaceId === workspaceId) ?? null) as T | null;
    }

    return (this.goalRows.find((row) => row.workspaceId === workspaceId && row.id === id) ?? null) as T | null;
  }

  runSync(source: string, ...params: unknown[]): unknown {
    this.executedSql.push(source);

    if (source.includes('INSERT INTO budgets')) {
      const [
        workspaceId,
        monthlyBudgetAmountMinor,
        currencyCode,
        resetDaySource,
        rolloverPolicy,
        overBudgetBehavior,
        createdAt,
        updatedAt,
      ] = params;
      this.budgetRows.push({
        createdAt: String(createdAt),
        currencyCode: String(currencyCode),
        monthlyBudgetAmountMinor: Number(monthlyBudgetAmountMinor),
        overBudgetBehavior: String(overBudgetBehavior),
        resetDaySource: String(resetDaySource),
        rolloverPolicy: String(rolloverPolicy),
        updatedAt: String(updatedAt),
        workspaceId: String(workspaceId),
      });
    }

    if (source.includes('UPDATE budgets')) {
      const [
        monthlyBudgetAmountMinor,
        currencyCode,
        resetDaySource,
        rolloverPolicy,
        overBudgetBehavior,
        updatedAt,
        workspaceId,
      ] = params;
      const row = this.budgetRows.find((candidate) => candidate.workspaceId === workspaceId);

      if (row) {
        row.monthlyBudgetAmountMinor = Number(monthlyBudgetAmountMinor);
        row.currencyCode = String(currencyCode);
        row.resetDaySource = String(resetDaySource);
        row.rolloverPolicy = String(rolloverPolicy);
        row.overBudgetBehavior = String(overBudgetBehavior);
        row.updatedAt = String(updatedAt);
      }
    }

    if (source.includes('INSERT INTO savings_goals')) {
      const [
        id,
        workspaceId,
        name,
        targetAmountMinor,
        currentAmountMinor,
        currencyCode,
        targetDate,
        createdAt,
        updatedAt,
        archivedAt,
      ] = params;
      this.goalRows.push({
        archivedAt: (archivedAt as string | null) ?? null,
        createdAt: String(createdAt),
        currencyCode: String(currencyCode),
        currentAmountMinor: Number(currentAmountMinor),
        id: String(id),
        name: String(name),
        targetAmountMinor: Number(targetAmountMinor),
        targetDate: (targetDate as string | null) ?? null,
        updatedAt: String(updatedAt),
        workspaceId: String(workspaceId),
      });
    }

    if (source.includes('UPDATE savings_goals')) {
      const [
        name,
        targetAmountMinor,
        currentAmountMinor,
        currencyCode,
        targetDate,
        updatedAt,
        workspaceId,
        id,
      ] = params;
      const row = this.goalRows.find((candidate) => candidate.workspaceId === workspaceId && candidate.id === id);

      if (row) {
        row.name = String(name);
        row.targetAmountMinor = Number(targetAmountMinor);
        row.currentAmountMinor = Number(currentAmountMinor);
        row.currencyCode = String(currencyCode);
        row.targetDate = (targetDate as string | null) ?? null;
        row.updatedAt = String(updatedAt);
      }
    }

    return { changes: 1 };
  }
}

const fixedNow = new Date('2026-05-08T00:00:00.000Z');
const laterNow = new Date('2026-05-08T00:10:00.000Z');

function createRepositoryWithFakeClient() {
  const client = new FakeBudgetPlanningClient();
  const repository = createBudgetPlanningRepository({ $client: client } as unknown as PplantDatabase);

  return { client, repository };
}

describe('budget planning repository', () => {
  it('upserts one budget row per workspace without destructive SQL', async () => {
    const { client, repository } = createRepositoryWithFakeClient();

    const first = await repository.saveBudgetRules(
      {
        currencyCode: 'USD',
        monthlyBudgetAmountMinor: 50000,
        overBudgetBehavior: 'allow_negative_warning',
        resetDaySource: 'preferences',
        rolloverPolicy: 'savings_fund',
        workspaceId: localWorkspaceId,
      },
      { now: fixedNow },
    );
    const second = await repository.saveBudgetRules(
      {
        currencyCode: 'USD',
        monthlyBudgetAmountMinor: 75000,
        overBudgetBehavior: 'allow_negative_warning',
        resetDaySource: 'preferences',
        rolloverPolicy: 'savings_fund',
        workspaceId: localWorkspaceId,
      },
      { now: laterNow },
    );

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(client.budgetRows).toHaveLength(1);
    expect(client.budgetRows[0].monthlyBudgetAmountMinor).toBe(75000);
    expect(client.executedSql.join('\n')).not.toContain('DROP');
    expect(client.executedSql.join('\n')).not.toContain('DELETE');
  });

  it('creates, lists, and updates active savings goals while preserving ids', async () => {
    const { repository } = createRepositoryWithFakeClient();

    const created = await repository.createSavingsGoal(
      {
        archivedAt: null,
        currencyCode: 'USD',
        currentAmountMinor: 1000,
        id: 'goal-books',
        name: 'Books',
        targetAmountMinor: 5000,
        targetDate: null,
        workspaceId: localWorkspaceId,
      },
      { now: fixedNow },
    );
    const updated = await repository.updateSavingsGoal(
      {
        currencyCode: 'USD',
        currentAmountMinor: 6000,
        id: 'goal-books',
        name: 'Books and lab fees',
        targetAmountMinor: 5000,
        targetDate: '2026-09-01',
        workspaceId: localWorkspaceId,
      },
      { now: laterNow },
    );
    const listed = await repository.listSavingsGoals(localWorkspaceId);

    expect(created.ok).toBe(true);
    expect(updated.ok).toBe(true);
    expect(listed.ok).toBe(true);
    if (updated.ok) {
      expect(updated.value.id).toBe('goal-books');
      expect(updated.value.createdAt).toBe(fixedNow.toISOString());
      expect(updated.value.updatedAt).toBe(laterNow.toISOString());
    }
    if (listed.ok) {
      expect(listed.value.map((goal) => goal.name)).toEqual(['Books and lab fees']);
    }
  });
});
