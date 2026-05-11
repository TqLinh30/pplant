import { migrateDatabase, type MigrationClient } from '@/data/db/migrations/migrate';
import { parseMoneyRecordRow } from '@/domain/money/schemas';
import { buildReminderOccurrences } from '@/domain/reminders/reminder-occurrences';
import { hasLowConfidenceFields } from '@/domain/receipts/normalize-parse-result';
import { calculatePeriodReviewSummary } from '@/domain/summaries/period-summary';

import {
  createStandardMvpDatasetFixture,
  standardMvpDatasetCounts,
  standardMvpDatasetFixtureCounts,
} from './standard-mvp-dataset';

class FixtureMigrationClient implements MigrationClient {
  readonly applied = new Set<string>();

  execSync(): void {}

  getFirstSync<T>(_source: string, ...params: unknown[]): T | null {
    const [migrationId] = params;

    return typeof migrationId === 'string' && this.applied.has(migrationId)
      ? ({ id: migrationId } as T)
      : null;
  }

  runSync(_source: string, ...params: unknown[]): unknown {
    const [migrationId] = params;

    if (typeof migrationId === 'string') {
      this.applied.add(migrationId);
    }

    return { changes: 1 };
  }
}

function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectStrings);
  }

  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(collectStrings);
  }

  return [];
}

describe('standard MVP dataset fixture', () => {
  it('generates at least the required PRD dataset counts', () => {
    const fixture = createStandardMvpDatasetFixture();

    expect(standardMvpDatasetFixtureCounts(fixture)).toEqual(standardMvpDatasetCounts);
    expect(fixture.expenses).toHaveLength(1500);
    expect(fixture.receiptBasedExpenses).toHaveLength(150);
    expect(fixture.incomeEntries).toHaveLength(250);
    expect(fixture.workShifts).toHaveLength(250);
    expect(fixture.tasks).toHaveLength(1000);
    expect(fixture.reminders).toHaveLength(300);
    expect(fixture.savingsGoalEvents).toHaveLength(50);
    expect(fixture.reflections).toHaveLength(100);
  });

  it('uses deterministic synthetic strings without paths, URIs, or personal-looking content', () => {
    const fixture = createStandardMvpDatasetFixture();
    const serializedStrings = collectStrings(fixture).join('\n');

    expect(serializedStrings).not.toMatch(/(?:file|content|data|https?):\/\//i);
    expect(serializedStrings).not.toMatch(/[a-z]:\\/i);
    expect(serializedStrings).not.toMatch(/[/\\](?:cache|documents?|receipts?|tmp)[/\\]/i);
    expect(serializedStrings).not.toMatch(/\b(?:campus|market|store|ocr text|raw receipt|answer)\b/i);
    expect(fixture.reflections.every((reflection) => reflection.responseText === null)).toBe(true);
  });

  it('supports pure summary, recurrence, parsing, migration, and row parsing smoke checks without UI', async () => {
    const fixture = createStandardMvpDatasetFixture();
    const parsedMoney = parseMoneyRecordRow(fixture.expenses[0], fixture.expenses[0].topicIds);
    const occurrences = buildReminderOccurrences({
      exceptions: [],
      fromLocalDate: fixture.reminders[0].startsOnLocalDate,
      maxCount: 3,
      reminder: fixture.reminders[0],
      throughLocalDate: fixture.reminders[0].startsOnLocalDate,
    });
    const migration = await migrateDatabase(
      { $client: new FixtureMigrationClient() },
      new Date('2026-05-09T02:40:00.000Z'),
    );
    const summary = calculatePeriodReviewSummary({
      asOfLocalDate: '2026-12-31' as never,
      budgetPeriod: {
        endDateExclusive: '2027-01-01' as never,
        startDate: '2025-01-01' as never,
      },
      budgetPeriodMoneyRecords: fixture.expenses,
      budgetRules: null,
      moneyRecords: [...fixture.expenses, ...fixture.incomeEntries],
      period: {
        anchorLocalDate: '2026-12-31' as never,
        endDateExclusive: '2027-01-01' as never,
        key: 'fixture-period',
        kind: 'month',
        label: 'Fixture period',
        startDate: '2025-01-01' as never,
      },
      recoveryItems: [],
      reminders: fixture.reminders.map((reminder) => ({ occurrences: [], reminder })),
      savingsGoals: [],
      taskRecurrenceOccurrences: [],
      tasks: fixture.tasks,
      workEntries: fixture.workShifts,
    });

    expect(parsedMoney.ok).toBe(true);
    expect(occurrences.ok).toBe(true);
    expect(hasLowConfidenceFields(fixture.receiptParseResults[0])).toBe(false);
    expect(migration.ok).toBe(true);
    expect(summary.money.recordCount).toBe(1750);
    expect(summary.work.entryCount).toBe(250);
    expect(summary.tasks.directTotalCount).toBe(1000);
  });
});
