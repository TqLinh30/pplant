import { createAppError } from '@/domain/common/app-error';
import { ok } from '@/domain/common/result';
import { parseBudgetRulesRow, parseSavingsGoalRow } from '@/domain/budgets/schemas';
import type { BudgetRules, SavingsGoal } from '@/domain/budgets/types';
import { parseUserPreferencesRow } from '@/domain/preferences/schemas';
import type { UserPreferences } from '@/domain/preferences/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import {
  budgetPlanningSettingsReducer,
  defaultSavingsGoalDraft,
  initialBudgetPlanningSettingsState,
  validateBudgetAmountDraft,
  validateSavingsGoalDraft,
} from './useBudgetPlanningSettings';

const fixedNow = '2026-05-08T00:00:00.000Z';

function createPreferences(): UserPreferences {
  const result = parseUserPreferencesRow({
    createdAt: fixedNow,
    currencyCode: 'USD',
    defaultHourlyWageCurrencyCode: 'USD',
    defaultHourlyWageMinor: 1500,
    locale: 'en-US',
    monthlyBudgetResetDay: 15,
    updatedAt: fixedNow,
    workspaceId: localWorkspaceId,
  });

  if (!result.ok) {
    throw new Error('preferences fixture failed');
  }

  return result.value;
}

function createBudgetRules(): BudgetRules {
  const result = parseBudgetRulesRow({
    createdAt: fixedNow,
    currencyCode: 'USD',
    monthlyBudgetAmountMinor: 50000,
    overBudgetBehavior: 'allow_negative_warning',
    resetDaySource: 'preferences',
    rolloverPolicy: 'savings_fund',
    updatedAt: fixedNow,
    workspaceId: localWorkspaceId,
  });

  if (!result.ok) {
    throw new Error('budget fixture failed');
  }

  return result.value;
}

function createGoal(): SavingsGoal {
  const result = parseSavingsGoalRow({
    archivedAt: null,
    createdAt: fixedNow,
    currencyCode: 'USD',
    currentAmountMinor: 1000,
    id: 'goal-books',
    name: 'Books',
    targetAmountMinor: 5000,
    targetDate: null,
    updatedAt: fixedNow,
    workspaceId: localWorkspaceId,
  });

  if (!result.ok) {
    throw new Error('goal fixture failed');
  }

  return result.value;
}

describe('budget planning settings state', () => {
  it('loads preferences, budget rules, and savings goals into ready state', () => {
    const preferences = createPreferences();
    const budgetRules = createBudgetRules();
    const goal = createGoal();
    const state = budgetPlanningSettingsReducer(initialBudgetPlanningSettingsState, {
      budgetRules,
      preferences,
      savingsGoals: [goal],
      type: 'load_succeeded',
    });

    expect(state.status).toBe('ready');
    expect(state.budgetAmount).toBe('500.00');
    expect(state.savingsGoals).toEqual([goal]);
    expect(state.preferences?.monthlyBudgetResetDay).toBe(15);
  });

  it('tracks missing preferences as a setup state', () => {
    const state = budgetPlanningSettingsReducer(initialBudgetPlanningSettingsState, {
      error: createAppError('not_found', 'Save preferences before setting budgets.', 'settings'),
      type: 'preferences_needed',
    });

    expect(state.status).toBe('preferences_needed');
    expect(state.loadError?.recovery).toBe('settings');
  });

  it('validates budget amount draft using minor-unit parsing', () => {
    const valid = validateBudgetAmountDraft('500.25', 'USD', 'en-US');
    const zero = validateBudgetAmountDraft('0', 'USD', 'en-US');

    expect(valid).toEqual({ ok: true, value: 50025 });
    expect(zero.ok).toBe(false);
    if (!zero.ok) {
      expect(zero.error.recovery).toBe('edit');
    }
  });

  it('validates savings goal drafts and maps optional blank date to null', () => {
    const valid = validateSavingsGoalDraft(
      {
        currentAmount: '12.50',
        name: ' Books ',
        targetAmount: '50.00',
        targetDate: '',
      },
      'USD',
      'en-US',
    );
    const invalid = validateSavingsGoalDraft(
      {
        currentAmount: '-1',
        name: ' ',
        targetAmount: '0',
        targetDate: '2026-02-30',
      },
      'USD',
      'en-US',
    );

    expect(valid).toEqual({
      ok: true,
      value: {
        currentAmountMinor: 1250,
        name: 'Books',
        targetAmountMinor: 5000,
        targetDate: null,
      },
    });
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.fieldErrors?.name).toBeDefined();
      expect(invalid.fieldErrors?.targetAmount).toBeDefined();
      expect(invalid.fieldErrors?.currentAmount).toBeDefined();
      expect(invalid.fieldErrors?.targetDate).toBeDefined();
    }
  });

  it('updates local state after budget save and goal create/edit', () => {
    const preferences = createPreferences();
    const budgetRules = createBudgetRules();
    const goal = createGoal();
    const loaded = budgetPlanningSettingsReducer(initialBudgetPlanningSettingsState, {
      budgetRules: null,
      preferences,
      savingsGoals: [],
      type: 'load_succeeded',
    });
    const budgetSaved = budgetPlanningSettingsReducer(loaded, {
      budgetRules,
      type: 'budget_saved',
    });
    const goalCreated = budgetPlanningSettingsReducer(budgetSaved, {
      goal,
      type: 'goal_saved',
    });
    const goalEdited = budgetPlanningSettingsReducer(goalCreated, {
      goal: { ...goal, name: 'Books and lab fees' as never },
      type: 'goal_saved',
    });

    expect(budgetSaved.budgetAmount).toBe('500.00');
    expect(goalCreated.goalDraft).toEqual(defaultSavingsGoalDraft);
    expect(goalEdited.savingsGoals).toHaveLength(1);
    expect(goalEdited.savingsGoals[0].name).toBe('Books and lab fees');
  });

  it('sets field errors and clears them when draft fields change', () => {
    const failed = budgetPlanningSettingsReducer(initialBudgetPlanningSettingsState, {
      fieldErrors: { budgetAmount: 'Money amount must be greater than zero.' },
      type: 'validation_failed',
    });
    const changed = budgetPlanningSettingsReducer(failed, {
      field: 'budgetAmount',
      type: 'budget_field_changed',
      value: '500',
    });

    expect(failed.fieldErrors.budgetAmount).toBeDefined();
    expect(changed.fieldErrors.budgetAmount).toBeUndefined();
    expect(changed.budgetAmount).toBe('500');
  });

  it('accepts service payload shapes used by the hook', () => {
    expect(ok({ budgetRules: null, preferences: createPreferences(), savingsGoals: [] }).ok).toBe(true);
  });
});
