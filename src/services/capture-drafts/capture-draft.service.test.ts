import type { CaptureDraftRepository } from '@/data/repositories/capture-drafts.repository';
import type {
  CaptureDraft,
  CaptureDraftKind,
  MarkCaptureDraftSavedInput,
  SaveActiveCaptureDraftInput,
} from '@/domain/capture-drafts/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import {
  discardCaptureDraft,
  keepCaptureDraft,
  listActiveCaptureDrafts,
  markActiveCaptureDraftSaved,
  saveActiveCaptureDraft,
} from './capture-draft.service';

const fixedNow = new Date('2026-05-08T00:00:00.000Z');

function createDraft(overrides: Partial<CaptureDraft> = {}): CaptureDraft {
  return {
    createdAt: fixedNow.toISOString(),
    discardedAt: null,
    id: 'draft-expense' as never,
    kind: 'expense',
    lastSavedAt: fixedNow.toISOString(),
    payload: { amount: '12.50' },
    savedAt: null,
    savedRecordId: null,
    savedRecordKind: null,
    status: 'active',
    updatedAt: fixedNow.toISOString(),
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

class FakeCaptureDraftRepository implements CaptureDraftRepository {
  drafts: CaptureDraft[] = [];
  savedInputs: SaveActiveCaptureDraftInput[] = [];
  markSavedInputs: { kind: CaptureDraftKind; input: MarkCaptureDraftSavedInput }[] = [];

  async discardDraft(_workspaceId: never, id: never, timestamp: string) {
    const draft = this.drafts.find((item) => item.id === id);

    if (!draft) {
      return { ok: false as const, error: { code: 'not_found' as const, message: 'Missing.', recovery: 'edit' as const } };
    }

    Object.assign(draft, {
      discardedAt: timestamp,
      status: 'discarded' as const,
      updatedAt: timestamp,
    });

    return { ok: true as const, value: draft };
  }

  async getActiveDraftByKind(_workspaceId: never, kind: CaptureDraftKind) {
    return {
      ok: true as const,
      value: this.drafts.find((draft) => draft.kind === kind && draft.status === 'active') ?? null,
    };
  }

  async getDraft(_workspaceId: never, id: never) {
    return {
      ok: true as const,
      value: this.drafts.find((draft) => draft.id === id) ?? null,
    };
  }

  async getDraftBySavedRecord(_workspaceId: never, savedRecordKind: never, savedRecordId: never) {
    return {
      ok: true as const,
      value:
        this.drafts.find(
          (draft) =>
            draft.status === 'saved' &&
            draft.savedRecordKind === savedRecordKind &&
            draft.savedRecordId === savedRecordId,
        ) ?? null,
    };
  }

  async keepDraft(_workspaceId: never, id: never, timestamp: string) {
    const draft = this.drafts.find((item) => item.id === id);

    if (!draft) {
      return { ok: false as const, error: { code: 'not_found' as const, message: 'Missing.', recovery: 'edit' as const } };
    }

    draft.updatedAt = timestamp;

    return { ok: true as const, value: draft };
  }

  async listActiveDrafts() {
    return { ok: true as const, value: this.drafts.filter((draft) => draft.status === 'active') };
  }

  async listActiveDraftsUpdatedBefore(_workspaceId: never, beforeTimestamp: string) {
    return {
      ok: true as const,
      value: this.drafts.filter((draft) => draft.status === 'active' && draft.updatedAt < beforeTimestamp),
    };
  }

  async markActiveDraftSavedByKind(_workspaceId: never, kind: CaptureDraftKind, input: MarkCaptureDraftSavedInput) {
    this.markSavedInputs.push({ input, kind });
    const draft = this.drafts.find((item) => item.kind === kind && item.status === 'active');

    if (!draft) {
      return { ok: true as const, value: null };
    }

    Object.assign(draft, {
      savedAt: input.savedAt,
      savedRecordId: input.savedRecordId,
      savedRecordKind: input.savedRecordKind,
      status: 'saved' as const,
      updatedAt: input.savedAt,
    });

    return { ok: true as const, value: draft };
  }

  async markDraftSaved() {
    return { ok: true as const, value: createDraft({ status: 'saved' }) };
  }

  async updateDraftPayload(_workspaceId: never, id: never, input: { payload: CaptureDraft['payload']; timestamp: string }) {
    const draft = this.drafts.find((item) => item.id === id);

    if (!draft) {
      return { ok: false as const, error: { code: 'not_found' as const, message: 'Missing.', recovery: 'edit' as const } };
    }

    draft.payload = input.payload;
    draft.updatedAt = input.timestamp;

    return { ok: true as const, value: draft };
  }

  async upsertActiveDraft(input: SaveActiveCaptureDraftInput) {
    this.savedInputs.push(input);
    const existing = this.drafts.find((draft) => draft.kind === input.kind && draft.status === 'active');

    if (existing) {
      existing.payload = input.payload;
      existing.updatedAt = input.timestamp;
      return { ok: true as const, value: existing };
    }

    const draft = createDraft({
      id: input.id,
      kind: input.kind,
      payload: input.payload,
    });
    this.drafts.push(draft);

    return { ok: true as const, value: draft };
  }
}

function createDependencies(repository: FakeCaptureDraftRepository) {
  return {
    createDraftId: () => 'draft-expense',
    createRepository: () => repository,
    migrateDatabase: async () => ({ ok: true as const, value: { applied: 0, appliedMigrations: [] } }),
    now: () => fixedNow,
    openDatabase: () => ({ $client: {} }),
  };
}

describe('capture draft service', () => {
  it('saves, lists, keeps, discards, and marks active drafts saved', async () => {
    const repository = new FakeCaptureDraftRepository();
    const dependencies = createDependencies(repository);

    const saved = await saveActiveCaptureDraft(
      { kind: 'expense', payload: { amount: '12.50' } },
      dependencies,
    );
    const listed = await listActiveCaptureDrafts(dependencies);
    const kept = await keepCaptureDraft({ id: 'draft-expense' }, dependencies);
    const marked = await markActiveCaptureDraftSaved(
      {
        kind: 'expense',
        savedRecordId: 'money-1',
        savedRecordKind: 'money_record',
      },
      dependencies,
    );
    const afterSaved = await listActiveCaptureDrafts(dependencies);

    expect(saved.ok).toBe(true);
    expect(listed.ok).toBe(true);
    if (listed.ok) {
      expect(listed.value).toHaveLength(1);
    }
    expect(kept.ok).toBe(true);
    expect(marked.ok).toBe(true);
    if (marked.ok) {
      expect(marked.value?.status).toBe('saved');
      expect(marked.value?.savedRecordId).toBe('money-1');
    }
    expect(afterSaved).toEqual({ ok: true, value: [] });
  });

  it('soft discards drafts', async () => {
    const repository = new FakeCaptureDraftRepository();
    const dependencies = createDependencies(repository);

    await saveActiveCaptureDraft({ kind: 'task', payload: { title: 'Essay' } }, dependencies);
    const discarded = await discardCaptureDraft({ id: 'draft-expense' }, dependencies);
    const listed = await listActiveCaptureDrafts(dependencies);

    expect(discarded.ok).toBe(true);
    if (discarded.ok) {
      expect(discarded.value.status).toBe('discarded');
    }
    expect(listed).toEqual({ ok: true, value: [] });
  });
});
