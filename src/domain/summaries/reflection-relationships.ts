import type { PeriodReviewSummary } from './period-summary';

export type ReflectionRelationshipId =
  | 'money_time'
  | 'receipts_spending'
  | 'reflections_summary'
  | 'tasks_reminders'
  | 'work_savings';

export type ReflectionRelationshipState = 'partial' | 'ready';

export type ReflectionRelationshipValue =
  | {
      amountMinor: number;
      kind: 'amount';
      label: string;
    }
  | {
      count: number;
      kind: 'count';
      label: string;
    }
  | {
      kind: 'duration';
      label: string;
      minutes: number;
    }
  | {
      kind: 'text';
      label: string;
      text: string;
    };

export type ReflectionRelationship = {
  description: string;
  id: ReflectionRelationshipId;
  missingReason: string | null;
  primary: ReflectionRelationshipValue;
  secondary: ReflectionRelationshipValue;
  state: ReflectionRelationshipState;
  title: string;
};

export type ReflectionRelationshipInput = {
  reflectionCount?: number | null;
  summary: PeriodReviewSummary;
};

const neutralReadyDescription = 'Saved records are shown together for reflection.';

function relationshipState(ready: boolean): ReflectionRelationshipState {
  return ready ? 'ready' : 'partial';
}

function missingReason(ready: boolean, reason: string): string | null {
  return ready ? null : reason;
}

function totalSavingsRemaining(summary: PeriodReviewSummary): number {
  return summary.savings.reduce((total, goal) => total + goal.remainingMinor, 0);
}

export function buildReflectionRelationships(input: ReflectionRelationshipInput): ReflectionRelationship[] {
  const { summary } = input;
  const reflectionCount = input.reflectionCount ?? 0;
  const moneyTimeReady = !summary.partial.money && !summary.partial.work;
  const workSavingsReady = !summary.partial.work && !summary.partial.savings;
  const tasksRemindersReady = !summary.partial.tasks && !summary.partial.reminders;
  const receiptsSpendingReady = summary.money.receiptExpenseCount > 0 && summary.money.expenseCount > 0;
  const reflectionsSummaryReady = reflectionCount > 0;

  return [
    {
      description: neutralReadyDescription,
      id: 'money_time',
      missingReason: missingReason(moneyTimeReady, 'Add spending and work records to compare these facts.'),
      primary: {
        amountMinor: summary.money.expenseAmountMinor,
        kind: 'amount',
        label: 'Spending recorded',
      },
      secondary: {
        kind: 'duration',
        label: 'Work time recorded',
        minutes: summary.work.totalDurationMinutes,
      },
      state: relationshipState(moneyTimeReady),
      title: 'Money and time',
    },
    {
      description: 'Work income and savings progress are listed side by side.',
      id: 'work_savings',
      missingReason: missingReason(workSavingsReady, 'Add work entries and savings goals to compare these facts.'),
      primary: {
        amountMinor: summary.work.earnedIncomeMinor,
        kind: 'amount',
        label: 'Work income recorded',
      },
      secondary: {
        amountMinor: totalSavingsRemaining(summary),
        kind: 'amount',
        label: 'Savings remaining',
      },
      state: relationshipState(workSavingsReady),
      title: 'Work and savings',
    },
    {
      description: 'Task and reminder records are shown together for planning review.',
      id: 'tasks_reminders',
      missingReason: missingReason(tasksRemindersReady, 'Add task activity and reminders to compare these facts.'),
      primary: {
        count: summary.tasks.completedCount,
        kind: 'count',
        label: 'Tasks and habits done',
      },
      secondary: {
        count: summary.reminders.missedOrRecoveryCount + summary.reminders.disabledOrUnavailableCount,
        kind: 'count',
        label: 'Reminders ready to review',
      },
      state: relationshipState(tasksRemindersReady),
      title: 'Tasks and reminders',
    },
    {
      description: 'Receipt-based expenses are listed beside total spending.',
      id: 'receipts_spending',
      missingReason: missingReason(receiptsSpendingReady, 'Add receipt-based expenses to compare these facts.'),
      primary: {
        amountMinor: summary.money.receiptExpenseAmountMinor,
        kind: 'amount',
        label: 'Receipt expenses',
      },
      secondary: {
        amountMinor: summary.money.expenseAmountMinor,
        kind: 'amount',
        label: 'Total spending',
      },
      state: relationshipState(receiptsSpendingReady),
      title: 'Receipts and spending',
    },
    {
      description: 'Saved reflections can sit beside this summary when available.',
      id: 'reflections_summary',
      missingReason: missingReason(reflectionsSummaryReady, 'Saved reflections are not available for this period yet.'),
      primary: {
        count: reflectionCount,
        kind: 'count',
        label: 'Saved reflections',
      },
      secondary: {
        kind: 'text',
        label: 'Summary period',
        text: summary.period.label,
      },
      state: relationshipState(reflectionsSummaryReady),
      title: 'Reflections and summary',
    },
  ];
}
