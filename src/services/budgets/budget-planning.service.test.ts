import type { BudgetPlanningRepository } from '@/data/repositories/budget-planning.repository';
import type { PreferencesRepository } from '@/data/repositories/preferences.repository';
import { createAppError } from '@/domain/common/app-error';
import { err, ok } from '@/domain/common/result';
import { parseBudgetRulesRow, parseSavingsGoalRow } from '@/domain/budgets/schemas';
import type { BudgetRules, SaveBudgetRulesInput, SaveSavingsGoalInput, SavingsGoal } from '@/domain/budgets/types';
import { parseUserPreferencesRow } from '@/domain/preferences/schemas';
import type { UserPreferences } from '@/domain/preferences/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import {
  createSavingsGoal,
  loadBudgetPlanningSettings,
  saveBudgetRules,
  updateSavingsGoal,
} from './budget-planning.service';

const fixedNow = new Date('2026-05-08T00:00:00.000Z');
const laterNow = new Date('2026-05-08T00:10:00.000Z');
const migrationReport = {
  applied: 0,
  appliedMigrations: [],
};

function createPreferences(): UserPreferences {
  const result = parseUserPreferencesRow({
    createdAt: fixedNow.toISOString(),
    currencyCode: 'USD',
    defaultHourlyWageCurrencyCode: 'USD',
    defaultHourlyWageMinor: 1500,
    locale: 'en-US',
    monthlyBudgetResetDay: 15,
    updatedAt: fixedNow.toISOString(),
    workspaceId: localWorkspaceId,
  });

  if (!result.ok) {
    throw new Error('preferences fixture failed');
  }

  return result.value;
}

function createBudgetRules(overrides: Partial<SaveBudgetRulesInput> = {}): BudgetRules {
  const result = parseBudgetRulesRow({
    createdAt: fixedNow.toISOString(),
    currencyCode: 'USD',
    monthlyBudgetAmountMinor: 50000,
    overBudgetBehavior: 'allow_negative_warning',
    resetDaySource: 'preferences',
    rolloverPolicy: 'savings_fund',
    updatedAt: fixedNow.toISOString(),
    workspaceId: localWorkspaceId,
    ...overrides,
  });

  if (!result.ok) {
    throw new Error('budget fixture failed');
  }

  return result.value;
}

function createGoal(overrides: Record<string, unknown> = {}): SavingsGoal {
  const result = parseSavingsGoalRow({
    archivedAt: null,
    createdAt: fixedNow.toISOString(),
    currencyCode: 'USD',
    currentAmountMinor: 1000,
    id: 'goal-generated',
    name: 'Books',
    targetAmountMinor: 5000,
    targetDate: null,
    updatedAt: fixedNow.toISOString(),
    workspaceId: localWorkspaceId,
    ...overrides,
  });

  if (!result.ok) {
    throw new Error('goal fixture failed');
  }

  return result.value;
}

function createPreferencesRepository(preferences: UserPreferences | null = createPreferences()): PreferencesRepository {
  return {
    async loadPreferences() {
      return ok(preferences);
    },
    async savePreferences() {
      throw new Error('not used');
    },
  };
}

function createBudgetPlanningRepository(
  initialBudget: BudgetRules | null = null,
  initialGoals: SavingsGoal[] = [],
): BudgetPlanningRepository & {
  lastBudgetInput?: SaveBudgetRulesInput;
  lastGoalInput?: SaveSavingsGoalInput;
  saveBudgetCalls: number;
} {
  let budget = initialBudget;
  let goals = [...initialGoals];

  return {
    saveBudgetCalls: 0,
    async createSavingsGoal(input, { now }) {
      this.lastGoalInput = input;
      const goal = createGoal({
        ...input,
        archivedAt: input.archivedAt ?? null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
      goals.push(goal);
      return ok(goal);
    },
    async findSavingsGoal(_workspaceId, id) {
      return ok(goals.find((goal) => goal.id === id) ?? null);
    },
    async listSavingsGoals() {
      return ok(goals.filter((goal) => goal.archivedAt === null));
    },
    async loadBudgetRules() {
      return ok(budget);
    },
    async saveBudgetRules(input, { now }) {
      this.saveBudgetCalls += 1;
      this.lastBudgetInput = input;
      budget = createBudgetRules({
        ...input,
        createdAt: budget?.createdAt ?? now.toISOString(),
        updatedAt: now.toISOString(),
      } as never);
      return ok(budget);
    },
    async updateSavingsGoal(input, { now }) {
      const existing = goals.find((goal) => goal.id === input.id);

      if (!existing) {
        return err(createAppError('not_found', 'Savings goal was not found.', 'edit'));
      }

      const updated = createGoal({
        ...input,
        archivedAt: existing.archivedAt,
        createdAt: existing.createdAt,
        updatedAt: now.toISOString(),
      });
      goals = goals.map((goal) => (goal.id === updated.id ? updated : goal));
      return ok(updated);
    },
  };
}

function createDependencies({
  budgetRepository = createBudgetPlanningRepository(),
  preferencesRepository = createPreferencesRepository(),
  createId = () => 'goal-generated',
  now = () => fixedNow,
}: {
  budgetRepository?: BudgetPlanningRepository;
  preferencesRepository?: PreferencesRepository;
  createId?: () => string;
  now?: () => Date;
} = {}) {
  return {
    createBudgetPlanningRepository: () => budgetRepository,
    createPreferencesRepository: () => preferencesRepository,
    createId,
    migrateDatabase: async () => ok(migrationReport),
    now,
    openDatabase: () => ({}),
  };
}

describe('budget planning service', () => {
  it('loads saved budget planning settings with preference context', async () => {
    const budget = createBudgetRules();
    const goal = createGoal();
    const result = await loadBudgetPlanningSettings(
      createDependencies({
        budgetRepository: createBudgetPlanningRepository(budget, [goal]),
      }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.preferences.currencyCode).toBe('USD');
      expect(result.value.preferences.monthlyBudgetResetDay).toBe(15);
      expect(result.value.budgetRules).toEqual(budget);
      expect(result.value.savingsGoals).toEqual([goal]);
    }
  });

  it('requires saved preferences before budget planning can save', async () => {
    const repository = createBudgetPlanningRepository();
    const result = await saveBudgetRules(
      { monthlyBudgetAmountMinor: 50000 },
      createDependencies({
        budgetRepository: repository,
        preferencesRepository: createPreferencesRepository(null),
      }),
    );

    expect(result.ok).toBe(false);
    expect(repository.saveBudgetCalls).toBe(0);
    if (!result.ok) {
      expect(result.error.code).toBe('not_found');
      expect(result.error.recovery).toBe('settings');
    }
  });

  it('saves budget rules with fixed policies and saved preference currency', async () => {
    const repository = createBudgetPlanningRepository();
    const result = await saveBudgetRules(
      { monthlyBudgetAmountMinor: 50000 },
      createDependencies({ budgetRepository: repository, now: () => laterNow }),
    );

    expect(result.ok).toBe(true);
    expect(repository.lastBudgetInput).toEqual({
      currencyCode: 'USD',
      monthlyBudgetAmountMinor: 50000,
      overBudgetBehavior: 'allow_negative_warning',
      resetDaySource: 'preferences',
      rolloverPolicy: 'savings_fund',
      workspaceId: localWorkspaceId,
    });
    if (result.ok) {
      expect(result.value.updatedAt).toBe(laterNow.toISOString());
    }
  });

  it('creates savings goals with stable generated ids and manual current amount', async () => {
    const repository = createBudgetPlanningRepository();
    const result = await createSavingsGoal(
      {
        currentAmountMinor: 1250,
        name: ' School supplies ',
        targetAmountMinor: 5000,
        targetDate: '2026-09-01',
      },
      createDependencies({
        budgetRepository: repository,
        createId: () => 'goal-school-supplies',
      }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe('goal-school-supplies');
      expect(result.value.name).toBe('School supplies');
      expect(result.value.currentAmountMinor).toBe(1250);
      expect(result.value.currencyCode).toBe('USD');
      expect(result.value.targetDate).toBe('2026-09-01');
    }
  });

  it('updates savings goals without changing ids or created timestamps', async () => {
    const existing = createGoal({ id: 'goal-books' });
    const repository = createBudgetPlanningRepository(null, [existing]);
    const result = await updateSavingsGoal(
      {
        currentAmountMinor: 6000,
        id: existing.id,
        name: 'Books and lab fees',
        targetAmountMinor: 5000,
        targetDate: null,
      },
      createDependencies({ budgetRepository: repository, now: () => laterNow }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe(existing.id);
      expect(result.value.createdAt).toBe(existing.createdAt);
      expect(result.value.updatedAt).toBe(laterNow.toISOString());
      expect(result.value.currentAmountMinor).toBe(6000);
    }
  });

  it('rejects invalid budget and goal inputs with edit recovery', async () => {
    const invalidBudget = await saveBudgetRules(
      { monthlyBudgetAmountMinor: 0 },
      createDependencies(),
    );
    const invalidGoal = await createSavingsGoal(
      {
        currentAmountMinor: -1,
        name: ' ',
        targetAmountMinor: 0,
        targetDate: '2026-02-30',
      },
      createDependencies(),
    );

    expect(invalidBudget.ok).toBe(false);
    expect(invalidGoal.ok).toBe(false);
    if (!invalidBudget.ok) {
      expect(invalidBudget.error.recovery).toBe('edit');
    }
    if (!invalidGoal.ok) {
      expect(invalidGoal.error.recovery).toBe('edit');
    }
  });

  it('returns retryable errors when local storage cannot open or migration fails', async () => {
    const openFailure = await loadBudgetPlanningSettings({
      ...createDependencies(),
      openDatabase: () => {
        throw new Error('sqlite open failed');
      },
    });
    const migrationFailure = await loadBudgetPlanningSettings({
      ...createDependencies(),
      migrateDatabase: async () =>
        err(createAppError('unavailable', 'Local data could not be prepared.', 'retry')),
    });

    expect(openFailure.ok).toBe(false);
    expect(migrationFailure.ok).toBe(false);
    if (!openFailure.ok) {
      expect(openFailure.error.recovery).toBe('retry');
    }
    if (!migrationFailure.ok) {
      expect(migrationFailure.error.recovery).toBe('retry');
    }
  });
});
