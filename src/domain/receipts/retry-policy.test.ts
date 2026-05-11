import {
  evaluateReceiptParseRetry,
  receiptParseFailureStatus,
  receiptParsingRetryPolicy,
} from './retry-policy';

const now = new Date('2026-05-08T12:00:00.000Z');

describe('receipt parse retry policy', () => {
  it('starts a new retry window for the first automatic attempt', () => {
    const decision = evaluateReceiptParseRetry(
      {
        attemptCount: 0,
        retryWindowStartedAt: null,
      },
      now,
    );

    expect(decision).toEqual({
      allowed: true,
      exhausted: false,
      nextAttemptCount: 1,
      nextRetryWindowStartedAt: now.toISOString(),
    });
  });

  it('caps automatic attempts at three within twenty-four hours', () => {
    const windowStart = '2026-05-08T10:00:00.000Z';

    expect(
      evaluateReceiptParseRetry(
        {
          attemptCount: receiptParsingRetryPolicy.maxAutomaticRetries - 1,
          retryWindowStartedAt: windowStart,
        },
        now,
      ),
    ).toMatchObject({
      allowed: true,
      nextAttemptCount: 3,
    });

    expect(
      evaluateReceiptParseRetry(
        {
          attemptCount: receiptParsingRetryPolicy.maxAutomaticRetries,
          retryWindowStartedAt: windowStart,
        },
        now,
      ),
    ).toEqual({
      allowed: false,
      exhausted: true,
      nextAttemptCount: 3,
      nextRetryWindowStartedAt: windowStart,
    });
  });

  it('opens a fresh automatic window after twenty-four hours', () => {
    const decision = evaluateReceiptParseRetry(
      {
        attemptCount: 3,
        retryWindowStartedAt: '2026-05-07T11:59:59.000Z',
      },
      now,
    );

    expect(decision).toMatchObject({
      allowed: true,
      nextAttemptCount: 1,
      nextRetryWindowStartedAt: now.toISOString(),
    });
  });

  it('allows explicit user action after automatic retry exhaustion', () => {
    const decision = evaluateReceiptParseRetry(
      {
        attemptCount: 3,
        retryWindowStartedAt: '2026-05-08T10:00:00.000Z',
      },
      now,
      { userInitiated: true },
    );

    expect(decision).toEqual({
      allowed: true,
      exhausted: false,
      nextAttemptCount: 1,
      nextRetryWindowStartedAt: now.toISOString(),
    });
    expect(receiptParseFailureStatus(2)).toBe('failed');
    expect(receiptParseFailureStatus(3)).toBe('retry_exhausted');
  });
});
