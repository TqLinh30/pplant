import { addMoney, type Money } from '@/domain/common/money';
import type { AppResult } from '@/domain/common/result';
import { calculateBudgetStatus, calculateSavingsGoalProgress } from '@/domain/budgets/schemas';
import type { BudgetRules, BudgetStatus, SavingsGoal, SavingsGoalProgress } from '@/domain/budgets/types';
import type { BudgetPeriod } from '@/domain/common/date-rules';
import type { EntityId } from '@/domain/common/ids';

import type { MoneyRecord } from './types';

export type SavingsGoalProgressSummary = SavingsGoalProgress & {
  currentAmountMinor: number;
  goalId: EntityId;
  name: SavingsGoal['name'];
  targetAmountMinor: number;
};

export type MoneyPlanningPeriodSummary = {
  budgetStatus: BudgetStatus | null;
  expenseAmountMinor: number;
  incomeAmountMinor: number;
  period: BudgetPeriod;
  savingsProgress: SavingsGoalProgressSummary[];
};

export function sumMoney(values: Money[]): AppResult<Money | null> {
  if (values.length === 0) {
    return { ok: true, value: null };
  }

  return values.slice(1).reduce<AppResult<Money>>(
    (result, value) => (result.ok ? addMoney(result.value, value) : result),
    { ok: true, value: values[0] },
  );
}

function isActiveRecordInPeriod(record: MoneyRecord, period: BudgetPeriod): boolean {
  return (
    record.deletedAt === null &&
    record.localDate >= period.startDate &&
    record.localDate < period.endDateExclusive
  );
}

export function calculateMoneyPlanningPeriodSummary({
  budgetRules,
  period,
  records,
  savingsGoals,
}: {
  budgetRules: BudgetRules | null;
  period: BudgetPeriod;
  records: MoneyRecord[];
  savingsGoals: SavingsGoal[];
}): MoneyPlanningPeriodSummary {
  let expenseAmountMinor = 0;
  let incomeAmountMinor = 0;

  for (const record of records) {
    if (!isActiveRecordInPeriod(record, period)) {
      continue;
    }

    if (record.kind === 'expense') {
      expenseAmountMinor += record.amountMinor;
    } else {
      incomeAmountMinor += record.amountMinor;
    }
  }

  return {
    budgetStatus: budgetRules
      ? calculateBudgetStatus({
          monthlyBudgetAmountMinor: budgetRules.monthlyBudgetAmountMinor,
          spentAmountMinor: expenseAmountMinor,
        })
      : null,
    expenseAmountMinor,
    incomeAmountMinor,
    period,
    savingsProgress: savingsGoals.map((goal) => ({
      ...calculateSavingsGoalProgress({
        currentAmountMinor: goal.currentAmountMinor,
        targetAmountMinor: goal.targetAmountMinor,
      }),
      currentAmountMinor: goal.currentAmountMinor,
      goalId: goal.id,
      name: goal.name,
      targetAmountMinor: goal.targetAmountMinor,
    })),
  };
}
