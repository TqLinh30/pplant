import {
  diagnosticEventNames,
  validateDiagnosticEvent,
  type DiagnosticEvent,
} from './events';

const baseEvent: DiagnosticEvent = {
  appVersion: '1.0.0',
  errorCategory: 'unavailable',
  name: 'receipt_parsing_failed',
  occurredAt: '2026-05-09T02:40:00.000Z',
};

describe('diagnostic event schema', () => {
  it('accepts all required diagnostic event names with safe metadata', () => {
    for (const name of diagnosticEventNames) {
      const result = validateDiagnosticEvent({
        ...baseEvent,
        metadata: {
          actionId: 'retry_parsing',
          deliveryState: 'failed',
          jobState: 'retry_exhausted',
          maxAutomaticRetries: 3,
          migrationStep: 'migrate',
          offline: false,
          permissionStatus: 'denied',
          retryCount: 3,
          retryWindowHours: 24,
          summaryPeriod: 'week',
          timedOut: true,
        },
        name,
      });

      expect(result.ok).toBe(true);
    }
  });

  it('rejects invalid names, timestamps, unsupported keys, and oversized strings', () => {
    expect(validateDiagnosticEvent({ ...baseEvent, name: 'raw_user_event' }).ok).toBe(false);
    expect(validateDiagnosticEvent({ ...baseEvent, occurredAt: 'not-a-date' }).ok).toBe(false);
    expect(
      validateDiagnosticEvent({
        ...baseEvent,
        metadata: {
          merchant: 'Campus Store',
        },
      }).ok,
    ).toBe(false);
    expect(
      validateDiagnosticEvent({
        ...baseEvent,
        metadata: {
          jobState: 'x'.repeat(81),
        },
      }).ok,
    ).toBe(false);
  });
});
