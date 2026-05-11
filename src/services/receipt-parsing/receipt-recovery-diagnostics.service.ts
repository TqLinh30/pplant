import { recordDiagnosticEvent } from '@/diagnostics/diagnostics.service';
import type { DiagnosticEvent } from '@/diagnostics/events';
import type { AppError } from '@/domain/common/app-error';
import type { AppResult } from '@/domain/common/result';
import type { ReceiptParseJob } from '@/domain/receipts/types';

export type ReceiptRecoveryDiagnosticActionId =
  | 'start_parsing'
  | 'retry_parsing'
  | 'edit_review'
  | 'edit_draft'
  | 'manual_expense'
  | 'keep_draft'
  | 'discard_draft';

export type ReceiptRecoveryFailureDiagnosticInput = {
  actionId: ReceiptRecoveryDiagnosticActionId;
  appVersion?: string;
  error: AppError;
  now?: Date;
  offline?: boolean;
  parseJob?: ReceiptParseJob | null;
  timedOut?: boolean;
};

export type ReceiptRecoveryFailureDiagnosticDependencies = {
  recordEvent?: (event: DiagnosticEvent) => Promise<AppResult<DiagnosticEvent>>;
};

export async function recordReceiptRecoveryFailure(
  input: ReceiptRecoveryFailureDiagnosticInput,
  dependencies: ReceiptRecoveryFailureDiagnosticDependencies = {},
): Promise<AppResult<DiagnosticEvent>> {
  const recordEvent = dependencies.recordEvent ?? recordDiagnosticEvent;

  return recordEvent({
    appVersion: input.appVersion ?? '1.0.0',
    errorCategory: input.error.code,
    metadata: {
      actionId: input.actionId,
      jobState: input.parseJob?.status ?? 'draft',
      offline: input.offline ?? false,
      retryCount: input.parseJob?.attemptCount ?? 0,
      timedOut: input.timedOut ?? false,
    },
    name: 'receipt_recovery_action_failed',
    occurredAt: (input.now ?? new Date()).toISOString(),
  });
}
