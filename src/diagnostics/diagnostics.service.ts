import { ok, type AppResult } from '@/domain/common/result';
import type { AppError } from '@/domain/common/app-error';

import { validateDiagnosticEvent, type DiagnosticEvent, type DiagnosticMetadata } from './events';
import { redactDiagnosticEvent } from './redact';

export async function recordDiagnosticEvent(event: DiagnosticEvent): Promise<AppResult<DiagnosticEvent>> {
  const redacted = redactDiagnosticEvent(event);
  const validated = validateDiagnosticEvent(redacted);

  if (!validated.ok) {
    return validated;
  }

  return ok(validated.value);
}

type DiagnosticRecorder = (event: DiagnosticEvent) => Promise<AppResult<DiagnosticEvent>>;

type DiagnosticHelperBaseInput = {
  appVersion?: string;
  error: Pick<AppError, 'code'>;
  now?: Date;
  recordEvent?: DiagnosticRecorder;
};

function baseDiagnosticEvent(
  input: DiagnosticHelperBaseInput,
): Pick<DiagnosticEvent, 'appVersion' | 'errorCategory' | 'occurredAt'> {
  return {
    appVersion: input.appVersion ?? '1.0.0',
    errorCategory: input.error.code,
    occurredAt: (input.now ?? new Date()).toISOString(),
  };
}

async function recordBuiltDiagnosticEvent(
  event: DiagnosticEvent,
  input: DiagnosticHelperBaseInput,
): Promise<AppResult<DiagnosticEvent>> {
  const recordEvent = input.recordEvent ?? recordDiagnosticEvent;

  return recordEvent(event);
}

export async function recordReceiptParsingDiagnostic(
  input: DiagnosticHelperBaseInput & {
    jobState: string;
    maxAutomaticRetries?: number;
    offline?: boolean;
    retryCount?: number;
    retryWindowHours?: number;
    timedOut?: boolean;
  },
): Promise<AppResult<DiagnosticEvent>> {
  const metadata: DiagnosticMetadata = {
    jobState: input.jobState,
    maxAutomaticRetries: input.maxAutomaticRetries ?? 3,
    offline: input.offline ?? false,
    retryCount: input.retryCount ?? 0,
    retryWindowHours: input.retryWindowHours ?? 24,
    timedOut: input.timedOut ?? false,
  };

  return recordBuiltDiagnosticEvent(
    {
      ...baseDiagnosticEvent(input),
      metadata,
      name: 'receipt_parsing_failed',
    },
    input,
  );
}

export async function recordReceiptRetryExhaustedDiagnostic(
  input: DiagnosticHelperBaseInput & {
    jobState?: string;
    maxAutomaticRetries?: number;
    retryCount?: number;
    retryWindowHours?: number;
  },
): Promise<AppResult<DiagnosticEvent>> {
  const metadata: DiagnosticMetadata = {
    jobState: input.jobState ?? 'retry_exhausted',
    maxAutomaticRetries: input.maxAutomaticRetries ?? 3,
    retryCount: input.retryCount ?? 3,
    retryWindowHours: input.retryWindowHours ?? 24,
  };

  return recordBuiltDiagnosticEvent(
    {
      ...baseDiagnosticEvent(input),
      metadata,
      name: 'receipt_retry_exhausted',
    },
    input,
  );
}

export async function recordReminderSchedulingDiagnostic(
  input: DiagnosticHelperBaseInput & {
    deliveryState: string;
    offline?: boolean;
    permissionStatus: string;
  },
): Promise<AppResult<DiagnosticEvent>> {
  return recordBuiltDiagnosticEvent(
    {
      ...baseDiagnosticEvent(input),
      metadata: {
        deliveryState: input.deliveryState,
        offline: input.offline ?? false,
        permissionStatus: input.permissionStatus,
      },
      name: 'reminder_scheduling_failed',
    },
    input,
  );
}

export async function recordMigrationDiagnostic(
  input: DiagnosticHelperBaseInput & {
    migrationStep: string;
  },
): Promise<AppResult<DiagnosticEvent>> {
  return recordBuiltDiagnosticEvent(
    {
      ...baseDiagnosticEvent(input),
      metadata: {
        migrationStep: input.migrationStep,
      },
      name: 'migration_failed',
    },
    input,
  );
}

export async function recordSummaryRecalculationDiagnostic(
  input: DiagnosticHelperBaseInput & {
    summaryPeriod: string;
  },
): Promise<AppResult<DiagnosticEvent>> {
  return recordBuiltDiagnosticEvent(
    {
      ...baseDiagnosticEvent(input),
      metadata: {
        summaryPeriod: input.summaryPeriod,
      },
      name: 'summary_recalculation_failed',
    },
    input,
  );
}
