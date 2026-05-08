import { addMoney, type Money } from '@/domain/common/money';
import type { AppResult } from '@/domain/common/result';
import { calculateBudgetStatus, calculateSavingsGoalProgress } from '@/domain/budgets/schemas';
import type { BudgetRules, BudgetStatus, SavingsGoal, SavingsGoalProgress } from '@/domain/budgets/types';
import { defaultWeekStartsOn, type BudgetPeriod, type LocalDate } from '@/domain/common/date-rules';
import type { EntityId } from '@/domain/common/ids';

import type { MoneyHistorySummaryMode, MoneyRecord } from './types';

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

export type MoneyHistorySummary = {
  endDateExclusive: LocalDate;
  expenseAmountMinor: number;
  incomeAmountMinor: number;
  key: string;
  label: string;
  mode: MoneyHistorySummaryMode;
  netAmountMinor: number;
  recordCount: number;
  startDate: LocalDate;
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

function parseLocalDateToUtc(value: LocalDate): Date {
  const [year, month, day] = value.split('-').map(Number);

  return new Date(Date.UTC(year, month - 1, day));
}

function formatUtcDateAsLocalDate(date: Date): LocalDate {
  return `${String(date.getUTCFullYear()).padStart(4, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}` as LocalDate;
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);

  return next;
}

function addUtcMonths(date: Date, months: number): Date {
  const next = new Date(date.getTime());
  next.setUTCMonth(next.getUTCMonth() + months);

  return next;
}

function historySummaryPeriod(
  localDate: LocalDate,
  mode: MoneyHistorySummaryMode,
): Pick<MoneyHistorySummary, 'endDateExclusive' | 'key' | 'label' | 'startDate'> {
  if (mode === 'day') {
    const date = parseLocalDateToUtc(localDate);
    const endDateExclusive = formatUtcDateAsLocalDate(addUtcDays(date, 1));

    return {
      endDateExclusive,
      key: localDate,
      label: localDate,
      startDate: localDate,
    };
  }

  if (mode === 'month') {
    const [year, month] = localDate.split('-');
    const startDate = `${year}-${month}-01` as LocalDate;
    const endDateExclusive = formatUtcDateAsLocalDate(addUtcMonths(parseLocalDateToUtc(startDate), 1));

    return {
      endDateExclusive,
      key: `${year}-${month}`,
      label: `${year}-${month}`,
      startDate,
    };
  }

  const date = parseLocalDateToUtc(localDate);
  const daysFromWeekStart = (date.getUTCDay() - defaultWeekStartsOn + 7) % 7;
  const startDate = formatUtcDateAsLocalDate(addUtcDays(date, -daysFromWeekStart));
  const endDateExclusive = formatUtcDateAsLocalDate(addUtcDays(parseLocalDateToUtc(startDate), 7));

  return {
    endDateExclusive,
    key: startDate,
    label: `${startDate} week`,
    startDate,
  };
}

export function calculateMoneyHistorySummaries(
  records: MoneyRecord[],
  mode: MoneyHistorySummaryMode,
): MoneyHistorySummary[] {
  const summariesByKey = new Map<string, MoneyHistorySummary>();

  for (const record of records) {
    if (record.deletedAt !== null) {
      continue;
    }

    const period = historySummaryPeriod(record.localDate, mode);
    const existing =
      summariesByKey.get(period.key) ??
      ({
        ...period,
        expenseAmountMinor: 0,
        incomeAmountMinor: 0,
        mode,
        netAmountMinor: 0,
        recordCount: 0,
      } satisfies MoneyHistorySummary);

    if (record.kind === 'expense') {
      existing.expenseAmountMinor += record.amountMinor;
    } else {
      existing.incomeAmountMinor += record.amountMinor;
    }

    existing.netAmountMinor = existing.incomeAmountMinor - existing.expenseAmountMinor;
    existing.recordCount += 1;
    summariesByKey.set(period.key, existing);
  }

  return [...summariesByKey.values()].sort((left, right) => right.startDate.localeCompare(left.startDate));
}
