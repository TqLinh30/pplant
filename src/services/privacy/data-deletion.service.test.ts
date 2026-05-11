import { ok } from '@/domain/common/result';
import { localWorkspaceId } from '@/domain/workspace/types';
import {
  buildReceiptCaptureDraftPayload,
  toCaptureDraftPayload,
} from '@/features/capture-drafts/captureDraftPayloads';

import { executeDeletionPlan, previewDeletionPlan } from './data-deletion.service';

type Row = Record<string, unknown>;

const now = new Date('2026-05-09T00:00:00.000Z');

function receiptPayload(uri = 'file:///app/documents/receipts/receipt-1.jpg') {
  return toCaptureDraftPayload(
    buildReceiptCaptureDraftPayload({
      capturedAt: '2026-05-08T00:00:00.000Z',
      retainedImageUri: uri,
      sizeBytes: 2048,
      source: 'camera',
    }),
  );
}

class FakeDataDeletionClient {
  tables: Record<string, Row[]> = {
    budgets: [],
    capture_drafts: [],
    categories: [],
    diagnostic_events: [],
    money_record_topics: [],
    money_records: [],
    recurrence_exceptions: [],
    recurrence_rule_topics: [],
    recurrence_rules: [],
    receipt_parse_jobs: [],
    recovery_events: [],
    reflection_insight_preferences: [],
    reflections: [],
    reminder_exceptions: [],
    reminder_scheduled_notifications: [],
    reminders: [],
    savings_goals: [],
    task_recurrence_completions: [],
    task_recurrence_exceptions: [],
    task_recurrence_rules: [],
    task_recurrence_topics: [],
    task_topics: [],
    tasks: [],
    topics: [],
    user_preferences: [],
    work_entry_topics: [],
    work_entries: [],
  };

  execSync(): void {}

  getAllSync<T>(source: string, ...params: unknown[]): T[] {
    const sql = source.replace(/\s+/g, ' ');

    if (sql.includes('FROM capture_drafts')) {
      return this.selectDrafts(sql, params) as T[];
    }

    if (sql.includes('FROM reminder_scheduled_notifications')) {
      const reminderIds = params.slice(1) as string[];

      return this.tables.reminder_scheduled_notifications
        .filter(
          (row) =>
            row.workspace_id === params[0] &&
            reminderIds.includes(row.reminder_id as string) &&
            row.deleted_at === null,
        )
        .map((row) => ({ scheduledNotificationId: row.scheduled_notification_id })) as T[];
    }

    const idSelectMatch = sql.match(/SELECT id FROM ([a-z_]+)/);

    if (idSelectMatch) {
      return this.selectIds(idSelectMatch[1], sql, params).map((id) => ({ id })) as T[];
    }

    return [];
  }

  runSync(source: string, ...params: unknown[]): { changes: number } {
    const sql = source.replace(/\s+/g, ' ');

    if (sql.startsWith('DELETE FROM diagnostic_events')) {
      const changes = this.tables.diagnostic_events.length;
      this.tables.diagnostic_events = [];

      return { changes };
    }

    const deleteWorkspaceMatch = sql.match(/^DELETE FROM ([a-z_]+) WHERE workspace_id = \?/);

    if (deleteWorkspaceMatch) {
      const table = deleteWorkspaceMatch[1];
      this.tables[table] = this.tables[table] ?? [];
      const before = this.tables[table].length;
      this.tables[table] = this.tables[table].filter((row) => row.workspace_id !== params[0]);

      return { changes: before - this.tables[table].length };
    }

    if (sql.startsWith('UPDATE capture_drafts SET payload_json = ?')) {
      const [payloadJson, updatedAt, workspaceId, id] = params;
      const row = this.tables.capture_drafts.find(
        (candidate) => candidate.workspace_id === workspaceId && candidate.id === id,
      );

      if (!row) {
        return { changes: 0 };
      }

      row.payload_json = payloadJson;
      row.updated_at = updatedAt;

      return { changes: 1 };
    }

    if (sql.startsWith("UPDATE capture_drafts SET status = 'discarded'")) {
      const [updatedAt, discardedAt, workspaceId, ...ids] = params;
      let changes = 0;

      for (const row of this.tables.capture_drafts) {
        if (row.workspace_id === workspaceId && ids.includes(row.id) && row.status !== 'discarded') {
          row.status = 'discarded';
          row.payload_json = '{}';
          row.updated_at = updatedAt;
          row.discarded_at = discardedAt;
          row.saved_at = null;
          row.saved_record_kind = null;
          row.saved_record_id = null;
          changes += 1;
        }
      }

      return { changes };
    }

    if (sql.startsWith('UPDATE receipt_parse_jobs')) {
      const [deletedAt, updatedAt, workspaceId, ...draftIds] = params;
      let changes = 0;

      for (const row of this.tables.receipt_parse_jobs) {
        const matchesDraft =
          draftIds.length === 0 || draftIds.includes(row.receipt_draft_id as string);

        if (row.workspace_id === workspaceId && matchesDraft && row.deleted_at === null) {
          row.deleted_at = deletedAt;
          row.updated_at = updatedAt;
          row.result_json = null;
          row.last_error_category = null;
          changes += 1;
        }
      }

      return { changes };
    }

    const updateMatch = sql.match(/^UPDATE ([a-z_]+) SET deleted_at = \?, updated_at = \?/);

    if (updateMatch) {
      return { changes: this.softDeleteRows(updateMatch[1], sql, params) };
    }

    return { changes: 0 };
  }

  private selectDrafts(sql: string, params: unknown[]): Row[] {
    const [, ...rest] = params;

    return this.tables.capture_drafts
      .filter((row) => {
        if (row.workspace_id !== localWorkspaceId) {
          return false;
        }

        if (sql.includes('saved_record_kind = ?')) {
          const [savedRecordKind, ...ids] = rest;

          return row.saved_record_kind === savedRecordKind && ids.includes(row.saved_record_id);
        }

        if (sql.includes('AND id = ?')) {
          return row.id === rest[0];
        }

        if (sql.includes("status = 'active' AND kind = ?")) {
          return row.status === 'active' && row.kind === rest[0];
        }

        if (sql.includes("status = 'active'")) {
          return row.status === 'active';
        }

        if (sql.includes('payload_json LIKE')) {
          return String(row.payload_json).includes('"receipt"');
        }

        return true;
      })
      .map((row) => ({
        id: row.id,
        kind: row.kind,
        payloadJson: row.payload_json,
        savedRecordId: row.saved_record_id,
        savedRecordKind: row.saved_record_kind,
        status: row.status,
      }));
  }

  private selectIds(table: string, sql: string, params: unknown[]): string[] {
    const rows = this.tables[table] ?? [];
    const workspaceId = params[0];

    return rows
      .filter((row) => {
        if (row.workspace_id !== workspaceId || row.deleted_at !== null) {
          return false;
        }

        if (sql.includes('kind = ?')) {
          const expectedKind = params[sql.includes('local_date >= ?') ? 3 : 1];

          return row.kind === expectedKind;
        }

        if (sql.includes('local_date >= ?')) {
          return String(row.local_date) >= String(params[1]) && String(row.local_date) <= String(params[2]);
        }

        if (sql.includes('starts_on_local_date >= ?')) {
          return (
            String(row.starts_on_local_date) >= String(params[1]) &&
            String(row.starts_on_local_date) <= String(params[2])
          );
        }

        if (sql.includes('period_start_date >= ?')) {
          return (
            String(row.period_start_date) >= String(params[1]) &&
            String(row.period_start_date) <= String(params[2])
          );
        }

        if (sql.includes('task_id IN')) {
          return params.slice(1).includes(row.task_id);
        }

        if (sql.includes('task_recurrence_rule_id IN')) {
          return params.slice(1).includes(row.task_recurrence_rule_id);
        }

        return true;
      })
      .map((row) => row.id as string);
  }

  private softDeleteRows(table: string, sql: string, params: unknown[]): number {
    const [deletedAt, updatedAt, workspaceId, ...ids] = params;
    const rows = this.tables[table] ?? [];
    let changes = 0;

    for (const row of rows) {
      const idMatches = !sql.includes('AND id IN') || ids.includes(row.id);
      const reminderMatches = !sql.includes('reminder_id IN') || ids.includes(row.reminder_id);
      const ruleMatches = !sql.includes('rule_id IN') || ids.includes(row.rule_id);

      if (row.workspace_id === workspaceId && idMatches && reminderMatches && ruleMatches && row.deleted_at === null) {
        row.deleted_at = deletedAt;
        row.updated_at = updatedAt;
        changes += 1;
      }
    }

    return changes;
  }
}

function createDatabase(client: FakeDataDeletionClient) {
  return { $client: client };
}

describe('data deletion service', () => {
  it('previews impact without touching local storage', async () => {
    const preview = await previewDeletionPlan({
      target: {
        endDate: '2026-05-31',
        kind: 'records_by_date_range',
        recordKind: 'money',
        startDate: '2026-05-01',
      },
    });

    expect(preview.ok).toBe(true);
    if (preview.ok) {
      expect(preview.value.title).toBe('Delete records by date range');
      expect(preview.value.requiresConfirmation).toBe(true);
    }
  });

  it('requires confirmation before executing destructive deletion', async () => {
    const client = new FakeDataDeletionClient();
    const result = await executeDeletionPlan(
      { target: { kind: 'diagnostics' } },
      { database: createDatabase(client), now: () => now },
    );

    expect(result.ok).toBe(false);
  });

  it('deletes money records in a date range and cleans linked receipt draft data', async () => {
    const client = new FakeDataDeletionClient();
    client.tables.money_records.push(
      {
        deleted_at: null,
        id: 'money-old',
        kind: 'expense',
        local_date: '2026-04-30',
        updated_at: '2026-04-30T00:00:00.000Z',
        workspace_id: localWorkspaceId,
      },
      {
        deleted_at: null,
        id: 'money-in-range',
        kind: 'expense',
        local_date: '2026-05-08',
        updated_at: '2026-05-08T00:00:00.000Z',
        workspace_id: localWorkspaceId,
      },
    );
    client.tables.capture_drafts.push({
      discarded_at: null,
      id: 'draft-receipt',
      kind: 'expense',
      payload_json: JSON.stringify(receiptPayload()),
      saved_at: '2026-05-08T00:10:00.000Z',
      saved_record_id: 'money-in-range',
      saved_record_kind: 'money_record',
      status: 'saved',
      updated_at: '2026-05-08T00:10:00.000Z',
      workspace_id: localWorkspaceId,
    });
    client.tables.receipt_parse_jobs.push({
      deleted_at: null,
      id: 'job-1',
      last_error_category: 'timeout',
      receipt_draft_id: 'draft-receipt',
      result_json: '{"merchant":"Campus cafe"}',
      updated_at: '2026-05-08T00:11:00.000Z',
      workspace_id: localWorkspaceId,
    });
    const deleteImage = jest.fn(async () => ok({ deleted: true, sizeBytes: 2048 }));

    const result = await executeDeletionPlan(
      {
        confirmed: true,
        target: {
          endDate: '2026-05-31',
          kind: 'records_by_date_range',
          recordKind: 'money',
          startDate: '2026-05-01',
        },
      },
      { database: createDatabase(client), deleteImage, now: () => now },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.counts.moneyRecordsDeleted).toBe(1);
      expect(result.value.counts.draftsDiscarded).toBe(1);
      expect(result.value.counts.receiptImagesDeleted).toBe(1);
      expect(result.value.counts.receiptParseJobsDeleted).toBe(1);
    }
    expect(client.tables.money_records.find((row) => row.id === 'money-in-range')?.deleted_at).toBe(
      now.toISOString(),
    );
    expect(client.tables.money_records.find((row) => row.id === 'money-old')?.deleted_at).toBeNull();
    expect(client.tables.capture_drafts[0].status).toBe('discarded');
    expect(client.tables.receipt_parse_jobs[0].result_json).toBeNull();
    expect(deleteImage).toHaveBeenCalledWith('file:///app/documents/receipts/receipt-1.jpg');
  });

  it('clears diagnostics without changing records or drafts', async () => {
    const client = new FakeDataDeletionClient();
    client.tables.diagnostic_events.push({ id: 'diag-1' }, { id: 'diag-2' });
    client.tables.money_records.push({
      deleted_at: null,
      id: 'money-1',
      kind: 'income',
      local_date: '2026-05-08',
      workspace_id: localWorkspaceId,
    });

    const result = await executeDeletionPlan(
      { confirmed: true, target: { kind: 'diagnostics' } },
      { database: createDatabase(client), now: () => now },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.counts.diagnosticsDeleted).toBe(2);
      expect(result.value.counts.moneyRecordsDeleted).toBe(0);
    }
    expect(client.tables.diagnostic_events).toEqual([]);
    expect(client.tables.money_records[0].deleted_at).toBeNull();
  });

  it('deletes reminders linked to deleted tasks and cancels native notifications', async () => {
    const client = new FakeDataDeletionClient();
    client.tables.tasks.push({
      created_at: '2026-05-08T00:00:00.000Z',
      deleted_at: null,
      id: 'task-1',
      updated_at: '2026-05-08T00:00:00.000Z',
      workspace_id: localWorkspaceId,
    });
    client.tables.reminders.push({
      deleted_at: null,
      id: 'reminder-task-1',
      task_id: 'task-1',
      updated_at: '2026-05-08T00:01:00.000Z',
      workspace_id: localWorkspaceId,
    });
    client.tables.reminder_scheduled_notifications.push({
      deleted_at: null,
      id: 'notification-task-1',
      reminder_id: 'reminder-task-1',
      scheduled_notification_id: 'platform-task-1',
      updated_at: '2026-05-08T00:02:00.000Z',
      workspace_id: localWorkspaceId,
    });
    const cancelScheduledNotification = jest.fn(async () => ok({ cancelled: true }));

    const result = await executeDeletionPlan(
      { confirmed: true, target: { kind: 'records_by_type', recordKind: 'task' } },
      {
        database: createDatabase(client),
        notificationScheduler: { cancelScheduledNotification },
        now: () => now,
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.counts.tasksDeleted).toBe(1);
      expect(result.value.counts.remindersDeleted).toBe(1);
      expect(result.value.counts.reminderNotificationsDeleted).toBe(1);
    }
    expect(cancelScheduledNotification).toHaveBeenCalledWith('platform-task-1');
    expect(client.tables.reminders[0].deleted_at).toBe(now.toISOString());
    expect(client.tables.reminder_scheduled_notifications[0].deleted_at).toBe(now.toISOString());
  });

  it('deletes all personal data and cancels local scheduled notifications', async () => {
    const client = new FakeDataDeletionClient();
    client.tables.money_records.push({ deleted_at: null, id: 'money-1', kind: 'expense', workspace_id: localWorkspaceId });
    client.tables.work_entries.push({ deleted_at: null, id: 'work-1', workspace_id: localWorkspaceId });
    client.tables.tasks.push({ deleted_at: null, id: 'task-1', workspace_id: localWorkspaceId });
    client.tables.reminders.push({ deleted_at: null, id: 'reminder-1', workspace_id: localWorkspaceId });
    client.tables.reminder_scheduled_notifications.push({
      deleted_at: null,
      id: 'notification-1',
      reminder_id: 'reminder-1',
      scheduled_notification_id: 'platform-1',
      workspace_id: localWorkspaceId,
    });
    client.tables.capture_drafts.push({
      discarded_at: null,
      id: 'draft-1',
      kind: 'expense',
      payload_json: JSON.stringify(receiptPayload()),
      saved_record_id: null,
      saved_record_kind: null,
      status: 'active',
      workspace_id: localWorkspaceId,
    });
    client.tables.reflections.push({ deleted_at: null, id: 'reflection-1', workspace_id: localWorkspaceId });
    client.tables.recovery_events.push({ id: 'recovery-1', workspace_id: localWorkspaceId });
    client.tables.diagnostic_events.push({ id: 'diag-1' });
    client.tables.user_preferences.push({ workspace_id: localWorkspaceId });
    const cancelScheduledNotification = jest.fn(async () => ok({ cancelled: true }));

    const result = await executeDeletionPlan(
      { confirmed: true, target: { kind: 'all_personal_data' } },
      {
        database: createDatabase(client),
        deleteImage: jest.fn(async () => ok({ deleted: true, sizeBytes: 2048 })),
        notificationScheduler: { cancelScheduledNotification },
        now: () => now,
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.counts.moneyRecordsDeleted).toBe(1);
      expect(result.value.counts.workEntriesDeleted).toBe(1);
      expect(result.value.counts.tasksDeleted).toBe(1);
      expect(result.value.counts.remindersDeleted).toBe(1);
      expect(result.value.counts.draftsDiscarded).toBe(1);
      expect(result.value.counts.reflectionsDeleted).toBe(1);
      expect(result.value.counts.recoveryEventsDeleted).toBe(1);
      expect(result.value.counts.diagnosticsDeleted).toBe(1);
      expect(result.value.counts.userPreferencesDeleted).toBe(1);
    }
    expect(cancelScheduledNotification).toHaveBeenCalledWith('platform-1');
    expect(client.tables.capture_drafts[0].payload_json).toBe('{}');
    expect(client.tables.diagnostic_events).toEqual([]);
  });
});
