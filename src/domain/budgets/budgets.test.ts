import { localWorkspaceId } from '@/domain/workspace/types';

import {
  calculateBudgetStatus,
  calculateSavingsGoalProgress,
  parseBudgetRulesRow,
  parseSavingsGoalRow,
  validateBudgetPlanningAmountMinor,
  validateSavingsGoalName,
} from './schemas';

const fixedNow = '2026-05-08T00:00:00.000Z';

function createBudgetRow(overrides: Record<string, unknown> = {}) {
  return {
    createdAt: fixedNow,
    currencyCode: 'USD',
    monthlyBudgetAmountMinor: 50000,
    overBudgetBehavior: 'allow_negative_warning',
    resetDaySource: 'preferences',
    rolloverPolicy: 'savings_fund',
    updatedAt: fixedNow,
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

function createGoalRow(overrides: Record<string, unknown> = {}) {
  return {
    archivedAt: null,
    createdAt: fixedNow,
    currencyCode: 'USD',
    currentAmountMinor: 12500,
    id: 'goal-school-supplies',
    name: 'School supplies',
    targetAmountMinor: 25000,
    targetDate: '2026-09-01',
    updatedAt: fixedNow,
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

describe('budget planning domain', () => {
  it('parses valid budget rules rows with fixed policies', () => {
    const result = parseBudgetRulesRow(createBudgetRow());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.monthlyBudgetAmountMinor).toBe(50000);
      expect(result.value.resetDaySource).toBe('preferences');
      expect(result.value.rolloverPolicy).toBe('savings_fund');
      expect(result.value.overBudgetBehavior).toBe('allow_negative_warning');
      expect(result.value.currencyCode).toBe('USD');
    }
  });

  it('rejects invalid policy values and non-positive budget amounts', () => {
    const invalidPolicy = parseBudgetRulesRow(createBudgetRow({ rolloverPolicy: 'next_month' }));
    const zeroBudget = parseBudgetRulesRow(createBudgetRow({ monthlyBudgetAmountMinor: 0 }));

    expect(invalidPolicy.ok).toBe(false);
    expect(zeroBudget.ok).toBe(false);
    if (!zeroBudget.ok) {
      expect(zeroBudget.error.recovery).toBe('edit');
    }
  });

  it('validates positive and non-negative minor-unit amounts', () => {
    expect(validateBudgetPlanningAmountMinor(1, { allowZero: false })).toEqual({ ok: true, value: 1 });
    expect(validateBudgetPlanningAmountMinor(0, { allowZero: true })).toEqual({ ok: true, value: 0 });

    const negative = validateBudgetPlanningAmountMinor(-1, { allowZero: true });
    const decimal = validateBudgetPlanningAmountMinor(1.5, { allowZero: false });

    expect(negative.ok).toBe(false);
    expect(decimal.ok).toBe(false);
  });

  it('calculates budget status with negative remaining and savings-fund contribution', () => {
    const underBudget = calculateBudgetStatus({
      monthlyBudgetAmountMinor: 50000,
      spentAmountMinor: 37500,
    });
    const overBudget = calculateBudgetStatus({
      monthlyBudgetAmountMinor: 50000,
      spentAmountMinor: 65000,
    });

    expect(underBudget).toEqual({
      isOverBudget: false,
      nextPeriodCarryoverMinor: 0,
      remainingMinor: 12500,
      savingsFundContributionMinor: 12500,
      state: 'within_budget',
    });
    expect(overBudget).toEqual({
      isOverBudget: true,
      nextPeriodCarryoverMinor: 0,
      remainingMinor: -15000,
      savingsFundContributionMinor: 0,
      state: 'over_budget_warning',
    });
  });

  it('parses savings goal rows with optional target date and manual current amount', () => {
    const withDate = parseSavingsGoalRow(createGoalRow());
    const withoutDate = parseSavingsGoalRow(createGoalRow({ targetDate: null }));

    expect(withDate.ok).toBe(true);
    expect(withoutDate.ok).toBe(true);
    if (withoutDate.ok) {
      expect(withoutDate.value.targetDate).toBeNull();
    }
  });

  it('rejects invalid savings goal names, target amounts, current amounts, and target dates', () => {
    const emptyName = validateSavingsGoalName('   ');
    const zeroTarget = parseSavingsGoalRow(createGoalRow({ targetAmountMinor: 0 }));
    const negativeCurrent = parseSavingsGoalRow(createGoalRow({ currentAmountMinor: -1 }));
    const badDate = parseSavingsGoalRow(createGoalRow({ targetDate: '2026-02-30' }));

    expect(emptyName.ok).toBe(false);
    expect(zeroTarget.ok).toBe(false);
    expect(negativeCurrent.ok).toBe(false);
    expect(badDate.ok).toBe(false);
  });

  it('calculates savings progress using integer basis points, including over-target progress', () => {
    expect(calculateSavingsGoalProgress({ currentAmountMinor: 12500, targetAmountMinor: 25000 })).toEqual({
      progressBasisPoints: 5000,
      remainingMinor: 12500,
      targetReached: false,
    });
    expect(calculateSavingsGoalProgress({ currentAmountMinor: 30000, targetAmountMinor: 25000 })).toEqual({
      progressBasisPoints: 12000,
      remainingMinor: 0,
      targetReached: true,
    });
  });
});
