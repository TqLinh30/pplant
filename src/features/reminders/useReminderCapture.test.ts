import { parseReminderRow } from '@/domain/reminders/schemas';
import type { ReminderRuleView } from '@/services/reminders/reminder.service';

import {
  createDefaultReminderCaptureDraft,
  initialReminderCaptureState,
  reminderCaptureReducer,
  validateReminderCaptureDraft,
} from './useReminderCapture';

const fixedNow = '2026-05-08T00:00:00.000Z';

function createReminderView(overrides: Record<string, unknown> = {}): ReminderRuleView {
  const reminder = parseReminderRow({
    createdAt: fixedNow,
    deletedAt: null,
    endsOnLocalDate: null,
    frequency: 'daily',
    id: 'reminder-1',
    notes: 'Bring workbook',
    ownerKind: 'standalone',
    permissionStatus: 'granted',
    reminderLocalTime: '09:30',
    scheduleState: 'scheduled',
    source: 'manual',
    sourceOfTruth: 'manual',
    startsOnLocalDate: '2026-05-08',
    taskId: null,
    taskRecurrenceRuleId: null,
    title: 'Study reminder',
    updatedAt: fixedNow,
    workspaceId: 'local-workspace',
    ...overrides,
  });

  if (!reminder.ok) {
    throw new Error('reminder fixture failed');
  }

  return {
    occurrences: [
      {
        fireAtLocal: '2026-05-08T09:30' as never,
        localDate: '2026-05-08' as never,
        reminderId: reminder.value.id,
        state: 'open',
      },
    ],
    reminder: reminder.value,
    scheduledNotifications: [],
  };
}

describe('reminder capture state', () => {
  it('validates reminder drafts into service input', () => {
    const validation = validateReminderCaptureDraft({
      ...createDefaultReminderCaptureDraft(new Date(fixedNow)),
      endsOnLocalDate: '2026-06-08',
      frequency: 'weekly',
      notes: '  Bring workbook  ',
      ownerKind: 'task',
      reminderLocalTime: '09:30',
      skipLocalDate: '2026-05-15',
      startsOnLocalDate: '2026-05-08',
      taskId: 'task-1',
      title: '  Study reminder  ',
    });

    expect(validation.ok).toBe(true);
    if (validation.ok) {
      expect(validation.value).toEqual({
        endsOnLocalDate: '2026-06-08',
        frequency: 'weekly',
        notes: 'Bring workbook',
        ownerKind: 'task',
        reminderLocalTime: '09:30',
        scheduleMode: 'request',
        skipLocalDates: ['2026-05-15'],
        startsOnLocalDate: '2026-05-08',
        taskId: 'task-1',
        taskRecurrenceRuleId: null,
        title: 'Study reminder',
      });
    }
  });

  it('returns field errors for invalid owner, date, time, and recurrence inputs', () => {
    const validation = validateReminderCaptureDraft({
      ...createDefaultReminderCaptureDraft(new Date(fixedNow)),
      endsOnLocalDate: '2026-05-07',
      frequency: 'once',
      ownerKind: 'task_recurrence',
      reminderLocalTime: '9:30',
      skipLocalDate: '2026-05-07',
      startsOnLocalDate: '2026-05-08',
      title: '',
    });

    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.fieldErrors?.title).toBeDefined();
      expect(validation.fieldErrors?.reminderLocalTime).toBeDefined();
      expect(validation.fieldErrors?.endsOnLocalDate).toBeDefined();
      expect(validation.fieldErrors?.skipLocalDate).toBeDefined();
      expect(validation.fieldErrors?.taskRecurrenceRuleId).toBeDefined();
    }
  });

  it('tracks loading, saving, permission denied, unavailable, retry, and local-only transitions', () => {
    const scheduled = createReminderView();
    const denied = createReminderView({
      permissionStatus: 'denied',
      scheduleState: 'permission_denied',
    });
    const unavailable = createReminderView({
      permissionStatus: 'unavailable',
      scheduleState: 'unavailable',
    });
    const localOnly = createReminderView({
      permissionStatus: 'unknown',
      scheduleState: 'local_only',
    });

    const loaded = reminderCaptureReducer(initialReminderCaptureState, {
      data: {
        recentTasks: [],
        reminders: [scheduled],
        taskRecurrenceRules: [],
      },
      type: 'load_succeeded',
    });
    const saving = reminderCaptureReducer(loaded, { type: 'save_started' });
    const permissionDenied = reminderCaptureReducer(saving, {
      data: {
        recentTasks: [],
        reminders: [denied],
        taskRecurrenceRules: [],
      },
      mutation: 'created',
      nextDraft: createDefaultReminderCaptureDraft(new Date(fixedNow)),
      result: {
        reminder: denied.reminder,
        view: denied,
      },
      type: 'save_succeeded',
    });
    const retry = reminderCaptureReducer(permissionDenied, { type: 'load_started' });
    const unavailableState = reminderCaptureReducer(retry, {
      data: {
        recentTasks: [],
        reminders: [unavailable],
        taskRecurrenceRules: [],
      },
      type: 'load_succeeded',
    });
    const localOnlyState = reminderCaptureReducer(unavailableState, {
      data: {
        recentTasks: [],
        reminders: [localOnly],
        taskRecurrenceRules: [],
      },
      mutation: 'local_only',
      nextDraft: createDefaultReminderCaptureDraft(new Date(fixedNow)),
      result: {
        reminder: localOnly.reminder,
        view: localOnly,
      },
      type: 'save_succeeded',
    });

    expect(loaded.status).toBe('ready');
    expect(saving.status).toBe('saving');
    expect(permissionDenied.savedReminder?.scheduleState).toBe('permission_denied');
    expect(retry.status).toBe('loading');
    expect(unavailableState.reminders[0].reminder.scheduleState).toBe('unavailable');
    expect(localOnlyState.lastMutation).toBe('local_only');
    expect(localOnlyState.savedReminder?.scheduleState).toBe('local_only');
  });
});
