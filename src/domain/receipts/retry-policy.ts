export type ReceiptParseRetryState = {
  attemptCount: number;
  retryWindowStartedAt: string | null;
};

export type ReceiptParseRetryDecision = {
  allowed: boolean;
  exhausted: boolean;
  nextAttemptCount: number;
  nextRetryWindowStartedAt: string;
};

export const receiptParsingRetryPolicy = {
  maxAutomaticRetries: 3,
  windowHours: 24,
} as const;

const retryWindowMs = receiptParsingRetryPolicy.windowHours * 60 * 60 * 1000;

function parseTimestamp(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);

  return Number.isNaN(parsed) ? null : parsed;
}

export function evaluateReceiptParseRetry(
  state: ReceiptParseRetryState,
  now: Date,
  options: { userInitiated?: boolean } = {},
): ReceiptParseRetryDecision {
  const timestamp = now.toISOString();

  if (options.userInitiated && state.attemptCount >= receiptParsingRetryPolicy.maxAutomaticRetries) {
    return {
      allowed: true,
      exhausted: false,
      nextAttemptCount: 1,
      nextRetryWindowStartedAt: timestamp,
    };
  }

  const windowStart = parseTimestamp(state.retryWindowStartedAt);
  const windowExpired = windowStart === null || now.getTime() - windowStart >= retryWindowMs;

  if (windowExpired) {
    return {
      allowed: true,
      exhausted: false,
      nextAttemptCount: 1,
      nextRetryWindowStartedAt: timestamp,
    };
  }

  if (state.attemptCount >= receiptParsingRetryPolicy.maxAutomaticRetries) {
    return {
      allowed: false,
      exhausted: true,
      nextAttemptCount: state.attemptCount,
      nextRetryWindowStartedAt: state.retryWindowStartedAt ?? timestamp,
    };
  }

  return {
    allowed: true,
    exhausted: false,
    nextAttemptCount: state.attemptCount + 1,
    nextRetryWindowStartedAt: state.retryWindowStartedAt ?? timestamp,
  };
}

export function receiptParseFailureStatus(attemptCount: number): 'failed' | 'retry_exhausted' {
  return attemptCount >= receiptParsingRetryPolicy.maxAutomaticRetries ? 'retry_exhausted' : 'failed';
}
