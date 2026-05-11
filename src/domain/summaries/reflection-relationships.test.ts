import type { PeriodReviewSummary } from './period-summary';
import { buildReflectionRelationships } from './reflection-relationships';

function createSummary(overrides: Partial<PeriodReviewSummary> = {}): PeriodReviewSummary {
  return {
    budget: {
      budgetStatus: {
        isOverBudget: false,
        nextPeriodCarryoverMinor: 0,
        remainingMinor: 30000,
        savingsFundContributionMinor: 0,
        state: 'within_budget',
      },
      expenseAmountMinor: 20000,
      incomeAmountMinor: 40000,
      period: {
        endDateExclusive: '2026-05-20' as never,
        startDate: '2026-04-20' as never,
      },
    },
    cacheStatus: 'fresh_from_source',
    isEmpty: false,
    money: {
      expenseAmountMinor: 12000,
      expenseCount: 4,
      incomeAmountMinor: 40000,
      incomeCount: 2,
      netAmountMinor: 28000,
      receiptExpenseAmountMinor: 3500,
      receiptExpenseCount: 2,
      recordCount: 6,
      records: [],
    },
    partial: {
      budget: false,
      money: false,
      reminders: false,
      savings: false,
      tasks: false,
      work: false,
    },
    period: {
      anchorLocalDate: '2026-05-08' as never,
      endDateExclusive: '2026-05-11' as never,
      key: 'week:2026-05-04',
      kind: 'week',
      label: 'Week of 2026-05-04',
      startDate: '2026-05-04' as never,
    },
    reminders: {
      disabledOrUnavailableCount: 1,
      missedOrRecoveryCount: 2,
      openOccurrenceCount: 5,
      recoveryItemCount: 1,
      skippedOccurrenceCount: 1,
      totalCount: 3,
      totalOccurrenceCount: 6,
    },
    savings: [
      {
        currentAmountMinor: 2000,
        goalId: 'goal-1' as never,
        name: 'Books' as never,
        progressBasisPoints: 2000,
        remainingMinor: 8000,
        targetAmountMinor: 10000,
        targetReached: false,
      },
    ],
    tasks: {
      completedCount: 5,
      directCompletedCount: 3,
      directMissedCount: 1,
      directOpenCount: 2,
      directTotalCount: 5,
      missedCount: 2,
      openCount: 4,
      recoveryItemCount: 1,
      recurringCompletedCount: 2,
      recurringMissedCount: 1,
      recurringOpenCount: 2,
      recurringSkippedCount: 1,
      recurringTotalCount: 6,
      skippedCount: 1,
      totalCount: 11,
    },
    work: {
      earnedIncomeMinor: 22000,
      entries: [],
      entryCount: 3,
      paidEntryCount: 2,
      totalDurationMinutes: 420,
      unpaidEntryCount: 1,
    },
    ...overrides,
  };
}

function copyStrings(summary: PeriodReviewSummary): string[] {
  return buildReflectionRelationships({ reflectionCount: 1, summary }).flatMap((relationship) => [
    relationship.description,
    relationship.missingReason ?? '',
    relationship.primary.label,
    relationship.secondary.label,
    relationship.title,
  ]);
}

describe('reflection-only relationships', () => {
  it('builds ready relationship groups from complete summary data', () => {
    const relationships = buildReflectionRelationships({
      reflectionCount: 1,
      summary: createSummary(),
    });

    expect(relationships.map((relationship) => relationship.id)).toEqual([
      'money_time',
      'work_savings',
      'tasks_reminders',
      'receipts_spending',
      'reflections_summary',
    ]);
    expect(relationships.every((relationship) => relationship.state === 'ready')).toBe(true);
    expect(relationships.find((relationship) => relationship.id === 'money_time')).toMatchObject({
      primary: {
        amountMinor: 12000,
        label: 'Spending recorded',
      },
      secondary: {
        label: 'Work time recorded',
        minutes: 420,
      },
    });
    expect(relationships.find((relationship) => relationship.id === 'receipts_spending')).toMatchObject({
      primary: {
        amountMinor: 3500,
        label: 'Receipt expenses',
      },
      secondary: {
        amountMinor: 12000,
        label: 'Total spending',
      },
    });
  });

  it('returns partial states without implying failure when data is missing', () => {
    const relationships = buildReflectionRelationships({
      summary: createSummary({
        money: {
          expenseAmountMinor: 0,
          expenseCount: 0,
          incomeAmountMinor: 0,
          incomeCount: 0,
          netAmountMinor: 0,
          receiptExpenseAmountMinor: 0,
          receiptExpenseCount: 0,
          recordCount: 0,
          records: [],
        },
        partial: {
          budget: true,
          money: true,
          reminders: true,
          savings: true,
          tasks: true,
          work: true,
        },
        reminders: {
          disabledOrUnavailableCount: 0,
          missedOrRecoveryCount: 0,
          openOccurrenceCount: 0,
          recoveryItemCount: 0,
          skippedOccurrenceCount: 0,
          totalCount: 0,
          totalOccurrenceCount: 0,
        },
        savings: [],
        tasks: {
          completedCount: 0,
          directCompletedCount: 0,
          directMissedCount: 0,
          directOpenCount: 0,
          directTotalCount: 0,
          missedCount: 0,
          openCount: 0,
          recoveryItemCount: 0,
          recurringCompletedCount: 0,
          recurringMissedCount: 0,
          recurringOpenCount: 0,
          recurringSkippedCount: 0,
          recurringTotalCount: 0,
          skippedCount: 0,
          totalCount: 0,
        },
        work: {
          earnedIncomeMinor: 0,
          entries: [],
          entryCount: 0,
          paidEntryCount: 0,
          totalDurationMinutes: 0,
          unpaidEntryCount: 0,
        },
      }),
    });

    expect(relationships.every((relationship) => relationship.state === 'partial')).toBe(true);
    expect(relationships.every((relationship) => relationship.missingReason)).toBe(true);
    expect(relationships.map((relationship) => relationship.missingReason)).toContain(
      'Saved reflections are not available for this period yet.',
    );
  });

  it('keeps relationship copy neutral and free of advice or causal language', () => {
    const prohibitedPatterns = [
      /\bbecause\b/i,
      /\bcaused?\b/i,
      /\bpredict/i,
      /\boptimi[sz]e/i,
      /\bshould\b/i,
      /\bmust\b/i,
      /financial advice/i,
      /\bfailure\b/i,
      /\bbad habit\b/i,
      /\bwaste/i,
    ];

    for (const text of copyStrings(createSummary())) {
      for (const pattern of prohibitedPatterns) {
        expect(text).not.toMatch(pattern);
      }
    }
  });
});
