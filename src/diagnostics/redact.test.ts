import { redactDiagnosticEvent } from './redact';
import type { DiagnosticEvent } from './events';

const baseEvent: DiagnosticEvent = {
  name: 'receipt_parsing_failed',
  occurredAt: '2026-05-08T00:00:00.000Z',
  appVersion: '1.0.0',
  errorCategory: 'parser_unavailable',
};

describe('diagnostic redaction', () => {
  it('keeps only allowlisted non-sensitive metadata', () => {
    const event = {
      ...baseEvent,
      metadata: {
        retryCount: 2,
        jobState: 'failed',
        timedOut: false,
        receiptImageUri: 'file:///private/receipts/abc.jpg',
        ocrText: 'merchant total 12.00',
        merchant: 'Campus Store',
        amountMinor: 1200,
        incomeValue: 2500,
        errorMessage: 'Failed for file:///private/receipts/abc.jpg',
      },
    } as unknown as DiagnosticEvent;

    expect(redactDiagnosticEvent(event)).toEqual({
      ...baseEvent,
      metadata: {
        retryCount: 2,
        jobState: 'failed',
        timedOut: false,
      },
    });
  });

  it('drops allowlisted string values when they look like paths or uris', () => {
    const event = {
      ...baseEvent,
      metadata: {
        jobState: 'file:///private/receipts/abc.jpg',
        deliveryState: 'C:\\Users\\student\\Documents\\receipt.jpg',
        retryWindowHours: 24,
      },
    } as unknown as DiagnosticEvent;

    expect(redactDiagnosticEvent(event)).toEqual({
      ...baseEvent,
      metadata: {
        retryWindowHours: 24,
      },
    });
  });

  it('removes metadata entirely when nothing safe remains', () => {
    const event = {
      ...baseEvent,
      metadata: {
        receiptImageUri: 'file:///private/receipts/abc.jpg',
        ocrText: 'raw receipt text',
      },
    } as unknown as DiagnosticEvent;

    expect(redactDiagnosticEvent(event)).toEqual(baseEvent);
  });

  it('keeps only safe reminder scheduling failure metadata', () => {
    const event = {
      appVersion: '1.0.0',
      errorCategory: 'unavailable',
      metadata: {
        deliveryState: 'unavailable',
        permissionStatus: 'denied',
        offline: false,
        reminderTitle: 'Study biology',
        reminderNotes: 'Bring workbook',
        scheduledNotificationId: 'platform-secret',
        occurrenceLocalDate: '2026-05-08',
      },
      name: 'reminder_scheduling_failed',
      occurredAt: '2026-05-08T00:00:00.000Z',
    } as unknown as DiagnosticEvent;

    expect(redactDiagnosticEvent(event)).toEqual({
      appVersion: '1.0.0',
      errorCategory: 'unavailable',
      metadata: {
        deliveryState: 'unavailable',
        offline: false,
        permissionStatus: 'denied',
      },
      name: 'reminder_scheduling_failed',
      occurredAt: '2026-05-08T00:00:00.000Z',
    });
  });

  it('keeps only safe receipt recovery failure metadata', () => {
    const event = {
      appVersion: '1.0.0',
      errorCategory: 'unavailable',
      metadata: {
        actionId: 'retry_parsing',
        amountMinor: 1200,
        draftPayload: '{"amount":"12.00","merchantOrSource":"Campus Store"}',
        jobState: 'retry_exhausted',
        lineItems: ['Coffee'],
        merchant: 'Campus Store',
        note: 'Bought coffee',
        ocrText: 'Campus Store total 12.00',
        receiptImageUri: 'file:///private/receipts/abc.jpg',
        retryCount: 3,
        savedRecordId: 'money-1',
      },
      name: 'receipt_recovery_action_failed',
      occurredAt: '2026-05-08T00:00:00.000Z',
    } as unknown as DiagnosticEvent;

    expect(redactDiagnosticEvent(event)).toEqual({
      appVersion: '1.0.0',
      errorCategory: 'unavailable',
      metadata: {
        actionId: 'retry_parsing',
        jobState: 'retry_exhausted',
        retryCount: 3,
      },
      name: 'receipt_recovery_action_failed',
      occurredAt: '2026-05-08T00:00:00.000Z',
    });
  });
});
