import { useCallback, useEffect, useReducer, useRef } from 'react';

import type { AppError } from '@/domain/common/app-error';
import type { AppResult } from '@/domain/common/result';
import { asCategoryTopicName } from '@/domain/categories/schemas';
import type {
  CategoryTopicDeletionImpact,
  CategoryTopicItem,
  CategoryTopicKind,
} from '@/domain/categories/types';
import {
  createCategoryTopicItem,
  deleteCategoryTopicItem,
  getCategoryTopicDeletionImpact,
  loadCategoryTopicSettings,
  reorderCategoryTopicItems,
  updateCategoryTopicItemName,
  type CategoryTopicSettingsData,
  type DeleteCategoryTopicItemResult,
} from '@/services/categories/category-topic.service';

export type CategoryTopicSettingsStatus = 'failed' | 'loading' | 'ready' | 'saved' | 'saving';

export type CategoryTopicSettingsState = {
  actionError?: AppError;
  categories: CategoryTopicItem[];
  editName: string;
  editingId?: string;
  fieldError?: string;
  loadError?: AppError;
  newName: string;
  pendingDeletion?: CategoryTopicDeletionImpact;
  reassignTargetId?: string;
  selectedKind: CategoryTopicKind;
  status: CategoryTopicSettingsStatus;
  topics: CategoryTopicItem[];
};

export type CategoryTopicSettingsAction =
  | { type: 'action_failed'; error: AppError }
  | { type: 'create_failed'; error: AppError }
  | { type: 'delete_cancelled' }
  | { type: 'deletion_impact_loaded'; impact: CategoryTopicDeletionImpact }
  | { type: 'edit_cancelled' }
  | { type: 'edit_name_changed'; value: string }
  | { type: 'edit_started'; item: CategoryTopicItem }
  | { type: 'item_created'; item: CategoryTopicItem }
  | { type: 'item_removed'; kind: CategoryTopicKind; id: CategoryTopicItem['id'] }
  | { type: 'item_updated'; item: CategoryTopicItem }
  | { type: 'items_reordered'; kind: CategoryTopicKind; items: CategoryTopicItem[] }
  | { type: 'load_failed'; error: AppError }
  | { type: 'load_started' }
  | { type: 'load_succeeded'; categories: CategoryTopicItem[]; topics: CategoryTopicItem[] }
  | { type: 'new_name_changed'; value: string }
  | { type: 'reassign_target_changed'; itemId: string }
  | { type: 'save_started' }
  | { type: 'selected_kind_changed'; kind: CategoryTopicKind };

export type CategoryTopicSettingsServices = {
  createItem?: (
    input: { kind: CategoryTopicKind; name: string },
  ) => Promise<AppResult<CategoryTopicItem>>;
  deleteItem?: (
    input: { kind: CategoryTopicKind; id: string; mode: 'archive' | 'cancel' | 'reassign'; replacementId?: string },
  ) => Promise<AppResult<DeleteCategoryTopicItemResult>>;
  getDeletionImpact?: (
    input: { kind: CategoryTopicKind; id: string },
  ) => Promise<AppResult<CategoryTopicDeletionImpact>>;
  loadSettings?: () => Promise<AppResult<CategoryTopicSettingsData>>;
  reorderItems?: (
    input: { kind: CategoryTopicKind; orderedIds: string[] },
  ) => Promise<AppResult<CategoryTopicItem[]>>;
  updateItemName?: (
    input: { kind: CategoryTopicKind; id: string; name: string },
  ) => Promise<AppResult<CategoryTopicItem>>;
};

export const initialCategoryTopicSettingsState: CategoryTopicSettingsState = {
  categories: [],
  editName: '',
  newName: '',
  selectedKind: 'category',
  status: 'loading',
  topics: [],
};

function sortItems(items: CategoryTopicItem[]): CategoryTopicItem[] {
  return [...items].sort((first, second) => first.sortOrder - second.sortOrder || first.id.localeCompare(second.id));
}

function replaceKindItems(
  state: CategoryTopicSettingsState,
  kind: CategoryTopicKind,
  items: CategoryTopicItem[],
): CategoryTopicSettingsState {
  return kind === 'category'
    ? { ...state, categories: sortItems(items) }
    : { ...state, topics: sortItems(items) };
}

function upsertItem(items: CategoryTopicItem[], item: CategoryTopicItem): CategoryTopicItem[] {
  const existingIndex = items.findIndex((candidate) => candidate.id === item.id);

  if (existingIndex === -1) {
    return sortItems([...items, item]);
  }

  const nextItems = [...items];
  nextItems[existingIndex] = item;
  return sortItems(nextItems);
}

export function getSelectedCategoryTopicItems(state: CategoryTopicSettingsState): CategoryTopicItem[] {
  return state.selectedKind === 'category' ? state.categories : state.topics;
}

export function getCategoryTopicReplacementOptions(
  state: CategoryTopicSettingsState,
): CategoryTopicItem[] {
  if (!state.pendingDeletion) {
    return [];
  }

  const items = state.pendingDeletion.kind === 'category' ? state.categories : state.topics;

  return items.filter((item) => item.id !== state.pendingDeletion?.itemId);
}

export function moveCategoryTopicItemId(
  orderedIds: string[],
  itemId: string,
  direction: 'down' | 'up',
): string[] {
  const currentIndex = orderedIds.indexOf(itemId);

  if (currentIndex === -1) {
    return orderedIds;
  }

  const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

  if (nextIndex < 0 || nextIndex >= orderedIds.length) {
    return orderedIds;
  }

  const nextIds = [...orderedIds];
  [nextIds[currentIndex], nextIds[nextIndex]] = [nextIds[nextIndex], nextIds[currentIndex]];
  return nextIds;
}

export function validateCategoryTopicDraft(value: string) {
  return asCategoryTopicName(value);
}

export function categoryTopicSettingsReducer(
  state: CategoryTopicSettingsState,
  action: CategoryTopicSettingsAction,
): CategoryTopicSettingsState {
  switch (action.type) {
    case 'action_failed':
      return {
        ...state,
        actionError: action.error,
        status: 'ready',
      };
    case 'create_failed':
      return {
        ...state,
        actionError: action.error.code === 'conflict' ? action.error : state.actionError,
        fieldError: action.error.message,
        status: 'ready',
      };
    case 'delete_cancelled':
      return {
        ...state,
        pendingDeletion: undefined,
        reassignTargetId: undefined,
        status: 'ready',
      };
    case 'deletion_impact_loaded': {
      const replacement = getCategoryTopicReplacementOptions({
        ...state,
        pendingDeletion: action.impact,
      })[0];

      return {
        ...state,
        actionError: undefined,
        pendingDeletion: action.impact,
        reassignTargetId: replacement?.id,
        status: 'ready',
      };
    }
    case 'edit_cancelled':
      return {
        ...state,
        editName: '',
        editingId: undefined,
        fieldError: undefined,
      };
    case 'edit_name_changed':
      return {
        ...state,
        editName: action.value,
        fieldError: undefined,
      };
    case 'edit_started':
      return {
        ...state,
        editName: action.item.name,
        editingId: action.item.id,
        fieldError: undefined,
      };
    case 'item_created': {
      const items = action.item.kind === 'category' ? state.categories : state.topics;

      return {
        ...replaceKindItems(state, action.item.kind, upsertItem(items, action.item)),
        actionError: undefined,
        fieldError: undefined,
        newName: '',
        status: 'saved',
      };
    }
    case 'item_removed': {
      const items = action.kind === 'category' ? state.categories : state.topics;

      return {
        ...replaceKindItems(
          state,
          action.kind,
          items.filter((item) => item.id !== action.id),
        ),
        actionError: undefined,
        pendingDeletion: undefined,
        reassignTargetId: undefined,
        status: 'saved',
      };
    }
    case 'item_updated': {
      const items = action.item.kind === 'category' ? state.categories : state.topics;

      return {
        ...replaceKindItems(state, action.item.kind, upsertItem(items, action.item)),
        actionError: undefined,
        editName: '',
        editingId: undefined,
        fieldError: undefined,
        status: 'saved',
      };
    }
    case 'items_reordered':
      return {
        ...replaceKindItems(state, action.kind, action.items),
        actionError: undefined,
        status: 'saved',
      };
    case 'load_failed':
      return {
        ...state,
        loadError: action.error,
        status: 'failed',
      };
    case 'load_started':
      return {
        ...state,
        loadError: undefined,
        status: 'loading',
      };
    case 'load_succeeded':
      return {
        ...state,
        actionError: undefined,
        categories: sortItems(action.categories),
        loadError: undefined,
        status: 'ready',
        topics: sortItems(action.topics),
      };
    case 'new_name_changed':
      return {
        ...state,
        fieldError: undefined,
        newName: action.value,
      };
    case 'reassign_target_changed':
      return {
        ...state,
        reassignTargetId: action.itemId,
      };
    case 'save_started':
      return {
        ...state,
        actionError: undefined,
        fieldError: undefined,
        status: 'saving',
      };
    case 'selected_kind_changed':
      return {
        ...state,
        actionError: undefined,
        editName: '',
        editingId: undefined,
        fieldError: undefined,
        newName: '',
        pendingDeletion: undefined,
        reassignTargetId: undefined,
        selectedKind: action.kind,
      };
  }
}

export function useCategoryTopicSettings({
  createItem = createCategoryTopicItem,
  deleteItem = deleteCategoryTopicItem,
  getDeletionImpact = getCategoryTopicDeletionImpact,
  loadSettings = loadCategoryTopicSettings,
  reorderItems = reorderCategoryTopicItems,
  updateItemName = updateCategoryTopicItemName,
}: CategoryTopicSettingsServices = {}) {
  const [state, dispatch] = useReducer(
    categoryTopicSettingsReducer,
    initialCategoryTopicSettingsState,
  );
  const isMounted = useRef(false);

  const reload = useCallback(() => {
    dispatch({ type: 'load_started' });

    void loadSettings().then((result) => {
      if (!isMounted.current) {
        return;
      }

      if (result.ok) {
        dispatch({
          categories: result.value.categories,
          topics: result.value.topics,
          type: 'load_succeeded',
        });
        return;
      }

      dispatch({ error: result.error, type: 'load_failed' });
    });
  }, [loadSettings]);

  const selectKind = useCallback((kind: CategoryTopicKind) => {
    dispatch({ kind, type: 'selected_kind_changed' });
  }, []);

  const updateNewName = useCallback((value: string) => {
    dispatch({ type: 'new_name_changed', value });
  }, []);

  const createSelectedItem = useCallback(() => {
    const validation = validateCategoryTopicDraft(state.newName);

    if (!validation.ok) {
      dispatch({ error: validation.error, type: 'create_failed' });
      return;
    }

    dispatch({ type: 'save_started' });

    void createItem({ kind: state.selectedKind, name: state.newName }).then((result) => {
      if (!isMounted.current) {
        return;
      }

      if (result.ok) {
        dispatch({ item: result.value, type: 'item_created' });
        return;
      }

      dispatch({ error: result.error, type: result.error.recovery === 'edit' ? 'create_failed' : 'action_failed' });
    });
  }, [createItem, state.newName, state.selectedKind]);

  const startEdit = useCallback((item: CategoryTopicItem) => {
    dispatch({ item, type: 'edit_started' });
  }, []);

  const updateEditName = useCallback((value: string) => {
    dispatch({ type: 'edit_name_changed', value });
  }, []);

  const cancelEdit = useCallback(() => {
    dispatch({ type: 'edit_cancelled' });
  }, []);

  const saveEdit = useCallback(() => {
    if (!state.editingId) {
      return;
    }

    const validation = validateCategoryTopicDraft(state.editName);

    if (!validation.ok) {
      dispatch({ error: validation.error, type: 'create_failed' });
      return;
    }

    dispatch({ type: 'save_started' });

    void updateItemName({
      id: state.editingId,
      kind: state.selectedKind,
      name: state.editName,
    }).then((result) => {
      if (!isMounted.current) {
        return;
      }

      if (result.ok) {
        dispatch({ item: result.value, type: 'item_updated' });
        return;
      }

      dispatch({ error: result.error, type: result.error.recovery === 'edit' ? 'create_failed' : 'action_failed' });
    });
  }, [state.editName, state.editingId, state.selectedKind, updateItemName]);

  const moveItem = useCallback(
    (itemId: string, direction: 'down' | 'up') => {
      const orderedIds = getSelectedCategoryTopicItems(state).map((item) => item.id);
      const nextIds = moveCategoryTopicItemId(orderedIds, itemId, direction);

      if (nextIds.join('|') === orderedIds.join('|')) {
        return;
      }

      dispatch({ type: 'save_started' });

      void reorderItems({ kind: state.selectedKind, orderedIds: nextIds }).then((result) => {
        if (!isMounted.current) {
          return;
        }

        if (result.ok) {
          dispatch({ items: result.value, kind: state.selectedKind, type: 'items_reordered' });
          return;
        }

        dispatch({ error: result.error, type: 'action_failed' });
      });
    },
    [reorderItems, state],
  );

  const requestDelete = useCallback(
    (item: CategoryTopicItem) => {
      dispatch({ type: 'save_started' });

      void getDeletionImpact({ id: item.id, kind: item.kind }).then((result) => {
        if (!isMounted.current) {
          return;
        }

        if (result.ok) {
          dispatch({ impact: result.value, type: 'deletion_impact_loaded' });
          return;
        }

        dispatch({ error: result.error, type: 'action_failed' });
      });
    },
    [getDeletionImpact],
  );

  const cancelDelete = useCallback(() => {
    dispatch({ type: 'delete_cancelled' });
  }, []);

  const updateReassignTarget = useCallback((itemId: string) => {
    dispatch({ itemId, type: 'reassign_target_changed' });
  }, []);

  const finishDelete = useCallback(
    (mode: 'archive' | 'reassign') => {
      if (!state.pendingDeletion) {
        return;
      }

      dispatch({ type: 'save_started' });

      void deleteItem({
        id: state.pendingDeletion.itemId,
        kind: state.pendingDeletion.kind,
        mode,
        replacementId: mode === 'reassign' ? state.reassignTargetId : undefined,
      }).then((result) => {
        if (!isMounted.current) {
          return;
        }

        if (result.ok) {
          if (result.value.action === 'cancelled') {
            dispatch({ type: 'delete_cancelled' });
            return;
          }

          dispatch({
            id: result.value.item.id,
            kind: result.value.item.kind,
            type: 'item_removed',
          });
          return;
        }

        dispatch({ error: result.error, type: result.error.recovery === 'edit' ? 'create_failed' : 'action_failed' });
      });
    },
    [deleteItem, state.pendingDeletion, state.reassignTargetId],
  );

  useEffect(() => {
    isMounted.current = true;
    reload();

    return () => {
      isMounted.current = false;
    };
  }, [reload]);

  return {
    cancelDelete,
    cancelEdit,
    createSelectedItem,
    finishDelete,
    moveItem,
    reload,
    requestDelete,
    saveEdit,
    selectKind,
    selectedItems: getSelectedCategoryTopicItems(state),
    replacementOptions: getCategoryTopicReplacementOptions(state),
    startEdit,
    state,
    updateEditName,
    updateNewName,
    updateReassignTarget,
  };
}
