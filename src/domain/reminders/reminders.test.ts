import { buildReminderOccurrences, parseReminderFireAtLocalToDate } from './reminder-occurrences';
import { parseReminderExceptionRow, parseReminderRow } from './schemas';

const fixedNow = '2026-05-08T00:00:00.000Z';

function createReminder(overrides: Record<string, unknown> = {}) {
  const parsed = parseReminderRow({
    createdAt: fixedNow,
    deletedAt: null,
    endsOnLocalDate: null,
    frequency: 'daily',
    id: 'reminder-1',
    notes: 'Bring workbook',
    ownerKind: 'standalone',
    permissionStatus: 'unknown',
    reminderLocalTime: '09:30',
    scheduleState: 'local_only',
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

  if (!parsed.ok) {
    throw new Error('reminder fixture failed');
  }

  return parsed.value;
}

function createException(occurrenceLocalDate: string) {
  const parsed = parseReminderExceptionRow({
    action: 'skip',
    createdAt: fixedNow,
    id: `exception-${occurrenceLocalDate}`,
    occurrenceLocalDate,
    reminderId: 'reminder-1',
    updatedAt: fixedNow,
    workspaceId: 'local-workspace',
  });

  if (!parsed.ok) {
    throw new Error('exception fixture failed');
  }

  return parsed.value;
}

describe('reminder domain', () => {
  it('validates owner combinations and local reminder fields', () => {
    expect(createReminder({ ownerKind: 'standalone', taskId: null }).ownerKind).toBe('standalone');
    expect(parseReminderRow({ ...createReminder(), ownerKind: 'standalone', taskId: 'task-1' }).ok).toBe(false);
    expect(parseReminderRow({ ...createReminder(), ownerKind: 'task', taskId: null }).ok).toBe(false);
    expect(
      parseReminderRow({
        ...createReminder(),
        ownerKind: 'task_recurrence',
        taskRecurrenceRuleId: 'rule-1',
      }).ok,
    ).toBe(true);
    expect(parseReminderRow({ ...createReminder(), reminderLocalTime: '24:01' }).ok).toBe(false);
    expect(parseReminderRow({ ...createReminder(), title: '' }).ok).toBe(false);
    expect(parseReminderRow({ ...createReminder(), notes: 'x'.repeat(501) }).ok).toBe(false);
    expect(parseReminderRow({ ...createReminder(), scheduleState: 'snoozed' }).ok).toBe(true);
    expect(parseReminderRow({ ...createReminder(), scheduleState: 'paused' }).ok).toBe(true);
    expect(parseReminderRow({ ...createReminder(), scheduleState: 'disabled' }).ok).toBe(true);
    expect(parseReminderRow({ ...createReminder(), scheduleState: 'waiting' }).ok).toBe(false);
  });

  it('builds one-time and daily reminder occurrences with skips and bounds', () => {
    const once = buildReminderOccurrences({
      exceptions: [],
      fromLocalDate: '2026-05-08',
      maxCount: 3,
      reminder: createReminder({ frequency: 'once' }),
      throughLocalDate: '2026-05-10',
    });
    const daily = buildReminderOccurrences({
      exceptions: [createException('2026-05-09')],
      fromLocalDate: '2026-05-08',
      maxCount: 3,
      reminder: createReminder(),
      throughLocalDate: '2026-05-12',
    });

    expect(once.ok && once.value.map((occurrence) => occurrence.fireAtLocal)).toEqual([
      '2026-05-08T09:30',
    ]);
    expect(daily.ok && daily.value.map((occurrence) => [occurrence.localDate, occurrence.state])).toEqual([
      ['2026-05-08', 'open'],
      ['2026-05-09', 'skipped'],
      ['2026-05-10', 'open'],
    ]);
  });

  it('uses existing recurrence generation for weekly, monthly clamp, leap day, and end dates', () => {
    const weekly = buildReminderOccurrences({
      exceptions: [],
      fromLocalDate: '2026-05-08',
      maxCount: 3,
      reminder: createReminder({ frequency: 'weekly' }),
      throughLocalDate: '2026-05-31',
    });
    const monthlyClamp = buildReminderOccurrences({
      exceptions: [],
      fromLocalDate: '2026-01-31',
      maxCount: 4,
      reminder: createReminder({
        frequency: 'monthly',
        startsOnLocalDate: '2026-01-31',
      }),
      throughLocalDate: '2026-04-30',
    });
    const leapDay = buildReminderOccurrences({
      exceptions: [],
      fromLocalDate: '2024-02-29',
      maxCount: 4,
      reminder: createReminder({
        frequency: 'monthly',
        startsOnLocalDate: '2024-02-29',
      }),
      throughLocalDate: '2024-05-31',
    });
    const ended = buildReminderOccurrences({
      exceptions: [],
      fromLocalDate: '2026-05-08',
      maxCount: 5,
      reminder: createReminder({
        endsOnLocalDate: '2026-05-09',
        frequency: 'daily',
      }),
      throughLocalDate: '2026-05-20',
    });

    expect(weekly.ok && weekly.value.map((occurrence) => occurrence.localDate)).toEqual([
      '2026-05-08',
      '2026-05-15',
      '2026-05-22',
    ]);
    expect(monthlyClamp.ok && monthlyClamp.value.map((occurrence) => occurrence.localDate)).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ]);
    expect(leapDay.ok && leapDay.value.map((occurrence) => occurrence.localDate)).toEqual([
      '2024-02-29',
      '2024-03-29',
      '2024-04-29',
      '2024-05-29',
    ]);
    expect(ended.ok && ended.value.map((occurrence) => occurrence.localDate)).toEqual([
      '2026-05-08',
      '2026-05-09',
    ]);
  });

  it('parses local fire times without storing timezone-shifted source strings', () => {
    const parsed = parseReminderFireAtLocalToDate('2026-05-08T09:30');
    const invalid = parseReminderFireAtLocalToDate('2026-05-08 09:30');

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.getFullYear()).toBe(2026);
      expect(parsed.value.getMonth()).toBe(4);
      expect(parsed.value.getDate()).toBe(8);
      expect(parsed.value.getHours()).toBe(9);
      expect(parsed.value.getMinutes()).toBe(30);
    }
    expect(invalid.ok).toBe(false);
  });
});
