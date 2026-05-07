import { z } from 'zod';

import { createAppError } from '@/domain/common/app-error';
import { asLocalDate } from '@/domain/common/date-rules';
import { asEntityId } from '@/domain/common/ids';
import { asCurrencyCode, type CurrencySupportChecker } from '@/domain/common/money';
import { err, ok, type AppResult } from '@/domain/common/result';
import { asWorkspaceId } from '@/domain/workspace/types';

import type {
  BudgetRules,
  BudgetStatus,
  SavingsGoal,
  SavingsGoalName,
  SavingsGoalProgress,
} from './types';

export const maxSavingsGoalNameLength = 60;
export const budgetResetDaySource = 'preferences' as const;
export const budgetRolloverPolicy = 'savings_fund' as const;
export const overBudgetBehavior = 'allow_negative_warning' as const;

const isoTimestampSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Expected an ISO timestamp.',
});

export const budgetRulesRowSchema = z.object({
  createdAt: isoTimestampSchema,
  currencyCode: z.string().min(1),
  monthlyBudgetAmountMinor: z.number().int(),
  overBudgetBehavior: z.literal(overBudgetBehavior),
  resetDaySource: z.literal(budgetResetDaySource),
  rolloverPolicy: z.literal(budgetRolloverPolicy),
  updatedAt: isoTimestampSchema,
  workspaceId: z.string().min(1),
});

export const savingsGoalRowSchema = z.object({
  archivedAt: isoTimestampSchema.nullable(),
  createdAt: isoTimestampSchema,
  currencyCode: z.string().min(1),
  currentAmountMinor: z.number().int(),
  id: z.string().min(1),
  name: z.string(),
  targetAmountMinor: z.number().int(),
  targetDate: z.string().nullable(),
  updatedAt: isoTimestampSchema,
  workspaceId: z.string().min(1),
});

export type BudgetRulesRow = z.infer<typeof budgetRulesRowSchema>;
export type SavingsGoalRow = z.infer<typeof savingsGoalRowSchema>;

export function validateBudgetPlanningAmountMinor(
  value: number,
  { allowZero }: { allowZero: boolean },
): AppResult<number> {
  if (!Number.isInteger(value)) {
    return err(createAppError('validation_failed', 'Money amounts must use integer minor units.', 'edit'));
  }

  if (value < 0 || (!allowZero && value === 0)) {
    return err(
      createAppError(
        'validation_failed',
        allowZero ? 'Money amount cannot be negative.' : 'Money amount must be greater than zero.',
        'edit',
      ),
    );
  }

  return ok(value);
}

export function validateSavingsGoalName(value: string): AppResult<SavingsGoalName> {
  const normalized = value.trim();

  if (normalized.length === 0) {
    return err(createAppError('validation_failed', 'Savings goal name cannot be empty.', 'edit'));
  }

  if (normalized.length > maxSavingsGoalNameLength) {
    return err(
      createAppError(
        'validation_failed',
        `Savings goal name must be ${maxSavingsGoalNameLength} characters or fewer.`,
        'edit',
      ),
    );
  }

  return ok(normalized as SavingsGoalName);
}

export function parseBudgetRulesRow(
  row: unknown,
  { isSupportedCurrency }: { isSupportedCurrency?: CurrencySupportChecker } = {},
): AppResult<BudgetRules> {
  const parsed = budgetRulesRowSchema.safeParse(row);

  if (!parsed.success) {
    return err(createAppError('validation_failed', 'Local budget rules data is invalid.', 'retry', parsed.error));
  }

  const workspaceId = asWorkspaceId(parsed.data.workspaceId);
  const currencyCode = asCurrencyCode(parsed.data.currencyCode, isSupportedCurrency);
  const amount = validateBudgetPlanningAmountMinor(parsed.data.monthlyBudgetAmountMinor, {
    allowZero: false,
  });

  if (!workspaceId.ok) {
    return workspaceId;
  }

  if (!currencyCode.ok) {
    return currencyCode;
  }

  if (!amount.ok) {
    return amount;
  }

  return ok({
    createdAt: parsed.data.createdAt,
    currencyCode: currencyCode.value,
    monthlyBudgetAmountMinor: amount.value,
    overBudgetBehavior: parsed.data.overBudgetBehavior,
    resetDaySource: parsed.data.resetDaySource,
    rolloverPolicy: parsed.data.rolloverPolicy,
    updatedAt: parsed.data.updatedAt,
    workspaceId: workspaceId.value,
  });
}

export function parseSavingsGoalRow(
  row: unknown,
  { isSupportedCurrency }: { isSupportedCurrency?: CurrencySupportChecker } = {},
): AppResult<SavingsGoal> {
  const parsed = savingsGoalRowSchema.safeParse(row);

  if (!parsed.success) {
    return err(createAppError('validation_failed', 'Local savings goal data is invalid.', 'retry', parsed.error));
  }

  const id = asEntityId(parsed.data.id);
  const workspaceId = asWorkspaceId(parsed.data.workspaceId);
  const name = validateSavingsGoalName(parsed.data.name);
  const targetAmount = validateBudgetPlanningAmountMinor(parsed.data.targetAmountMinor, {
    allowZero: false,
  });
  const currentAmount = validateBudgetPlanningAmountMinor(parsed.data.currentAmountMinor, {
    allowZero: true,
  });
  const currencyCode = asCurrencyCode(parsed.data.currencyCode, isSupportedCurrency);
  const targetDate = parsed.data.targetDate === null ? ok(null) : asLocalDate(parsed.data.targetDate);

  if (!id.ok) {
    return id;
  }

  if (!workspaceId.ok) {
    return workspaceId;
  }

  if (!name.ok) {
    return name;
  }

  if (!targetAmount.ok) {
    return targetAmount;
  }

  if (!currentAmount.ok) {
    return currentAmount;
  }

  if (!currencyCode.ok) {
    return currencyCode;
  }

  if (!targetDate.ok) {
    return targetDate;
  }

  return ok({
    archivedAt: parsed.data.archivedAt,
    createdAt: parsed.data.createdAt,
    currencyCode: currencyCode.value,
    currentAmountMinor: currentAmount.value,
    id: id.value,
    name: name.value,
    targetAmountMinor: targetAmount.value,
    targetDate: targetDate.value,
    updatedAt: parsed.data.updatedAt,
    workspaceId: workspaceId.value,
  });
}

export function calculateBudgetStatus({
  monthlyBudgetAmountMinor,
  spentAmountMinor,
}: {
  monthlyBudgetAmountMinor: number;
  spentAmountMinor: number;
}): BudgetStatus {
  const remainingMinor = monthlyBudgetAmountMinor - spentAmountMinor;
  const isOverBudget = remainingMinor < 0;

  return {
    isOverBudget,
    nextPeriodCarryoverMinor: 0,
    remainingMinor,
    savingsFundContributionMinor: Math.max(remainingMinor, 0),
    state: isOverBudget ? 'over_budget_warning' : 'within_budget',
  };
}

export function calculateSavingsGoalProgress({
  currentAmountMinor,
  targetAmountMinor,
}: {
  currentAmountMinor: number;
  targetAmountMinor: number;
}): SavingsGoalProgress {
  const remainingMinor = Math.max(targetAmountMinor - currentAmountMinor, 0);

  return {
    progressBasisPoints: Math.floor((currentAmountMinor * 10000) / targetAmountMinor),
    remainingMinor,
    targetReached: currentAmountMinor >= targetAmountMinor,
  };
}
