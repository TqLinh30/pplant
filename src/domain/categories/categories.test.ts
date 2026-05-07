import { localWorkspaceId } from '@/domain/workspace/types';

import {
  archiveCategoryTopicItem,
  asCategoryTopicName,
  createCategoryTopicDeletionImpact,
  hasActiveNameConflict,
  parseCategoryTopicRow,
  resolveCategoryTopicReorder,
} from './schemas';

const fixedNow = '2026-05-08T00:00:00.000Z';

function createRow(overrides: Record<string, unknown> = {}) {
  return {
    archivedAt: null,
    createdAt: fixedNow,
    id: 'category-school',
    name: 'School',
    sortOrder: 0,
    updatedAt: fixedNow,
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

describe('category/topic domain', () => {
  it('trims valid names and rejects empty names with edit recovery', () => {
    const valid = asCategoryTopicName('  School  ');
    const empty = asCategoryTopicName('   ');

    expect(valid).toEqual({ ok: true, value: 'School' });
    expect(empty.ok).toBe(false);
    if (!empty.ok) {
      expect(empty.error.code).toBe('validation_failed');
      expect(empty.error.recovery).toBe('edit');
    }
  });

  it('rejects names over the mobile-friendly limit', () => {
    const result = asCategoryTopicName('a'.repeat(41));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('40');
    }
  });

  it('parses persisted rows and preserves ids across archive updates', () => {
    const parsed = parseCategoryTopicRow(createRow(), 'category');

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      const archived = archiveCategoryTopicItem(parsed.value, fixedNow);

      expect(archived.id).toBe(parsed.value.id);
      expect(archived.archivedAt).toBe(fixedNow);
      expect(archived.name).toBe('School');
    }
  });

  it('detects duplicate active names case-insensitively while ignoring archived items', () => {
    const active = parseCategoryTopicRow(createRow(), 'category');
    const archived = parseCategoryTopicRow(
      createRow({ archivedAt: fixedNow, id: 'category-old', name: 'School' }),
      'category',
    );

    if (!active.ok || !archived.ok) {
      throw new Error('fixture failed');
    }

    expect(hasActiveNameConflict([active.value], ' school ')).toBe(true);
    expect(hasActiveNameConflict([archived.value], ' school ')).toBe(false);
    expect(hasActiveNameConflict([active.value], ' school ', active.value.id)).toBe(false);
  });

  it('resolves dense deterministic reorder assignments', () => {
    const first = parseCategoryTopicRow(createRow({ id: 'first', sortOrder: 0 }), 'topic');
    const second = parseCategoryTopicRow(createRow({ id: 'second', sortOrder: 1 }), 'topic');

    if (!first.ok || !second.ok) {
      throw new Error('fixture failed');
    }

    const result = resolveCategoryTopicReorder([first.value, second.value], ['second', 'first']);

    expect(result).toEqual({
      ok: true,
      value: [
        { id: 'second', sortOrder: 0 },
        { id: 'first', sortOrder: 1 },
      ],
    });
  });

  it('rejects reorder lists that omit or duplicate ids', () => {
    const first = parseCategoryTopicRow(createRow({ id: 'first' }), 'topic');

    if (!first.ok) {
      throw new Error('fixture failed');
    }

    const result = resolveCategoryTopicReorder([first.value], ['first', 'first']);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('validation_failed');
      expect(result.error.recovery).toBe('edit');
    }
  });

  it('creates deletion impact with keep-history and reassign availability', () => {
    const parsed = parseCategoryTopicRow(createRow(), 'category');

    if (!parsed.ok) {
      throw new Error('fixture failed');
    }

    const impact = createCategoryTopicDeletionImpact(parsed.value, {
      moneyRecordCount: 2,
      reflectionCount: 1,
      taskCount: 0,
      totalCount: 3,
      workEntryCount: 0,
    }, 2);

    expect(impact).toMatchObject({
      canKeepHistory: true,
      canReassign: true,
      itemId: 'category-school',
      itemName: 'School',
      usage: { totalCount: 3 },
    });
  });
});
