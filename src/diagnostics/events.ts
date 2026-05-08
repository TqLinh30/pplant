import { z } from 'zod';

import { createAppError } from '@/domain/common/app-error';
import { err, ok, type AppResult } from '@/domain/common/result';

export type DiagnosticEventName =
  | 'receipt_parsing_failed'
  | 'receipt_recovery_action_failed'
  | 'reminder_scheduling_failed'
  | 'migration_failed'
  | 'summary_recalculation_failed'
  | 'receipt_retry_exhausted';

export const diagnosticMetadataKeys = [
  'retryCount',
  'maxAutomaticRetries',
  'retryWindowHours',
  'jobState',
  'deliveryState',
  'migrationStep',
  'summaryPeriod',
  'permissionStatus',
  'offline',
  'timedOut',
  'actionId',
] as const;

export type DiagnosticMetadataKey = (typeof diagnosticMetadataKeys)[number];
export type DiagnosticMetadataValue = string | number | boolean | null;
export type DiagnosticMetadata = Partial<Record<DiagnosticMetadataKey, DiagnosticMetadataValue>>;

export type DiagnosticEvent = {
  name: DiagnosticEventName;
  occurredAt: string;
  appVersion: string;
  errorCategory: string;
  metadata?: DiagnosticMetadata;
};

export const diagnosticEventNames = [
  'receipt_parsing_failed',
  'receipt_recovery_action_failed',
  'reminder_scheduling_failed',
  'migration_failed',
  'summary_recalculation_failed',
  'receipt_retry_exhausted',
] as const satisfies readonly DiagnosticEventName[];

const diagnosticMetadataValueSchema = z.union([
  z.string().max(80),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

const diagnosticMetadataSchema = z
  .object(
    Object.fromEntries(
      diagnosticMetadataKeys.map((key) => [key, diagnosticMetadataValueSchema.optional()]),
    ) as Record<DiagnosticMetadataKey, z.ZodOptional<typeof diagnosticMetadataValueSchema>>,
  )
  .strict()
  .partial();

export const diagnosticEventSchema = z
  .object({
    appVersion: z.string().min(1).max(40),
    errorCategory: z.string().min(1).max(80),
    metadata: diagnosticMetadataSchema.optional(),
    name: z.enum(diagnosticEventNames),
    occurredAt: z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
      message: 'Expected an ISO timestamp.',
    }),
  })
  .strict();

export function validateDiagnosticEvent(event: unknown): AppResult<DiagnosticEvent> {
  const parsed = diagnosticEventSchema.safeParse(event);

  if (!parsed.success) {
    return err(createAppError('validation_failed', 'Diagnostic event data is invalid.', 'none', parsed.error));
  }

  return ok(parsed.data);
}
