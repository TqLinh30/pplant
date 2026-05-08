import { createAppError } from '@/domain/common/app-error';
import { err } from '@/domain/common/result';

import {
  recordDiagnosticEvent,
  recordMigrationDiagnostic,
  recordReceiptParsingDiagnostic,
  recordReceiptRetryExhaustedDiagnostic,
  recordReminderSchedulingDiagnostic,
  recordSummaryRecalculationDiagnostic,
} from './diagnostics.service';

const fixedNow = new Date('2026-05-09T02:40:00.000Z');
const error = createAppError('unavailable', 'Sensitive source failed for file:///private/receipts/a.jpg', 'retry');

describe('diagnostics service', () => {
  it('redacts then validates direct diagnostic events', async () => {
    const result = await recordDiagnosticEvent({
      appVersion: '1.0.0',
      errorCategory: 'unavailable',
      metadata: {
        jobState: 'file:///private/receipts/a.jpg',
        retryCount: 2,
        unsupportedKey: 'raw value',
      } as never,
      name: 'receipt_parsing_failed',
      occurredAt: fixedNow.toISOString(),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.metadata).toEqual({ retryCount: 2 });
    }
  });

  it('rejects invalid direct diagnostic event shapes after redaction', async () => {
    const result = await recordDiagnosticEvent({
      appVersion: '1.0.0',
      errorCategory: 'unavailable',
      name: 'unsupported_event' as never,
      occurredAt: fixedNow.toISOString(),
    });

    expect(result.ok).toBe(false);
  });

  it('records safe receipt parsing and retry exhaustion diagnostics', async () => {
    const parsing = await recordReceiptParsingDiagnostic({
      error,
      jobState: 'failed',
      now: fixedNow,
      offline: true,
      retryCount: 2,
      timedOut: true,
    });
    const exhausted = await recordReceiptRetryExhaustedDiagnostic({
      error,
      now: fixedNow,
    });

    expect(parsing.ok).toBe(true);
    expect(exhausted.ok).toBe(true);
    if (parsing.ok && exhausted.ok) {
      expect(parsing.value).toMatchObject({
        errorCategory: 'unavailable',
        metadata: {
          jobState: 'failed',
          maxAutomaticRetries: 3,
          offline: true,
          retryCount: 2,
          retryWindowHours: 24,
          timedOut: true,
        },
        name: 'receipt_parsing_failed',
      });
      expect(exhausted.value).toMatchObject({
        metadata: {
          jobState: 'retry_exhausted',
          retryCount: 3,
        },
        name: 'receipt_retry_exhausted',
      });
      expect(JSON.stringify([parsing.value, exhausted.value])).not.toContain('file:///private');
    }
  });

  it('records safe reminder, migration, and summary diagnostics', async () => {
    const reminder = await recordReminderSchedulingDiagnostic({
      deliveryState: 'failed',
      error,
      now: fixedNow,
      offline: false,
      permissionStatus: 'denied',
    });
    const migration = await recordMigrationDiagnostic({
      error,
      migrationStep: '006_add_money_record_corrections',
      now: fixedNow,
    });
    const summary = await recordSummaryRecalculationDiagnostic({
      error,
      now: fixedNow,
      summaryPeriod: 'week',
    });

    expect(reminder.ok).toBe(true);
    expect(migration.ok).toBe(true);
    expect(summary.ok).toBe(true);
    if (reminder.ok && migration.ok && summary.ok) {
      expect(reminder.value.name).toBe('reminder_scheduling_failed');
      expect(reminder.value.metadata).toEqual({
        deliveryState: 'failed',
        offline: false,
        permissionStatus: 'denied',
      });
      expect(migration.value).toMatchObject({
        metadata: { migrationStep: '006_add_money_record_corrections' },
        name: 'migration_failed',
      });
      expect(summary.value).toMatchObject({
        metadata: { summaryPeriod: 'week' },
        name: 'summary_recalculation_failed',
      });
    }
  });

  it('returns typed failures from injected recorders without throwing', async () => {
    const result = await recordSummaryRecalculationDiagnostic({
      error,
      recordEvent: async () =>
        err(createAppError('unavailable', 'Diagnostic event could not be recorded.', 'none')),
      summaryPeriod: 'week',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('unavailable');
      expect(result.error.recovery).toBe('none');
    }
  });
});
