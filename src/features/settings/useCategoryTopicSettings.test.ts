import { createAppError } from '@/domain/common/app-error';
import type { EntityId } from '@/domain/common/ids';
import { ok } from '@/domain/common/result';
import { parseCategoryTopicRow } from '@/domain/categories/schemas';
import type { CategoryTopicDeletionImpact, CategoryTopicItem } from '@/domain/categories/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import {
  categoryTopicSettingsReducer,
  getCategoryTopicReplacementOptions,
  getSelectedCategoryTopicItems,
  initialCategoryTopicSettingsState,
  moveCategoryTopicItemId,
  validateCategoryTopicDraft,
} from './useCategoryTopicSettings';

const fixedNow = '2026-05-08T00:00:00.000Z';

function createItem(id: string, name: string, sortOrder: number): CategoryTopicItem {
  const parsed = parseCategoryTopicRow(
    {
      archivedAt: null,
      createdAt: fixedNow,
      id,
      name,
      sortOrder,
      updatedAt: fixedNow,
      workspaceId: localWorkspaceId,
    },
    'category',
  );

  if (!parsed.ok) {
    throw new Error('category fixture failed');
  }

  return parsed.value;
}

const first = createItem('first', 'First', 0);
const second = createItem('second', 'Second', 1);

describe('category/topic settings state', () => {
  it('loads category and topic lists into ready state', () => {
    const state = categoryTopicSettingsReducer(initialCategoryTopicSettingsState, {
      categories: [first],
      topics: [],
      type: 'load_succeeded',
    });

    expect(state.status).toBe('ready');
    expect(getSelectedCategoryTopicItems(state)).toEqual([first]);
  });

  it('validates create/edit drafts with field-level errors', () => {
    const result = validateCategoryTopicDraft('   ');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('validation_failed');
      expect(result.error.recovery).toBe('edit');
    }
  });

  it('moves ids up or down without changing bounded positions', () => {
    expect(moveCategoryTopicItemId(['first', 'second'], 'second', 'up')).toEqual(['second', 'first']);
    expect(moveCategoryTopicItemId(['first', 'second'], 'second', 'down')).toEqual(['first', 'second']);
  });

  it('sets create validation errors and clears them when the draft changes', () => {
    const failed = categoryTopicSettingsReducer(initialCategoryTopicSettingsState, {
      error: createAppError('validation_failed', 'Name cannot be empty.', 'edit'),
      type: 'create_failed',
    });
    const changed = categoryTopicSettingsReducer(failed, {
      type: 'new_name_changed',
      value: 'School',
    });

    expect(failed.fieldError).toBe('Name cannot be empty.');
    expect(changed.fieldError).toBeUndefined();
    expect(changed.newName).toBe('School');
  });

  it('updates local lists after create, edit, reorder, and archive completion', () => {
    const loaded = categoryTopicSettingsReducer(initialCategoryTopicSettingsState, {
      categories: [first],
      topics: [],
      type: 'load_succeeded',
    });
    const created = categoryTopicSettingsReducer(loaded, {
      item: second,
      type: 'item_created',
    });
    const edited = categoryTopicSettingsReducer(created, {
      item: { ...second, name: 'Second renamed' as never },
      type: 'item_updated',
    });
    const reordered = categoryTopicSettingsReducer(edited, {
      items: [{ ...edited.categories[1], sortOrder: 0 }, { ...edited.categories[0], sortOrder: 1 }],
      kind: 'category',
      type: 'items_reordered',
    });
    const archived = categoryTopicSettingsReducer(reordered, {
      id: 'second' as EntityId,
      kind: 'category',
      type: 'item_removed',
    });

    expect(created.categories.map((item) => item.id)).toEqual(['first', 'second']);
    expect(edited.categories[1].name).toBe('Second renamed');
    expect(reordered.categories.map((item) => item.id)).toEqual(['second', 'first']);
    expect(archived.categories.map((item) => item.id)).toEqual(['first']);
  });

  it('tracks deletion impact and replacement selection', () => {
    const impact: CategoryTopicDeletionImpact = {
      canKeepHistory: true,
      canReassign: true,
      itemId: first.id,
      itemName: first.name,
      kind: 'category',
      usage: {
        moneyRecordCount: 1,
        reflectionCount: 0,
        taskCount: 0,
        totalCount: 1,
        workEntryCount: 0,
      },
    };
    const loaded = categoryTopicSettingsReducer(initialCategoryTopicSettingsState, {
      categories: [first, second],
      topics: [],
      type: 'load_succeeded',
    });
    const withImpact = categoryTopicSettingsReducer(loaded, {
      impact,
      type: 'deletion_impact_loaded',
    });
    const changed = categoryTopicSettingsReducer(withImpact, {
      itemId: second.id,
      type: 'reassign_target_changed',
    });

    expect(withImpact.pendingDeletion?.itemId).toBe(first.id);
    expect(getCategoryTopicReplacementOptions(withImpact).map((item) => item.id)).toEqual(['second']);
    expect(changed.reassignTargetId).toBe(second.id);
  });

  it('sets retryable action errors without exposing persistence details', () => {
    const failed = categoryTopicSettingsReducer(initialCategoryTopicSettingsState, {
      error: createAppError('unavailable', 'Local category/topic data could not be loaded.', 'retry'),
      type: 'action_failed',
    });

    expect(failed.status).toBe('ready');
    expect(failed.actionError?.recovery).toBe('retry');
  });

  it('keeps load failures retryable', () => {
    const failed = categoryTopicSettingsReducer(initialCategoryTopicSettingsState, {
      error: createAppError('unavailable', 'Local category/topic data could not be loaded.', 'retry'),
      type: 'load_failed',
    });

    expect(failed.status).toBe('failed');
    expect(failed.loadError?.recovery).toBe('retry');
  });

  it('accepts successful service payload shapes used by the hook', () => {
    expect(ok({ categories: [first], topics: [] })).toEqual({
      ok: true,
      value: { categories: [first], topics: [] },
    });
  });
});
