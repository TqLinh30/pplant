import { parseRecoveryEventRow } from './schemas';
import {
  buildMissedTaskRecurrenceOccurrences,
  isMissedDailyTask,
  isMissedReminderNotification,
  isReminderRecoveryScheduleState,
} from './recovery-rules';

const now = new Date('2026-05-08T10:00:00.000Z');

describe('recovery domain rules', () => {
  it('validates recovery event rows without sensitive metadata', () => {
    const parsed = parseRecoveryEventRow({
      action: 'dismiss',
      createdAt: now.toISOString(),
      id: 'recovery-1',
      occurredAt: now.toISOString(),
      occurrenceLocalDate: '2026-05-07',
      targetId: 'reminder-1',
      targetKind: 'reminder_occurrence',
      workspaceId: 'local',
    });
    const invalid = parseRecoveryEventRow({
      action: 'dismiss',
      createdAt: now.toISOString(),
      id: 'recovery-1',
      occurredAt: now.toISOString(),
      occurrenceLocalDate: null,
      targetId: 'rule-1',
      targetKind: 'task_recurrence_occurrence',
      workspaceId: 'local',
    });

    expect(parsed.ok).toBe(true);
    expect(invalid.ok).toBe(false);
    if (parsed.ok) {
      expect(Object.keys(parsed.value).sort()).toEqual([
        'action',
        'createdAt',
        'id',
        'occurredAt',
        'occurrenceLocalDate',
        'targetId',
        'targetKind',
        'workspaceId',
      ]);
    }
  });

  it('detects missed daily tasks from local dates', () => {
    expect(
      isMissedDailyTask(
        {
          categoryId: null,
          completedAt: null,
          createdAt: now.toISOString(),
          deadlineLocalDate: '2026-05-07' as never,
          deletedAt: null,
          id: 'task-1' as never,
          notes: null,
          priority: 'high',
          source: 'manual',
          sourceOfTruth: 'manual',
          state: 'todo',
          title: 'Study' as never,
          topicIds: [],
          updatedAt: now.toISOString(),
          userCorrectedAt: null,
          workspaceId: 'local' as never,
        },
        '2026-05-08' as never,
      ),
    ).toBe(true);
  });

  it('uses virtual recurrence occurrences within the bounded lookback', () => {
    const result = buildMissedTaskRecurrenceOccurrences({
      completions: [],
      exceptions: [],
      lookbackDays: 3,
      now,
      rule: {
        categoryId: null,
        createdAt: now.toISOString(),
        deletedAt: null,
        endsOnLocalDate: null,
        frequency: 'daily',
        id: 'rule-1' as never,
        kind: 'habit',
        notes: null,
        pausedAt: null,
        priority: 'low',
        source: 'manual',
        sourceOfTruth: 'manual',
        startsOnLocalDate: '2026-05-01' as never,
        stoppedAt: null,
        stoppedOnLocalDate: null,
        title: 'Read' as never,
        topicIds: [],
        updatedAt: now.toISOString(),
        userCorrectedAt: null,
        workspaceId: 'local' as never,
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.map((occurrence) => occurrence.localDate)).toEqual([
        '2026-05-05',
        '2026-05-06',
        '2026-05-07',
      ]);
    }
  });

  it('detects reminder recovery states without relying on color-only labels', () => {
    const reminder = {
      deletedAt: null,
      scheduleState: 'permission_denied',
    } as never;

    expect(isReminderRecoveryScheduleState(reminder)).toBe(true);
    expect(
      isMissedReminderNotification(
        {
          deletedAt: null,
          deliveryState: 'scheduled',
          fireAtLocal: '2026-05-08T09:30',
        } as never,
        '2026-05-08T10:00',
      ),
    ).toBe(true);
  });
});
