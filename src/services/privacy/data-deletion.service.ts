import { openPplantDatabase, type PplantDatabase } from '@/data/db/client';
import {
  migrateDatabase,
  type MigrationDatabase,
  type MigrationReport,
} from '@/data/db/migrations/migrate';
import { createAppError } from '@/domain/common/app-error';
import { err, isErr, ok, type AppResult } from '@/domain/common/result';
import {
  buildDataDeletionImpact,
  type DataDeletionImpact,
  type DataDeletionPlan,
  type DataDeletionRecordKind,
  type DataDeletionTarget,
  validateDataDeletionPlan,
} from '@/domain/privacy/deletion-plan';
import { localWorkspaceId } from '@/domain/workspace/types';
import {
  markReceiptImageDeleted,
  parseReceiptCaptureDraftPayload,
  receiptDraftHasRetainedImage,
  toCaptureDraftPayload,
} from '@/features/capture-drafts/captureDraftPayloads';
import { deleteReceiptImageReference } from '@/services/files/receipt-file-store';
import type { NotificationSchedulerPort } from '@/services/notifications/notification-scheduler.port';

export type DataDeletionCounts = {
  budgetsDeleted: number;
  categoriesDeleted: number;
  diagnosticsDeleted: number;
  draftsDiscarded: number;
  moneyRecordsDeleted: number;
  receiptImagesDeleted: number;
  receiptParseJobsDeleted: number;
  recurrenceRulesDeleted: number;
  recoveryEventsDeleted: number;
  reflectionPreferencesDeleted: number;
  reflectionsDeleted: number;
  reminderNotificationsDeleted: number;
  remindersDeleted: number;
  savingsGoalsDeleted: number;
  taskRecurrenceCompletionsDeleted: number;
  taskRecurrenceRulesDeleted: number;
  tasksDeleted: number;
  topicsDeleted: number;
  userPreferencesDeleted: number;
  workEntriesDeleted: number;
};

export type DataDeletionExecutionResult = {
  completedAt: string;
  counts: DataDeletionCounts;
  impact: DataDeletionImpact;
  warnings: string[];
};

export type DataDeletionServiceDependencies = {
  database?: unknown;
  deleteImage?: typeof deleteReceiptImageReference;
  migrateDatabase?: (database: unknown, now: Date) => Promise<AppResult<MigrationReport>>;
  notificationScheduler?: Pick<NotificationSchedulerPort, 'cancelScheduledNotification'>;
  now?: () => Date;
  openDatabase?: () => unknown;
};

type DataDeletionSqlClient = PplantDatabase['$client'] & {
  withTransactionSync?: (task: () => void) => void;
};

type PreparedDeletionAccess = {
  client: DataDeletionSqlClient;
  now: Date;
};

type DraftRow = {
  id: string;
  kind: string;
  payloadJson: string;
  savedRecordId: string | null;
  savedRecordKind: string | null;
  status: string;
};

const emptyCounts: DataDeletionCounts = {
  budgetsDeleted: 0,
  categoriesDeleted: 0,
  diagnosticsDeleted: 0,
  draftsDiscarded: 0,
  moneyRecordsDeleted: 0,
  receiptImagesDeleted: 0,
  receiptParseJobsDeleted: 0,
  recurrenceRulesDeleted: 0,
  recoveryEventsDeleted: 0,
  reflectionPreferencesDeleted: 0,
  reflectionsDeleted: 0,
  reminderNotificationsDeleted: 0,
  remindersDeleted: 0,
  savingsGoalsDeleted: 0,
  taskRecurrenceCompletionsDeleted: 0,
  taskRecurrenceRulesDeleted: 0,
  tasksDeleted: 0,
  topicsDeleted: 0,
  userPreferencesDeleted: 0,
  workEntriesDeleted: 0,
};

function cloneCounts(): DataDeletionCounts {
  return { ...emptyCounts };
}

function runMutation(client: DataDeletionSqlClient, source: string, ...params: unknown[]): number {
  const result = client.runSync(source, ...(params as never[])) as { changes?: number } | undefined;

  return result?.changes ?? 0;
}

function placeholders(values: readonly unknown[]): string {
  return values.map(() => '?').join(', ');
}

async function resolveNotificationScheduler(
  dependencies: DataDeletionServiceDependencies,
): Promise<AppResult<Pick<NotificationSchedulerPort, 'cancelScheduledNotification'>>> {
  if (dependencies.notificationScheduler) {
    return ok(dependencies.notificationScheduler);
  }

  try {
    const notifications = await import('@/services/notifications/expo-notification-scheduler');

    return ok(notifications.expoNotificationScheduler);
  } catch (cause) {
    return err(createAppError('unavailable', 'Local notification cleanup is unavailable.', 'retry', cause));
  }
}

async function prepareDeletionAccess({
  database,
  migrateDatabase: migrateDatabaseDependency = (target, now) =>
    migrateDatabase(target as MigrationDatabase, now),
  now: nowDependency = () => new Date(),
  openDatabase: openDatabaseDependency = openPplantDatabase,
}: DataDeletionServiceDependencies = {}): Promise<AppResult<PreparedDeletionAccess>> {
  const now = nowDependency();
  let targetDatabase = database;

  if (!targetDatabase) {
    try {
      targetDatabase = openDatabaseDependency();
    } catch (cause) {
      return err(createAppError('unavailable', 'Local data controls could not open storage.', 'retry', cause));
    }

    const migrationResult = await migrateDatabaseDependency(targetDatabase, now);

    if (isErr(migrationResult)) {
      return migrationResult;
    }
  }

  return ok({
    client: (targetDatabase as PplantDatabase).$client as DataDeletionSqlClient,
    now,
  });
}

export async function previewDeletionPlan(plan: DataDeletionPlan): Promise<AppResult<DataDeletionImpact>> {
  return buildDataDeletionImpact(plan);
}

function selectDraftRows(client: DataDeletionSqlClient, whereSql: string, params: unknown[]): DraftRow[] {
  return client.getAllSync<DraftRow>(
    `SELECT
       id,
       kind,
       payload_json AS payloadJson,
       saved_record_kind AS savedRecordKind,
       saved_record_id AS savedRecordId,
       status
     FROM capture_drafts
     WHERE workspace_id = ? AND ${whereSql}
     ORDER BY updated_at DESC, id DESC`,
    localWorkspaceId,
    ...(params as never[]),
  );
}

function parseDraftPayload(payloadJson: string): Record<string, unknown> | null {
  try {
    const value = JSON.parse(payloadJson);

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  } catch {
    return null;
  }

  return null;
}

async function deleteReceiptImagesForDraftRows(
  access: PreparedDeletionAccess,
  dependencies: DataDeletionServiceDependencies,
  rows: DraftRow[],
  counts: DataDeletionCounts,
  warnings: string[],
): Promise<AppResult<void>> {
  const timestamp = access.now.toISOString();
  const deleteImage = dependencies.deleteImage ?? deleteReceiptImageReference;

  for (const row of rows) {
    const payload = parseDraftPayload(row.payloadJson);

    if (!payload) {
      continue;
    }

    const receipt = parseReceiptCaptureDraftPayload(payload);

    if (isErr(receipt) || !receiptDraftHasRetainedImage(receipt.value)) {
      continue;
    }

    const deletion = await deleteImage(receipt.value.receipt.retainedImageUri);

    if (isErr(deletion)) {
      warnings.push('A receipt image reference was cleared, but the file could not be deleted locally.');
    } else if (deletion.value.deleted) {
      counts.receiptImagesDeleted += 1;
    }

    const updatedPayload = toCaptureDraftPayload(
      markReceiptImageDeleted(receipt.value, {
        deletedAt: timestamp,
        deletionReason: 'user_deleted',
      }),
    );

    runMutation(
      access.client,
      `UPDATE capture_drafts
       SET payload_json = ?,
           updated_at = ?
       WHERE workspace_id = ? AND id = ?`,
      JSON.stringify(updatedPayload),
      timestamp,
      localWorkspaceId,
      row.id,
    );
  }

  return ok(undefined);
}

function clearReceiptParseJobsForDraftIds(
  client: DataDeletionSqlClient,
  draftIds: string[],
  timestamp: string,
): number {
  if (draftIds.length === 0) {
    return 0;
  }

  return runMutation(
    client,
    `UPDATE receipt_parse_jobs
     SET deleted_at = ?,
         updated_at = ?,
         result_json = NULL,
         last_error_category = NULL
     WHERE workspace_id = ?
       AND receipt_draft_id IN (${placeholders(draftIds)})
       AND deleted_at IS NULL`,
    timestamp,
    timestamp,
    localWorkspaceId,
    ...draftIds,
  );
}

function discardDraftRows(client: DataDeletionSqlClient, rows: DraftRow[], timestamp: string): number {
  if (rows.length === 0) {
    return 0;
  }

  const ids = rows.map((row) => row.id);

  return runMutation(
    client,
    `UPDATE capture_drafts
     SET status = 'discarded',
         payload_json = '{}',
         updated_at = ?,
         discarded_at = ?,
         saved_at = NULL,
         saved_record_kind = NULL,
         saved_record_id = NULL
     WHERE workspace_id = ?
       AND id IN (${placeholders(ids)})
       AND status != 'discarded'`,
    timestamp,
    timestamp,
    localWorkspaceId,
    ...ids,
  );
}

async function discardDraftsByWhere(
  access: PreparedDeletionAccess,
  dependencies: DataDeletionServiceDependencies,
  whereSql: string,
  params: unknown[],
  counts: DataDeletionCounts,
  warnings: string[],
): Promise<AppResult<string[]>> {
  const rows = selectDraftRows(access.client, whereSql, params);
  const imageDeletion = await deleteReceiptImagesForDraftRows(access, dependencies, rows, counts, warnings);

  if (isErr(imageDeletion)) {
    return imageDeletion;
  }

  const timestamp = access.now.toISOString();
  const draftIds = rows.map((row) => row.id);

  counts.receiptParseJobsDeleted += clearReceiptParseJobsForDraftIds(access.client, draftIds, timestamp);
  counts.draftsDiscarded += discardDraftRows(access.client, rows, timestamp);

  return ok(draftIds);
}

function selectIds(client: DataDeletionSqlClient, source: string, ...params: unknown[]): string[] {
  return client
    .getAllSync<{ id: string }>(source, ...(params as never[]))
    .map((row) => row.id);
}

function selectMoneyIdsForKind(
  client: DataDeletionSqlClient,
  recordKind: DataDeletionRecordKind,
): string[] {
  const kindClause = recordKind === 'expense' || recordKind === 'income' ? 'AND kind = ?' : '';
  const params = recordKind === 'expense' || recordKind === 'income' ? [recordKind] : [];

  return selectIds(
    client,
    `SELECT id
     FROM money_records
     WHERE workspace_id = ?
       AND deleted_at IS NULL
       ${kindClause}`,
    localWorkspaceId,
    ...params,
  );
}

function selectMoneyRecurrenceRuleIdsForKind(
  client: DataDeletionSqlClient,
  recordKind: DataDeletionRecordKind,
): string[] {
  const kindClause = recordKind === 'expense' || recordKind === 'income' ? 'AND money_kind = ?' : '';
  const params = recordKind === 'expense' || recordKind === 'income' ? [recordKind] : [];

  return selectIds(
    client,
    `SELECT id
     FROM recurrence_rules
     WHERE workspace_id = ?
       AND deleted_at IS NULL
       ${kindClause}`,
    localWorkspaceId,
    ...params,
  );
}

function selectMoneyIdsForDateRange(
  client: DataDeletionSqlClient,
  recordKind: DataDeletionRecordKind,
  startDate: string,
  endDate: string,
): string[] {
  const kindClause = recordKind === 'expense' || recordKind === 'income' ? 'AND kind = ?' : '';
  const params = recordKind === 'expense' || recordKind === 'income' ? [recordKind] : [];

  return selectIds(
    client,
    `SELECT id
     FROM money_records
     WHERE workspace_id = ?
       AND deleted_at IS NULL
       AND local_date >= ?
       AND local_date <= ?
       ${kindClause}`,
    localWorkspaceId,
    startDate,
    endDate,
    ...params,
  );
}

function selectIdsForRecordKind(
  client: DataDeletionSqlClient,
  recordKind: Exclude<DataDeletionRecordKind, 'all_records'>,
): string[] {
  switch (recordKind) {
    case 'expense':
    case 'income':
    case 'money':
      return selectMoneyIdsForKind(client, recordKind);
    case 'work':
      return selectIds(client, `SELECT id FROM work_entries WHERE workspace_id = ? AND deleted_at IS NULL`, localWorkspaceId);
    case 'task':
      return selectIds(client, `SELECT id FROM tasks WHERE workspace_id = ? AND deleted_at IS NULL`, localWorkspaceId);
    case 'task_recurrence':
      return selectIds(client, `SELECT id FROM task_recurrence_rules WHERE workspace_id = ? AND deleted_at IS NULL`, localWorkspaceId);
    case 'reminder':
      return selectIds(client, `SELECT id FROM reminders WHERE workspace_id = ? AND deleted_at IS NULL`, localWorkspaceId);
    case 'reflection':
      return selectIds(client, `SELECT id FROM reflections WHERE workspace_id = ? AND deleted_at IS NULL`, localWorkspaceId);
    default:
      return [];
  }
}

function selectIdsForRecordDateRange(
  client: DataDeletionSqlClient,
  recordKind: Exclude<DataDeletionRecordKind, 'all_records'>,
  startDate: string,
  endDate: string,
): string[] {
  switch (recordKind) {
    case 'expense':
    case 'income':
    case 'money':
      return selectMoneyIdsForDateRange(client, recordKind, startDate, endDate);
    case 'work':
      return selectIds(
        client,
        `SELECT id FROM work_entries
         WHERE workspace_id = ? AND deleted_at IS NULL AND local_date >= ? AND local_date <= ?`,
        localWorkspaceId,
        startDate,
        endDate,
      );
    case 'task':
      return selectIds(
        client,
        `SELECT id FROM tasks
         WHERE workspace_id = ?
           AND deleted_at IS NULL
           AND COALESCE(deadline_local_date, substr(created_at, 1, 10)) >= ?
           AND COALESCE(deadline_local_date, substr(created_at, 1, 10)) <= ?`,
        localWorkspaceId,
        startDate,
        endDate,
      );
    case 'task_recurrence':
      return selectIds(
        client,
        `SELECT id FROM task_recurrence_rules
         WHERE workspace_id = ? AND deleted_at IS NULL AND starts_on_local_date >= ? AND starts_on_local_date <= ?`,
        localWorkspaceId,
        startDate,
        endDate,
      );
    case 'reminder':
      return selectIds(
        client,
        `SELECT id FROM reminders
         WHERE workspace_id = ? AND deleted_at IS NULL AND starts_on_local_date >= ? AND starts_on_local_date <= ?`,
        localWorkspaceId,
        startDate,
        endDate,
      );
    case 'reflection':
      return selectIds(
        client,
        `SELECT id FROM reflections
         WHERE workspace_id = ? AND deleted_at IS NULL AND period_start_date >= ? AND period_start_date <= ?`,
        localWorkspaceId,
        startDate,
        endDate,
      );
    default:
      return [];
  }
}

function softDeleteByIds(
  client: DataDeletionSqlClient,
  tableName: string,
  ids: string[],
  timestamp: string,
  updatedAtColumn = 'updated_at',
): number {
  if (ids.length === 0) {
    return 0;
  }

  return runMutation(
    client,
    `UPDATE ${tableName}
     SET deleted_at = ?,
         ${updatedAtColumn} = ?
     WHERE workspace_id = ?
       AND id IN (${placeholders(ids)})
       AND deleted_at IS NULL`,
    timestamp,
    timestamp,
    localWorkspaceId,
    ...ids,
  );
}

function softDeleteTaskRecurrenceCompletionsForRuleIds(
  client: DataDeletionSqlClient,
  ruleIds: string[],
  timestamp: string,
): number {
  if (ruleIds.length === 0) {
    return 0;
  }

  return runMutation(
    client,
    `UPDATE task_recurrence_completions
     SET deleted_at = ?,
         updated_at = ?
     WHERE workspace_id = ?
       AND rule_id IN (${placeholders(ruleIds)})
       AND deleted_at IS NULL`,
    timestamp,
    timestamp,
    localWorkspaceId,
    ...ruleIds,
  );
}

function selectReminderIdsByOwnerColumn(
  client: DataDeletionSqlClient,
  ownerColumn: 'task_id' | 'task_recurrence_rule_id',
  ownerIds: string[],
): string[] {
  if (ownerIds.length === 0) {
    return [];
  }

  return selectIds(
    client,
    `SELECT id
     FROM reminders
     WHERE workspace_id = ?
       AND ${ownerColumn} IN (${placeholders(ownerIds)})
       AND deleted_at IS NULL`,
    localWorkspaceId,
    ...ownerIds,
  );
}

async function cancelAndSoftDeleteScheduledNotifications(
  access: PreparedDeletionAccess,
  dependencies: DataDeletionServiceDependencies,
  reminderIds: string[],
  counts: DataDeletionCounts,
  warnings: string[],
): Promise<AppResult<void>> {
  if (reminderIds.length === 0) {
    return ok(undefined);
  }

  const rows = access.client.getAllSync<{ scheduledNotificationId: string }>(
    `SELECT scheduled_notification_id AS scheduledNotificationId
     FROM reminder_scheduled_notifications
     WHERE workspace_id = ?
       AND reminder_id IN (${placeholders(reminderIds)})
       AND deleted_at IS NULL`,
    localWorkspaceId,
    ...reminderIds,
  );

  if (rows.length > 0) {
    const scheduler = await resolveNotificationScheduler(dependencies);

    if (isErr(scheduler)) {
      warnings.push('Local reminder rows were cleared, but native notification cancellation was unavailable.');
    } else {
      for (const row of rows) {
        const cancelled = await scheduler.value.cancelScheduledNotification(row.scheduledNotificationId);

        if (isErr(cancelled)) {
          warnings.push('A native reminder notification could not be cancelled.');
        }
      }
    }
  }

  counts.reminderNotificationsDeleted += runMutation(
    access.client,
    `UPDATE reminder_scheduled_notifications
     SET deleted_at = ?,
         updated_at = ?
     WHERE workspace_id = ?
       AND reminder_id IN (${placeholders(reminderIds)})
       AND deleted_at IS NULL`,
    access.now.toISOString(),
    access.now.toISOString(),
    localWorkspaceId,
    ...reminderIds,
  );

  return ok(undefined);
}

async function deleteReminderIds(
  access: PreparedDeletionAccess,
  dependencies: DataDeletionServiceDependencies,
  reminderIds: string[],
  counts: DataDeletionCounts,
  warnings: string[],
): Promise<AppResult<void>> {
  const cancelled = await cancelAndSoftDeleteScheduledNotifications(
    access,
    dependencies,
    reminderIds,
    counts,
    warnings,
  );

  if (isErr(cancelled)) {
    return cancelled;
  }

  counts.remindersDeleted += softDeleteByIds(
    access.client,
    'reminders',
    reminderIds,
    access.now.toISOString(),
  );

  const cleanup = await cleanupDraftsForSavedRecords(
    access,
    dependencies,
    'reminder',
    reminderIds,
    counts,
    warnings,
  );

  if (isErr(cleanup)) {
    return cleanup;
  }

  return ok(undefined);
}

async function cleanupDraftsForSavedRecords(
  access: PreparedDeletionAccess,
  dependencies: DataDeletionServiceDependencies,
  savedRecordKind: string,
  savedRecordIds: string[],
  counts: DataDeletionCounts,
  warnings: string[],
): Promise<AppResult<void>> {
  if (savedRecordIds.length === 0) {
    return ok(undefined);
  }

  const discarded = await discardDraftsByWhere(
    access,
    dependencies,
    `saved_record_kind = ? AND saved_record_id IN (${placeholders(savedRecordIds)})`,
    [savedRecordKind, ...savedRecordIds],
    counts,
    warnings,
  );

  if (isErr(discarded)) {
    return discarded;
  }

  return ok(undefined);
}

async function deleteRecordsByKindAndIds(
  access: PreparedDeletionAccess,
  dependencies: DataDeletionServiceDependencies,
  recordKind: Exclude<DataDeletionRecordKind, 'all_records'>,
  ids: string[],
  counts: DataDeletionCounts,
  warnings: string[],
): Promise<AppResult<void>> {
  const timestamp = access.now.toISOString();

  switch (recordKind) {
    case 'expense':
    case 'income':
    case 'money':
      counts.moneyRecordsDeleted += softDeleteByIds(access.client, 'money_records', ids, timestamp);
      {
        const cleanup = await cleanupDraftsForSavedRecords(access, dependencies, 'money_record', ids, counts, warnings);

        if (isErr(cleanup)) {
          return cleanup;
        }
      }
      return ok(undefined);
    case 'work':
      counts.workEntriesDeleted += softDeleteByIds(access.client, 'work_entries', ids, timestamp);
      {
        const cleanup = await cleanupDraftsForSavedRecords(access, dependencies, 'work_entry', ids, counts, warnings);

        if (isErr(cleanup)) {
          return cleanup;
        }
      }
      return ok(undefined);
    case 'task':
      counts.tasksDeleted += softDeleteByIds(access.client, 'tasks', ids, timestamp);
      {
        const reminderIds = selectReminderIdsByOwnerColumn(access.client, 'task_id', ids);
        const reminders = await deleteReminderIds(access, dependencies, reminderIds, counts, warnings);

        if (isErr(reminders)) {
          return reminders;
        }
      }
      {
        const cleanup = await cleanupDraftsForSavedRecords(access, dependencies, 'task', ids, counts, warnings);

        if (isErr(cleanup)) {
          return cleanup;
        }
      }
      return ok(undefined);
    case 'task_recurrence':
      counts.taskRecurrenceRulesDeleted += softDeleteByIds(access.client, 'task_recurrence_rules', ids, timestamp);
      counts.taskRecurrenceCompletionsDeleted += softDeleteTaskRecurrenceCompletionsForRuleIds(
        access.client,
        ids,
        timestamp,
      );
      {
        const reminderIds = selectReminderIdsByOwnerColumn(access.client, 'task_recurrence_rule_id', ids);
        const reminders = await deleteReminderIds(access, dependencies, reminderIds, counts, warnings);

        if (isErr(reminders)) {
          return reminders;
        }
      }
      return ok(undefined);
    case 'reminder': {
      return deleteReminderIds(access, dependencies, ids, counts, warnings);
    }
    case 'reflection':
      counts.reflectionsDeleted += softDeleteByIds(access.client, 'reflections', ids, timestamp);
      return ok(undefined);
    default:
      return ok(undefined);
  }
}

async function executeRecordDeletion(
  access: PreparedDeletionAccess,
  dependencies: DataDeletionServiceDependencies,
  target: Extract<DataDeletionTarget, { kind: 'record' | 'records_by_date_range' | 'records_by_type' }>,
  counts: DataDeletionCounts,
  warnings: string[],
): Promise<AppResult<void>> {
  if (target.kind === 'record') {
    return deleteRecordsByKindAndIds(access, dependencies, target.recordKind, [target.recordId], counts, warnings);
  }

  if (target.kind === 'records_by_type') {
    const ids = selectIdsForRecordKind(access.client, target.recordKind);
    if (target.recordKind === 'expense' || target.recordKind === 'income' || target.recordKind === 'money') {
      const recurrenceRuleIds = selectMoneyRecurrenceRuleIdsForKind(access.client, target.recordKind);
      counts.recurrenceRulesDeleted += softDeleteByIds(
        access.client,
        'recurrence_rules',
        recurrenceRuleIds,
        access.now.toISOString(),
      );
    }

    return deleteRecordsByKindAndIds(access, dependencies, target.recordKind, ids, counts, warnings);
  }

  const recordKinds =
    target.recordKind === 'all_records'
      ? (['money', 'work', 'task', 'task_recurrence', 'reminder', 'reflection'] as const)
      : ([target.recordKind] as const);

  for (const recordKind of recordKinds) {
    const ids = selectIdsForRecordDateRange(access.client, recordKind, target.startDate, target.endDate);
    const deleted = await deleteRecordsByKindAndIds(access, dependencies, recordKind, ids, counts, warnings);

    if (isErr(deleted)) {
      return deleted;
    }
  }

  return ok(undefined);
}

async function executeReceiptImageDeletion(
  access: PreparedDeletionAccess,
  dependencies: DataDeletionServiceDependencies,
  target: Extract<DataDeletionTarget, { kind: 'receipt_image' | 'receipt_images' }>,
  counts: DataDeletionCounts,
  warnings: string[],
): Promise<AppResult<void>> {
  const rows =
    target.kind === 'receipt_image'
      ? selectDraftRows(access.client, 'id = ?', [target.draftId])
      : selectDraftRows(access.client, "payload_json LIKE '%\"receipt\"%'", []);
  const deletion = await deleteReceiptImagesForDraftRows(access, dependencies, rows, counts, warnings);

  if (isErr(deletion)) {
    return deletion;
  }

  counts.receiptParseJobsDeleted += clearReceiptParseJobsForDraftIds(
    access.client,
    rows.map((row) => row.id),
    access.now.toISOString(),
  );

  return ok(undefined);
}

async function executeDraftDeletion(
  access: PreparedDeletionAccess,
  dependencies: DataDeletionServiceDependencies,
  target: Extract<DataDeletionTarget, { kind: 'draft' | 'drafts' }>,
  counts: DataDeletionCounts,
  warnings: string[],
): Promise<AppResult<void>> {
  if (target.kind === 'draft') {
    const discarded = await discardDraftsByWhere(access, dependencies, 'id = ?', [target.draftId], counts, warnings);

    if (isErr(discarded)) {
      return discarded;
    }

    return ok(undefined);
  }

  const draftKind = target.draftKind && target.draftKind !== 'all' ? target.draftKind : null;
  const discarded = await discardDraftsByWhere(
    access,
    dependencies,
    draftKind ? "status = 'active' AND kind = ?" : "status = 'active'",
    draftKind ? [draftKind] : [],
    counts,
    warnings,
  );

  if (isErr(discarded)) {
    return discarded;
  }

  return ok(undefined);
}

function deleteDiagnostics(client: DataDeletionSqlClient, counts: DataDeletionCounts): void {
  counts.diagnosticsDeleted += runMutation(client, 'DELETE FROM diagnostic_events');
}

async function executeAllPersonalDataDeletion(
  access: PreparedDeletionAccess,
  dependencies: DataDeletionServiceDependencies,
  counts: DataDeletionCounts,
  warnings: string[],
): Promise<AppResult<void>> {
  const timestamp = access.now.toISOString();
  const allReminderIds = selectIdsForRecordKind(access.client, 'reminder');
  const notifications = await cancelAndSoftDeleteScheduledNotifications(
    access,
    dependencies,
    allReminderIds,
    counts,
    warnings,
  );

  if (isErr(notifications)) {
    return notifications;
  }

  const drafts = await discardDraftsByWhere(access, dependencies, '1 = 1', [], counts, warnings);

  if (isErr(drafts)) {
    return drafts;
  }

  counts.moneyRecordsDeleted += runMutation(
    access.client,
    `UPDATE money_records SET deleted_at = ?, updated_at = ? WHERE workspace_id = ? AND deleted_at IS NULL`,
    timestamp,
    timestamp,
    localWorkspaceId,
  );
  counts.recurrenceRulesDeleted += runMutation(
    access.client,
    `UPDATE recurrence_rules SET deleted_at = ?, updated_at = ? WHERE workspace_id = ? AND deleted_at IS NULL`,
    timestamp,
    timestamp,
    localWorkspaceId,
  );
  counts.workEntriesDeleted += runMutation(
    access.client,
    `UPDATE work_entries SET deleted_at = ?, updated_at = ? WHERE workspace_id = ? AND deleted_at IS NULL`,
    timestamp,
    timestamp,
    localWorkspaceId,
  );
  counts.tasksDeleted += runMutation(
    access.client,
    `UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE workspace_id = ? AND deleted_at IS NULL`,
    timestamp,
    timestamp,
    localWorkspaceId,
  );
  counts.taskRecurrenceRulesDeleted += runMutation(
    access.client,
    `UPDATE task_recurrence_rules SET deleted_at = ?, updated_at = ? WHERE workspace_id = ? AND deleted_at IS NULL`,
    timestamp,
    timestamp,
    localWorkspaceId,
  );
  counts.taskRecurrenceCompletionsDeleted += runMutation(
    access.client,
    `UPDATE task_recurrence_completions SET deleted_at = ?, updated_at = ? WHERE workspace_id = ? AND deleted_at IS NULL`,
    timestamp,
    timestamp,
    localWorkspaceId,
  );
  counts.remindersDeleted += runMutation(
    access.client,
    `UPDATE reminders SET deleted_at = ?, updated_at = ? WHERE workspace_id = ? AND deleted_at IS NULL`,
    timestamp,
    timestamp,
    localWorkspaceId,
  );
  counts.receiptParseJobsDeleted += runMutation(
    access.client,
    `UPDATE receipt_parse_jobs
     SET deleted_at = ?,
         updated_at = ?,
         result_json = NULL,
         last_error_category = NULL
     WHERE workspace_id = ? AND deleted_at IS NULL`,
    timestamp,
    timestamp,
    localWorkspaceId,
  );
  counts.reflectionsDeleted += runMutation(
    access.client,
    `UPDATE reflections SET deleted_at = ?, updated_at = ? WHERE workspace_id = ? AND deleted_at IS NULL`,
    timestamp,
    timestamp,
    localWorkspaceId,
  );
  counts.reflectionPreferencesDeleted += runMutation(
    access.client,
    `UPDATE reflection_insight_preferences SET deleted_at = ?, updated_at = ? WHERE workspace_id = ? AND deleted_at IS NULL`,
    timestamp,
    timestamp,
    localWorkspaceId,
  );
  counts.recoveryEventsDeleted += runMutation(
    access.client,
    `DELETE FROM recovery_events WHERE workspace_id = ?`,
    localWorkspaceId,
  );
  counts.budgetsDeleted += runMutation(access.client, `DELETE FROM budgets WHERE workspace_id = ?`, localWorkspaceId);
  counts.savingsGoalsDeleted += runMutation(
    access.client,
    `DELETE FROM savings_goals WHERE workspace_id = ?`,
    localWorkspaceId,
  );
  counts.categoriesDeleted += runMutation(access.client, `DELETE FROM categories WHERE workspace_id = ?`, localWorkspaceId);
  counts.topicsDeleted += runMutation(access.client, `DELETE FROM topics WHERE workspace_id = ?`, localWorkspaceId);
  counts.userPreferencesDeleted += runMutation(
    access.client,
    `DELETE FROM user_preferences WHERE workspace_id = ?`,
    localWorkspaceId,
  );

  runMutation(access.client, `DELETE FROM money_record_topics WHERE workspace_id = ?`, localWorkspaceId);
  runMutation(access.client, `DELETE FROM recurrence_rule_topics WHERE workspace_id = ?`, localWorkspaceId);
  runMutation(access.client, `DELETE FROM recurrence_exceptions WHERE workspace_id = ?`, localWorkspaceId);
  runMutation(access.client, `DELETE FROM work_entry_topics WHERE workspace_id = ?`, localWorkspaceId);
  runMutation(access.client, `DELETE FROM task_topics WHERE workspace_id = ?`, localWorkspaceId);
  runMutation(access.client, `DELETE FROM task_recurrence_topics WHERE workspace_id = ?`, localWorkspaceId);
  runMutation(access.client, `DELETE FROM task_recurrence_exceptions WHERE workspace_id = ?`, localWorkspaceId);
  runMutation(access.client, `DELETE FROM reminder_exceptions WHERE workspace_id = ?`, localWorkspaceId);
  deleteDiagnostics(access.client, counts);

  return ok(undefined);
}

export async function executeDeletionPlan(
  plan: DataDeletionPlan,
  dependencies: DataDeletionServiceDependencies = {},
): Promise<AppResult<DataDeletionExecutionResult>> {
  const impact = buildDataDeletionImpact(plan);

  if (isErr(impact)) {
    return impact;
  }

  const validated = validateDataDeletionPlan(plan);

  if (isErr(validated)) {
    return validated;
  }

  if (impact.value.requiresConfirmation && plan.confirmed !== true) {
    return err(createAppError('validation_failed', 'Confirm deletion before continuing.', 'edit'));
  }

  const access = await prepareDeletionAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const counts = cloneCounts();
  const warnings: string[] = [];
  const target = validated.value.target;

  try {
    let result: AppResult<void> = ok(undefined);

    if (
      target.kind === 'record' ||
      target.kind === 'records_by_type' ||
      target.kind === 'records_by_date_range'
    ) {
      result = await executeRecordDeletion(access.value, dependencies, target, counts, warnings);
    } else if (target.kind === 'receipt_image' || target.kind === 'receipt_images') {
      result = await executeReceiptImageDeletion(access.value, dependencies, target, counts, warnings);
    } else if (target.kind === 'draft' || target.kind === 'drafts') {
      result = await executeDraftDeletion(access.value, dependencies, target, counts, warnings);
    } else if (target.kind === 'diagnostics') {
      deleteDiagnostics(access.value.client, counts);
    } else if (target.kind === 'all_personal_data') {
      result = await executeAllPersonalDataDeletion(access.value, dependencies, counts, warnings);
    }

    if (isErr(result)) {
      return result;
    }

    return ok({
      completedAt: access.value.now.toISOString(),
      counts,
      impact: impact.value,
      warnings,
    });
  } catch (cause) {
    return err(createAppError('unavailable', 'Local data could not be deleted.', 'retry', cause));
  }
}
