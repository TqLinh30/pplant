import { parseCategoryTopicRow } from '@/domain/categories/schemas';
import type { CategoryTopicItem } from '@/domain/categories/types';
import { parseTaskRow } from '@/domain/tasks/schemas';
import type { Task } from '@/domain/tasks/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import {
  createDefaultTaskCaptureDraft,
  initialTaskCaptureState,
  taskCaptureReducer,
  validateTaskCaptureDraft,
} from './useTaskCapture';

const fixedNow = '2026-05-08T00:00:00.000Z';

function createCategory(): CategoryTopicItem {
  const result = parseCategoryTopicRow(
    {
      archivedAt: null,
      createdAt: fixedNow,
      id: 'cat-study',
      name: 'Study',
      sortOrder: 0,
      updatedAt: fixedNow,
      workspaceId: localWorkspaceId,
    },
    'category',
  );

  if (!result.ok) {
    throw new Error('category fixture failed');
  }

  return result.value;
}

function createTaskFixture(overrides: Record<string, unknown> = {}): Task {
  const result = parseTaskRow(
    {
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
      workspaceId: localWorkspaceId,
      ...overrides,
    },
    ['topic-class'],
  );

  if (!result.ok) {
    throw new Error('task fixture failed');
  }

  return result.value;
}

describe('task capture state', () => {
  it('validates task drafts into service input', () => {
    const validation = validateTaskCaptureDraft({
      ...createDefaultTaskCaptureDraft(),
      categoryId: 'cat-study',
      deadlineLocalDate: '2026-05-09',
      notes: '  Read chapter 4  ',
      priority: 'low',
      state: 'doing',
      title: '  Biology homework  ',
      topicIds: ['topic-class'],
    });

    expect(validation.ok).toBe(true);
    if (validation.ok) {
      expect(validation.value).toEqual({
        categoryId: 'cat-study',
        deadlineLocalDate: '2026-05-09',
        notes: 'Read chapter 4',
        priority: 'low',
        state: 'doing',
        title: 'Biology homework',
        topicIds: ['topic-class'],
      });
    }
  });

  it('returns field errors for invalid drafts', () => {
    const validation = validateTaskCaptureDraft({
      ...createDefaultTaskCaptureDraft(),
      deadlineLocalDate: '2026-02-30',
      title: '',
      topicIds: ['topic-class', 'topic-class'],
    });

    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.fieldErrors?.deadlineLocalDate).toBeDefined();
      expect(validation.fieldErrors?.title).toBeDefined();
      expect(validation.fieldErrors?.topicIds).toBeDefined();
    }
  });

  it('loads, starts editing, saves, and removes tasks from recent list', () => {
    const task = createTaskFixture();
    const loaded = taskCaptureReducer(initialTaskCaptureState, {
      data: {
        categories: [createCategory()],
        recentTasks: [task],
        summary: {
          doingCount: 0,
          doneCount: 0,
          highPriorityOpenCount: 1,
          lowPriorityOpenCount: 0,
          openCount: 1,
          overdueOpenCount: 0,
          todoCount: 1,
          totalCount: 1,
        },
        topics: [],
      },
      type: 'load_succeeded',
    });
    const editing = taskCaptureReducer(loaded, {
      task,
      type: 'edit_started',
    });
    const updatedTask = createTaskFixture({ notes: 'Updated note', title: 'Essay outline' });
    const saved = taskCaptureReducer(editing, {
      mutation: 'updated',
      nextDraft: createDefaultTaskCaptureDraft(),
      result: {
        summary: loaded.summary,
        task: updatedTask,
      },
      type: 'save_succeeded',
    });
    const deleted = taskCaptureReducer(saved, {
      nextDraft: createDefaultTaskCaptureDraft(),
      result: {
        summary: {
          doingCount: 0,
          doneCount: 0,
          highPriorityOpenCount: 0,
          lowPriorityOpenCount: 0,
          openCount: 0,
          overdueOpenCount: 0,
          todoCount: 0,
          totalCount: 0,
        },
        task: updatedTask,
      },
      type: 'delete_succeeded',
    });

    expect(loaded.status).toBe('ready');
    expect(editing.editingTaskId).toBe('task-1');
    expect(saved.recentTasks.map((item) => item.title)).toEqual(['Essay outline']);
    expect(deleted.recentTasks).toEqual([]);
    expect(deleted.status).toBe('deleted');
  });

  it('applies a recovered task draft for resume', () => {
    const recovered = taskCaptureReducer(initialTaskCaptureState, {
      draft: {
        ...createDefaultTaskCaptureDraft(),
        deadlineLocalDate: '2026-05-09',
        notes: 'Bring outline',
        title: 'Essay',
      },
      type: 'draft_applied',
    });

    expect(recovered.status).toBe('ready');
    expect(recovered.editingTaskId).toBeNull();
    expect(recovered.draft.title).toBe('Essay');
    expect(recovered.draft.deadlineLocalDate).toBe('2026-05-09');
  });
});
