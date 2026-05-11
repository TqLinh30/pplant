import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

import type { CategoryTopicItem } from '@/domain/categories/types';
import type { AppError } from '@/domain/common/app-error';
import { err, ok, type AppResult } from '@/domain/common/result';
import type { CaptureDraft } from '@/domain/capture-drafts/types';
import { asMoneyRecordTopicIds, asOptionalMoneyRecordCategoryId } from '@/domain/money/schemas';
import {
  asOptionalTaskDeadline,
  asTaskNotes,
  asTaskPriority,
  asTaskState,
  asTaskTitle,
} from '@/domain/tasks/schemas';
import type { Task, TaskPriority, TaskState } from '@/domain/tasks/types';
import type { TaskStateSummary } from '@/domain/tasks/task-summary';
import {
  markActiveCaptureDraftSaved,
  type MarkActiveCaptureDraftSavedRequest,
  type SaveActiveCaptureDraftRequest,
} from '@/services/capture-drafts/capture-draft.service';
import {
  createTask,
  deleteTask,
  editTask,
  loadTaskCaptureData,
  type CreateTaskRequest,
  type TaskCaptureData,
  type TaskMutationResult,
} from '@/services/tasks/task.service';
import {
  isTaskCaptureDraftMeaningful,
  toCaptureDraftPayload,
} from '@/features/capture-drafts/captureDraftPayloads';
import { useCaptureDraftPersistence } from '@/features/capture-drafts/useCaptureDraftPersistence';

export type TaskCaptureStatus = 'deleted' | 'failed' | 'loading' | 'ready' | 'saved' | 'saving';
export type TaskCaptureMutation = 'created' | 'deleted' | 'updated';

export type TaskCaptureDraft = {
  categoryId: string | null;
  deadlineLocalDate: string;
  notes: string;
  priority: TaskPriority;
  state: TaskState;
  title: string;
  topicIds: string[];
};

export type TaskCaptureFieldErrors = Partial<Record<keyof TaskCaptureDraft, string>>;

export type TaskCaptureState = {
  actionError: AppError | null;
  categories: CategoryTopicItem[];
  deletedTask: Task | null;
  draft: TaskCaptureDraft;
  editingTaskId: string | null;
  fieldErrors: TaskCaptureFieldErrors;
  lastMutation: TaskCaptureMutation | null;
  loadError: AppError | null;
  recentTasks: Task[];
  savedTask: Task | null;
  status: TaskCaptureStatus;
  summary: TaskStateSummary;
  topics: CategoryTopicItem[];
};

export type TaskCaptureServices = {
  createTask?: (input: CreateTaskRequest) => Promise<AppResult<TaskMutationResult>>;
  deleteTask?: (id: string) => Promise<AppResult<TaskMutationResult>>;
  loadData?: () => Promise<AppResult<TaskCaptureData>>;
  markDraftSaved?: (input: MarkActiveCaptureDraftSavedRequest) => Promise<AppResult<CaptureDraft | null>>;
  saveDraft?: (input: SaveActiveCaptureDraftRequest) => Promise<AppResult<CaptureDraft>>;
  updateTask?: (id: string, input: CreateTaskRequest) => Promise<AppResult<TaskMutationResult>>;
};

type TaskCaptureAction =
  | { type: 'category_selected'; categoryId: string | null }
  | { type: 'delete_started' }
  | { type: 'delete_succeeded'; nextDraft: TaskCaptureDraft; result: TaskMutationResult }
  | { type: 'draft_applied'; draft: TaskCaptureDraft }
  | { type: 'edit_cancelled'; nextDraft: TaskCaptureDraft }
  | { type: 'edit_started'; task: Task }
  | { type: 'field_changed'; field: 'deadlineLocalDate' | 'notes' | 'title'; value: string }
  | { type: 'load_failed'; error: AppError }
  | { type: 'load_started' }
  | { type: 'load_succeeded'; data: TaskCaptureData }
  | { type: 'priority_changed'; priority: TaskPriority }
  | { type: 'save_failed'; error: AppError }
  | { type: 'save_started' }
  | { type: 'save_succeeded'; mutation: 'created' | 'updated'; nextDraft: TaskCaptureDraft; result: TaskMutationResult }
  | { type: 'state_changed'; state: TaskState }
  | { type: 'topic_toggled'; topicId: string }
  | { type: 'validation_failed'; fieldErrors: TaskCaptureFieldErrors };

const emptySummary: TaskStateSummary = {
  doingCount: 0,
  doneCount: 0,
  highPriorityOpenCount: 0,
  lowPriorityOpenCount: 0,
  openCount: 0,
  overdueOpenCount: 0,
  todoCount: 0,
  totalCount: 0,
};

export function createDefaultTaskCaptureDraft(): TaskCaptureDraft {
  return {
    categoryId: null,
    deadlineLocalDate: '',
    notes: '',
    priority: 'high',
    state: 'todo',
    title: '',
    topicIds: [],
  };
}

export const initialTaskCaptureState: TaskCaptureState = {
  actionError: null,
  categories: [],
  deletedTask: null,
  draft: createDefaultTaskCaptureDraft(),
  editingTaskId: null,
  fieldErrors: {},
  lastMutation: null,
  loadError: null,
  recentTasks: [],
  savedTask: null,
  status: 'loading',
  summary: emptySummary,
  topics: [],
};

export function validateTaskCaptureDraft(
  draft: TaskCaptureDraft,
): AppResult<CreateTaskRequest> & { fieldErrors?: TaskCaptureFieldErrors } {
  const fieldErrors: TaskCaptureFieldErrors = {};
  const title = asTaskTitle(draft.title);
  const notes = asTaskNotes(draft.notes);
  const state = asTaskState(draft.state);
  const priority = asTaskPriority(draft.priority);
  const deadlineLocalDate = asOptionalTaskDeadline(draft.deadlineLocalDate);
  const categoryId = asOptionalMoneyRecordCategoryId(draft.categoryId);
  const topicIds = asMoneyRecordTopicIds(draft.topicIds);

  if (!title.ok) {
    fieldErrors.title = title.error.message;
  }

  if (!notes.ok) {
    fieldErrors.notes = notes.error.message;
  }

  if (!state.ok) {
    fieldErrors.state = state.error.message;
  }

  if (!priority.ok) {
    fieldErrors.priority = priority.error.message;
  }

  if (!deadlineLocalDate.ok) {
    fieldErrors.deadlineLocalDate = deadlineLocalDate.error.message;
  }

  if (!categoryId.ok) {
    fieldErrors.categoryId = categoryId.error.message;
  }

  if (!topicIds.ok) {
    fieldErrors.topicIds = topicIds.error.message;
  }

  if (!title.ok || !notes.ok || !state.ok || !priority.ok || !deadlineLocalDate.ok || !categoryId.ok || !topicIds.ok) {
    return {
      ...err({
        code: 'validation_failed',
        message: 'Check the highlighted task fields.',
        recovery: 'edit',
      }),
      fieldErrors,
    };
  }

  return ok({
    categoryId: categoryId.value,
    deadlineLocalDate: deadlineLocalDate.value,
    notes: notes.value,
    priority: priority.value,
    state: state.value,
    title: title.value,
    topicIds: topicIds.value,
  });
}

function clearFieldError(
  fieldErrors: TaskCaptureFieldErrors,
  field: keyof TaskCaptureDraft,
): TaskCaptureFieldErrors {
  const { [field]: _removed, ...nextErrors } = fieldErrors;

  return nextErrors;
}

export function taskCaptureReducer(state: TaskCaptureState, action: TaskCaptureAction): TaskCaptureState {
  switch (action.type) {
    case 'category_selected':
      return {
        ...state,
        draft: { ...state.draft, categoryId: action.categoryId },
        fieldErrors: clearFieldError(state.fieldErrors, 'categoryId'),
        lastMutation: null,
      };
    case 'delete_started':
    case 'save_started':
      return {
        ...state,
        actionError: null,
        fieldErrors: {},
        status: 'saving',
      };
    case 'delete_succeeded':
      return {
        ...state,
        actionError: null,
        deletedTask: action.result.task,
        draft: action.nextDraft,
        editingTaskId: null,
        lastMutation: 'deleted',
        recentTasks: state.recentTasks.filter((task) => task.id !== action.result.task.id),
        savedTask: null,
        status: 'deleted',
        summary: action.result.summary,
      };
    case 'draft_applied':
      return {
        ...state,
        actionError: null,
        deletedTask: null,
        draft: action.draft,
        editingTaskId: null,
        fieldErrors: {},
        lastMutation: null,
        savedTask: null,
        status: 'ready',
      };
    case 'edit_cancelled':
      return {
        ...state,
        actionError: null,
        deletedTask: null,
        draft: action.nextDraft,
        editingTaskId: null,
        fieldErrors: {},
        lastMutation: null,
        savedTask: null,
        status: 'ready',
      };
    case 'edit_started':
      return {
        ...state,
        actionError: null,
        deletedTask: null,
        draft: {
          categoryId: action.task.categoryId,
          deadlineLocalDate: action.task.deadlineLocalDate ?? '',
          notes: action.task.notes ?? '',
          priority: action.task.priority,
          state: action.task.state,
          title: action.task.title,
          topicIds: action.task.topicIds,
        },
        editingTaskId: action.task.id,
        fieldErrors: {},
        lastMutation: null,
        savedTask: null,
        status: 'ready',
      };
    case 'field_changed':
      return {
        ...state,
        draft: { ...state.draft, [action.field]: action.value },
        fieldErrors: clearFieldError(state.fieldErrors, action.field),
        lastMutation: null,
      };
    case 'load_failed':
      return { ...state, loadError: action.error, status: 'failed' };
    case 'load_started':
      return { ...state, actionError: null, loadError: null, status: 'loading' };
    case 'load_succeeded':
      return {
        ...state,
        categories: action.data.categories,
        loadError: null,
        recentTasks: action.data.recentTasks,
        status: 'ready',
        summary: action.data.summary,
        topics: action.data.topics,
      };
    case 'priority_changed':
      return {
        ...state,
        draft: { ...state.draft, priority: action.priority },
        fieldErrors: clearFieldError(state.fieldErrors, 'priority'),
        lastMutation: null,
      };
    case 'save_failed':
      return { ...state, actionError: action.error, status: 'ready' };
    case 'save_succeeded':
      return {
        ...state,
        actionError: null,
        deletedTask: null,
        draft: action.nextDraft,
        editingTaskId: null,
        lastMutation: action.mutation,
        recentTasks: [action.result.task, ...state.recentTasks.filter((task) => task.id !== action.result.task.id)],
        savedTask: action.result.task,
        status: 'saved',
        summary: action.result.summary,
      };
    case 'state_changed':
      return {
        ...state,
        draft: { ...state.draft, state: action.state },
        fieldErrors: clearFieldError(state.fieldErrors, 'state'),
        lastMutation: null,
      };
    case 'topic_toggled': {
      const topicIds = state.draft.topicIds.includes(action.topicId)
        ? state.draft.topicIds.filter((topicId) => topicId !== action.topicId)
        : [...state.draft.topicIds, action.topicId];

      return {
        ...state,
        draft: { ...state.draft, topicIds },
        fieldErrors: clearFieldError(state.fieldErrors, 'topicIds'),
        lastMutation: null,
      };
    }
    case 'validation_failed':
      return { ...state, fieldErrors: action.fieldErrors, status: 'ready' };
    default:
      return state;
  }
}

export function useTaskCapture(services: TaskCaptureServices = {}) {
  const [state, dispatch] = useReducer(taskCaptureReducer, initialTaskCaptureState);
  const isMounted = useRef(false);
  const loadData = services.loadData ?? loadTaskCaptureData;
  const createTaskDependency = services.createTask ?? createTask;
  const markDraftSaved = services.markDraftSaved ?? markActiveCaptureDraftSaved;
  const defaultDraft = useMemo(() => createDefaultTaskCaptureDraft(), []);
  const updateTaskDependency = useMemo(
    () => services.updateTask ?? ((id: string, input: CreateTaskRequest) => editTask({ ...input, id })),
    [services.updateTask],
  );
  const deleteTaskDependency = useMemo(
    () => services.deleteTask ?? ((id: string) => deleteTask({ id })),
    [services.deleteTask],
  );
  useCaptureDraftPersistence({
    draft: state.draft,
    enabled: state.status === 'ready' && state.editingTaskId === null,
    isMeaningful: useCallback(
      (draft: TaskCaptureDraft) => isTaskCaptureDraftMeaningful(draft, defaultDraft),
      [defaultDraft],
    ),
    kind: 'task',
    saveDraft: services.saveDraft,
    toPayload: toCaptureDraftPayload,
  });

  const reload = useCallback(() => {
    dispatch({ type: 'load_started' });
    void loadData().then((result) => {
      if (!isMounted.current) {
        return;
      }

      if (result.ok) {
        dispatch({ data: result.value, type: 'load_succeeded' });
        return;
      }

      dispatch({ error: result.error, type: 'load_failed' });
    });
  }, [loadData]);

  const save = useCallback(() => {
    const validation = validateTaskCaptureDraft(state.draft);

    if (!validation.ok) {
      dispatch({ fieldErrors: validation.fieldErrors ?? {}, type: 'validation_failed' });
      return;
    }

    dispatch({ type: 'save_started' });

    if (state.editingTaskId) {
      void updateTaskDependency(state.editingTaskId, validation.value).then((result) => {
        if (!isMounted.current) {
          return;
        }

        if (result.ok) {
          dispatch({
            mutation: 'updated',
            nextDraft: createDefaultTaskCaptureDraft(),
            result: result.value,
            type: 'save_succeeded',
          });
          return;
        }

        dispatch({ error: result.error, type: 'save_failed' });
      });
      return;
    }

    void createTaskDependency(validation.value).then(async (result) => {
      if (!isMounted.current) {
        return;
      }

      if (result.ok) {
        const draftSaved = await markDraftSaved({
          kind: 'task',
          savedRecordId: result.value.task.id,
          savedRecordKind: 'task',
        });

        if (!isMounted.current) {
          return;
        }

        if (!draftSaved.ok) {
          dispatch({ error: draftSaved.error, type: 'save_failed' });
          return;
        }

        dispatch({
          mutation: 'created',
          nextDraft: createDefaultTaskCaptureDraft(),
          result: result.value,
          type: 'save_succeeded',
        });
        return;
      }

      dispatch({ error: result.error, type: 'save_failed' });
    });
  }, [createTaskDependency, markDraftSaved, state.draft, state.editingTaskId, updateTaskDependency]);

  const deleteEditingTask = useCallback(() => {
    if (!state.editingTaskId) {
      return;
    }

    dispatch({ type: 'delete_started' });
    void deleteTaskDependency(state.editingTaskId).then((result) => {
      if (!isMounted.current) {
        return;
      }

      if (result.ok) {
        dispatch({
          nextDraft: createDefaultTaskCaptureDraft(),
          result: result.value,
          type: 'delete_succeeded',
        });
        return;
      }

      dispatch({ error: result.error, type: 'save_failed' });
    });
  }, [deleteTaskDependency, state.editingTaskId]);

  const startEdit = useCallback((task: Task) => dispatch({ task, type: 'edit_started' }), []);

  useEffect(() => {
    isMounted.current = true;
    reload();

    return () => {
      isMounted.current = false;
    };
  }, [reload]);

  return {
    applyDraft: (draft: TaskCaptureDraft) => dispatch({ draft, type: 'draft_applied' }),
    cancelEdit: () => dispatch({ nextDraft: createDefaultTaskCaptureDraft(), type: 'edit_cancelled' }),
    deleteEditingTask,
    reload,
    save,
    selectCategory: (categoryId: string | null) => dispatch({ categoryId, type: 'category_selected' }),
    setPriority: (priority: TaskPriority) => dispatch({ priority, type: 'priority_changed' }),
    setState: (taskState: TaskState) => dispatch({ state: taskState, type: 'state_changed' }),
    startEdit,
    state,
    toggleTopic: (topicId: string) => dispatch({ topicId, type: 'topic_toggled' }),
    updateField: (field: 'deadlineLocalDate' | 'notes' | 'title', value: string) =>
      dispatch({ field, type: 'field_changed', value }),
  };
}
