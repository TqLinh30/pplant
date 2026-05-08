import { asOptionalTaskDeadline, asTaskNotes, asTaskTitle, parseTaskRow } from './schemas';
import { calculateTaskStateSummary } from './task-summary';

const fixedNow = '2026-05-08T00:00:00.000Z';

function createRow(overrides: Record<string, unknown> = {}) {
  return {
    categoryId: 'cat-study',
    completedAt: null,
    createdAt: fixedNow,
    deadlineLocalDate: '2026-05-09',
    deletedAt: null,
    id: 'task-1',
    notes: 'Read chapter 4',
    priority: 'high',
    source: 'manual',
    sourceOfTruth: 'manual',
    state: 'todo',
    title: 'Biology homework',
    updatedAt: fixedNow,
    userCorrectedAt: null,
    workspaceId: 'local',
    ...overrides,
  };
}

describe('task domain', () => {
  it('validates and trims task title, notes, and deadline input', () => {
    expect(asTaskTitle('  Read notes  ')).toEqual({ ok: true, value: 'Read notes' });
    expect(asTaskNotes('  Chapter outline  ')).toEqual({ ok: true, value: 'Chapter outline' });
    expect(asTaskNotes('   ')).toEqual({ ok: true, value: null });
    expect(asOptionalTaskDeadline('2026-05-08')).toEqual({ ok: true, value: '2026-05-08' });

    expect(asTaskTitle('   ').ok).toBe(false);
    expect(asOptionalTaskDeadline('2026-02-30').ok).toBe(false);
  });

  it('parses persisted manual tasks with optional metadata and topics', () => {
    const parsed = parseTaskRow(createRow({ notes: '  Outline ', title: '  Essay  ' }), ['topic-class']);

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value).toMatchObject({
        categoryId: 'cat-study',
        deadlineLocalDate: '2026-05-09',
        notes: 'Outline',
        source: 'manual',
        sourceOfTruth: 'manual',
        state: 'todo',
        title: 'Essay',
        topicIds: ['topic-class'],
      });
    }
  });

  it('rejects invalid persisted task state and completion timestamp combinations', () => {
    expect(parseTaskRow(createRow({ completedAt: null, state: 'done' }))).toMatchObject({ ok: false });
    expect(parseTaskRow(createRow({ completedAt: fixedNow, state: 'doing' }))).toMatchObject({ ok: false });
    expect(parseTaskRow(createRow({ deadlineLocalDate: '2026-02-30' }))).toMatchObject({ ok: false });
    expect(parseTaskRow(createRow({ priority: 'urgent' }))).toMatchObject({ ok: false });
  });

  it('summarizes active tasks by state, priority, and overdue open deadlines', () => {
    const todoHigh = parseTaskRow(createRow({ deadlineLocalDate: '2026-05-07', id: 'task-high' }));
    const doingLow = parseTaskRow(
      createRow({
        deadlineLocalDate: '2026-05-08',
        id: 'task-low',
        priority: 'low',
        state: 'doing',
      }),
    );
    const done = parseTaskRow(
      createRow({
        completedAt: fixedNow,
        deadlineLocalDate: '2026-05-01',
        id: 'task-done',
        state: 'done',
      }),
    );
    const deleted = parseTaskRow(
      createRow({
        deletedAt: fixedNow,
        id: 'task-deleted',
      }),
    );

    if (!todoHigh.ok || !doingLow.ok || !done.ok || !deleted.ok) {
      throw new Error('task fixture failed');
    }

    const summary = calculateTaskStateSummary(
      [todoHigh.value, doingLow.value, done.value, deleted.value],
      '2026-05-08' as never,
    );

    expect(summary).toEqual({
      doingCount: 1,
      doneCount: 1,
      highPriorityOpenCount: 1,
      lowPriorityOpenCount: 1,
      openCount: 2,
      overdueOpenCount: 1,
      todoCount: 1,
      totalCount: 3,
    });
  });
});
