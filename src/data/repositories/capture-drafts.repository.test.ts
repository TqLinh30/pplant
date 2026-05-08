import type { CaptureDraftRow } from '@/domain/capture-drafts/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import { createCaptureDraftRepository } from './capture-drafts.repository';

const fixedNow = '2026-05-08T00:00:00.000Z';

class FakeCaptureDraftClient {
  readonly executedSql: string[] = [];
  rows: CaptureDraftRow[] = [];

  execSync(source: string): void {
    this.executedSql.push(source);
  }

  withTransactionSync(task: () => void): void {
    const snapshot = this.rows.map((row) => ({ ...row }));

    try {
      task();
    } catch (cause) {
      this.rows = snapshot;
      throw cause;
    }
  }

  runSync(source: string, ...params: unknown[]): unknown {
    this.executedSql.push(source);

    if (source.includes('INSERT INTO capture_drafts')) {
      const [id, workspaceId, kind, payloadJson, createdAt, updatedAt, lastSavedAt] = params;

      this.rows.push({
        createdAt: createdAt as string,
        discardedAt: null,
        id: id as string,
        kind: kind as string,
        lastSavedAt: lastSavedAt as string,
        payloadJson: payloadJson as string,
        savedAt: null,
        savedRecordId: null,
        savedRecordKind: null,
        status: 'active',
        updatedAt: updatedAt as string,
        workspaceId: workspaceId as string,
      });

      return { changes: 1 };
    }

    if (source.includes('payload_json = ?')) {
      const [payloadJson, updatedAt, lastSavedAt, workspaceId, id] = params;
      const row = this.rows.find(
        (candidate) => candidate.workspaceId === workspaceId && candidate.id === id && candidate.status === 'active',
      );

      if (row) {
        row.payloadJson = payloadJson as string;
        row.updatedAt = updatedAt as string;
        row.lastSavedAt = lastSavedAt as string;
      }

      return { changes: row ? 1 : 0 };
    }

    if (source.includes("status = 'discarded'")) {
      const [updatedAt, discardedAt, workspaceId, id] = params;
      const row = this.rows.find(
        (candidate) => candidate.workspaceId === workspaceId && candidate.id === id && candidate.status === 'active',
      );

      if (row) {
        row.discardedAt = discardedAt as string;
        row.savedAt = null;
        row.savedRecordId = null;
        row.savedRecordKind = null;
        row.status = 'discarded';
        row.updatedAt = updatedAt as string;
      }

      return { changes: row ? 1 : 0 };
    }

    if (source.includes("status = 'saved'")) {
      const [updatedAt, savedAt, savedRecordKind, savedRecordId, workspaceId, id] = params;
      const row = this.rows.find(
        (candidate) => candidate.workspaceId === workspaceId && candidate.id === id && candidate.status === 'active',
      );

      if (row) {
        row.discardedAt = null;
        row.savedAt = savedAt as string;
        row.savedRecordId = savedRecordId as string;
        row.savedRecordKind = savedRecordKind as string;
        row.status = 'saved';
        row.updatedAt = updatedAt as string;
      }

      return { changes: row ? 1 : 0 };
    }

    if (source.includes('SET updated_at = ?')) {
      const [updatedAt, workspaceId, id] = params;
      const row = this.rows.find(
        (candidate) => candidate.workspaceId === workspaceId && candidate.id === id && candidate.status === 'active',
      );

      if (row) {
        row.updatedAt = updatedAt as string;
      }

      return { changes: row ? 1 : 0 };
    }

    return { changes: 0 };
  }

  getFirstSync<T>(source: string, ...params: unknown[]): T | null {
    if (source.includes('kind = ?')) {
      const [workspaceId, kind] = params;

      return (
        (this.rows
          .filter(
            (row) => row.workspaceId === workspaceId && row.kind === kind && row.status === 'active',
          )
          .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || right.id.localeCompare(left.id))[0] as
          | T
          | undefined) ?? null
      );
    }

    const [workspaceId, id] = params;
    const activeOnly = source.includes("status = 'active'");

    return (
      (this.rows.find(
        (row) => row.workspaceId === workspaceId && row.id === id && (!activeOnly || row.status === 'active'),
      ) as T | undefined) ?? null
    );
  }

  getAllSync<T>(_source: string, ...params: unknown[]): T[] {
    const [workspaceId] = params;

    return this.rows
      .filter((row) => row.workspaceId === workspaceId && row.status === 'active')
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || right.id.localeCompare(left.id))
      .map((row) => row as T);
  }
}

describe('capture draft repository', () => {
  it('creates and lists active drafts', async () => {
    const client = new FakeCaptureDraftClient();
    const repository = createCaptureDraftRepository({ $client: client } as never);

    const saved = await repository.upsertActiveDraft({
      id: 'draft-expense' as never,
      kind: 'expense',
      payload: { amount: '12.50' },
      timestamp: fixedNow,
      workspaceId: localWorkspaceId,
    });
    const active = await repository.listActiveDrafts(localWorkspaceId);

    expect(saved.ok).toBe(true);
    expect(active.ok).toBe(true);
    if (active.ok) {
      expect(active.value).toHaveLength(1);
      expect(active.value[0]).toMatchObject({
        id: 'draft-expense',
        kind: 'expense',
        payload: { amount: '12.50' },
        status: 'active',
      });
    }
  });

  it('enforces one active draft per kind by updating the existing active draft', async () => {
    const client = new FakeCaptureDraftClient();
    const repository = createCaptureDraftRepository({ $client: client } as never);

    await repository.upsertActiveDraft({
      id: 'draft-expense-1' as never,
      kind: 'expense',
      payload: { amount: '12.50' },
      timestamp: fixedNow,
      workspaceId: localWorkspaceId,
    });
    await repository.upsertActiveDraft({
      id: 'draft-expense-2' as never,
      kind: 'expense',
      payload: { amount: '18.25' },
      timestamp: '2026-05-08T00:01:00.000Z',
      workspaceId: localWorkspaceId,
    });

    const active = await repository.listActiveDrafts(localWorkspaceId);

    expect(active.ok).toBe(true);
    if (active.ok) {
      expect(active.value).toHaveLength(1);
      expect(active.value[0]).toMatchObject({
        id: 'draft-expense-1',
        payload: { amount: '18.25' },
      });
    }
  });

  it('hides saved and discarded drafts from active listings', async () => {
    const client = new FakeCaptureDraftClient();
    const repository = createCaptureDraftRepository({ $client: client } as never);

    await repository.upsertActiveDraft({
      id: 'draft-expense' as never,
      kind: 'expense',
      payload: { amount: '12.50' },
      timestamp: fixedNow,
      workspaceId: localWorkspaceId,
    });
    const saved = await repository.markActiveDraftSavedByKind(localWorkspaceId, 'expense', {
      savedAt: '2026-05-08T00:02:00.000Z',
      savedRecordId: 'money-1' as never,
      savedRecordKind: 'money_record',
    });
    await repository.upsertActiveDraft({
      id: 'draft-task' as never,
      kind: 'task',
      payload: { title: 'Essay' },
      timestamp: '2026-05-08T00:03:00.000Z',
      workspaceId: localWorkspaceId,
    });
    const discarded = await repository.discardDraft(
      localWorkspaceId,
      'draft-task' as never,
      '2026-05-08T00:04:00.000Z',
    );
    const active = await repository.listActiveDrafts(localWorkspaceId);

    expect(saved.ok).toBe(true);
    if (saved.ok && saved.value) {
      expect(saved.value).toMatchObject({
        savedRecordId: 'money-1',
        savedRecordKind: 'money_record',
        status: 'saved',
      });
    }
    expect(discarded.ok).toBe(true);
    if (discarded.ok) {
      expect(discarded.value.status).toBe('discarded');
    }
    expect(active).toEqual({ ok: true, value: [] });
  });

  it('keeps active drafts by touching updatedAt', async () => {
    const client = new FakeCaptureDraftClient();
    const repository = createCaptureDraftRepository({ $client: client } as never);

    await repository.upsertActiveDraft({
      id: 'draft-work' as never,
      kind: 'work',
      payload: { durationHours: '2' },
      timestamp: fixedNow,
      workspaceId: localWorkspaceId,
    });
    const kept = await repository.keepDraft(
      localWorkspaceId,
      'draft-work' as never,
      '2026-05-08T00:05:00.000Z',
    );

    expect(kept.ok).toBe(true);
    if (kept.ok) {
      expect(kept.value.updatedAt).toBe('2026-05-08T00:05:00.000Z');
      expect(kept.value.status).toBe('active');
    }
  });
});
