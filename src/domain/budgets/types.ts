import type { CurrencyCode } from '@/domain/common/money';
import type { EntityId } from '@/domain/common/ids';
import type { LocalDate } from '@/domain/common/date-rules';
import type { WorkspaceId } from '@/domain/workspace/types';

export type BudgetResetDaySource = 'preferences';
export type BudgetRolloverPolicy = 'savings_fund';
export type OverBudgetBehavior = 'allow_negative_warning';
export type BudgetStatusState = 'over_budget_warning' | 'within_budget';
export type SavingsGoalName = string & { readonly __brand: 'SavingsGoalName' };

export type BudgetRules = {
  workspaceId: WorkspaceId;
  monthlyBudgetAmountMinor: number;
  currencyCode: CurrencyCode;
  resetDaySource: BudgetResetDaySource;
  rolloverPolicy: BudgetRolloverPolicy;
  overBudgetBehavior: OverBudgetBehavior;
  createdAt: string;
  updatedAt: string;
};

export type SaveBudgetRulesInput = {
  workspaceId: string;
  monthlyBudgetAmountMinor: number;
  currencyCode: string;
  resetDaySource: BudgetResetDaySource;
  rolloverPolicy: BudgetRolloverPolicy;
  overBudgetBehavior: OverBudgetBehavior;
};

export type SavingsGoal = {
  id: EntityId;
  workspaceId: WorkspaceId;
  name: SavingsGoalName;
  targetAmountMinor: number;
  currentAmountMinor: number;
  currencyCode: CurrencyCode;
  targetDate: LocalDate | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type SaveSavingsGoalInput = {
  id: string;
  workspaceId: string;
  name: string;
  targetAmountMinor: number;
  currentAmountMinor: number;
  currencyCode: string;
  targetDate?: string | null;
  archivedAt?: string | null;
};

export type BudgetStatus = {
  remainingMinor: number;
  savingsFundContributionMinor: number;
  nextPeriodCarryoverMinor: 0;
  isOverBudget: boolean;
  state: BudgetStatusState;
};

export type SavingsGoalProgress = {
  remainingMinor: number;
  progressBasisPoints: number;
  targetReached: boolean;
};
