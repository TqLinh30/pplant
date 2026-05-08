import type { MoneyRecord } from '@/domain/money/types';
import type { Reminder } from '@/domain/reminders/types';
import type { Task } from '@/domain/tasks/types';
import type { WorkEntry } from '@/domain/work/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import {
  calculateEndOfDayReviewSummary,
  type EndOfDayTaskRecurrenceOccurrenceInput,
} from './end-of-day-review';

const fixedNow = '2026-05-08T10:00:00.000Z';

function createMoneyRecord(overrides: Partial<MoneyRecord> = {}): MoneyRecord {
  return {
    amountMinor: 1200,
    categoryId: null,
    createdAt: fixedNow,
    currencyCode: 'USD' as never,
    deletedAt: null,
    id: 'money-1' as never,
    kind: 'expense',
    localDate: '2026-05-08' as never,
    merchantOrSource: 'Lunch' as never,
    note: null,
    recurrenceOccurrenceDate: null,
    recurrenceRuleId: null,
    source: 'manual',
    sourceOfTruth: 'manual',
    topicIds: [],
    updatedAt: fixedNow,
    userCorrectedAt: null,
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    categoryId: null,
    completedAt: null,
    createdAt: fixedNow,
    deadlineLocalDate: '2026-05-08' as never,
    deletedAt: null,
    id: 'task-1' as never,
    notes: null,
    priority: 'high',
    source: 'manual',
    sourceOfTruth: 'manual',
    state: 'todo',
    title: 'Biology homework' as never,
    topicIds: [],
    updatedAt: fixedNow,
    userCorrectedAt: null,
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

function createReminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    createdAt: fixedNow,
    deletedAt: null,
    endsOnLocalDate: null,
    frequency: 'once',
    id: 'reminder-1' as never,
    notes: null,
    ownerKind: 'standalone',
    permissionStatus: 'granted',
    reminderLocalTime: '09:00' as never,
    scheduleState: 'scheduled',
    source: 'manual',
    sourceOfTruth: 'manual',
    startsOnLocalDate: '2026-05-08' as never,
    taskId: null,
    taskRecurrenceRuleId: null,
    title: 'Review slides' as never,
    updatedAt: fixedNow,
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

function createWorkEntry(overrides: Partial<WorkEntry> = {}): WorkEntry {
  return {
    breakMinutes: 0,
    categoryId: null,
    createdAt: fixedNow,
    deletedAt: null,
    durationMinutes: 90,
    earnedIncomeMinor: 1800,
    endedAtLocalDate: null,
    endedAtLocalTime: null,
    entryMode: 'hours',
    id: 'work-1' as never,
    localDate: '2026-05-08' as never,
    note: 'Tutoring' as never,
    paid: true,
    source: 'manual',
    sourceOfTruth: 'manual',
    startedAtLocalDate: null,
    startedAtLocalTime: null,
    topicIds: [],
    updatedAt: fixedNow,
    wageCurrencyCode: 'USD' as never,
    wageMinorPerHour: 1200,
    wageSource: 'default',
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

describe('end-of-day review summary', () => {
  it('returns calm empty and partial state data for a quiet day', () => {
    const summary = calculateEndOfDayReviewSummary({
      localDate: '2026-05-08' as never,
      moneyRecords: [],
      recoveryItems: [],
      reminders: [],
      taskRecurrenceOccurrences: [],
      tasks: [],
      workEntries: [],
    });

    expect(summary.isEmpty).toBe(true);
    expect(summary.partial).toEqual({
      money: true,
      reminders: true,
      tasks: true,
      work: true,
    });
    expect(summary.money.totalCount).toBe(0);
    expect(summary.tasks.items).toEqual([]);
    expect(summary.reminders.items).toEqual([]);
    expect(summary.work.entryCount).toBe(0);
  });

  it('combines same-day money, tasks, reminders, recovery, and work entries', () => {
    const recurrence: EndOfDayTaskRecurrenceOccurrenceInput = {
      kind: 'habit',
      localDate: '2026-05-08' as never,
      priority: 'low',
      ruleId: 'rule-1' as never,
      state: 'completed',
      title: 'Read notes',
    };
    const summary = calculateEndOfDayReviewSummary({
      localDate: '2026-05-08' as never,
      moneyRecords: [
        createMoneyRecord(),
        createMoneyRecord({
          amountMinor: 4000,
          id: 'money-2' as never,
          kind: 'income',
          merchantOrSource: 'Tutoring' as never,
        }),
        createMoneyRecord({
          id: 'money-3' as never,
          localDate: '2026-05-07' as never,
        }),
      ],
      recoveryItems: [
        {
          occurrenceLocalDate: null,
          reason: 'reminder_not_active',
          targetId: 'reminder-2' as never,
          targetKind: 'reminder_occurrence',
          title: 'Budget check',
        },
      ],
      reminders: [
        {
          occurrences: [
            {
              fireAtLocal: '2026-05-08T09:00' as never,
              localDate: '2026-05-08' as never,
              reminderId: 'reminder-1' as never,
              state: 'open',
            },
          ],
          reminder: createReminder(),
        },
        {
          occurrences: [],
          reminder: createReminder({
            id: 'reminder-2' as never,
            scheduleState: 'permission_denied',
            title: 'Budget check' as never,
          }),
        },
      ],
      taskRecurrenceOccurrences: [recurrence],
      tasks: [
        createTask(),
        createTask({
          completedAt: '2026-05-08T08:00:00.000Z',
          id: 'task-2' as never,
          state: 'done',
          title: 'Essay outline' as never,
        }),
        createTask({
          completedAt: '2026-05-07T08:00:00.000Z',
          id: 'task-old-done' as never,
          state: 'done',
          title: 'Old outline' as never,
        }),
        createTask({
          deadlineLocalDate: '2026-05-07' as never,
          id: 'task-3' as never,
          priority: 'low',
          title: 'Print notes' as never,
        }),
      ],
      workEntries: [createWorkEntry(), createWorkEntry({ id: 'old-work' as never, localDate: '2026-05-07' as never })],
    });

    expect(summary.isEmpty).toBe(false);
    expect(summary.money).toMatchObject({
      expenseAmountMinor: 1200,
      expenseCount: 1,
      incomeAmountMinor: 4000,
      incomeCount: 1,
      netAmountMinor: 2800,
      totalCount: 2,
    });
    expect(summary.tasks).toMatchObject({
      completedTodayCount: 1,
      openRelevantCount: 2,
      overdueOpenCount: 1,
      recurringCompletedTodayCount: 1,
    });
    expect(summary.reminders).toMatchObject({
      needsReviewCount: 2,
      todayOccurrenceCount: 1,
      totalCount: 2,
    });
    expect(summary.work).toMatchObject({
      earnedIncomeMinor: 1800,
      entryCount: 1,
      totalDurationMinutes: 90,
      unpaidEntryCount: 0,
    });
    expect(summary.partial).toEqual({
      money: false,
      reminders: false,
      tasks: false,
      work: false,
    });
    expect(summary.activity.map((item) => item.kind)).toEqual([
      'money',
      'money',
      'work',
      'reminder',
      'task',
      'task_recurrence',
    ]);
  });

  it('caps review lists and activity to bounded sizes', () => {
    const summary = calculateEndOfDayReviewSummary({
      localDate: '2026-05-08' as never,
      maxItems: 2,
      moneyRecords: [
        createMoneyRecord({ id: 'money-1' as never }),
        createMoneyRecord({ id: 'money-2' as never }),
        createMoneyRecord({ id: 'money-3' as never }),
      ],
      recoveryItems: [
        { occurrenceLocalDate: null, reason: 'task_deadline_passed', targetId: 'r1' as never, targetKind: 'task', title: 'One' },
        { occurrenceLocalDate: null, reason: 'task_deadline_passed', targetId: 'r2' as never, targetKind: 'task', title: 'Two' },
        { occurrenceLocalDate: null, reason: 'task_deadline_passed', targetId: 'r3' as never, targetKind: 'task', title: 'Three' },
      ],
      reminders: [
        { occurrences: [], reminder: createReminder({ id: 'reminder-1' as never, scheduleState: 'failed', title: 'One' as never }) },
        { occurrences: [], reminder: createReminder({ id: 'reminder-2' as never, scheduleState: 'failed', title: 'Two' as never }) },
        { occurrences: [], reminder: createReminder({ id: 'reminder-3' as never, scheduleState: 'failed', title: 'Three' as never }) },
      ],
      taskRecurrenceOccurrences: [],
      tasks: [
        createTask({ id: 'task-1' as never, title: 'One' as never }),
        createTask({ id: 'task-2' as never, title: 'Two' as never }),
        createTask({ id: 'task-3' as never, title: 'Three' as never }),
      ],
      workEntries: [
        createWorkEntry({ id: 'work-1' as never }),
        createWorkEntry({ id: 'work-2' as never }),
        createWorkEntry({ id: 'work-3' as never }),
      ],
    });

    expect(summary.money.records).toHaveLength(2);
    expect(summary.tasks.items).toHaveLength(2);
    expect(summary.reminders.items).toHaveLength(2);
    expect(summary.reminders.recoveryItems).toHaveLength(2);
    expect(summary.work.entries).toHaveLength(2);
    expect(summary.activity).toHaveLength(2);
  });
});
