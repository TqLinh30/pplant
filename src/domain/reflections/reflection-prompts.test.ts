import type { PeriodReviewSummary } from '@/domain/summaries/period-summary';

import { buildReflectionPrompts } from './reflection-prompts';

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
    savings: [],
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

describe('reflection prompts', () => {
  it('builds up to three short optional prompts for weekly and monthly reviews', () => {
    const weeklyPrompts = buildReflectionPrompts({ summary: createSummary() });
    const monthlyPrompts = buildReflectionPrompts({
      summary: createSummary({
        period: {
          anchorLocalDate: '2026-05-08' as never,
          endDateExclusive: '2026-06-01' as never,
          key: 'month:2026-05',
          kind: 'month',
          label: '2026-05',
          startDate: '2026-05-01' as never,
        },
      }),
    });

    expect(weeklyPrompts).toHaveLength(3);
    expect(monthlyPrompts).toHaveLength(3);
    expect(weeklyPrompts.map((prompt) => prompt.id)).toEqual([
      'remember_period',
      'noticed_pair',
      'next_review_ease',
    ]);
    expect(weeklyPrompts.every((prompt) => prompt.text.length <= 90)).toBe(true);
    expect(weeklyPrompts.every((prompt) => prompt.optional)).toBe(true);
  });

  it('keeps prompt copy neutral and free of calculation, advice, or shame language', () => {
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
      /\bcalculate\b/i,
      /\bsum\b/i,
      /\bdivide\b/i,
      /\bpercentage\b/i,
    ];

    for (const prompt of buildReflectionPrompts({ summary: createSummary() })) {
      for (const pattern of prohibitedPatterns) {
        expect(`${prompt.text} ${prompt.helperText}`).not.toMatch(pattern);
      }
    }
  });
});
