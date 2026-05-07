export type DiagnosticEventName =
  | 'receipt_parsing_failed'
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
